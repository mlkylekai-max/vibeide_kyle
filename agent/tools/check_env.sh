#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "python: $(python3 --version)"
echo "venv:   $ROOT_DIR/.venv"
echo "config: $ROOT_DIR/config/app.yaml"
echo "runtime browser dir: $ROOT_DIR/runtime/browser_runtime"
echo "workplaces dir: $ROOT_DIR/workplaces"
echo "pythonpath bootstrap: $ROOT_DIR/src"
