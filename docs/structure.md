# 目录结构

程序目录和配置目录分离。

## 程序目录

```text
<repo>/
├── callx
├── package.json
├── providers.example.json
├── skillpacks/
└── sprites/
```

## 配置目录

```text
~/.config/callx/
├── providers.json
├── skillpacks/
├── sprites/
└── .default
```

## Sprite 内部结构

```text
sprites/<sprite 名>/
├── config.json          # 模型、provider、skill_links 等配置
├── agents/
├── commands/
├── modes/
├── skills/              # call 启动时自动建软链接
├── tools/
└── themes/
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
