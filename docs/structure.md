# 目录结构

```
~/.callx/
├── call                    # 召唤脚本（入口）
├── providers.json          # API 提供商配置（含密钥，已 gitignore）
├── providers.example.json  # 提供商配置模板（可安全提交）
├── skill-packs/            # 技能库，所有技能存放于此
│   ├── code-skill/         # 代码质量检查技能
│   └── send-email/         # msmtp 邮件发送技能
├── spirits/                # 所有智能体运行环境
│   ├── claude-01/          # Claude Code 智能体
│   └── open-01/            # OpenCode 智能体
└── .default                # 记录当前默认环境名
```

## 智能体内部结构

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

## config.json 示例

```json
{
  "cli": "opencode",
  "provider": "deepseek",
  "model": "deepseek/deepseek-chat",
  "autoupdate": true,
  "skill_links": ["code-skill", "send-email"]
}
```

字段说明：

| 字段 | 说明 |
|------|------|
| `cli` | CLI 类型，`opencode` 或 `claude` |
| `provider` | `providers.json` 中的提供商名 |
| `model` | 模型 ID，格式为 `提供商/模型名` |
| `autoupdate` | 是否自动更新智能体 |
| `skill_links` | 需要的技能列表 |
