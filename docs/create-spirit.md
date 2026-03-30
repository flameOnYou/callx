# 召唤新的智能体

## 步骤

### 1. 创建目录结构

```bash
mkdir -p ~/.callx/spirits/<智能体名>/{agents,commands,modes,plugins,skills,tools,themes}
```

### 2. 创建 config.json

```bash
cat > ~/.callx/spirits/<智能体名>/config.json <<'EOF'
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
call -l                          # 确认新智能体已显示
call <智能体名>                   # 召唤
```

## OpenCode vs Claude CLI

| 字段 | OpenCode | Claude CLI |
|------|----------|------------|
| `cli` | `"opencode"` | `"claude"` |
| `provider` | 任意 OpenAI 兼容提供商 | Anthropic 格式提供商 |

> Claude CLI 的智能体，`provider` 需设为支持 Anthropic 格式的提供商（如 `minimax`）。
