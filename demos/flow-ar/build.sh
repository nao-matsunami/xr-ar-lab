#!/bin/bash
# demos/flow-ar/build.sh <素材フォルダ>
#
# Google Flow の素材（<name>.jpg = 印刷物 / <name>.mp4 = その絵を最初のコマにした映像）から
# 各デモの target.png と video.mp4 を作る。素材フォルダの元ファイルは読むだけで変更しない。
#
# 素材の実測（2026-10-19）: jpg は 1024x1024、mp4 は 1920x1080・24fps・8 秒。
# mp4 の最初のコマは jpg の「縦の中央 16:9（y=224〜800）」をそのまま拡大したもの
# （SIFT＋RANSAC の相似変換で 3 本とも 倍率 0.5334・回転 0.0°・残差中央値 0.5px 以下）。
# なので AR の認識ターゲットも jpg の同じ帯を切り出す。こうすると動画の枠＝ターゲットの枠になり、
# 動画を板いっぱいに貼れば最初のコマが印刷物とぴったり重なる。
set -euo pipefail
SRC=${1:?usage: build.sh <素材フォルダ>}
DIR=$(cd "$(dirname "$0")" && pwd)
for n in sumi-ryu sakura ramen; do
  mkdir -p "$DIR/$n"
  # 認識ターゲット兼印刷用: jpg の y=224〜800 を切り出し（1024x576）
  ffmpeg -v error -y -i "$SRC/$n.jpg" -vf "crop=1024:576:0:224" "$DIR/$n/target.png"
  # スマホ向け: H.264 / 長辺 720px / 音声なし / faststart。1 本 3MB 以下が目安
  ffmpeg -v error -y -i "$SRC/$n.mp4" -an -vf "scale=720:-2:flags=lanczos" \
    -c:v libx264 -profile:v main -level 3.1 -pix_fmt yuv420p -preset slow -crf 22 \
    -movflags +faststart "$DIR/$n/video.mp4"
  printf '%-9s target %s  video %s bytes\n' "$n" \
    "$(sips -g pixelWidth -g pixelHeight "$DIR/$n/target.png" | awk '/pixel/{printf "%s ", $2}')" \
    "$(stat -f %z "$DIR/$n/video.mp4")"
done
