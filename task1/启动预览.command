#!/bin/zsh
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  print '没有找到 Node.js。你可以直接双击同目录的 index.html 打开网页。'
  read '?按回车退出…'
  exit 1
fi
node scripts/serve.cjs
