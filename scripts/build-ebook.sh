#!/usr/bin/env bash
# 电子书冒烟构建：src/content/docs/*.md → epub
# 写作期只验证"能编译、图片可解析"；样式/封面/PDF 到 M4 再做（见 CLAUDE.md）
#
# 注意：.mdx 文件跳过（pandoc 不处理 JSX 语法）。MDX 降级策略在 M4 确定。
#
# 依赖：pandoc（macOS: brew install pandoc）
set -eu
cd "$(dirname "$0")/.."
mkdir -p dist

# 章节顺序 = 文件名排序（见 WRITING.md：文件名不含空格，数字前缀定序）
# 仅处理 .md 文件，.mdx 跳过（pandoc 不支持 JSX）
FILES=$(find src/content/docs -maxdepth 1 -name '*.md' ! -name 'index.md' ! -name 'about.md' ! -name 'outline.md' | sort)

# shellcheck disable=SC2086
pandoc $FILES \
  -o dist/build-your-own-ai-agent.epub \
  --metadata title="Build Your Own AI Agent —— 从零复刻一个 Claude Code" \
  --metadata author="haoo" \
  --metadata lang=zh-CN \
  --toc --toc-depth=2 \
  --resource-path=src/content/docs \
  --top-level-division=chapter

echo "✓ dist/build-your-own-ai-agent.epub"
