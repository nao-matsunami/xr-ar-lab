#!/bin/bash
# vendor/ ディレクトリのセットアップスクリプト
# vendor/ は .gitignore されているため、clone 後に手動で実行する必要がある
#
# 使い方:
#   cd ~/xr-ar-lab
#   ./tools/setup-vendor.sh

set -e

VENDOR_DIR="$(cd "$(dirname "$0")/.." && pwd)/vendor"
mkdir -p "$VENDOR_DIR"

echo "===== vendor/ セットアップ開始 ====="

# 1. 8th Wall Web SDK (examples + xrextras)
if [ ! -d "$VENDOR_DIR/web" ]; then
  echo "[1/3] 8th Wall Web SDK をクローン中..."
  git clone https://github.com/nicolo-ribaudo/nicolo-nicolo.git /tmp/8thwall-web-tmp 2>/dev/null || \
  git clone https://github.com/nicolo-ribaudo/nicolo-nicolo.git /tmp/8thwall-web-tmp
  # 注意: 上記URLはプレースホルダー。実際のリポジトリURLに変更してください。
  # 正しくは: git clone <8th-wall-web-repo-url> "$VENDOR_DIR/web"
  echo "  ⚠️  8th Wall Web SDK のリポジトリURLを確認し、手動でクローンしてください:"
  echo "     git clone <URL> $VENDOR_DIR/web"
else
  echo "[1/3] web/ — 既にセットアップ済み"
fi

# 2. 8th Wall Engine (standalone binary)
if [ ! -d "$VENDOR_DIR/engine" ]; then
  echo "[2/3] 8th Wall Engine をセットアップ中..."
  echo "  ⚠️  エンジンバイナリを手動で配置してください:"
  echo "     mkdir -p $VENDOR_DIR/engine/xr-standalone/"
  echo "     # xr.js をダウンロードして配置"
  echo "     cp /path/to/xr.js $VENDOR_DIR/engine/xr-standalone/xr.js"
else
  echo "[2/3] engine/ — 既にセットアップ済み"
fi

# 3. 8th Wall CLI tools
if [ ! -d "$VENDOR_DIR/8thwall" ]; then
  echo "[3/3] 8th Wall CLI tools をセットアップ中..."
  echo "  ⚠️  CLI ツールを手動で配置してください:"
  echo "     git clone <8thwall-apps-repo-url> $VENDOR_DIR/8thwall"
else
  echo "[3/3] 8thwall/ — 既にセットアップ済み"
fi

echo ""
echo "===== セットアップ完了 ====="
echo "vendor/ の状態:"
ls -la "$VENDOR_DIR/" 2>/dev/null
echo ""
echo "各ディレクトリのサイズ:"
du -sh "$VENDOR_DIR"/*/ 2>/dev/null || echo "  (ディレクトリなし)"
