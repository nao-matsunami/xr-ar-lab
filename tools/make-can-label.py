#!/usr/bin/env python3
"""
Generate the test label for print-shop/can-demo (CYLINDER image target).

Label: 208 x 105 mm, wraps once around a 350ml can (diameter ~66.2mm,
circumference ~208mm). Fictional brand. Dense, non-repeating text and shapes
so the luminance image has plenty of feature points.

Rendered at 12 px/mm (304.8 dpi) so both dimensions are whole pixels and the
PDFs come out at exact physical size.

Outputs (under templates/print-shop/can-demo/assets/):
  can-label.png                 2496x1260, input for image-target-cli
  print/can-label-208x105mm.pdf page = label, no margins
  print/can-label-A4.pdf        A4 landscape, label + crop marks + 50mm scale bar

Usage: python3 tools/make-can-label.py
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFont

PX_PER_MM = 12
DPI = PX_PER_MM * 25.4  # 304.8
W_MM, H_MM = 208, 105
W, H = W_MM * PX_PER_MM, H_MM * PX_PER_MM

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'templates/print-shop/can-demo/assets')

CJK_BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
CJK_MED = '/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc'
SERIF_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'


def font(path, size_mm, index=0):
    return ImageFont.truetype(path, int(size_mm * PX_PER_MM), index=index)


def mm(v):
    return int(round(v * PX_PER_MM))


PALETTE = ['#0b2545', '#13315c', '#e63946', '#f4a261', '#2a9d8f',
           '#264653', '#e9c46a', '#ffffff', '#1d3557', '#8d0801']


def star(cx, cy, r_out, r_in, n, rot):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = rot + math.pi * i / n
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def draw_label():
    rnd = random.Random(20261025)
    img = Image.new('RGB', (W, H), '#f6efe0')
    d = ImageDraw.Draw(img)

    # Background: scattered, non-repeating shapes in varied luminance.
    for _ in range(420):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H)
        s = rnd.uniform(mm(1.5), mm(7))
        c = rnd.choice(PALETTE)
        kind = rnd.random()
        if kind < 0.3:
            d.ellipse([x - s, y - s, x + s, y + s], outline=c, width=max(2, int(s / 6)))
        elif kind < 0.55:
            a = rnd.uniform(0, math.tau)
            d.polygon([(x + s * math.cos(a + k * math.tau / 3), y + s * math.sin(a + k * math.tau / 3))
                       for k in range(3)], fill=c)
        elif kind < 0.75:
            d.polygon(star(x, y, s, s * 0.45, rnd.randint(4, 7), rnd.uniform(0, math.pi)), fill=c)
        else:
            a = rnd.uniform(0, math.pi)
            dx, dy = s * 1.6 * math.cos(a), s * 1.6 * math.sin(a)
            d.line([x - dx, y - dy, x + dx, y + dy], fill=c, width=max(3, int(s / 4)))

    # Mountain silhouette band across the lower third (irregular, non-periodic).
    pts = [(0, H)]
    x = 0
    while x < W:
        pts.append((x, rnd.uniform(mm(68), mm(84))))
        x += rnd.uniform(mm(4), mm(13))
    pts += [(W, mm(76)), (W, H)]
    d.polygon(pts, fill='#13315c')
    for _ in range(140):  # "city lights" on the mountains
        x, y = rnd.uniform(0, W), rnd.uniform(mm(86), mm(101))
        r = rnd.uniform(mm(0.4), mm(1.4))
        d.rectangle([x - r, y - r, x + r, y + r], fill=rnd.choice(['#e9c46a', '#ffffff', '#f4a261']))

    # Central title panel (inside the default 4:3 tracking crop, ~140mm wide centered).
    cx = W // 2
    d.rounded_rectangle([cx - mm(58), mm(10), cx + mm(58), mm(62)], radius=mm(5),
                        fill='#0b2545', outline='#e9c46a', width=mm(1.2))
    d.text((cx, mm(23)), '星風サイダー', font=font(CJK_BOLD, 17), fill='#ffffff', anchor='mm')
    d.text((cx, mm(42)), 'HOSHIKAZE CIDER', font=font(SERIF_BOLD, 9.5), fill='#e9c46a', anchor='mm')
    d.text((cx, mm(54)), 'SPARKLING  ·  YUZU & GINGER  ·  350ml',
           font=font(MONO, 3.6), fill='#ffffff', anchor='mm')

    # Badge (lower left, over the mountains).
    bx, by = mm(26), mm(80)
    d.polygon(star(bx, by, mm(17), mm(13.5), 14, 0.1), fill='#e63946')
    d.ellipse([bx - mm(12), by - mm(12), bx + mm(12), by + mm(12)], outline='#ffffff', width=mm(0.8))
    d.text((bx, by - mm(4)), '限定', font=font(CJK_BOLD, 7), fill='#ffffff', anchor='mm')
    d.text((bx, by + mm(5)), 'LIMITED 2026', font=font(MONO, 2.6), fill='#ffffff', anchor='mm')

    # Slogan under the title panel.
    d.rounded_rectangle([cx - mm(34), mm(64), cx + mm(34), mm(74)], radius=mm(2), fill='#f6efe0',
                        outline='#8d0801', width=mm(0.5))
    d.text((cx, mm(69)), 'しゅわっと、夜空の味。', font=font(CJK_MED, 5.2), fill='#8d0801', anchor='mm')

    # Fizz bubbles (lower right, over the mountains).
    for _ in range(26):
        r = rnd.uniform(mm(0.8), mm(3.5))
        x, y = mm(182) + rnd.uniform(-mm(18), mm(18)), rnd.uniform(mm(70), mm(98))
        d.ellipse([x - r, y - r, x + r, y + r], outline='#ffffff', width=mm(0.5))

    # Left panel: nutrition-style table (fictional values).
    lx = mm(6)
    d.rectangle([lx, mm(8), lx + mm(36), mm(62)], fill='#ffffff', outline='#0b2545', width=mm(0.6))
    d.text((lx + mm(2), mm(10)), '栄養成分表示 (100ml)', font=font(CJK_BOLD, 2.6), fill='#0b2545')
    rows = [('エネルギー', '38kcal'), ('たんぱく質', '0g'), ('脂質', '0g'),
            ('炭水化物', '9.4g'), ('食塩相当量', '0.03g'), ('果汁', '3%')]
    for i, (k, v) in enumerate(rows):
        y = mm(16) + i * mm(6.8)
        d.line([lx + mm(1.5), y - mm(1), lx + mm(34.5), y - mm(1)], fill='#0b2545', width=2)
        d.text((lx + mm(2), y), k, font=font(CJK_MED, 2.6), fill='#0b2545')
        d.text((lx + mm(34), y), v, font=font(MONO, 2.6), fill='#e63946', anchor='ra')

    # Right panel: fictional barcode (random bars, NOT a valid EAN) + small print.
    rx = W - mm(44)
    d.rectangle([rx - mm(1.5), mm(8), rx + mm(39.5), mm(56)], fill='#ffffff')
    x = rx + mm(2)
    while x < rx + mm(36):
        bw = rnd.choice([2, 3, 5, 7])
        if rnd.random() < 0.55:
            d.rectangle([x, mm(10), x + bw, mm(32)], fill='#000000')
        x += bw + rnd.choice([2, 3, 4])
    d.text((rx + mm(19), mm(36)), '4 912345 678904', font=font(MONO, 2.4), fill='#000000', anchor='mm')
    d.text((rx, mm(44)), '原材料名: 果糖ぶどう糖液糖、ゆず果汁、\nしょうが、炭酸 / 架空のテスト用ラベル\n'
                         'FICTIONAL TEST LABEL — NOT FOR SALE', font=font(CJK_MED, 1.95), fill='#0b2545',
           spacing=mm(0.8))

    # Orientation + glue marks at the seam edges.
    d.text((mm(2), mm(2)), 'TOP ↑', font=font(MONO, 2.2), fill='#0b2545')
    for ex in (0, W - 1):
        d.line([ex, 0, ex, mm(4)], fill='#000000', width=3)
        d.line([ex, H - mm(4), ex, H], fill='#000000', width=3)

    return img


def save_pdf(img, path):
    img.save(path, 'PDF', resolution=DPI)


def a4_sheet(label):
    aw, ah = 297 * PX_PER_MM, 210 * PX_PER_MM
    sheet = Image.new('RGB', (aw, ah), '#ffffff')
    ox, oy = (aw - W) // 2, mm(45)
    sheet.paste(label, (ox, oy))
    d = ImageDraw.Draw(sheet)
    # Crop marks (outside the label, 2mm gap, 6mm long).
    g, L = mm(2), mm(6)
    for x in (ox, ox + W):
        d.line([x, oy - g - L, x, oy - g], fill='#000000', width=2)
        d.line([x, oy + H + g, x, oy + H + g + L], fill='#000000', width=2)
    for y in (oy, oy + H):
        d.line([ox - g - L, y, ox - g, y], fill='#000000', width=2)
        d.line([ox + W + g, y, ox + W + g + L, y], fill='#000000', width=2)
    f = font(CJK_MED, 4)
    d.text((ox, mm(14)), 'can-demo テスト用ラベル  208 × 105 mm（350ml缶 1周）', font=f, fill='#000000')
    d.text((ox, mm(22)), '「実際のサイズ / 100%」で印刷してください（「ページに合わせる」は不可）',
           font=font(CJK_MED, 3.2), fill='#e63946')
    # 50mm scale bar to verify print scale.
    sy = oy + H + mm(18)
    d.line([ox, sy, ox + mm(50), sy], fill='#000000', width=4)
    for t in range(0, 51, 10):
        d.line([ox + mm(t), sy - mm(2), ox + mm(t), sy + mm(2)], fill='#000000', width=3)
    d.text((ox + mm(53), sy), '← この線が 50mm なら実寸', font=font(CJK_MED, 3.2), fill='#000000', anchor='lm')
    return sheet


def main():
    os.makedirs(os.path.join(OUT, 'print'), exist_ok=True)
    label = draw_label()
    label.save(os.path.join(OUT, 'can-label.png'), dpi=(DPI, DPI))
    save_pdf(label, os.path.join(OUT, 'print/can-label-208x105mm.pdf'))
    save_pdf(a4_sheet(label), os.path.join(OUT, 'print/can-label-A4.pdf'))
    print('wrote', OUT)


if __name__ == '__main__':
    main()
