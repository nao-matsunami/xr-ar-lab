#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
showcase/print/gen_front.py

antymark ショーケース名刺 — 印刷面（表）の生成。

出力（variant ごと）:
  showcase/print/front-print-<variant>.pdf    91x61mm (85x55 + 塗り足し3mm), 350dpi, RGB
  showcase/print/front-target-<variant>.png   85x55mm, 1024px幅（画像ターゲット登録用）
  showcase/print/front-preview-<variant>.png  確認用
  showcase/ar/particles-<variant>.json        粒子の座標/直径/明度（mm, カード左上原点）
  showcase/ar/shapes-<variant>.json           目標形状（logotype / fish / ant）— 粒子index順に並べ済み

variant = normal のものは接尾辞なしの別名（front-print.pdf など）でも書き出す。

設計:
  - 紙色・輪郭（右上/左下の斜め落とし）は showcase/assets/card-front.svg からそのまま拾う。
  - 表面の文字（Visual Projection Unit / 氏名 / 肩書 / antymark.com）は落とす。
  - ロゴタイプはベタ塗りせず、粒子の密度差だけで読ませる。
  - 蟻マークだけ実線でそのまま置く。
  - 粒子はポアソンディスクサンプリング（可変半径）。画像認識のため特徴点を全面に散らす。

依存: Pillow, numpy, cairosvg
"""

import argparse
import io
import json
import math
import os
import re
import sys
import time
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

try:
    import cairosvg
except ImportError:  # pragma: no cover
    sys.exit('cairosvg が必要です:  pip install cairosvg')

# ポアソンディスク・マスク内サンプリング・最近傍割当は tools/sampling.py（make-sample.py と共通）
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), 'tools'))
from sampling import greedy_assign, poisson_disk, sample_mask  # noqa: E402


# --------------------------------------------------------------------------
# 寸法
# --------------------------------------------------------------------------

CARD_W_MM = 85.0
CARD_H_MM = 55.0
BLEED_MM = 3.0
PAGE_W_MM = CARD_W_MM + 2 * BLEED_MM   # 91
PAGE_H_MM = CARD_H_MM + 2 * BLEED_MM   # 61

PRINT_DPI = 350
TARGET_PX_W = 1024        # front-target.png の幅
PREVIEW_PX_W = 1600       # front-preview.png のカード部分の幅
PREVIEW_MARGIN_PX = 48
SS = 2                    # 粒子描画のスーパーサンプリング倍率

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))          # リポジトリ root
ASSETS = os.path.join(ROOT, 'showcase', 'assets')
AR_DIR = os.path.join(ROOT, 'showcase', 'ar')

CARD_FRONT_SVG = os.path.join(ASSETS, 'card-front.svg')
FISH_SVG = os.path.join(ASSETS, 'fish.svg')


# --------------------------------------------------------------------------
# variant 定義
#   r_out : ロゴタイプ外側のポアソン半径 (mm) — 粒子総数をほぼ決める
#   r_in  : ロゴタイプ内側の半径。現行ロゴはステム幅が 0.9mm ほどしかないので、
#           r_out に比例させると sparse で字が崩れる。直接指定する。
# --------------------------------------------------------------------------
# r_in は 3 つとも同じにしてある。preview を見ると、これを variant ごとに
# 変えるとロゴの読みやすさまで variant ごとに変わってしまい、「どの密度が
# 認識に強いか」の比較にならない。ステム幅 0.9mm に 4〜5 列入る 0.20mm が
# 「ベタ塗りにならず、かつ字が繋がる」下限だった。
VARIANTS = {
    'sparse': dict(r_out=0.80, r_in=0.20),
    'normal': dict(r_out=0.55, r_in=0.20),
    'dense':  dict(r_out=0.37, r_in=0.20),
}

# ロゴタイプの周りに一段疎な「隙間」を作ると字面が立つ。
# halo は logo マスクの外側にしか作らないのでステムは削られない。
HALO_MM = 0.45          # 隙間の幅
HALO_R_FACTOR = 2.10    # 隙間の中のポアソン半径 = r_out * これ

# 粒子の直径 (mm) — 仕様 0.15〜0.4mm
# 内側は「細かくて明るい」、外側は「粗くて暗い」。これで密度差が読みに変わる。
# 外側はばらつきを大きく取る。点サイズが一定だと画像が「一様な高周波ノイズ」に
# なってしまい、カメラで縮小されたときに特徴が潰れる。0.15〜0.40 に散らして
# 複数スケールの塊を作ると、繰り返し感も消えて検出にも効く。
# 背景（外側）だけは下限を 0.25mm に上げる。細かすぎる点は印刷で潰れやすく、
# カメラから見ても特徴にならない。ロゴとハローは字面のために従来の 0.15 のまま。
DIA_MIN, DIA_MAX = 0.15, 0.40
DIA_OUT_MIN = 0.25
DIA_OUT_MEAN, DIA_OUT_SD = 0.265, 0.085
DIA_IN_MEAN, DIA_IN_SD = 0.200, 0.035
DIA_HALO_MEAN, DIA_HALO_SD = 0.165, 0.025

# 明度 0..1 （0 = 紙色、1 = 現行ロゴの明るさ #c8c7c7）
LUM_OUT = (0.45, 0.65)
LUM_IN = (0.88, 1.00)
LUM_HALO = (0.16, 0.34)


# --------------------------------------------------------------------------
# SVG の分解
# --------------------------------------------------------------------------

SVG_NS = 'http://www.w3.org/2000/svg'
_NUM_RE = re.compile(r'-?\d+\.?\d*(?:[eE][-+]?\d+)?')


def _iter_paths(elem):
    for child in elem:
        if child.tag.split('}')[-1] == 'path':
            yield child
        yield from _iter_paths(child)


def _path_bbox(d):
    v = [float(x) for x in _NUM_RE.findall(d)]
    xs, ys = v[0::2], v[1::2]
    return min(xs), min(ys), max(xs), max(ys)


def parse_card_front(svg_path):
    """card-front.svg を「紙」「ロゴタイプ」「蟻」「その他（文字）」に分解する。

    現行ファイルはフラット化済みの <path> の集まりで、
      - 紙          : 唯一の暗い塗り
      - インク      : rgb(78.4%,78.0%,78.1%) の 75 パス
    インクを y 帯で分けると、ロゴ行は y=34〜52pt の帯にだけ乗っている。
    その帯の中で fill-rule="evenodd" のパスが蟻、残りがロゴタイプ。
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()
    vb = root.get('viewBox').split()
    view = tuple(float(x) for x in vb)  # (0, 0, w, h) in pt

    paper = None
    ink = []
    for p in _iter_paths(root):
        d = p.get('d')
        if not d or p.get('clip-rule') is not None:
            continue
        fill = p.get('fill', '')
        bb = _path_bbox(d)
        if paper is None and (bb[2] - bb[0]) > view[2] * 0.9:
            paper = (p, fill)
            continue
        ink.append((p, bb, fill))

    if paper is None:
        raise RuntimeError('紙のパスが見つからない')

    # ロゴ行の y 帯を拾う: 表面で最も背の高いインク群
    band = [(p, bb, f) for (p, bb, f) in ink if 33.0 <= bb[1] <= 53.0 and bb[3] <= 53.0]
    if not band:
        raise RuntimeError('ロゴ行が見つからない')

    ant = [p for (p, bb, f) in band if p.get('fill-rule') == 'evenodd']
    logotype = [p for (p, bb, f) in band if p.get('fill-rule') != 'evenodd']
    if len(ant) != 1 or not logotype:
        raise RuntimeError(f'ロゴ行の分解に失敗 (ant={len(ant)}, logotype={len(logotype)})')

    def bbox_of(paths):
        bs = [_path_bbox(p.get('d')) for p in paths]
        return (min(b[0] for b in bs), min(b[1] for b in bs),
                max(b[2] for b in bs), max(b[3] for b in bs))

    return dict(
        view=view,
        paper_path=paper[0],
        paper_fill=paper[1],
        logotype=logotype,
        logotype_bbox=bbox_of(logotype),
        ant=ant,
        ant_bbox=bbox_of(ant),
    )


def _fill_to_rgb(fill):
    m = re.match(r'rgb\(([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)%\)', fill or '')
    if m:
        return tuple(int(round(float(g) * 255.0 / 100.0)) for g in m.groups())
    if (fill or '').startswith('#') and len(fill) == 7:
        return tuple(int(fill[i:i + 2], 16) for i in (1, 3, 5))
    return (255, 255, 255)


def build_svg(view, paths, fill, transform=None):
    """指定パスだけを含む SVG 文字列を組み立てる。"""
    x, y, w, h = view
    body = []
    if transform:
        body.append(f'<g transform="{transform}">')
    for p in paths:
        fr = p.get('fill-rule', 'nonzero')
        body.append(f'<path fill-rule="{fr}" fill="{fill}" d="{p.get("d")}"/>')
    if transform:
        body.append('</g>')
    return (
        f'<svg xmlns="{SVG_NS}" width="{w}" height="{h}" '
        f'viewBox="{x} {y} {w} {h}">' + ''.join(body) + '</svg>'
    )


def rasterize(svg_text, width_px, height_px):
    png = cairosvg.svg2png(bytestring=svg_text.encode('utf-8'),
                           output_width=width_px, output_height=height_px)
    return Image.open(io.BytesIO(png)).convert('RGBA')


def alpha_mask(img):
    return np.array(img)[..., 3] > 127


# --------------------------------------------------------------------------
# 描画
# --------------------------------------------------------------------------

def draw_particles(size_px, px_per_mm, xs, ys, dia, lum, paper_rgb, ink_rgb):
    """粒子を描いた RGB 画像を返す（2x スーパーサンプル）。"""
    w, h = size_px
    img = Image.new('RGB', (w * SS, h * SS), paper_rgb)
    d = ImageDraw.Draw(img)
    s = px_per_mm * SS
    pr = np.array(paper_rgb, dtype=float)
    ir = np.array(ink_rgb, dtype=float)
    for i in range(len(xs)):
        rr = dia[i] * 0.5 * s
        cx = xs[i] * s
        cy = ys[i] * s
        col = tuple(int(round(v)) for v in (pr + (ir - pr) * lum[i]))
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=col)
    return img.resize((w, h), Image.LANCZOS)


# --------------------------------------------------------------------------
# 本体
# --------------------------------------------------------------------------

def gen_variant(card, name, params, seed, outdir, ardir, quiet=False):
    t0 = time.time()
    rng = np.random.default_rng(seed)

    view = card['view']
    pt_w, pt_h = view[2], view[3]
    mm_per_pt = CARD_W_MM / pt_w

    paper_rgb = _fill_to_rgb(card['paper_fill'])
    ink_rgb = _fill_to_rgb(card['ink_fill'])

    # --- マスク解像度（1mm あたり 16px 程度あれば密度場には十分）------------
    mw = int(round(CARD_W_MM * 16))
    mh = int(round(CARD_H_MM * 16))

    card_mask = alpha_mask(rasterize(
        build_svg(view, [card['paper_path']], '#ffffff'), mw, mh))
    logo_mask = alpha_mask(rasterize(
        build_svg(view, card['logotype'], '#ffffff'), mw, mh))
    # 密度場としては少しだけ太らせた方が字面がまとまる
    logo_field = np.array(Image.fromarray((logo_mask * 255).astype(np.uint8))
                          .filter(ImageFilter.MaxFilter(3))) > 127
    # ロゴの周りに一段疎な隙間を作る（これが無いと字が背景に溶ける）
    halo_px = int(round(HALO_MM * 16)) | 1
    halo_grown = np.array(Image.fromarray((logo_field * 255).astype(np.uint8))
                          .filter(ImageFilter.MaxFilter(halo_px * 2 + 1))) > 127
    halo_field = halo_grown & ~logo_field

    r_out = params['r_out']
    r_in = params['r_in']
    r_halo = r_out * HALO_R_FACTOR

    def _fields(xs, ys):
        cx_ = xs - BLEED_MM
        cy_ = ys - BLEED_MM
        ix_ = np.clip((cx_ / CARD_W_MM * mw).astype(np.int32), 0, mw - 1)
        iy_ = np.clip((cy_ / CARD_H_MM * mh).astype(np.int32), 0, mh - 1)
        inside = (cx_ >= 0) & (cx_ < CARD_W_MM) & (cy_ >= 0) & (cy_ < CARD_H_MM)
        return inside & logo_field[iy_, ix_], inside & halo_field[iy_, ix_]

    def radius_fn(xs, ys):
        hot, halo = _fields(xs, ys)
        out = np.full(xs.shape, r_out)
        out[halo] = r_halo
        out[hot] = r_in
        return out

    pts = poisson_disk(PAGE_W_MM, PAGE_H_MM, radius_fn, r_in, r_halo, rng)
    if not quiet:
        print(f'  [{name}] poisson: {len(pts)} 点 ({time.time() - t0:.1f}s)')

    # ページ座標 -> カード座標
    cx = pts[:, 0] - BLEED_MM
    cy = pts[:, 1] - BLEED_MM

    ix = np.clip((cx / CARD_W_MM * mw).astype(np.int32), 0, mw - 1)
    iy = np.clip((cy / CARD_H_MM * mh).astype(np.int32), 0, mh - 1)
    on_card = (cx >= 0) & (cx < CARD_W_MM) & (cy >= 0) & (cy < CARD_H_MM) & card_mask[iy, ix]
    in_logo = on_card & logo_field[iy, ix]
    in_halo = on_card & halo_field[iy, ix]

    # 蟻は実線で置くので、蟻マークの上には粒子を置かない
    ant_mask = alpha_mask(rasterize(
        build_svg(view, card['ant'], '#ffffff'), mw, mh))
    ant_field = np.array(Image.fromarray((ant_mask * 255).astype(np.uint8))
                         .filter(ImageFilter.MaxFilter(5))) > 127
    on_ant = on_card & ant_field[iy, ix]

    n = len(pts)
    dia = rng.normal(DIA_OUT_MEAN, DIA_OUT_SD, n)
    dia = np.where(in_halo, rng.normal(DIA_HALO_MEAN, DIA_HALO_SD, n), dia)
    dia = np.where(in_logo, rng.normal(DIA_IN_MEAN, DIA_IN_SD, n), dia)
    dia_lo = np.where(in_logo | in_halo, DIA_MIN, DIA_OUT_MIN)
    dia = np.clip(dia, dia_lo, DIA_MAX)

    lum = rng.uniform(LUM_OUT[0], LUM_OUT[1], n)
    lum = np.where(in_halo, rng.uniform(LUM_HALO[0], LUM_HALO[1], n), lum)
    lum = np.where(in_logo, rng.uniform(LUM_IN[0], LUM_IN[1], n), lum)

    # --- 印刷用（塗り足し込み 91x61mm）------------------------------------
    ppm_print = PRINT_DPI / 25.4
    page_px = (int(round(PAGE_W_MM * ppm_print)), int(round(PAGE_H_MM * ppm_print)))
    keep_print = ~on_ant
    print_img = draw_particles(page_px, ppm_print,
                               pts[keep_print, 0], pts[keep_print, 1],
                               dia[keep_print], lum[keep_print], paper_rgb, ink_rgb)
    # 蟻を実線で合成
    ant_img = rasterize(build_svg(view, card['ant'], card['ink_fill']),
                        int(round(CARD_W_MM * ppm_print)),
                        int(round(CARD_H_MM * ppm_print)))
    print_img.paste(ant_img, (int(round(BLEED_MM * ppm_print)),
                              int(round(BLEED_MM * ppm_print))), ant_img)

    pdf_path = os.path.join(outdir, f'front-print-{name}.pdf')
    print_img.save(pdf_path, 'PDF', resolution=float(PRINT_DPI))

    # --- 画像ターゲット用（塗り足しなし 85x55mm, 1024px）------------------
    ppm_tgt = TARGET_PX_W / CARD_W_MM
    tgt_px = (TARGET_PX_W, int(round(CARD_H_MM * ppm_tgt)))
    keep_tgt = on_card & ~on_ant
    tgt_img = draw_particles(tgt_px, ppm_tgt, cx[keep_tgt], cy[keep_tgt],
                             dia[keep_tgt], lum[keep_tgt], paper_rgb, ink_rgb)
    ant_t = rasterize(build_svg(view, card['ant'], card['ink_fill']), *tgt_px)
    tgt_img.paste(ant_t, (0, 0), ant_t)
    # 斜め落としの外側はフラットな紙色にしておく（特徴を出さない）
    outline = rasterize(build_svg(view, [card['paper_path']], '#ffffff'), *tgt_px)
    flat = Image.new('RGB', tgt_px, paper_rgb)
    flat.paste(tgt_img, (0, 0), outline)
    flat.save(os.path.join(outdir, f'front-target-{name}.png'))

    # --- 確認用 -----------------------------------------------------------
    ppm_prev = PREVIEW_PX_W / CARD_W_MM
    prev_px = (PREVIEW_PX_W, int(round(CARD_H_MM * ppm_prev)))
    prev_card = draw_particles(prev_px, ppm_prev, cx[keep_tgt], cy[keep_tgt],
                               dia[keep_tgt], lum[keep_tgt], paper_rgb, ink_rgb)
    ant_p = rasterize(build_svg(view, card['ant'], card['ink_fill']), *prev_px)
    prev_card.paste(ant_p, (0, 0), ant_p)
    outline_p = rasterize(build_svg(view, [card['paper_path']], '#ffffff'), *prev_px)
    m = PREVIEW_MARGIN_PX
    prev = Image.new('RGB', (prev_px[0] + 2 * m, prev_px[1] + 2 * m), (255, 255, 255))
    prev.paste(prev_card, (m, m), outline_p)
    prev.save(os.path.join(outdir, f'front-preview-{name}.png'))

    # --- particles.json ---------------------------------------------------
    keep = on_card & ~on_ant
    order = rng.permutation(int(keep.sum()))   # 先頭 K 点だけ使っても全面に散るように
    pxs = cx[keep][order]
    pys = cy[keep][order]
    pdi = dia[keep][order]
    plu = lum[keep][order]

    particles = {
        'card': {'widthMm': CARD_W_MM, 'heightMm': CARD_H_MM},
        'origin': 'top-left',
        'units': 'mm',
        'variant': name,
        'seed': seed,
        'count': int(len(pxs)),
        'paper': '#%02x%02x%02x' % paper_rgb,
        'ink': '#%02x%02x%02x' % ink_rgb,
        'x': [round(float(v), 3) for v in pxs],
        'y': [round(float(v), 3) for v in pys],
        'd': [round(float(v), 3) for v in pdi],
        'l': [round(float(v), 3) for v in plu],
    }
    with open(os.path.join(ardir, f'particles-{name}.json'), 'w') as f:
        json.dump(particles, f, separators=(',', ':'))

    # --- shapes.json ------------------------------------------------------
    shapes = build_shapes(card, np.stack([pxs, pys], axis=1), rng, quiet=quiet)
    shapes['variant'] = name
    shapes['count'] = int(len(pxs))
    with open(os.path.join(ardir, f'shapes-{name}.json'), 'w') as f:
        json.dump(shapes, f, separators=(',', ':'))

    if not quiet:
        print(f'  [{name}] 粒子 {len(pxs)} / ロゴ内 {int((in_logo & keep).sum())} '
              f'/ 完了 {time.time() - t0:.1f}s')
    return dict(name=name, total=int(len(pxs)), in_logo=int((in_logo & keep).sum()),
                page_px=page_px)


# --------------------------------------------------------------------------
# 目標形状
# --------------------------------------------------------------------------

def _shape_mask(svg_text, view, fit_w_mm, fit_h_mm, res=16):
    """SVG を mm 空間のカード上に、指定サイズで中央配置した bool マスクにする。"""
    mw = int(round(CARD_W_MM * res))
    mh = int(round(CARD_H_MM * res))
    img = rasterize(svg_text, int(round(fit_w_mm * res)), int(round(fit_h_mm * res)))
    canvas = Image.new('RGBA', (mw, mh), (0, 0, 0, 0))
    canvas.paste(img, ((mw - img.width) // 2, (mh - img.height) // 2), img)
    return alpha_mask(canvas)


def _crop_svg(paths, bbox, fill):
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    body = ''.join(
        f'<path fill-rule="{p.get("fill-rule", "nonzero")}" fill="{fill}" d="{p.get("d")}"/>'
        for p in paths)
    return (f'<svg xmlns="{SVG_NS}" width="{w}" height="{h}" '
            f'viewBox="{x0} {y0} {w} {h}">{body}</svg>')


def build_shapes(card, particles_xy, rng, quiet=False):
    """logotype / fish / ant の点群を作り、粒子 index 順に並べ替えて返す。"""
    n = len(particles_xy)
    view = card['view']
    out = {'shapes': {}}

    specs = []

    # logotype — 現行のロゴタイプを 70mm 幅で中央に
    lb = card['logotype_bbox']
    specs.append(('logotype', _crop_svg(card['logotype'], lb, '#ffffff'), 70.0, None))

    # fish — 自作のブリのシルエット SVG
    if os.path.exists(FISH_SVG):
        specs.append(('fish', open(FISH_SVG).read(), 70.0, None))

    # ant — 蟻マークを 44mm 幅で
    ab = card['ant_bbox']
    specs.append(('ant', _crop_svg(card['ant'], ab, '#ffffff'), 44.0, 'legs'))

    for name, svg_text, fit_w, special in specs:
        root = ET.fromstring(svg_text)
        sw = float(root.get('width'))
        sh = float(root.get('height'))
        fit_h = fit_w * sh / sw
        if fit_h > 42.0:
            fit_h = 42.0
            fit_w = fit_h * sw / sh

        mask = _shape_mask(svg_text, view, fit_w, fit_h, res=16)
        pts = sample_mask(mask, CARD_W_MM, CARD_H_MM, n, rng)

        delay = rng.uniform(0.0, 1.0, n)
        if special == 'legs':
            # 細い部分（脚・触角）は本体より後から伸ばす
            body = np.array(Image.fromarray((mask * 255).astype(np.uint8))
                            .filter(ImageFilter.MinFilter(9))) > 127
            mh_, mw_ = mask.shape
            jx = np.clip((pts[:, 0] / CARD_W_MM * mw_).astype(np.int32), 0, mw_ - 1)
            jy = np.clip((pts[:, 1] / CARD_H_MM * mh_).astype(np.int32), 0, mh_ - 1)
            is_leg = ~body[jy, jx]
            delay = np.where(is_leg,
                             rng.uniform(0.62, 1.00, n),
                             rng.uniform(0.00, 0.28, n))

        idx = greedy_assign(particles_xy, pts, CARD_W_MM, CARD_H_MM)
        out['shapes'][name] = {
            'x': [round(float(v), 3) for v in pts[idx, 0]],
            'y': [round(float(v), 3) for v in pts[idx, 1]],
            'delay': [round(float(v), 3) for v in delay[idx]],
        }
        if not quiet:
            print(f'    shape {name}: {fit_w:.1f}x{fit_h:.1f}mm, {n} 点')

    return out


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description='antymark 名刺・表面の生成')
    ap.add_argument('--seed', type=int, default=20260923, help='乱数シード（固定）')
    ap.add_argument('--variant', choices=sorted(VARIANTS) + ['all'], default='all')
    ap.add_argument('--outdir', default=HERE)
    ap.add_argument('--ardir', default=AR_DIR)
    ap.add_argument('--quiet', action='store_true')
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    os.makedirs(args.ardir, exist_ok=True)

    card = parse_card_front(CARD_FRONT_SVG)
    # インク色は現行のロゴタイプの塗りをそのまま使う
    card['ink_fill'] = card['logotype'][0].get('fill')
    if not args.quiet:
        print(f'card-front.svg: 紙 {card["paper_fill"]} / インク {card["ink_fill"]}')
        print(f'  logotype bbox(pt) {tuple(round(v, 2) for v in card["logotype_bbox"])}')
        print(f'  ant      bbox(pt) {tuple(round(v, 2) for v in card["ant_bbox"])}')

    names = sorted(VARIANTS) if args.variant == 'all' else [args.variant]
    results = []
    for i, name in enumerate(names):
        results.append(gen_variant(card, name, VARIANTS[name], args.seed + i * 1000,
                                   args.outdir, args.ardir, quiet=args.quiet))

    # normal を接尾辞なしの既定として複製
    if 'normal' in names:
        import shutil
        for src, dst in (
            (os.path.join(args.outdir, 'front-print-normal.pdf'),
             os.path.join(args.outdir, 'front-print.pdf')),
            (os.path.join(args.outdir, 'front-target-normal.png'),
             os.path.join(args.outdir, 'front-target.png')),
            (os.path.join(args.outdir, 'front-preview-normal.png'),
             os.path.join(args.outdir, 'front-preview.png')),
            (os.path.join(args.ardir, 'particles-normal.json'),
             os.path.join(args.ardir, 'particles.json')),
            (os.path.join(args.ardir, 'shapes-normal.json'),
             os.path.join(args.ardir, 'shapes.json')),
        ):
            shutil.copyfile(src, dst)

    if not args.quiet:
        print('\n--- まとめ ---')
        for r in results:
            print(f'{r["name"]:7s} 粒子 {r["total"]:6d}  ロゴ内 {r["in_logo"]:6d}  '
                  f'print {r["page_px"][0]}x{r["page_px"][1]}px @{PRINT_DPI}dpi')


if __name__ == '__main__':
    main()
