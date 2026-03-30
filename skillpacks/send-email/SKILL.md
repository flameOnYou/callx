---
name: send-email
description: 使用 Python 生成 MIME 邮件并通过 msmtp 发送。默认收件人为 your@email.com；只有明确指定 --to 时才发送给其他人。未特别说明时，内容直接作为邮件正文发送，不默认转成附件。失败时只重试同一种发送方式，不切换到其他命令。
allowed-tools:
  - Bash(*)
---

# msmtp 邮件发送技能

统一使用 `msmtp + Python MIME` 发送邮件。

## 唯一入口

```bash
python3 ./scripts/send_email_stable.py \
  --subject "主题" \
  --body "正文"
```

**不要使用** `send_email.py` 或 `send_email_multiple.py`，它们只是旧兼容入口。

## 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `--subject` | 是 | — | 邮件主题 |
| `--body` | 是 | — | 邮件正文（默认就是正文，不会自动转附件） |
| `--to` | 否 | `your@email.com` | 收件人，支持多个逗号分隔 |
| `--attachments` | 否 | — | 附件路径，空格分隔多个 |
| `--retries` | 否 | `3` | 发送失败总尝试次数 |
| `--timeout` | 否 | `30` | 单次超时秒数 |

## 常用示例

```bash
# 纯文字邮件
python3 ./scripts/send_email_stable.py \
  --subject "周报" \
  --body "本周完成了接口联调、页面修复和发布准备。"

# 带附件（中文文件名也支持）
python3 ./scripts/send_email_stable.py \
  --subject "周报" \
  --body "请查收附件" \
  --attachments /tmp/周报.pdf /tmp/数据.xlsx

# 指定收件人
python3 ./scripts/send_email_stable.py \
  --to other@example.com \
  --subject "文档" \
  --body "请查收"
```

## 规范

- 未显式指定收件人时，默认发送到 `your@email.com`
- 未显式要求附件时，`--body` 内容直接作为正文，不落盘、不转附件
- 发送失败时继续使用同一脚本重试，不切换到 `mail`、`curl` 等其他方式

## 失败处理

```bash
# 增加重试次数
python3 ./scripts/send_email_stable.py \
  --subject "重试" \
  --body "内容" \
  --retries 5
```

失败后检查：
```bash
which msmtp
msmtp --version
ls -la ~/.msmtprc
```
