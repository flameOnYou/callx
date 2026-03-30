# API 提供商管理

## 配置格式

在 `~/.config/callx/providers.json` 中集中管理所有提供商的 API Key：

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

## 字段说明

| 字段 | 说明 |
|------|------|
| `base_url` | 提供商接口地址 |
| `api_key` | 对应提供商的密钥 |
| `format` | 协议类型，`openai` 或 `anthropic` |
| `remark` | 可选备注，用于标记用途、线路、账号归属等 |

## format 字段说明

| 值 | 说明 | 适用提供商 |
|----|------|-----------|
| `openai` | OpenAI 兼容格式 | DeepSeek、通义、硅基流动、OpenRouter 等 |
| `anthropic` | Anthropic 格式 | 官方 Claude、MiniMax 兼容接口 |

## 新增提供商

1. 在 `providers.json` 中加一项
2. 在需要的 sprite 的 `config.json` 里设置 `"provider": "新名字"`
3. 重新运行 `call` 即可生效

## 注意事项

`providers.json` 含有 API Key，不应该提交到 Git。
