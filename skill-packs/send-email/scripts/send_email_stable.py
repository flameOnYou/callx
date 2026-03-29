#!/usr/bin/env python3
"""
超稳定邮件发送脚本
默认收件人为 your@email.com，失败时只做原方法重试。
"""

import sys
import argparse
from email_sender import (
    DEFAULT_RECIPIENT,
    DEFAULT_RETRIES,
    DEFAULT_TIMEOUT_SECONDS,
    send_email,
)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="超稳定邮件发送工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  %(prog)s --subject "测试" --body "测试邮件"
  %(prog)s --to other@example.com --subject "文档" --body "请查收" --attachments file1.pdf file2.docx
        """,
    )
    parser.add_argument(
        "--to",
        default=DEFAULT_RECIPIENT,
        help=f"收件人邮箱，默认: {DEFAULT_RECIPIENT}",
    )
    parser.add_argument("--subject", required=True, help="邮件主题")
    parser.add_argument("--body", required=True, help="邮件正文")
    parser.add_argument(
        "--attachments", nargs="+", default=[], help="附件文件路径（多个）"
    )
    parser.add_argument("--from", dest="sender", default=None, help="发件人邮箱")
    parser.add_argument(
        "--retries",
        type=int,
        default=DEFAULT_RETRIES,
        help=f"发送总尝试次数，默认: {DEFAULT_RETRIES}",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        help=f"单次发送超时秒数，默认: {DEFAULT_TIMEOUT_SECONDS}",
    )

    args = parser.parse_args()

    try:
        send_email(
            to=args.to,
            subject=args.subject,
            body=args.body,
            attachments=args.attachments,
            smtp_from=args.sender,
            retries=args.retries,
            timeout_seconds=args.timeout,
        )
    except Exception as exc:
        print(f"邮件发送失败: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"邮件发送成功，收件人: {args.to or DEFAULT_RECIPIENT}")
