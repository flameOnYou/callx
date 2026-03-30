#!/usr/bin/env python3

import os
import shutil
import subprocess
import time
from email import encoders
from email.generator import BytesGenerator
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from io import BytesIO
from pathlib import Path

DEFAULT_RECIPIENT = "your@email.com"
DEFAULT_SENDER = "your@email.com"
DEFAULT_RETRIES = 3
DEFAULT_TIMEOUT_SECONDS = 30


def normalize_recipients(to):
    if to is None:
        return [DEFAULT_RECIPIENT]

    if isinstance(to, str):
        raw_values = [to]
    else:
        raw_values = list(to)

    recipients = []
    for raw in raw_values:
        for item in str(raw).replace(";", ",").split(","):
            recipient = item.strip()
            if recipient:
                recipients.append(recipient)

    return recipients or [DEFAULT_RECIPIENT]


def check_msmtp():
    msmtp_path = shutil.which("msmtp")
    if not msmtp_path:
        raise RuntimeError("msmtp not found in PATH")

    try:
        result = subprocess.run(
            [msmtp_path, "--version"],
            capture_output=True,
            timeout=5,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("msmtp version check timed out") from exc

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"msmtp version check failed: {stderr or 'unknown error'}")

    return msmtp_path


def validate_attachments(attachments):
    valid_paths = []
    for attachment in attachments or []:
        path = Path(attachment).expanduser()
        if not path.exists():
            raise FileNotFoundError(f"attachment does not exist: {path}")
        if not path.is_file():
            raise ValueError(f"attachment is not a file: {path}")
        if not os.access(path, os.R_OK):
            raise PermissionError(f"attachment is not readable: {path}")
        valid_paths.append(path)
    return valid_paths


def build_message(recipients, subject, body, attachments, smtp_from):
    valid_attachments = validate_attachments(attachments)

    if not valid_attachments:
        # 纯文本，无附件，直接用 MIMEText
        msg = MIMEText(body, "plain", "utf-8")
        msg["From"] = smtp_from or DEFAULT_SENDER
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
    else:
        msg = MIMEMultipart()
        msg["From"] = smtp_from or DEFAULT_SENDER
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        for path in valid_attachments:
            with path.open("rb") as handle:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(handle.read())
            encoders.encode_base64(part)
            # 使用 RFC 2231 编码，确保中文文件名不乱码
            part.add_header(
                "Content-Disposition",
                "attachment",
                filename=("utf-8", "", path.name),
            )
            msg.attach(part)

    buffer = BytesIO()
    BytesGenerator(buffer).flatten(msg)
    return buffer.getvalue()


def send_email(
    to=None,
    subject="",
    body="",
    attachments=None,
    smtp_from=None,
    retries=DEFAULT_RETRIES,
    timeout_seconds=DEFAULT_TIMEOUT_SECONDS,
):
    recipients = normalize_recipients(to)
    attempts = max(1, int(retries))
    message = build_message(recipients, subject, body, attachments or [], smtp_from)
    msmtp_path = check_msmtp()

    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            result = subprocess.run(
                [msmtp_path, *recipients],
                input=message,
                capture_output=True,
                timeout=timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            last_error = RuntimeError(
                f"msmtp timed out after {timeout_seconds}s on attempt {attempt}/{attempts}"
            )
        except OSError as exc:
            last_error = RuntimeError(
                f"msmtp execution failed on attempt {attempt}/{attempts}: {exc}"
            )
        else:
            if result.returncode == 0:
                return True

            stderr = result.stderr.decode("utf-8", errors="replace").strip()
            stdout = result.stdout.decode("utf-8", errors="replace").strip()
            detail = stderr or stdout or f"exit code {result.returncode}"
            last_error = RuntimeError(
                f"msmtp send failed on attempt {attempt}/{attempts}: {detail}"
            )

        if attempt < attempts:
            time.sleep(2 ** (attempt - 1))

    if last_error is not None:
        raise last_error

    raise RuntimeError("msmtp send failed without a captured error")
