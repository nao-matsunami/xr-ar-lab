#!/bin/bash
# 8th Wall AR プロジェクトのHTTPSサーバー起動
# 使い方: ./tools/serve.sh [プロジェクトディレクトリ] [ポート]
#
# 例:
#   ./tools/serve.sh vendor/web/examples/aframe 8443
#   ./tools/serve.sh templates/image-target 8443
#   ./tools/serve.sh projects/himi-tourism-ar 8443

PROJECT_DIR=${1:-.}
PORT=${2:-8443}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSL_DIR="$SCRIPT_DIR/ssl"

if [ ! -f "$SSL_DIR/cert.pem" ]; then
  echo "ERROR: SSL証明書が見つかりません: $SSL_DIR/cert.pem"
  echo "先に SSL証明書を生成してください"
  exit 1
fi

LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================="
echo "  8th Wall AR Development Server"
echo "========================================="
echo "  Project : $PROJECT_DIR"
echo "  PC      : https://localhost:$PORT"
echo "  Mobile  : https://${LOCAL_IP}:$PORT"
echo "========================================="
echo "  Ctrl+C で停止"
echo ""

http-server "$PROJECT_DIR" \
  -S -C "$SSL_DIR/cert.pem" -K "$SSL_DIR/key.pem" \
  -p "$PORT" \
  --cors
