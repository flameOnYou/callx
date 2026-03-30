# AI 智能体召唤台

> 每一个 AI，都是一个可以被召唤的灵。

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue.svg" alt="License" /></a>
  <a href="https://agentskills.io"><img src="https://img.shields.io/badge/skills-Agent%20Skills-7c6cf2" alt="Agent Skills" /></a>
  <img src="https://img.shields.io/badge/shell-bash-green.svg" alt="Shell" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey.svg" alt="Platform" />
</p>

<p align="center">
  <strong>一键切换、统一管理多个 AI 运行环境 — Claude Code、OpenCode 随叫随到。</strong>
</p>

<p align="center">
  <a href="#安装"><strong>快速开始</strong></a>
  ·
  <a href="https://github.com/flameOnYou/callx" target="_blank"><strong>GitHub</strong></a>
  ·
  <a href="#/?id=目录"><strong>文档</strong></a>
</p>

---

## 缘起

有一年，在回家的车上，我睡着了。

那时候好像也是接近清明，窗外的风景一闪而过，我在迷蒙中梦见了无数的英灵，一个接一个地走进了我的电脑里。那个画面太清晰，醒来之后久久没有散去，像是某种提示，但我一直不明白它在说什么。

直到今晚有感，才终于明白——

**召唤，或者说，请神！**

每一个 AI，都是一个可以被召唤的灵。它们各有性格，各有所长，等待着被呼唤，等待着去完成某件事。这个项目，就是那个召唤台。

---

## 功能特性

| 特性 | 说明 |
|------|------|
| ⚡ **一键召唤** | `call` 召唤默认智能体，`call <名>` 召唤任意智能体 |
| 🔗 **统一 API 配置** | 所有提供商的 API Key 集中在 `providers.json`，一处配置处处生效 |
| 🧩 **技能即插即用** | 遵循 Agent Skills 规范，技能存放在 `skill-packs/`，所有智能体共享 |
| 🔀 **运行时无缝切换** | 无需退出，切换智能体后模型、提供商、技能全部重新加载 |
| 🎭 **多智能体并行** | 在 `spirits/` 下配置任意多个智能体，按任务选择最合适的 |
| 🛠️ **完全可扩展** | agents、commands、modes、tools、themes 全部可自定义 |

---

## 安装

### 前置条件

- Python 3
- 对应 AI CLI 工具：
  - **OpenCode**：`npm install -g opencode-ai`
  - **Claude Code**：`npm install -g @anthropic-ai/claude-code`

### 步骤

```bash
# 1. 克隆到本地
git clone https://github.com/flameOnYou/callx.git ~/.callx

# 2. 创建软链接
ln -s ~/.callx/call /usr/local/bin/call

# 3. 配置 API Key
cp ~/.callx/providers.example.json ~/.callx/providers.json
# 编辑 providers.json，填入真实 API Key

# 4. 开始召唤
call -l           # 查看所有可召唤的智能体
call -d claude-01 # 设置默认智能体
call              # 召唤！
```

---

## 命令速查

```bash
call              # 召唤默认智能体
call claude-01    # 召唤指定智能体
call -l           # 查看所有可召唤的智能体
call -d <智能体名> # 设置默认智能体
call -a           # 自动执行模式
call -s           # 查看当前配置
call -h           # 显示帮助
```

---

## 终端演示

```bash
$ call
正在召唤默认智能体...
✓ claude-01 就绪 · deepseek · claude-3-7-sonnet

$ call -l
claude-01   claude · deepseek · claude-3-7-sonnet  ● 默认
open-01     opencode · openai · gpt-4o

$ call claude-01 run "优化我的数据库查询"
召唤 claude-01，执行任务...
```

---

## 支持的提供商

DeepSeek · OpenAI · Claude (Anthropic) · MiniMax · 通义千问 · 硅基流动 · OpenRouter · 任何 OpenAI 兼容 API

---

## 感谢

> 感谢郭小姐一路相伴。
