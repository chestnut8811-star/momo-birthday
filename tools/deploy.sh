#!/bin/bash
# app/ フォルダだけを GitHub Pages（gh-pages ブランチ）へ公開する。
# 使い方: bash tools/deploy.sh
# 前提: このフォルダが git 管理下で、origin が GitHub のリポジトリを指していること。
# 更新して公開し直すときは、先に app/sw.js の VERSION を上げてコミットしておく。
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "未コミットの変更があります。コミットしてから公開してください。" >&2
  exit 1
fi

# 現在のコミットの app/ の中身だけで、履歴を持たない公開用コミットを作って gh-pages に置く
src="$(git rev-parse --short HEAD)"
tree="$(git rev-parse "HEAD:app")"
commit="$(printf 'Deploy app/ from %s\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n' "${src}" | git commit-tree "${tree}")"
git push --force origin "${commit}:refs/heads/gh-pages"
echo "公開しました（反映まで1〜2分かかります）。"
