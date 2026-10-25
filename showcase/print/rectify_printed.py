#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
showcase/print/rectify_printed.py

印刷した名刺を撮った写真（front-printed.jpg）を 4 隅検出で矩形化し、
画像ターゲット antymark-card-printed 用の PNG を出す。

  入力: showcase/print/front-printed.jpg   白い紙の上に名刺を置いて真上付近から撮ったもの
  出力: showcase/print/front-target-printed.png   1024x663（front-target-<variant>.png と同寸）

手元の印刷物は 85x55 の全面ではなく、右側が 14% ほど切れていた（外形の縦横比 1.33、
右上の斜め落としがほぼ無い）。85:55 に引き伸ばすと設計とずれるので、写真の 4 隅の
縦横比のまま矩形化し、設計のターゲット画像と相関を取って縮尺と位置を決め、
カード座標（85x55mm = 1024x663px）に貼り直す。こうすると AR 側の点群
（particles-<variant>.json, mm・カード左上原点）がそのまま重なる。

手順:
  1. グレースケールをぼかして粒子を潰し、大津の二値化で「暗い名刺 / 白い背景」に分ける。
  2. 行ごと・列ごとに外側から最初に名刺に入る位置を拾い、上下左右の 4 辺に直線を当てる。
     右上・左下は斜め落とし（card-front.svg）なので、残差の大きい点を落としながら
     当て直して直線部分だけを使う。
  3. 4 直線の交点＝印刷外形の矩形の 4 隅（斜め落としの角は延長上の仮想の角）から
     ホモグラフィを求め、4 辺の長さから出した縦横比で切り出す。
  4. sparse/normal/dense の front-target-<variant>.png と、縮尺を振りながら FFT で
     相互相関を取り、最も合う variant・縮尺・位置を選ぶ。
  5. 紙色のカンバスに貼る。印刷で切れていた部分は紙色のまま（特徴点なし）。
  6. 斜め落とし・角丸の外側（写真では白い背景）は紙色で塗る。生成ターゲットと同じ扱いで、
     背景の柄を特徴点として登録しないため。印刷物の斜め落としは card-front.svg と寸法が
     ずれていたので、SVG ではなく写真の二値化結果から外側を決める。

依存: Pillow, numpy
"""

import argparse
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))

CARD_W_MM = 85.0
CARD_H_MM = 55.0
TARGET_PX_W = 1024
TARGET_PX_H = int(round(TARGET_PX_W * CARD_H_MM / CARD_W_MM))   # 663
PAPER_RGB = (35, 31, 32)   # #231f20

# 背景を塗りつぶしてよい範囲: 4 隅の直角三角形（脚の長さは幅・高さに対する比）。
# 斜め落としのある右上・左下は大きく、角丸だけの左上・右下は小さく取る。
# 左上を広げるとロゴの "a" が背景扱いで消える。
# 比は矩形化した印刷外形に対するもの。
CORNER_LEG = {'TL': (0.04, 0.06), 'TR': (0.30, 0.40), 'BR': (0.04, 0.06), 'BL': (0.30, 0.40)}


def otsu(gray):
    hist = np.bincount(gray.ravel(), minlength=256).astype(float)
    p = hist / hist.sum()
    omega = np.cumsum(p)
    mu = np.cumsum(p * np.arange(256))
    with np.errstate(divide='ignore', invalid='ignore'):
        sb = (mu[-1] * omega - mu) ** 2 / (omega * (1 - omega))
    return int(np.nanargmax(sb))


def first_true(mask, axis, reverse):
    """各行（axis=1）/列（axis=0）で外側から最初に True になる位置。無ければ -1。"""
    m = mask if not reverse else np.flip(mask, axis=axis)
    idx = np.argmax(m, axis=axis)
    has = m.any(axis=axis)
    n = mask.shape[axis]
    if reverse:
        idx = n - 1 - idx
    return np.where(has, idx, -1)


def fit_line(t, s, iters=8):
    """s = a*t + b を、残差の大きい点（斜め落とし・角丸）を落としながら当てる。"""
    keep = np.ones(len(t), bool)
    for _ in range(iters):
        a, b = np.polyfit(t[keep], s[keep], 1)
        r = np.abs(s - (a * t + b))
        thr = max(2.0, 3.0 * np.median(r[keep]))
        new = r < thr
        if (new == keep).all():
            break
        keep = new
    return a, b, keep.sum()


def homography(src, dst):
    """src[i] -> dst[i] の 3x3 ホモグラフィ（4 点 DLT）。"""
    A = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y, -u])
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y, -v])
    _, _, vt = np.linalg.svd(np.array(A, float))
    H = vt[-1].reshape(3, 3)
    return H / H[2, 2]


def detect_corners(img, work_w=1600):
    """名刺外形の 4 隅（TL, TR, BR, BL）を元画像の座標で返す。"""
    k = img.width / work_w
    small = img.convert('L').resize((work_w, int(round(img.height / k))), Image.LANCZOS)
    small = small.filter(ImageFilter.BoxBlur(4))
    g = np.asarray(small)
    th = otsu(g)
    card = g < th
    h, w = card.shape
    ys, xs = np.arange(h), np.arange(w)

    left = first_true(card, 1, False)
    right = first_true(card, 1, True)
    top = first_true(card, 0, False)
    bottom = first_true(card, 0, True)

    def side(t, s):
        ok = s >= 0
        # 端の数 % は角丸・斜め落としの影響が大きいので最初から外す
        t, s = t[ok], s[ok].astype(float)
        lo, hi = np.percentile(t, [5, 95])
        sel = (t > lo) & (t < hi)
        return fit_line(t[sel].astype(float), s[sel])

    # 左右: x = a*y + b、上下: y = a*x + b
    L, R, T, B = side(ys, left), side(ys, right), side(xs, top), side(xs, bottom)

    def cross(vert, horz):
        # x = av*y + bv, y = ah*x + bh
        av, bv, _ = vert
        ah, bh, _ = horz
        y = (ah * bv + bh) / (1 - ah * av)
        x = av * y + bv
        return (x * k, y * k)

    corners = [cross(L, T), cross(R, T), cross(R, B), cross(L, B)]
    return corners, small, th, (L[2], R[2], T[2], B[2])


VARIANTS = ['sparse', 'normal', 'dense']


def warp(img, corners, size, resample=Image.BICUBIC, **kw):
    w, h = size
    # PIL の PERSPECTIVE は出力 -> 入力の係数を取る
    Hm = homography([(0, 0), (w, 0), (w, h), (0, h)], corners)
    return img.transform(size, Image.PERSPECTIVE, tuple((Hm.ravel() / Hm[2, 2])[:8]),
                         resample, **kw)


def _prep(im):
    return np.asarray(im.convert('L').filter(ImageFilter.GaussianBlur(1.2)), float)


def match(D, M):
    """M の中央部をテンプレートにして D 上の位置を FFT で探す。(相関係数, M 原点の x, y)"""
    my0, my1 = int(M.shape[0] * 0.2), int(M.shape[0] * 0.8)
    mx0, mx1 = int(M.shape[1] * 0.15), int(M.shape[1] * 0.6)
    t = M[my0:my1, mx0:mx1]
    t = (t - t.mean()) / t.std()
    cc = np.fft.irfft2(np.fft.rfft2(D - D.mean()) *
                       np.fft.rfft2(t[::-1, ::-1], s=D.shape), s=D.shape)
    iy, ix = np.unravel_index(np.argmax(cc), cc.shape)
    y, x = iy - t.shape[0] + 1, ix - t.shape[1] + 1
    d = D[y:y + t.shape[0], x:x + t.shape[1]] if y >= 0 and x >= 0 else np.zeros(0)
    if d.shape != t.shape:
        return -1.0, 0, 0
    d = (d - d.mean()) / d.std()
    return float((d * t).mean()), x - mx0, y - my0


def fit_to_design(nat, W, Ht):
    """nat（矩形化した印刷面）を設計のカード座標に置く縮尺・位置と variant を求める。
    縮尺は「設計 px / nat px」。半分の解像度で粗く、原寸で細かく探す。"""
    def search(variant, scales, f):
        D = _prep(Image.open(os.path.join(HERE, f'front-target-{variant}.png'))
                  .resize((int(round(W * f)), int(round(Ht * f))), Image.LANCZOS))
        best = (-1.0, 1.0, 0, 0)
        for s in scales:
            size = (int(round(nat.width * s * f)), int(round(nat.height * s * f)))
            r, x, y = match(D, _prep(nat.resize(size, Image.LANCZOS)))
            if r > best[0]:
                best = (r, s, x / f, y / f)
        return best

    coarse = {v: search(v, np.arange(0.70, 1.30, 0.01), 0.5) for v in VARIANTS}
    for v, (r, s, x, y) in coarse.items():
        print(f'  {v:6s} r={r:.3f} scale={s:.2f}')
    variant = max(coarse, key=lambda v: coarse[v][0])
    s0 = coarse[variant][1]
    r, s, x, y = search(variant, np.arange(s0 - 0.015, s0 + 0.0151, 0.0025), 1.0)
    return variant, r, s, int(round(x)), int(round(y))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', default=os.path.join(HERE, 'front-printed.jpg'))
    ap.add_argument('--output', default=os.path.join(HERE, 'front-target-printed.png'))
    ap.add_argument('--keep-chamfer', action='store_true',
                    help='斜め落としの外側を紙色で塗らず写真のまま残す')
    args = ap.parse_args()

    img = ImageOps.exif_transpose(Image.open(args.input)).convert('RGB')
    corners, blurred, th, inliers = detect_corners(img)
    print(f'threshold={th}, edge inliers L/R/T/B={tuple(int(n) for n in inliers)}')
    for name, (x, y) in zip(['TL', 'TR', 'BR', 'BL'], corners):
        print(f'  {name}: ({x:.1f}, {y:.1f})')

    c = np.array(corners)
    aspect = ((np.linalg.norm(c[1] - c[0]) + np.linalg.norm(c[2] - c[3])) /
              (np.linalg.norm(c[3] - c[0]) + np.linalg.norm(c[2] - c[1])))
    W, Ht = TARGET_PX_W, TARGET_PX_H
    nw, nh = int(round(Ht * aspect)), Ht
    print(f'printed outline aspect={aspect:.3f} (card 85:55 = {CARD_W_MM / CARD_H_MM:.3f})')
    nat = warp(img, corners, (nw, nh))

    if not args.keep_chamfer:
        # ぼかした作業画像を同じ射影で引き、しきい値より明るい＝背景。境界のにじみも潰すため膨らませる
        k = img.width / blurred.width
        bg = warp(blurred, [(x / k, y / k) for x, y in corners], (nw, nh),
                  Image.BILINEAR, fillcolor=255)
        bg = bg.point(lambda v: 255 if v >= th else 0).filter(ImageFilter.MaxFilter(9))
        region = Image.new('L', (nw, nh), 0)
        draw = ImageDraw.Draw(region)
        for name, cx, cy, sx, sy in [('TL', 0, 0, 1, 1), ('TR', nw, 0, -1, 1),
                                     ('BR', nw, nh, -1, -1), ('BL', 0, nh, 1, -1)]:
            lx, ly = CORNER_LEG[name][0] * nw, CORNER_LEG[name][1] * nh
            draw.polygon([(cx, cy), (cx + sx * lx, cy), (cx, cy + sy * ly)], fill=255)
        nat.paste(PAPER_RGB, (0, 0), Image.fromarray(np.minimum(np.asarray(bg),
                                                                np.asarray(region))))

    variant, r, s, x, y = fit_to_design(nat, W, Ht)
    pw, ph = int(round(nw * s)), int(round(nh * s))
    print(f'best: variant={variant} r={r:.3f} scale={s:.4f} offset=({x}, {y}) '
          f'-> printed area {pw}x{ph}px = {pw / W * CARD_W_MM:.1f}x{ph / Ht * CARD_H_MM:.1f}mm')

    out = Image.new('RGB', (W, Ht), PAPER_RGB)
    out.paste(nat.resize((pw, ph), Image.LANCZOS), (x, y))
    out.save(args.output)
    print(f'wrote {os.path.relpath(args.output)} ({W}x{Ht}), variant={variant}')


if __name__ == '__main__':
    main()
