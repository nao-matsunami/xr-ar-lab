#!/bin/bash
# tools/sync-flow-ar-vendor.sh
#
# demos/flow-ar/vendor/ に、flow-ar のページが実際に読む同梱ファイルを実ファイルでコピーする。
# flow-ar は demos/flow-ar/ だけを antymark.com/demo/flow-ar/ へミラーするので、
# リポジトリ直下の lib/ や engine/ を ../../../ で参照すると階層が変わって壊れる。そこで
# demos/flow-ar の中で完結する ./vendor/ 参照に揃えてある（GitHub Pages でも同じ構成で動く。symlink は使わない）。
#
# 元ファイル（engine/mit/、lib/vendor/、shared/attribution.js）を更新したらこれを流してコミットする。
#
# 入れるのは、ヘッドレス Chrome で実測したリクエストに出たものだけ（2026-10-26）:
#   engine/mit/xr.js, xr-tracking.js（data-preload-chunks="slam" で読む）。WASM は xr.js に埋め込み
#   lib/vendor/three/three.module.min.js, three.core.min.js（module が core を import する）
#   lib/vendor/web/xrextras/xrextras.js
#   shared/attribution.js
# engine/mit/resources/（顔・セマンティクスのモデル、録画用 worker、draco）は画像ターゲットでは読まれないので入れない。
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
V="$ROOT/demos/flow-ar/vendor"

rm -rf "$V"
mkdir -p "$V/engine" "$V/three" "$V/xrextras"
cp "$ROOT"/engine/mit/{xr.js,xr-tracking.js,LICENSE,README.md} "$V/engine/"
cp "$ROOT"/lib/vendor/three/{three.module.min.js,three.core.min.js,LICENSE} "$V/three/"
cp "$ROOT"/lib/vendor/web/xrextras/{xrextras.js,LICENSE} "$V/xrextras/"
cp "$ROOT/shared/attribution.js" "$V/attribution.js"

cat > "$V/README.md" <<'EOF'
# demos/flow-ar/vendor

リポジトリ同梱ファイルのコピー（実ファイル）。直接編集しない。元ファイルを直して
`tools/sync-flow-ar-vendor.sh` を流す。

| ここ | 元 | ライセンス |
|---|---|---|
| `engine/xr.js`, `engine/xr-tracking.js` | `engine/mit/` | MIT（`engine/LICENSE`） |
| `three/three.module.min.js`, `three/three.core.min.js` | `lib/vendor/three/` | MIT（`three/LICENSE`） |
| `xrextras/xrextras.js` | `lib/vendor/web/xrextras/` | MIT（`xrextras/LICENSE`） |
| `attribution.js` | `shared/attribution.js` | — |
EOF

find "$V" -type f | sort | sed "s|$ROOT/||"
du -sh "$V"
