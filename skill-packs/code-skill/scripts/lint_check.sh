#!/bin/bash
# lint_check.sh — 自动检测语言并运行对应 linter
set -euo pipefail

targets=("${@:-.}")

if command -v ruff >/dev/null 2>&1; then
  echo "=== Ruff (Python) ==="
  ruff check "${targets[@]}" || true
elif command -v flake8 >/dev/null 2>&1; then
  echo "=== Flake8 (Python) ==="
  flake8 "${targets[@]}" || true
fi

if command -v eslint >/dev/null 2>&1; then
  echo "=== ESLint (JS/TS) ==="
  eslint "${targets[@]}" || true
fi

if command -v shellcheck >/dev/null 2>&1; then
  echo "=== ShellCheck ==="
  find "${targets[@]}" -name "*.sh" -exec shellcheck {} + || true
fi
