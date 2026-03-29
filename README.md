# callx

有一年，在回家的车上，我睡着了。

那时候好像也是接近清明，窗外的风景一闪而过，我在迷蒙中梦见了无数的英灵，一个接一个地走进了我的电脑里。那个画面太清晰，醒来之后久久没有散去，像是某种提示，但我一直不明白它在说什么。

直到今晚有感，才终于明白——

**call**，召唤。

每一个 AI，都是一个可以被召唤的灵。它们各有性格，各有所长，等待着被呼唤，等待着去完成某件事。这个项目，就是那个召唤台。

---

## 安装

**前置条件：**
- [OpenCode](https://opencode.ai) 已安装（`opencode` 在 PATH 中）
- 或 [Claude CLI](https://claude.ai/code) 已安装（`claude` 在 PATH 中）
- Python 3

**1. 克隆仓库**

```bash
git clone git@gitee.com:pandas02/mn-agent-team.git ~/code/callx
```

**2. 将仓库路径加入 PATH**

在 `~/.zshrc` 中追加：

```bash
export PATH="$HOME/code/callx:$PATH"
```

```bash
source ~/.zshrc
```

---

## 配置

**1. 配置 API Key**

```bash
cp ~/code/callx/providers.example.json ~/code/callx/providers.json
```

编辑 `providers.json`，填入各提供商的真实 API Key 和格式：

```json
{
  "deepseek": {
    "base_url": "https://api.deepseek.com/v1",
    "api_key": "sk-xxx",
    "format": "openai"
  },
  "minimax": {
    "base_url": "https://api.minimaxi.com/anthropic",
    "api_key": "sk-xxx",
    "format": "anthropic"
  }
}
```

`format` 字段说明：
- `openai` — OpenAI 兼容格式（DeepSeek、通义等）
- `anthropic` — Anthropic 格式（官方 Claude、MiniMax 兼容接口等）

**2. 设置默认智能体**

```bash
call -d agent01
```

---

## 召唤

```bash
call              # 召唤默认智能体
call week-report  # 召唤指定智能体
call -l           # 查看所有可召唤的智能体
```

### 完整命令速查

| 命令 | 说明 |
|------|------|
| `call` | 召唤默认智能体 |
| `call <智能体名>` | 召唤指定智能体 |
| `call -l` | 查看所有可召唤的智能体 |
| `call -d <智能体名>` | 设置默认智能体 |
| `call -a <智能体名>` | 自动执行模式（claude 免确认，opencode 权限设为 allow） |
| `call -s` | 查看当前智能体的配置 |
| `call -h` | 显示帮助 |
| `call <智能体名> run "任务"` | 让指定智能体执行单次任务 |
| `call <智能体名> -a run "任务"` | 让指定智能体以自动模式执行任务 |

---

## 目录结构

```
callx/
├── call                    # 召唤脚本
├── providers.json          # 所有 API 提供商配置（含密钥，已 gitignore）
├── providers.example.json  # 提供商配置模板（可安全提交）
├── skill-packs/            # 技能库，所有技能存放于此
│   ├── deepseek-skill/     # DeepSeek 通用助手技能
│   └── send-email/         # msmtp 邮件发送技能
├── spirits/                # 所有智能体运行环境
│   ├── agent01/            # OpenCode + DeepSeek 通用环境
│   ├── agent-claude/       # Claude CLI 环境（MiniMax 兼容接口）
│   ├── deepseek01/         # OpenCode + DeepSeek（含技能链接）
│   └── week-report/        # 周报专用环境（含技能链接）
├── .default                # 记录当前默认环境名
└── README.md
```

每个智能体的内部结构：

```
spirits/<智能体名>/
├── config.json          # 模型、提供商、技能链接等配置
├── agents/              # 自定义 Agent 定义
├── commands/            # 自定义命令
├── modes/               # 自定义模式
├── skills/              # 运行时技能目录（call 启动时自动建软链接）
├── tools/               # 自定义工具
└── themes/              # 主题
```

---

## API 提供商管理

**新增提供商**：在 `providers.json` 中加一项，在需要的智能体的 `config.json` 里设置 `"provider": "新名字"` 即可。

---

## 技能库管理

所有技能统一存放在 `skill-packs/`，各智能体通过 `config.json` 的 `skill_links` 字段声明需要哪些技能。`call` 启动时会自动在 `<env>/skills/` 下创建对应的符号链接。

**config.json 示例：**

```json
{
  "cli": "opencode",
  "provider": "deepseek",
  "model": "deepseek/deepseek-chat",
  "skill_links": ["deepseek-skill", "send-email"],
  "skills": { "paths": ["./skills"] }
}
```

**新增技能**：将技能目录放入 `skill-packs/`，在需要的智能体的 `config.json` 的 `skill_links` 里加上技能名，下次召唤时自动生效。

### 内置技能

| 技能 | 说明 |
|------|------|
| `deepseek-skill` | DeepSeek 通用助手，支持代码编写、重构、代码审查 |
| `send-email` | 通过 msmtp 发送邮件，支持正文和附件，默认收件人 songyu19@outlook.com |

邮件技能依赖 `msmtp`，请确保 `~/.msmtprc` 已配置好 SMTP 账户。

---

## 召唤一个新的智能体

```bash
# 1. 创建目录结构
mkdir -p ~/code/callx/spirits/<智能体名>/{agents,commands,modes,plugins,skills,tools,themes}

# 2. 创建 config.json
cat > ~/code/callx/spirits/<智能体名>/config.json <<'EOF'
{
  "cli": "opencode",
  "provider": "deepseek",
  "model": "deepseek/deepseek-chat",
  "autoupdate": true,
  "skill_links": ["deepseek-skill"],
  "skills": { "paths": ["./skills"] }
}
EOF
```

Claude CLI 的智能体将 `cli` 改为 `"claude"`，`provider` 改为对应的提供商名（如 `"minimax"`）。

---

## 注意事项

- `providers.json` 含有 API Key，已被 `.gitignore` 排除，**请勿手动提交**
- `skills/` 目录下的软链接由 `call` 脚本自动维护，无需手动管理
- `skill-packs/` 是技能的唯一来源，修改技能只需改这里，所有智能体立即生效

---

现在，是一个 AI 的时代。接下来，是思想的竞赛，是精神世界的比拼。

换一种思路，理清思路后，走出电脑。

感谢郭小姐一路相伴。
