#!/usr/bin/env bash
# 电子书冒烟构建：book/*.md → epub
# 写作期只验证"能编译、图片可解析"；样式/封面/PDF 到 M4 再做（见 CLAUDE.md）
# 依赖：pandoc（macOS: brew install pandoc）
set -eu
cd "$(dirname "$0")/.."
mkdir -p dist

# 章节顺序 = 文件名排序（见 WRITING.md：文件名不含空格，数字前缀定序）
FILES=$(find book -maxdepth 1 -name '*.md' ! -name 'index.md' | sort)

# shellcheck disable=SC2086 # 文件名约定无空格，依赖分词展开（兼容 macOS bash 3.2）
pandoc $FILES \
  -o dist/build-your-own-ai-agent.epub \
  --metadata title="Build Your Own AI Agent —— 从零复刻一个 Claude Code" \
  --metadata author="haoo" \
  --metadata lang=zh-CN \
  --toc --toc-depth=2 \
  --resource-path=book \
  --top-level-division=chapter

echo "✓ dist/build-your-own-ai-agent.epub"
