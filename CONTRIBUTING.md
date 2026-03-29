# 贡献指南

感谢你对 callx 的关注！欢迎提交 Issue 和 Pull Request。

## 报告 Bug

请在 [Issues](https://github.com/flameOnYou/callx/issues) 中提交，包含：

- 操作系统和 Shell 版本
- 复现步骤
- 期望行为与实际行为

## 提交 Pull Request

1. Fork 并克隆仓库
2. 创建功能分支：`git checkout -b feature/xxx`
3. 提交更改并推送
4. 发起 Pull Request，描述你的改动

## 新增技能

技能目录遵循 [Agent Skills](https://agentskills.io) 规范：

```
skill-packs/<技能名>/
├── SKILL.md          # 必需：元数据 + 使用说明
├── scripts/          # 可执行脚本
├── references/       # 参考文档
└── assets/           # 静态资源
```

## 代码风格

- Shell 脚本使用 `bash`，缩进 2 空格
- Python 使用 UTF-8 编码，缩进 4 空格
- JSON 缩进 2 空格
