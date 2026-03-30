# callx

**像 `codex`、`claude`、`opencode` 一样用 `npm install -g` 安装的 AI 召唤器。**

`callx` 是一个 Node CLI：

- 全局安装命令是 `callx`
- 用户配置统一读取 `~/.config/callx`
- 第一次运行时如果配置目录不存在，会自动初始化

运行时只认这一套结构：

```text
~/.config/callx/
├── providers.json
├── skillpacks/
│   ├── code-skill/
│   └── send-email/
├── sprites/
│   ├── claude-01/
│   └── open-01/
└── .default
```

## 安装

前置条件：

- Node.js 18+
- OpenCode: `npm install -g opencode-ai`
- Claude Code: `npm install -g @anthropic-ai/claude-code`

安装：

```bash
npm install -g @greenhill/callx
```

如果你是在本地开发这个仓库，也可以直接：

```bash
npm install -g .
```

## 配置

第一次运行任意 `callx` 命令时，如果 `~/.config/callx` 不存在，会自动创建：

- `~/.config/callx/providers.json`
- `~/.config/callx/skillpacks/`
- `~/.config/callx/sprites/`

然后编辑：

```bash
$EDITOR ~/.config/callx/providers.json
```

示例：

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

## 使用

```bash
callx -l
callx -d open-01
callx
callx claude-01
callx open-01 -a run "hi"
callx -s
callx update
```

## 更新

如果是通过 npm 全局安装的，直接：

```bash
callx update
```

它会执行 npm 全局升级，不会改动 `~/.config/callx`。配置里的 `providers.json`、`sprites/`、`skillpacks/` 都由用户自己维护。

## 发布

发 npm 包之前，先确保：

- 你已经登录 npm：`npm login --registry=https://registry.npmjs.org/`
- git 工作区是干净的

常用命令：

```bash
npm run pack:check
npm run release:patch
npm run publish:npm
```

如果想一步完成升级版本并发布：

```bash
npm run release:patch:publish
```

版本管理建议：

- 修复 bug 用 `patch`
- 加兼容性功能用 `minor`
- 有破坏性变更用 `major`

## 创建新 Sprite

```bash
mkdir -p ~/.config/callx/sprites/my-agent/{agents,commands,modes,plugins,skills,tools,themes}
cat > ~/.config/callx/sprites/my-agent/config.json <<'EOF'
{
  "cli": "opencode",
  "provider": "deepseek",
  "model": "deepseek/deepseek-chat",
  "autoupdate": true,
  "skill_links": ["code-skill"]
}
EOF
```

然后：

```bash
callx -l
callx my-agent
```

## 约定

- `providers.json` 是唯一运行时 provider 配置
- `skillpacks/` 是技能源目录
- `sprites/` 是所有 AI 角色目录
- 每个 sprite 启动时会自动把 `skill_links` 链接到自己的 `skills/`

## 许可证

[GPL-3.0](LICENSE)
