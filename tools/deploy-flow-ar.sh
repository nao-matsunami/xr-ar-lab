#!/bin/bash
# tools/deploy-flow-ar.sh — flow-ar を antymark.com/demo/flow-ar/ へミラーする
#
# ★ Mac mini 上で実行する（heteml の鍵は Mac mini にしかない）。ThinkPad からは動かさない。
#
#   1. ThinkPad（ubuntu-dev-tailscale）の ~/xr-ar-lab/demos/flow-ar/ を Mac mini のステージングに rsync
#   2. ステージングを ssh heteml の HETEML_DIR へ rsync
#   3. 公開 URL を curl で叩いて 404 と Content-Type を確認
#
# 使い方（Mac mini）:
#   ./deploy-flow-ar.sh -n     # 試し（rsync --dry-run。heteml 側は何も変わらない）
#   ./deploy-flow-ar.sh        # 本番
#   DELETE=1 ./deploy-flow-ar.sh   # ミラー先にだけある古いファイルも消す（HETEML_DIR の中だけ）
#
# demos/flow-ar/ はそれだけで完結している（エンジン・three.js・xrextras・帰属表示は ./vendor/ に実ファイル。
# tools/sync-flow-ar-vendor.sh 参照）。なのでミラーするのはこのフォルダだけで、lib/ や engine/ は要らない。
# 印刷用（print/）・README.md・build.sh は公開しない。
#
# 送るのは ThinkPad の作業ツリーそのもの（未コミットの変更も入る）。デプロイ前に ThinkPad 側で
# git status / git pull を済ませておくこと。
set -euo pipefail

# heteml 上で https://antymark.com/demo/flow-ar/ に当たるディレクトリ（絶対パス、末尾スラッシュなし）。
# 既存デモ（~/ai-workspace/claude/antymark-demo-index/）と同じ階層。Mac mini で `ssh heteml 'ls'` 等で確かめて埋める。
HETEML_DIR=""

SRC_HOST=${SRC_HOST:-ubuntu-dev-tailscale}
SRC_DIR=${SRC_DIR:-xr-ar-lab/demos/flow-ar/}   # SRC_HOST のホームからの相対
DEST_HOST=${DEST_HOST:-heteml}
PUBLIC_URL=${PUBLIC_URL:-https://antymark.com/demo/flow-ar}
STAGE=${STAGE:-$HOME/.cache/flow-ar-deploy}

DRY=()
[ "${1:-}" = "-n" ] && DRY=(--dry-run)

if [ -z "$HETEML_DIR" ]; then
  echo "ERROR: HETEML_DIR が未設定です。$0 の先頭で heteml 上の demo/flow-ar のパスを設定してください" >&2
  exit 1
fi
# 取り違えでサイト全体を上書き・削除しないよう、末尾が demo/flow-ar のパスだけ受け付ける
case "$HETEML_DIR" in
  /*/demo/flow-ar) ;;
  *) echo "ERROR: HETEML_DIR は /.../demo/flow-ar の形の絶対パスにしてください: $HETEML_DIR" >&2; exit 1 ;;
esac

EXCLUDES=(--exclude '/print/' --exclude '/README.md' --exclude '/build.sh' --exclude '.DS_Store')

echo "== 1. $SRC_HOST:$SRC_DIR -> $STAGE"
mkdir -p "$STAGE"
rsync -az --delete "${EXCLUDES[@]}" -e ssh "$SRC_HOST:$SRC_DIR" "$STAGE/"

# 必要なファイルが揃っているか（vendor の同期漏れ、ThinkPad 側の作業途中を弾く）
missing=0
for f in index.html core.js config.json \
         vendor/engine/xr.js vendor/engine/xr-tracking.js vendor/three/three.module.min.js \
         vendor/three/three.core.min.js vendor/xrextras/xrextras.js vendor/attribution.js \
         sumi-ryu/index.html sumi-ryu/target.png sumi-ryu/video.mp4 \
         sakura/index.html sakura/target.png sakura/video.mp4 \
         ramen/index.html ramen/target.png ramen/video.mp4; do
  [ -f "$STAGE/$f" ] || { echo "ERROR: missing $f" >&2; missing=1; }
done
# demos/flow-ar の外（../../ 以上）を参照していたらミラー先で 404 になる
if grep -nE '"\.\./\.\./|src="\.\./\.\./' "$STAGE"/index.html "$STAGE"/*/index.html; then
  echo "ERROR: demos/flow-ar の外を参照しているページがあります（上の行）" >&2
  missing=1
fi
[ $missing -eq 0 ] || exit 1

echo "== 2. $STAGE -> $DEST_HOST:$HETEML_DIR ${DRY[*]:-}"
DEL=()
[ "${DELETE:-}" = "1" ] && DEL=(--delete)
ssh "$DEST_HOST" "mkdir -p '$HETEML_DIR'"
# macOS 標準の bash 3.2 は set -u で空配列の "${a[@]}" をエラーにするので ${a[@]+...} で展開する
rsync -rltz ${DRY[@]+"${DRY[@]}"} ${DEL[@]+"${DEL[@]}"} -e ssh \
  "$STAGE/" "$DEST_HOST:$HETEML_DIR/"

if [ ${#DRY[@]} -gt 0 ]; then
  echo "(dry-run なので確認は省略)"
  exit 0
fi

echo "== 3. $PUBLIC_URL の確認（HTTP ステータスと Content-Type）"
fail=0
check() {  # path 期待する Content-Type の先頭
  local line code type
  line=$(curl -sS -o /dev/null -w '%{http_code} %{content_type}' "$PUBLIC_URL/$1")
  code=${line%% *}
  type=${line#* }
  if [ "$code" = "200" ] && [[ "$type" == $2* ]]; then
    printf 'ok   %-32s %s\n' "$1" "$line"
  else
    printf 'NG   %-32s %s（期待: 200 %s）\n' "$1" "$line" "$2" >&2
    fail=1
  fi
}
check ''                              text/html
check 'core.js'                       '*javascript'
check 'config.json'                   application/json
check 'vendor/engine/xr.js'           '*javascript'
check 'vendor/engine/xr-tracking.js'  '*javascript'
check 'vendor/three/three.module.min.js' '*javascript'
check 'vendor/three/three.core.min.js'   '*javascript'
check 'vendor/xrextras/xrextras.js'   '*javascript'
check 'vendor/attribution.js'         '*javascript'
for n in sumi-ryu sakura ramen; do
  check "$n/"           text/html
  check "$n/target.png" image/png
  check "$n/video.mp4"  video/mp4
done
# core.js は type="module"。JS の MIME が違うとブラウザが実行しない。mp4 が違うと iOS で再生できない。
# 合わなければ HETEML_DIR に .htaccess（AddType video/mp4 .mp4 / AddType text/javascript .js 等）を置く。

echo
echo "公開 URL:"
echo "  $PUBLIC_URL/"
for n in sumi-ryu sakura ramen; do echo "  $PUBLIC_URL/$n/"; done
echo "ThinkPad で外部要求 0 件の確認:"
echo "  node tools/headless-check.mjs '$PUBLIC_URL/ramen/?anydevice' --wait 12000"
exit $fail
