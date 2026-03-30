# 技能库管理

所有技能统一存放在 `skill-packs/`，遵循 [Agent Skills](https://agentskills.io) 开放规范。

## 工作原理

各智能体通过 `config.json` 的 `skill_links` 字段声明需要哪些技能，`call` 启动时自动在智能体的 `skills/` 目录下建立软链接，指向 `skill-packs/` 中的技能。

**修改技能只需改 `skill-packs/`，所有智能体立即生效。**

## 内置技能

| 技能 | 说明 |
|------|------|
| `code-skill` | 代码质量检查，自动检测语言并运行对应 linter |
| `send-email` | 通过 msmtp 发送邮件，支持正文和附件 |

## 新增技能

1. 将技能目录放入 `skill-packs/`
2. 在需要的智能体的 `config.json` 的 `skill_links` 里加上技能名
3. 下次召唤时自动生效

## 邮件技能依赖

`send-email` 技能依赖 `msmtp`，请确保 `~/.msmtprc` 已配置好 SMTP 账户。
