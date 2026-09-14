#!/usr/bin/env bash
# Builds the app and publishes dist/ to the gh-pages branch, which GitHub
# Pages serves. Force-pushes an orphan commit each time so the branch never
# accumulates history of built files.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
remote=$(git remote get-url origin)
tmp=$(mktemp -d)
cp -R dist/. "$tmp"/
touch "$tmp/.nojekyll"   # Pages must not run Jekyll over the assets/ folder
git -C "$tmp" init -q -b gh-pages
git -C "$tmp" add -A
git -C "$tmp" -c user.name="deploy" -c user.email="deploy@local" commit -q -m "Deploy $(git rev-parse --short HEAD)"
git -C "$tmp" push -f -q "$remote" gh-pages
rm -rf "$tmp"
echo "Published $(git rev-parse --short HEAD) to gh-pages."
