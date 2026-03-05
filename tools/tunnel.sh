#!/bin/bash
# ARプロジェクトをcloudflaredトンネルで公開
# 使い方: ./tools/tunnel.sh [ポート]
#
# 先に serve.sh でローカルサーバーを起動してから、
# 別ターミナルでこのスクリプトを実行してください。
#
# 例:
#   ターミナル1: ./tools/serve.sh templates/image-target 8443
#   ターミナル2: ./tools/tunnel.sh 8443

PORT=${1:-8443}

echo ""
echo "========================================="
echo "  cloudflared Tunnel"
echo "========================================="
echo "  ローカル: https://localhost:$PORT"
echo "  ↓ トンネル作成中..."
echo "  公開URLが下に表示されます"
echo "  そのURLをスマホでアクセスしてください"
echo "========================================="
echo "  Ctrl+C で停止"
echo ""

cloudflared tunnel --url https://localhost:$PORT --no-tls-verify
