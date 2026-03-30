![logo](https://raw.githubusercontent.com/flameOnYou/callx/main/logo.svg#only-light)
![logo](https://raw.githubusercontent.com/flameOnYou/callx/main/logo.svg#only-dark)

# callx

## AI 智能体召唤台

> 每一个 AI，都是一个可以被召唤的灵。它们各有性格，各有所长，等待着被呼唤。

**一键切换、统一管理 — Claude Code、OpenCode 随叫随到。**

[GitHub](https://github.com/flameOnYou/callx)
[快速开始](#/README)
[命令速查](#/README?id=命令速查)

---

## ⚡ 功能特性

- **一键召唤** — `call` 直达默认智能体，`call <名>` 召唤任意智能体
- **统一 API 配置** — 所有提供商的 API Key 集中在 `providers.json`
- **技能即插即用** — 遵循 Agent Skills 规范，修改一次所有智能体生效
- **运行时无缝切换** — 无需退出，切换后模型、提供商、技能全部重新加载
- **多智能体并行** — 在 `spirits/` 下配置任意多个智能体
- **完全可扩展** — agents、commands、modes、tools、themes 全部可自定义

---

## 🚀 快速开始

```bash
git clone https://github.com/flameOnYou/callx.git ~/.callx
ln -s ~/.callx/call /usr/local/bin/call
cp ~/.callx/providers.example.json ~/.callx/providers.json
# 编辑 providers.json，填入 API Key
call -l
call -d claude-01
call
```

---

## 已支持提供商

DeepSeek · OpenAI · Claude · MiniMax · 通义千问 · 硅基流动 · OpenRouter · 任何 OpenAI 兼容 API

---

## 📖 完整文档

| 章节 | 内容 |
|------|------|
| [README.md](https://github.com/flameOnYou/callx#readme) | 完整 README，完整安装与配置 |
| [spirits/claude-01](https://github.com/flameOnYou/callx/tree/main/spirits/claude-01) | Claude Code 智能体配置 |
| [spirits/open-01](https://github.com/flameOnYou/callx/tree/main/spirits/open-01) | OpenCode 智能体配置 |
| [skill-packs/code-skill](https://github.com/flameOnYou/callx/tree/main/skill-packs/code-skill) | 代码质量检查技能 |
| [skill-packs/send-email](https://github.com/flameOnYou/callx/tree/main/skill-packs/send-email) | 邮件发送技能 |

---

*感谢郭小姐一路相伴。*
