# callx

**像 `codex`、`claude`、`opencode` 一样用 `npm install -g` 安装的 AI 召唤器。**

`callx` 是一个 Node CLI：

- 全局安装命令是 `call`
- 交互式配置器命令是 `callcli`
- 用户配置统一读取 `~/.config/callx`
- 第一次运行时如果配置目录不存在，会自动初始化

运行时只认这一套结构：

```text
~/.config/callx/
├── providers.json
├── skillpacks/
│   ├── code-skill/
│   └── send-email/
├── mcpservers/
│   └── context7/
├── sprites/
│   ├── claude-01/
│   └── open-01/
└── .default
```

除了 `call` 这个运行时切换命令，现在还提供一个交互式配置入口：

```bash
callcli
```

`callcli` 会进入一个 TUI 主菜单，支持：

- 管理 `providers.json`：provider 名、备注、URL、API Key、格式的增删改查
- 管理 `sprites/`：通过列表选择配置 provider、skills、MCP、默认智能体
- 在 git 仓库中创建 `worktree`：封装常用创建流程，并可直接进入新目录的子 shell

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

安装后可直接打开交互式配置器：

```bash
callcli
```

## 配置

第一次运行任意 `call` 命令时，如果 `~/.config/callx` 不存在，会自动创建：

- `~/.config/callx/providers.json`
- `~/.config/callx/skillpacks/`
- `~/.config/callx/mcpservers/`
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
    "format": "openai",
    "remark": "日常编码"
  },
  "minimax": {
    "base_url": "https://api.minimaxi.com/anthropic",
    "api_key": "sk-xxx",
    "format": "anthropic",
    "remark": "Claude 兼容线路"
  }
}
```

其中 `remark` 是可选字段，用来标记用途、线路或账号备注，运行 `call -s` 时会显示出来。

## 使用

```bash
call -l
call -d open-01
call
call claude-01
call open-01 -a run "hi"
call -s
call update
callcli
```

## callcli

`callcli` 是新的 TUI 配置入口，已迁到 `Ink` 渲染，整体视觉改成更现代的 Monokai 风格：

- **编辑大模型供应商**：对 `providers.json` 做增删改查，覆盖 `name`、`remark`、`base_url`、`api_key`、`format`，并支持字段级编辑
- **编辑智能体**：列表式配置 `provider`、`skill_links`、`mcp_links`、`cli`、`model`、`autoupdate`
- **创建 worktree**：对 `git worktree add` 做交互封装，创建成功后可直接进入新 worktree 的子 shell

说明：

- 智能体编辑流程尽量避免用户手工输入，重点配置都走列表选择
- worktree 创建后，`callcli` 不能直接修改父 shell 的当前目录，所以采用“进入新目录下的子 shell”作为可执行替代方案

## MCP 服务器

callx 统一管理 MCP 服务器，自动为 Claude Code 和 OpenCode 生成各自格式的配置。

### 添加 MCP 服务器

在 `~/.config/callx/mcpservers/` 下创建目录，写入 `mcp.json`：

```bash
mkdir -p ~/.config/callx/mcpservers/playwright
cat > ~/.config/callx/mcpservers/playwright/mcp.json <<'EOF'
{
  "type": "local",
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
EOF
```

远程服务器：

```json
{
  "type": "remote",
  "url": "https://api.githubcopilot.com/mcp/",
  "headers": { "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}" }
}
```

### 在 Sprite 中引用

在 `config.json` 的 `mcp_links` 中加入服务器名即可：

```json
{
  "mcp_links": ["context7", "playwright"]
}
```

启动时 callx 自动转换为对应 CLI 的 MCP 格式。详见 [MCP 服务器管理](docs/mcp.md)。

## 更新

如果是通过 npm 全局安装的，直接：

```bash
call update
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
  "skill_links": ["code-skill"],
  "mcp_links": ["context7"]
}
EOF
```

然后：

```bash
call -l
call my-agent
```

## 约定

- `providers.json` 是唯一运行时 provider 配置
- `skillpacks/` 是技能源目录
- `mcpservers/` 是 MCP 服务器源目录
- `sprites/` 是所有 AI 角色目录
- 每个 sprite 启动时会自动把 `skill_links` 链接到自己的 `skills/`
- 每个 sprite 启动时会根据 `mcp_links` 生成对应 CLI 格式的 MCP 配置

## 许可证

[GPL-3.0](LICENSE)
