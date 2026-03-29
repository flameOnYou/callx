---
name: code-skill
description: 代码质量检查技能，自动检测项目语言并运行对应 linter
allowed-tools:
  - Bash(*)
---

# 代码质量检查

## 使用

```bash
bash ./scripts/lint_check.sh [文件或目录...]
```

自动检测项目语言，运行已安装的 linter（ruff / flake8 / eslint / shellcheck 等）。
未安装对应工具时会提示安装命令。
