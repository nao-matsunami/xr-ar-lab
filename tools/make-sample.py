#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/make-sample.py

紙に書かれたもの（墨文字など）の写真・スキャンから、ショーケースと同じ形式の点群を作る。
showcase/print/gen_front.py の粒子サンプリング部分を、入力画像を受け取る汎用版にしたもの。
サンプリングの部品は tools/sampling.py（gen_front.py と共通）。

  1. 紙の四隅を自動検出して射影変換で矩形化する（OpenCV）。
     紙は「明るく彩度の低い領域」として取り、凸包を 4 点に近似する。表装（掛軸の布）や
     机が写っていても、紙より彩度が高いか暗ければ切り離せる。失敗したら --corners で 4 点を渡す。
  2. 墨の濃さ（紙からの暗さ）に比例した密度でポアソンディスク・サンプリングする。
     点の間隔 r = r0 / sqrt(濃さ) なので、面積あたりの点数が濃さに比例する。
     r0 は点数が --count に近づくまで調整する。
  3. 点の明度は、その場所の明るさを紙の明るさで割ったもの（濃い墨 = 小さい = 暗い点、
     にじみ = 1 に近い = 薄い点）。シェーダは uInk * aLum で色を出すので、
     particles.json の ink には紙色を入れておく（ink * l = その場所の色）。

出力:
  <ardir>/particles.json    粒子（mm, 紙の左上原点）。showcase の particles-*.json と同じ形式
  <ardir>/shapes.json       形状循環の目標（--rest-name = 元の文字そのもの、--shape で足したもの）
  <printdir>/target.png     矩形化した画像（長辺 1024px）。画像ターゲットの登録と印刷に使う
  <printdir>/preview.png    確認用（元画像と検出した四隅 / target / 点群）

例（白隠『徳』。表装込みの画像から本紙だけを切り出す。本紙は 520x1060mm として扱う）:

  ~/.venvs/showcase/bin/python tools/make-sample.py samples-ar/sumi/assets/sumi.jpg \\
    --paper-mm 520x1060 --ardir samples-ar/sumi/ar --printdir samples-ar/sumi/print \\
    --rest-name sumi --shape enso=samples-ar/sumi/assets/enso.svg

依存: numpy, Pillow, opencv-python-headless, cairosvg（--shape を使うとき）
"""

import argparse
import io
import json
import math
import os
import sys
import time

import numpy as np
from PIL import Image, ImageDraw

try:
    import cv2
except ImportError:  # pragma: no cover
    sys.exit('OpenCV が必要です:  pip install opencv-python-headless')

from sampling import greedy_assign, poisson_disk, sample_mask

TARGET_LONG_PX = 1024     # target.png の長辺
PREVIEW_H_PX = 1024       # preview.png の各パネルの高さ
SS = 2                    # 点の描画のスーパーサンプリング倍率
MASK_PX_PER_MM = 2.0      # 濃さ・形状マスクの解像度


# --------------------------------------------------------------------------
# 1. 紙の四隅
# --------------------------------------------------------------------------

def order_corners(pts):
    """4 点を 左上・右上・右下・左下 の順にする。"""
    pts = np.asarray(pts, dtype=np.float32).reshape(4, 2)
    s = pts.sum(axis=1)
    d = pts[:, 1] - pts[:, 0]
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)],
                     pts[np.argmax(s)], pts[np.argmax(d)]], dtype=np.float32)


def detect_paper(bgr, sat_max, val_min, inset_px):
    """明るく彩度の低い領域を紙とみなし、その凸包を 4 点に近似する。

    墨は暗いのでマスクから抜けるが、凸包を取るので穴や縁の欠けは埋まる。
    紙の外に紙と同じくらい明るく白いもの（白い壁など）が大きく写っていると混ざるので、
    そのときは --corners で指定する。
    戻り値: (4x2 の角, 紙マスク)。見つからなければ (None, マスク)
    """
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    mask = ((hsv[..., 1] <= sat_max) & (hsv[..., 2] >= val_min)).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=4)
    if n <= 1:
        return None, mask
    # 太い横画が紙の端から端まで届くと、紙は上下の断片に分かれる。
    # 最大の断片の 5% 以上ある断片はまとめて紙とみなす（凸包で一枚に戻る）
    areas = stats[1:, cv2.CC_STAT_AREA]
    keep = 1 + np.nonzero(areas >= 0.05 * areas.max())[0]
    paper = np.isin(labels, keep).astype(np.uint8) * 255
    if int(areas[keep - 1].sum()) < 0.15 * mask.size:
        return None, paper
    pts = cv2.findNonZero(paper)
    hull = cv2.convexHull(pts)
    peri = cv2.arcLength(hull, True)
    quad = None
    for eps in np.linspace(0.005, 0.08, 40):
        approx = cv2.approxPolyDP(hull, eps * peri, True)
        if len(approx) == 4:
            quad = approx.reshape(4, 2).astype(np.float32)
            break
    if quad is None:
        return None, paper
    quad = order_corners(quad)
    if inset_px:
        # 境目の布の色が target に混ざらないよう、重心へ向けて少し内側に寄せる
        c = quad.mean(axis=0)
        v = quad - c
        quad = quad - v / np.linalg.norm(v, axis=1, keepdims=True) * inset_px * math.sqrt(2)
    return quad, paper


def rectify(bgr, quad, out_w, out_h):
    dst = np.array([[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]],
                   dtype=np.float32)
    m = cv2.getPerspectiveTransform(quad.astype(np.float32), dst)
    return cv2.warpPerspective(bgr, m, (out_w, out_h), flags=cv2.INTER_CUBIC,
                               borderMode=cv2.BORDER_REPLICATE)


# --------------------------------------------------------------------------
# 2. 墨の濃さ
# --------------------------------------------------------------------------

def ink_fields(rect_bgr, paper_pct, ink_pct):
    """矩形化した画像 -> (濃さ 0..1, 紙に対する明るさ 0..1, 紙の RGB)。

    紙の明るさは輝度の paper_pct パーセンタイル、墨の底は ink_pct パーセンタイル。
    """
    rgb = cv2.cvtColor(rect_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    luma = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    luma = cv2.GaussianBlur(luma, (0, 0), 1.2)   # JPEG のブロックと紙の繊維を均す
    paper_l = float(np.percentile(luma, paper_pct))
    ink_l = float(np.percentile(luma, ink_pct))
    dark = np.clip((paper_l - luma) / max(paper_l - ink_l, 1.0), 0.0, 1.0)
    rel = np.clip(luma / max(paper_l, 1.0), 0.0, 1.0)
    paper_px = dark < 0.04
    paper_rgb = tuple(int(round(v)) for v in np.median(rgb[paper_px], axis=0))
    return dark, rel, paper_rgb, paper_l, ink_l


# --------------------------------------------------------------------------
# 描画
# --------------------------------------------------------------------------

def draw_points(size_px, px_per_mm, xs, ys, dia, lum, bg_rgb, ink_rgb):
    """点を ink * lum の色で描く（シェーダと同じ色の出し方）。"""
    w, h = size_px
    img = Image.new('RGB', (w * SS, h * SS), bg_rgb)
    d = ImageDraw.Draw(img)
    s = px_per_mm * SS
    ink = np.array(ink_rgb, dtype=float)
    for i in np.argsort(-lum):          # 薄い点から描いて、濃い点を上に重ねる
        rr = dia[i] * 0.5 * s
        cx = xs[i] * s
        cy = ys[i] * s
        col = tuple(int(round(v)) for v in ink * lum[i])
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=col)
    return img.resize((w, h), Image.LANCZOS)


def svg_mask(path, w_px, h_px, fit_w_px, fit_h_px):
    """SVG を (w_px, h_px) の中央に、fit 内に収まるようアスペクトを保って置いた bool マスク。"""
    try:
        import cairosvg
    except ImportError:  # pragma: no cover
        sys.exit('--shape には cairosvg が必要です:  pip install cairosvg')
    import xml.etree.ElementTree as ET
    root = ET.parse(path).getroot()
    vb = [float(v) for v in root.get('viewBox').split()]
    k = min(fit_w_px / vb[2], fit_h_px / vb[3])
    sw, sh = int(round(vb[2] * k)), int(round(vb[3] * k))
    png = cairosvg.svg2png(url=path, output_width=sw, output_height=sh)
    img = Image.open(io.BytesIO(png)).convert('RGBA')
    canvas = Image.new('RGBA', (w_px, h_px), (0, 0, 0, 0))
    canvas.paste(img, ((w_px - sw) // 2, (h_px - sh) // 2), img)
    return np.array(canvas)[..., 3] > 127


# --------------------------------------------------------------------------
# 本体
# --------------------------------------------------------------------------

def parse_size(s):
    w, h = s.lower().split('x')
    return float(w), float(h)


def parse_corners(s):
    v = [float(x) for x in s.replace(' ', '').split(',')]
    if len(v) != 8:
        raise argparse.ArgumentTypeError('--corners は x,y を 4 組（8 個の数）')
    return order_corners(np.array(v).reshape(4, 2))


def main():
    ap = argparse.ArgumentParser(description='紙に書かれたものの画像から点群を作る')
    ap.add_argument('image')
    ap.add_argument('--paper-mm', type=parse_size, default=(242.0, 333.0),
                    help='紙の実寸 WxH (mm)。既定は半紙 242x333')
    ap.add_argument('--ardir', required=True, help='particles.json / shapes.json の出力先')
    ap.add_argument('--printdir', required=True, help='target.png / preview.png の出力先')
    ap.add_argument('--corners', type=parse_corners, default=None,
                    help='自動検出が外れたときの手動指定: 左上から時計回りに x,y,x,y,x,y,x,y（元画像の px）')
    ap.add_argument('--sat-max', type=int, default=90, help='紙とみなす彩度の上限 (0..255)')
    ap.add_argument('--val-min', type=int, default=165, help='紙とみなす明度の下限 (0..255)')
    ap.add_argument('--inset-px', type=float, default=2.0, help='検出した四隅を内側へ寄せる量 (元画像の px)')
    ap.add_argument('--count', type=int, default=16000, help='目標の点数（12000〜20000 に収める）')
    ap.add_argument('--min-dark', type=float, default=0.16,
                    help='これより薄いところには点を置かない（紙の地合い・染み）')
    ap.add_argument('--rest-name', default='ink', help='元の形（印刷どおり）の形状名')
    ap.add_argument('--shape', action='append', default=[],
                    help='形状循環に足す形 name=path.svg（紙幅の 84%% に収めて中央に置く）')
    ap.add_argument('--seed', type=int, default=20261015)
    args = ap.parse_args()

    t0 = time.time()
    rng = np.random.default_rng(args.seed)
    W, H = args.paper_mm
    os.makedirs(args.ardir, exist_ok=True)
    os.makedirs(args.printdir, exist_ok=True)

    bgr = cv2.imread(args.image, cv2.IMREAD_COLOR)
    if bgr is None:
        sys.exit(f'{args.image} を読めない')
    print(f'{args.image}: {bgr.shape[1]}x{bgr.shape[0]}px')

    if args.corners is not None:
        quad = args.corners
        print('  四隅: 手動指定')
    else:
        quad, _ = detect_paper(bgr, args.sat_max, args.val_min, args.inset_px)
        if quad is None:
            sys.exit('紙の四隅を検出できなかった。--corners x,y,x,y,x,y,x,y で指定する'
                     '（--sat-max / --val-min を変えると拾える場合もある）')
        print('  四隅: 自動検出')
    print('  ' + '  '.join(f'({x:.1f},{y:.1f})' for x, y in quad) + '  [左上 右上 右下 左下]')
    top = np.linalg.norm(quad[1] - quad[0])
    left = np.linalg.norm(quad[3] - quad[0])
    print(f'  検出した紙の縦横比 {left / top:.3f} / 指定寸法の縦横比 {H / W:.3f}')

    # --- target.png（長辺 1024px）----------------------------------------
    k = TARGET_LONG_PX / max(W, H)
    tgt_w, tgt_h = int(round(W * k)), int(round(H * k))
    target = rectify(bgr, quad, tgt_w, tgt_h)
    cv2.imwrite(os.path.join(args.printdir, 'target.png'), target)

    # --- 濃さの場（mm 格子）----------------------------------------------
    mw, mh = int(round(W * MASK_PX_PER_MM)), int(round(H * MASK_PX_PER_MM))
    work = rectify(bgr, quad, mw, mh)
    dark, rel, paper_rgb, paper_l, ink_l = ink_fields(work, 90, 0.5)
    print(f'  紙の輝度 {paper_l:.0f} / 墨の底 {ink_l:.0f} / 紙色 #%02x%02x%02x' % paper_rgb)
    print(f'  墨の面積 {float((dark >= args.min_dark).mean()) * 100:.1f}%（濃さ {args.min_dark} 以上）')

    def lookup(field, xs, ys):
        ix = np.clip((xs * MASK_PX_PER_MM).astype(np.int32), 0, mw - 1)
        iy = np.clip((ys * MASK_PX_PER_MM).astype(np.int32), 0, mh - 1)
        return field[iy, ix]

    def sample(r0):
        dmin = args.min_dark

        def radius_fn(xs, ys):
            return r0 / np.sqrt(np.maximum(lookup(dark, xs, ys), dmin))

        def accept(x, y):
            return lookup(dark, np.array([x]), np.array([y]))[0] >= dmin

        return poisson_disk(W, H, radius_fn, r0, r0 / math.sqrt(dmin), rng, k=12,
                            accept_fn=accept)

    # 点数は r0 の 2 乗に反比例する。目標の ±6% に入るまで r0 を合わせる
    ink_area = float((dark >= args.min_dark).sum()) / (MASK_PX_PER_MM ** 2)
    r0 = math.sqrt(0.75 * ink_area * float(dark[dark >= args.min_dark].mean()) / args.count)
    for it in range(8):
        pts = sample(r0)
        print(f'  poisson r0={r0:.3f}mm -> {len(pts)} 点 ({time.time() - t0:.1f}s)')
        if abs(len(pts) - args.count) <= 0.06 * args.count:
            break
        r0 *= math.sqrt(len(pts) / args.count)
    n = len(pts)
    if not 12000 <= n <= 20000:
        print(f'  注意: 点数 {n} が 12000〜20000 の外')

    xs, ys = pts[:, 0], pts[:, 1]
    dk = lookup(dark, xs, ys)
    spacing = r0 / np.sqrt(np.maximum(dk, args.min_dark))
    # 直径は局所の間隔に合わせる（濃い所は点が重なってベタに見え、薄い所は粒が立つ）
    dia = np.clip(spacing * rng.normal(1.25, 0.12, n), r0 * 0.8, r0 * 2.6)
    lum = np.clip(lookup(rel, xs, ys), 0.04, 1.0)

    order = rng.permutation(n)        # 先頭 K 点だけ使っても全面に散るように
    xs, ys, dia, lum, dk = xs[order], ys[order], dia[order], lum[order], dk[order]

    paper_hex = '#%02x%02x%02x' % paper_rgb
    particles = {
        'card': {'widthMm': W, 'heightMm': H},
        'origin': 'top-left',
        'units': 'mm',
        'variant': args.rest_name,
        'seed': args.seed,
        'source': os.path.basename(args.image),
        'corners': [[round(float(x), 1), round(float(y), 1)] for x, y in quad],
        'count': int(n),
        # 板の色。AR では白い紙として見せる
        'paper': '#f4f1ea',
        # 点の色 = ink * l。l は紙に対する明るさなので、ink は元画像の紙色
        'ink': paper_hex,
        'x': [round(float(v), 2) for v in xs],
        'y': [round(float(v), 2) for v in ys],
        'd': [round(float(v), 2) for v in dia],
        'l': [round(float(v), 3) for v in lum],
    }
    with open(os.path.join(args.ardir, 'particles.json'), 'w') as f:
        json.dump(particles, f, separators=(',', ':'))

    # --- shapes.json -------------------------------------------------------
    xy = np.stack([xs, ys], axis=1)
    shapes = {'shapes': {}, 'variant': args.rest_name, 'count': int(n)}
    # 元の形: 位置は印刷どおり。上から順に戻る（書いた順に近い）
    rest_delay = np.clip(0.75 * ys / H + rng.uniform(0, 0.25, n), 0, 1)
    shapes['shapes'][args.rest_name] = {
        'x': particles['x'], 'y': particles['y'],
        'delay': [round(float(v), 3) for v in rest_delay],
    }
    for spec in args.shape:
        name, path = spec.split('=', 1)
        mask = svg_mask(path, mw, mh, mw * 0.84, mh * 0.84)
        sp = sample_mask(mask, W, H, n, rng)
        # 円相は一筆で描く: 描き始め（SVG の data-start-deg）から筆の進む向きに順に集まる
        import xml.etree.ElementTree as ET
        sroot = ET.parse(path).getroot()
        start = sroot.get('data-start-deg')
        if start is not None:
            cw = sroot.get('data-direction', 'ccw') == 'cw'
            ang = np.degrees(np.arctan2(-(sp[:, 1] - H / 2), sp[:, 0] - W / 2))
            prog = ((float(start) - ang) if cw else (ang - float(start))) % 360.0 / 360.0
            delay = np.clip(prog * 0.9 + rng.uniform(0, 0.1, n), 0, 1)
        else:
            delay = rng.uniform(0, 1, n)
        idx = greedy_assign(xy, sp, W, H, cell_mm=max(W, H) / 80)
        shapes['shapes'][name] = {
            'x': [round(float(v), 2) for v in sp[idx, 0]],
            'y': [round(float(v), 2) for v in sp[idx, 1]],
            'delay': [round(float(v), 3) for v in delay[idx]],
        }
        print(f'  shape {name}: {n} 点 ({time.time() - t0:.1f}s)')
    with open(os.path.join(args.ardir, 'shapes.json'), 'w') as f:
        json.dump(shapes, f, separators=(',', ':'))

    # --- preview.png ---------------------------------------------------------
    ph = PREVIEW_H_PX
    src = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    src_img = Image.fromarray(src)
    sk = ph / src_img.height
    src_img = src_img.resize((int(round(src_img.width * sk)), ph), Image.LANCZOS)
    dq = ImageDraw.Draw(src_img)
    q = [(float(x) * sk, float(y) * sk) for x, y in quad]
    dq.line(q + [q[0]], fill=(255, 40, 40), width=3)
    for x, y in q:
        dq.ellipse([x - 6, y - 6, x + 6, y + 6], outline=(255, 40, 40), width=3)
    pk = ph / H
    pw = int(round(W * pk))
    tgt_img = Image.fromarray(cv2.cvtColor(target, cv2.COLOR_BGR2RGB)).resize((pw, ph), Image.LANCZOS)
    pts_img = draw_points((pw, ph), pk, xs, ys, dia, lum,
                          tuple(int(particles['paper'][i:i + 2], 16) for i in (1, 3, 5)), paper_rgb)
    panels = [src_img, tgt_img, pts_img]
    for name in [s.split('=', 1)[0] for s in args.shape]:
        s = shapes['shapes'][name]
        panels.append(draw_points((pw, ph), pk, np.array(s['x']), np.array(s['y']), dia, lum,
                                  tuple(int(particles['paper'][i:i + 2], 16) for i in (1, 3, 5)),
                                  paper_rgb))
    gap = 16
    prev = Image.new('RGB', (sum(p.width for p in panels) + gap * (len(panels) + 1), ph + 2 * gap),
                     (255, 255, 255))
    x = gap
    for p in panels:
        prev.paste(p, (x, gap))
        x += p.width + gap
    prev.save(os.path.join(args.printdir, 'preview.png'))

    print(f'粒子 {n} 点 / 濃さ 0.5 以上 {int((dk >= 0.5).sum())} 点 / '
          f'明度 {lum.min():.2f}〜{lum.max():.2f} / 直径 {dia.min():.1f}〜{dia.max():.1f}mm')
    print(f'target.png {tgt_w}x{tgt_h}px / 完了 {time.time() - t0:.1f}s')


if __name__ == '__main__':
    main()
