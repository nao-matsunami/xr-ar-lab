# 円相（一筆の円）の SVG を作る。筆の太さにむら、描き終わりはかすれ。
import math, sys
import numpy as np
cx, cy, R = 500.0, 500.0, 380.0
START, SWEEP = 258.0, 336.0            # 度。y 上向きの数学の角度、時計回りに描く
rng = np.random.default_rng(7)
def center(s):
    th = math.radians(START - SWEEP * s)
    r = R * (1 + 0.018 * math.sin(s * 2 * math.pi * 1.3 + 0.4) + 0.01 * math.sin(s * 17))
    return cx + r * math.cos(th), cy - r * math.sin(th), th
def width(s):
    # 入り: 押し付けて太く、途中で痩せたり膨らんだり、終わりに向けて細る
    w = 70 + 40 * math.exp(-((s - 0.04) / 0.05) ** 2) + 14 * math.sin(s * 2 * math.pi * 2.2 + 1.0) \
        + 8 * math.sin(s * 2 * math.pi * 5.1)
    taper = 1.0 if s < 0.70 else max(0.0, 1 - ((s - 0.70) / 0.30) ** 1.6)
    return max(w * taper, 0.0)
def band(s0, s1, off0, off1, wscale, steps=400):
    left, right = [], []
    for i in range(steps + 1):
        s = s0 + (s1 - s0) * i / steps
        x, y, th = center(s)
        w = width(s) * wscale
        if s0 > 0:  # かすれの筋は先端ほど細く
            w *= (1 - (i / steps) ** 2) * 0.9 + 0.1
        off = off0 + (off1 - off0) * i / steps
        nx, ny = math.cos(th), -math.sin(th)       # 外向きの法線（SVG 座標）
        left.append((x + nx * (off + w / 2), y + ny * (off + w / 2)))
        right.append((x + nx * (off - w / 2), y + ny * (off - w / 2)))
    pts = left + right[::-1]
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z'
paths = []
# 本体（入り〜0.76）。先端は丸く押す
paths.append(band(0.0, 0.76, 0, 0, 1.0))
x0, y0, _ = center(0.0)
paths.append(f'M{x0 + 52:.1f},{y0:.1f} A52,52 0 1,0 {x0 - 52:.1f},{y0:.1f} A52,52 0 1,0 {x0 + 52:.1f},{y0:.1f} Z')
# かすれ: 0.62 から先は筆の毛が割れて数本の筋になる
for off, ws, s1 in [(-30, 0.30, 0.97), (-10, 0.26, 1.0), (10, 0.28, 0.93), (29, 0.20, 0.86)]:
    paths.append(band(0.62, s1, off, off * 0.7, ws, steps=300))
body = '\n'.join(f'  <path d="{d}"/>' for d in paths)
sys.stdout.write(f'''<?xml version="1.0" encoding="UTF-8"?>
<!-- 円相（一筆の円）。tools/make-sample.py の形状循環 enso 用の自作図形。
     data-start-deg / data-direction は描き始めの角度（y 上向き、度）と筆の向き。
     make-sample.py はこの順に点を集める。 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000"
     data-start-deg="{START}" data-direction="cw">
<g fill="#000">
{body}
</g>
</svg>
''')
