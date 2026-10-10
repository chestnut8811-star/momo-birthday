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

src="$(git rev-parse --short HEAD)"
tree="$(git rev-parse "HEAD:app")"

# app/ を変えたのに sw.js の VERSION が公開中と同じだと、ホーム画面のアプリが古い版のままになる
if git fetch -q origin gh-pages 2>/dev/null; then
  live_tree="$(git rev-parse "FETCH_HEAD^{tree}")"
  live_version="$(git show FETCH_HEAD:sw.js | grep -o "momo-bday-v[0-9]*" | head -1)"
  new_version="$(grep -o "momo-bday-v[0-9]*" app/sw.js | head -1)"
  if [ "${tree}" != "${live_tree}" ] && [ "${live_version}" = "${new_version}" ]; then
    echo "app/sw.js の VERSION（${new_version}）が公開中と同じです。上げてからコミットしてください。" >&2
    exit 1
  fi
fi

# 現在のコミットの app/ の中身だけで、履歴を持たない公開用コミットを作って gh-pages に置く
commit="$(printf 'Deploy app/ from %s\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n' "${src}" | git commit-tree "${tree}")"
git push --force origin "${commit}:refs/heads/gh-pages"
echo "公開しました（反映まで1〜2分かかります）。"
