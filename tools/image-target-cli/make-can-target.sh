#!/usr/bin/env bash
# Regenerate the CYLINDER image target for templates/print-shop/can-demo.
# Feeds fixed answers to the interactive @8thwall/image-target-cli (no flag mode).
#   label:    templates/print-shop/can-demo/assets/can-label.png (tools/make-can-label.py)
#   geometry: 350ml can, circumference 208mm, label width 208mm (wraps once, arcAngle 360)
#   crop:     CLI default (centered 4:3 landscape region, isRotated)
# Usage: (cd tools/image-target-cli && npm install) && tools/image-target-cli/make-can-target.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEMO="$ROOT/templates/print-shop/can-demo"
printf '%s\n' \
  "$DEMO/assets/can-label.png" \
  cylinder \
  mm \
  208 \
  208 \
  y \
  "$DEMO/image-targets" \
  can-target \
| OVERWRITE_FILES=true node "$ROOT/tools/image-target-cli/node_modules/@8thwall/image-target-cli/src/index.js"
