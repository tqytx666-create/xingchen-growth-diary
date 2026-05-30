#!/usr/bin/env bash
# 手动部署:构建后把 dist 推到 gh-pages 分支(GitHub Pages 从该分支根目录发布)。
# 用法: bash deploy.sh
set -e
cd "$(dirname "$0")"
npm run build
REMOTE=$(git remote get-url origin)
cd dist
cp index.html 404.html  # SPA: 让 hash 路由的刷新/深链不 404
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email=tqytx666@gmail.com -c user.name=tqytx666-create commit -q -m "deploy $(date +%F-%H%M)"
git push -q -f "$REMOTE" gh-pages
echo "pushed dist -> gh-pages"
