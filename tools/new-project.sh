#!/bin/bash
# テンプレートから新規案件プロジェクトを作成
#
# 使い方:
#   ./tools/new-project.sh <テンプレート名> <プロジェクト名>
#
# 例:
#   ./tools/new-project.sh image-target-demo himi-tourism-ar
#   ./tools/new-project.sh face-effects-demo event-photo-booth
#   ./tools/new-project.sh sky-effects-demo himi-sky-installation
#   ./tools/new-project.sh world-slam-demo furniture-preview
#
# 実行後:
#   cd ~/xr-ar-lab
#   ./tools/serve.sh . 8443
#   アクセス: https://<URL>/projects/<プロジェクト名>/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$BASE_DIR/templates"
PROJECTS_DIR="$BASE_DIR/projects"

# --- 引数チェック ---
if [ $# -lt 2 ]; then
  echo ""
  echo "使い方: $0 <テンプレート名> <プロジェクト名>"
  echo ""
  echo "利用可能なテンプレート:"
  for dir in "$TEMPLATES_DIR"/*/; do
    name=$(basename "$dir")
    if [ -f "$dir/index.html" ] && [ -f "$dir/README.md" ]; then
      desc=$(grep -m1 "^## 概要" -A1 "$dir/README.md" 2>/dev/null | tail -1 | sed 's/^[ \t]*//')
      echo "  $name  — $desc"
    fi
  done
  echo ""
  echo "例: $0 world-slam-demo himi-tourism-ar"
  exit 1
fi

TEMPLATE_NAME="$1"
PROJECT_NAME="$2"
TEMPLATE_DIR="$TEMPLATES_DIR/$TEMPLATE_NAME"
PROJECT_DIR="$PROJECTS_DIR/$PROJECT_NAME"

# --- テンプレートの存在確認 ---
if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "エラー: テンプレート '$TEMPLATE_NAME' が見つかりません"
  echo "場所: $TEMPLATE_DIR"
  echo ""
  echo "利用可能なテンプレート:"
  for dir in "$TEMPLATES_DIR"/*/; do
    name=$(basename "$dir")
    [ -f "$dir/index.html" ] && echo "  $name"
  done
  exit 1
fi

if [ ! -f "$TEMPLATE_DIR/index.html" ]; then
  echo "エラー: テンプレート '$TEMPLATE_NAME' に index.html がありません"
  exit 1
fi

# --- プロジェクトの重複チェック ---
if [ -d "$PROJECT_DIR" ]; then
  echo "エラー: プロジェクト '$PROJECT_NAME' は既に存在します"
  echo "場所: $PROJECT_DIR"
  exit 1
fi

# --- コピー ---
echo ""
echo "========================================="
echo "  新規プロジェクト作成"
echo "========================================="
echo "  テンプレート : $TEMPLATE_NAME"
echo "  プロジェクト : $PROJECT_NAME"
echo "========================================="
echo ""

cp -r "$TEMPLATE_DIR" "$PROJECT_DIR"

# --- README.md 内のテンプレート名を置換 ---
if [ -f "$PROJECT_DIR/README.md" ]; then
  sed -i "s/$TEMPLATE_NAME/$PROJECT_NAME/g" "$PROJECT_DIR/README.md"
fi

# --- index.html のタイトルを更新 ---
if [ -f "$PROJECT_DIR/index.html" ]; then
  sed -i "s|<title>.*</title>|<title>$PROJECT_NAME</title>|" "$PROJECT_DIR/index.html"
fi

# --- 完了メッセージ ---
FILE_COUNT=$(find "$PROJECT_DIR" -type f | wc -l)
echo "✓ プロジェクト作成完了!"
echo ""
echo "  場所: $PROJECT_DIR"
echo "  ファイル数: $FILE_COUNT"
echo ""
echo "起動方法:"
echo "  cd $BASE_DIR"
echo "  ./tools/serve.sh . 8443"
echo ""
echo "アクセスURL:"
echo "  https://localhost:8443/projects/$PROJECT_NAME/"
echo ""
