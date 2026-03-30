# 创建新的 Sprite

## 步骤

### 1. 创建目录结构

```bash
mkdir -p ~/.config/callx/sprites/<sprite 名>/{agents,commands,modes,plugins,skills,tools,themes}
```

### 2. 创建 config.json

```bash
cat > ~/.config/callx/sprites/<sprite 名>/config.json <<'EOF'
{
  "cli": "opencode",
  "provider": "deepseek",
  "model": "deepseek/deepseek-chat",
  "autoupdate": true,
  "skill_links": ["code-skill"]
}
EOF
```

### 3. 使用

```bash
call -l
call <sprite 名>
```

## OpenCode vs Claude CLI

| 字段 | OpenCode | Claude CLI |
|------|----------|------------|
| `cli` | `"opencode"` | `"claude"` |
| `provider` | 任意 OpenAI 兼容提供商 | Anthropic 格式提供商 |

> Claude CLI 的 sprite，`provider` 需设为支持 Anthropic 格式的提供商（如 `minimax`）。
