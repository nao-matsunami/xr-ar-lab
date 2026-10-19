# demos/flow-ar/print/make_print.py
#
# 3 つのターゲットを A4 横・1 枚に 1 つずつ並べた印刷用 PDF を作る（家庭のプリンタで試す用）。
#   python make_print.py            -> flow-ar-targets.pdf（このディレクトリ）
# 依存: Pillow, qrcode（~/.venvs/flowar に入れて使った）。日本語は macOS のヒラギノ。
#
# 版面: ターゲットは幅 260mm（各ページの data-width-mm と同じ）で上寄せ。
# AR は紙の長辺で縮尺を決めるので、拡大・縮小して刷っても重なりは崩れない（等倍でなくてよい）。
# QR と説明はターゲットの外（下の余白）に置く。ターゲットの中には何も足さない。

import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BASE = 'https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar'
FONT = '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc'

DPI = 300
MM = DPI / 25.4
PAGE = (round(297 * MM), round(210 * MM))   # A4 横
TARGET_W_MM = 260

DEMOS = [
    ('sumi-ryu', '墨文字「龍」（お寺向け）', '墨がにじんで龍になる'),
    ('sakura', '燕と桜（ART シャツ）', '燕と桜の柄が動き出す'),
    ('ramen', 'ラーメン（飲食店チラシ）', 'ラーメンから湯気が立つ'),
]


def page(name, title, desc):
    im = Image.new('RGB', PAGE, 'white')
    d = ImageDraw.Draw(im)
    t = Image.open(os.path.join(ROOT, name, 'target.png')).convert('RGB')
    tw = round(TARGET_W_MM * MM)
    th = round(tw * t.height / t.width)
    t = t.resize((tw, th), Image.LANCZOS)
    x0 = (PAGE[0] - tw) // 2
    y0 = round(12 * MM)
    im.paste(t, (x0, y0))

    url = f'{BASE}/{name}/'
    q = qrcode.QRCode(border=1, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    q.make(fit=True)
    qs = round(34 * MM)
    qi = q.make_image(fill_color='black', back_color='white').convert('RGB').resize((qs, qs), Image.NEAREST)
    yq = PAGE[1] - qs - round(10 * MM)
    im.paste(qi, (x0, yq))

    f1 = ImageFont.truetype(FONT, round(5.2 * MM))
    f2 = ImageFont.truetype(FONT, round(3.4 * MM))
    tx = x0 + qs + round(8 * MM)
    d.text((tx, yq), title, font=f1, fill='black')
    lines = [
        f'{desc}。QR からページを開き、カメラをこの絵に向けてください。',
        '終わると最後のコマで止まります。画面をタップするともう一度再生します（音声なし）。',
        url,
    ]
    for i, s in enumerate(lines):
        d.text((tx, yq + round((9 + i * 6) * MM)), s, font=f2, fill='#333333')
    return im


pages = [page(*x) for x in DEMOS]
out = os.path.join(HERE, 'flow-ar-targets.pdf')
pages[0].save(out, save_all=True, append_images=pages[1:], resolution=DPI)
print(out, os.path.getsize(out))
