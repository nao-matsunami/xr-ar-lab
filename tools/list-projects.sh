#!/bin/bash
# 作成済み案件プロジェクト一覧を表示
#
# 使い方: ./tools/list-projects.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECTS_DIR="$(cd "$SCRIPT_DIR/../projects" && pwd)"

echo ""
echo "========================================="
echo "  案件プロジェクト一覧"
echo "========================================="
echo ""

count=0
for dir in "$PROJECTS_DIR"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  [ -f "$dir/index.html" ] || continue

  # ファイル数
  file_count=$(find "$dir" -type f | wc -l)

  # 元テンプレートの推定（README.mdの内容から）
  template="不明"
  if [ -f "$dir/README.md" ]; then
    # チャンク情報からテンプレートタイプを推定
    if grep -q "Face Effects" "$dir/README.md" 2>/dev/null; then
      template="face-effects-demo"
    elif grep -q "Image Target" "$dir/README.md" 2>/dev/null; then
      template="image-target-demo"
    elif grep -q "Sky Effects" "$dir/README.md" 2>/dev/null; then
      template="sky-effects-demo"
    elif grep -q "World SLAM" "$dir/README.md" 2>/dev/null; then
      template="world-slam-demo"
    fi
  fi

  # 最終更新日
  last_modified=$(stat -c %y "$dir/index.html" 2>/dev/null | cut -d' ' -f1)

  printf "  %-24s 元: %-22s ファイル: %3d  更新: %s\n" "$name" "$template" "$file_count" "$last_modified"
  count=$((count + 1))
done

if [ $count -eq 0 ]; then
  echo "  (プロジェクトはまだありません)"
  echo ""
  echo "新規作成:"
  echo "  ./tools/new-project.sh <テンプレート名> <プロジェクト名>"
fi

echo ""
echo "-----------------------------------------"
echo "  合計: ${count} プロジェクト"
echo ""
