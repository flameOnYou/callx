![logo](https://raw.githubusercontent.com/flameOnYou/callx/main/logo.svg#only-light)
![logo](https://raw.githubusercontent.com/flameOnYou/callx/main/logo.svg#only-dark)

# callx

## AI 智能体召唤台

> 每一个 AI，都是一个可以被召唤的灵。它们各有性格，各有所长，等待着被呼唤。

**像 codex、claude、opencode 一样全局安装，统一从 `~/.config/callx` 读取 providers、skillpacks、sprites。**

[GitHub](https://github.com/flameOnYou/callx)
[快速开始](#/README)
[命令速查](#/README?id=命令速查)

---

## ⚡ 功能特性

- **一键召唤** — `callx` 直达默认 sprite，`callx <名>` 召唤任意 sprite
- **统一 API 配置** — 所有提供商的 API Key 集中在 `providers.json`
- **技能即插即用** — 遵循 Agent Skills 规范，修改一次所有智能体生效
- **运行时无缝切换** — 无需退出，切换后模型、提供商、技能全部重新加载
- **多智能体并行** — 在 `sprites/` 下配置任意多个 sprite
- **完全可扩展** — agents、commands、modes、tools、themes 全部可自定义

---

## 🚀 快速开始

```bash
npm install -g callx
callx -l
$EDITOR ~/.config/callx/providers.json
callx -d claude-01
callx
```

---

## 已支持提供商

DeepSeek · OpenAI · Claude · MiniMax · 通义千问 · 硅基流动 · OpenRouter · 任何 OpenAI 兼容 API

---

## 📖 完整文档

| 章节 | 内容 |
|------|------|
| [README.md](https://github.com/flameOnYou/callx#readme) | 完整 README，完整安装与配置 |
| [sprites/claude-01](https://github.com/flameOnYou/callx/tree/main/sprites/claude-01) | Claude Code sprite 配置 |
| [sprites/open-01](https://github.com/flameOnYou/callx/tree/main/sprites/open-01) | OpenCode sprite 配置 |
| [skillpacks/code-skill](https://github.com/flameOnYou/callx/tree/main/skillpacks/code-skill) | 代码质量检查技能 |
| [skillpacks/send-email](https://github.com/flameOnYou/callx/tree/main/skillpacks/send-email) | 邮件发送技能 |

---

*感谢郭小姐一路相伴。*
