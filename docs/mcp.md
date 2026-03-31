# MCP 服务器管理

所有 MCP 服务器统一存放在 `~/.config/callx/mcpservers/`，由 callx 在启动时自动转换为 Claude Code 或 OpenCode 各自的格式。

## 工作原理

各 sprite 通过 `config.json` 的 `mcp_links` 字段声明需要哪些 MCP 服务器。`call` 启动时读取对应的 MCP 定义，根据目标 CLI 生成格式正确的配置：

- **Claude Code**：在 sprite 目录下生成 `.mcp.json`
- **OpenCode**：在运行时配置的 `mcp` 字段中注入

**修改 MCP 配置只需改 `mcpservers/`，所有引用该服务器的 sprite 立即生效。**

## 目录结构

```text
~/.config/callx/mcpservers/
├── context7/
│   └── mcp.json
├── playwright/
│   └── mcp.json
└── github/
    └── mcp.json
```

每个 MCP 服务器一个目录，目录名即服务器名，内含一个 `mcp.json` 配置文件。

## 配置格式

### 本地服务器（命令启动）

```json
{
  "type": "local",
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp@latest"],
  "env": {
    "SOME_KEY": "value"
  },
  "timeout": 5000
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `type` | 是 | 固定为 `"local"` |
| `command` | 是 | 启动命令，如 `npx`、`node`、`docker` |
| `args` | 否 | 命令参数数组 |
| `env` | 否 | 环境变量，支持 `${VAR}` 占位符 |
| `timeout` | 否 | 工具获取超时时间（毫秒），默认 5000 |
| `enabled` | 否 | 设为 `false` 可禁用，默认启用 |

### 远程服务器（HTTP 连接）

```json
{
  "type": "remote",
  "url": "https://api.githubcopilot.com/mcp/",
  "headers": {
    "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
  }
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `type` | 是 | 固定为 `"remote"` |
| `url` | 是 | 远程服务器地址 |
| `headers` | 否 | HTTP 请求头，支持 `${VAR}` 占位符 |
| `oauth` | 否 | OAuth 配置（仅 OpenCode 支持） |
| `enabled` | 否 | 设为 `false` 可禁用 |

## 使用步骤

### 1. 创建 MCP 服务器定义

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

### 2. 在 sprite 中引用

编辑 sprite 的 `config.json`，在 `mcp_links` 中加入服务器名：

```json
{
  "cli": "claude",
  "provider": "minimax",
  "model": "MiniMax-M2.7-highspeed",
  "skill_links": ["code-skill"],
  "mcp_links": ["context7", "playwright"]
}
```

### 3. 启动即生效

```bash
call claude-01
```

callx 会自动把 `mcp_links` 中的服务器转换为 Claude Code 的 `.mcp.json` 格式并写入 sprite 目录。OpenCode 同理，会注入到运行时配置中。

## 内置 MCP 服务器

| 名称 | 类型 | 说明 |
|------|------|------|
| `context7` | local | 文档上下文查询服务（@upstash/context7-mcp） |

## 格式转换对照

callx 使用统一格式定义 MCP 服务器，启动时自动转换：

| 统一格式 | Claude Code | OpenCode |
|---------|------------|----------|
| `command` + `args` | 保持 `command` + `args` | 合并为 `command` 数组 |
| `env` | 保持 `env` | 重命名为 `environment` |
| `type: "local"` | 不输出 type | 保持 `type: "local"` |
| `type: "remote"` | 转为 `type: "http"` | 保持 `type: "remote"` |
| `oauth` | 忽略 | 保留 |

## 环境变量

MCP 配置中的 `${VAR}` 占位符会在运行时由各 CLI 工具自行解析。你需要在 shell 环境中设置对应的环境变量，例如：

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxx"
```

## 查看当前 MCP 配置

```bash
call -s
```

输出中的 `MCP` 行会显示当前 sprite 引用的所有 MCP 服务器。
