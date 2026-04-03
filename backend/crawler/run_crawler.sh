#!/usr/bin/env bash
# 使用 backend venv 的 Python 运行爬虫，避免用到系统/Homebrew 的 Python
cd "$(dirname "$0")/.."
exec ./venv/bin/python crawler/main.py "$@"
