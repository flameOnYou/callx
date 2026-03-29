# mn-config

A multi-environment configuration repository for OpenCode / Claude AI. Each subdirectory is an independent AI runtime environment, managed and switched via the `mn` script.

> 中文版: [README.md](./README.md)

---

## Directory Structure

```
mn-config/
├── mn                   # Environment manager script (copy to ~/bin/mn)
├── .default             # Stores the current default environment name
├── agent01/             # OpenCode + DeepSeek general-purpose environment
├── agent-claude/        # Claude CLI environment (MiniMax-compatible API)
├── deepseek01/          # OpenCode + DeepSeek (with custom skills)
├── week-report/         # Weekly report environment (with email skill)
└── README.en.md
```

Internal structure of each environment:

```
<env-name>/
├── config.json          # Model, API Key, permissions, etc.
├── mm.json              # (Optional) Specifies CLI type: claude or opencode
├── agents/              # Custom agent definitions
├── commands/            # Custom commands
├── modes/               # Custom modes
├── plugins/             # Plugins
├── skills/              # Skills (*.md files, auto-discovered by OpenCode)
├── tools/               # Custom tools
└── themes/              # Themes
```

---

## Prerequisites

- [OpenCode](https://opencode.ai) installed (`opencode` in PATH)
- Or [Claude CLI](https://claude.ai/code) installed (`claude` in PATH)
- Python 3 (used by the `mn` script for JSON processing)

---

## Quick Start

### 1. Clone the repository

```bash
git clone git@gitee.com:pandas02/mn-agent-team.git ~/code/mn-config
```

### 2. Install the launcher script

```bash
cp ~/code/mn-config/mn ~/bin/mn
chmod +x ~/bin/mn
```

Make sure `~/bin` is in your PATH. If not, add to `~/.zshrc`:

```bash
export PATH="$HOME/bin:$PATH"
```

### 3. Set a default environment

```bash
mn -d agent01
```

### 4. Launch

```bash
mn              # Launch with default environment
mn week-report  # Launch with a specific environment
```

---

## mn Command Reference

| Command | Description |
|---------|-------------|
| `mn` | Launch with the default environment |
| `mn <env>` | Launch with a specific environment |
| `mn -l` | List all available environments and their CLI types |
| `mn -d <env>` | Set the default environment |
| `mn -a <env>` | Auto-execution mode (claude: bypass confirmations; opencode: permission = allow) |
| `mn -s` | Show current environment config |
| `mn -h` | Show help |
| `mn <env> run "task"` | Run a one-shot task in the specified environment |
| `mn <env> -a run "task"` | Run a one-shot task in auto-execution mode |

---

## Environments

### agent01
General-purpose OpenCode environment using the DeepSeek Chat model. Good for everyday coding tasks.

### deepseek01
OpenCode + DeepSeek with a custom skills directory. Add `.md` files under `skills/` to extend its capabilities.

### agent-claude
Claude CLI environment, identified by `"cli": "claude"` in `mm.json`. Supports custom `base_url` for Anthropic-compatible APIs (e.g. MiniMax).

### week-report
A dedicated weekly report environment with two skills:

| Skill | Path | Description |
|-------|------|-------------|
| `send-email` | `week-report/skills/send-email/` | Send emails via msmtp, supports body text and attachments |
| `deepseek-skill` | `week-report/skills/deepseek-skill/` | General DeepSeek assistant skill |

**Email skill quick usage:**

```bash
# Plain text email
python3 ~/code/mn-config/week-report/skills/send-email/scripts/send_email_stable.py \
  --subject "Weekly Report" \
  --body "This week I completed..."

# With attachments (Chinese filenames supported)
python3 ~/code/mn-config/week-report/skills/send-email/scripts/send_email_stable.py \
  --subject "Weekly Report" \
  --body "Please find the attachment." \
  --attachments /tmp/report.pdf
```

The email skill requires `msmtp`. Make sure `~/.msmtprc` is configured with your SMTP account.

---

## Creating a New Environment

```bash
# Create directory structure
mkdir -p ~/code/mn-config/<new-env>/{agents,commands,modes,plugins,skills,tools,themes}

# Create config.json (OpenCode example)
cat > ~/code/mn-config/<new-env>/config.json <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "model": "deepseek/deepseek-chat",
  "provider": {
    "deepseek": {
      "options": {
        "baseURL": "https://api.deepseek.com/v1",
        "apiKey": "your-api-key"
      }
    }
  }
}
EOF

# To use Claude CLI instead, create mm.json
echo '{"cli": "claude"}' > ~/code/mn-config/<new-env>/mm.json
```

---

## CLI Type Resolution

`mn` determines which CLI to use based on `mm.json` in the environment directory:

| `cli` value in `mm.json` | Behavior |
|--------------------------|----------|
| No `mm.json`, or value is `opencode` | Launch with OpenCode |
| `claude` | Read `api_key` / `base_url` / `model` from `config.json`, set environment variables, then launch Claude CLI |

---

## Notes

- `config.json` contains API Keys — **do not commit to a public repository**
- `.md` files under `skills/` are automatically discovered by OpenCode as skills
- `prompts/` is not auto-scanned; reference files explicitly via the `instructions` field in `config.json`
