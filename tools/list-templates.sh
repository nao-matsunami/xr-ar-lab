#!/bin/bash
# 利用可能なテンプレート一覧を表示
#
# 使い方: ./tools/list-templates.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATES_DIR="$(cd "$SCRIPT_DIR/../templates" && pwd)"

echo ""
echo "========================================="
echo "  利用可能なテンプレート"
echo "========================================="
echo ""

count=0
for dir in "$TEMPLATES_DIR"/*/; do
  name=$(basename "$dir")
  [ -f "$dir/index.html" ] || continue

  # README.md の概要行を取得
  desc=""
  if [ -f "$dir/README.md" ]; then
    desc=$(grep -m1 "^## 概要" -A1 "$dir/README.md" 2>/dev/null | tail -1 | sed 's/^[ \t]*//')
  fi

  # チャンク情報を取得
  chunk=$(grep -o 'data-preload-chunks="[^"]*"' "$dir/index.html" 2>/dev/null | head -1 | sed 's/data-preload-chunks="//;s/"//')
  [ -z "$chunk" ] && chunk="core"

  # README有無
  has_readme="README"
  [ ! -f "$dir/README.md" ] && has_readme="      "

  printf "  %-24s [%s] %s\n" "$name" "$chunk" "$has_readme"
  [ -n "$desc" ] && echo "    $desc"
  echo ""
  count=$((count + 1))
done

echo "-----------------------------------------"
echo "  合計: ${count} テンプレート"
echo ""
echo "新規プロジェクト作成:"
echo "  ./tools/new-project.sh <テンプレート名> <プロジェクト名>"
echo ""
