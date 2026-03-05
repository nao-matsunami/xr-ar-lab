#!/bin/bash
# 案件プロジェクトを削除
#
# 使い方: ./tools/clean-project.sh <プロジェクト名>
#
# 確認プロンプト付きで安全に削除します。

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECTS_DIR="$(cd "$SCRIPT_DIR/../projects" && pwd)"

# --- 引数チェック ---
if [ $# -lt 1 ]; then
  echo ""
  echo "使い方: $0 <プロジェクト名>"
  echo ""
  echo "既存プロジェクト:"
  for dir in "$PROJECTS_DIR"/*/; do
    [ -d "$dir" ] && [ -f "$dir/index.html" ] && echo "  $(basename "$dir")"
  done
  exit 1
fi

PROJECT_NAME="$1"
PROJECT_DIR="$PROJECTS_DIR/$PROJECT_NAME"

# --- 存在確認 ---
if [ ! -d "$PROJECT_DIR" ]; then
  echo "エラー: プロジェクト '$PROJECT_NAME' が見つかりません"
  echo "場所: $PROJECT_DIR"
  exit 1
fi

# --- ファイル情報表示 ---
FILE_COUNT=$(find "$PROJECT_DIR" -type f | wc -l)
DIR_SIZE=$(du -sh "$PROJECT_DIR" | cut -f1)

echo ""
echo "========================================="
echo "  プロジェクト削除"
echo "========================================="
echo "  プロジェクト : $PROJECT_NAME"
echo "  場所         : $PROJECT_DIR"
echo "  ファイル数   : $FILE_COUNT"
echo "  サイズ       : $DIR_SIZE"
echo "========================================="
echo ""

# --- 確認プロンプト ---
read -p "本当に削除しますか? (y/N): " confirm
case "$confirm" in
  [yY]|[yY][eE][sS])
    rm -rf "$PROJECT_DIR"
    echo ""
    echo "✓ プロジェクト '$PROJECT_NAME' を削除しました"
    echo ""
    ;;
  *)
    echo ""
    echo "キャンセルしました"
    echo ""
    ;;
esac
