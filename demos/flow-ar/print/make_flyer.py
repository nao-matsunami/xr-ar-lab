#!/usr/bin/env python3
# demos/flow-ar/print/make_flyer.py
#
# 営業チラシ（A4 縦・両面）を作る。表は 3 つのサンプルそのものが認識ターゲット、裏は商品説明と価格。
#
#   python make_flyer.py --mode single --base https://antymark.com/demo/flow-ar --out flyer.pdf
#   python make_flyer.py --mode each   --base https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar
#   python make_flyer.py                 （--base の既定は ../config.json の base、出力は flow-ar-flyer.pdf）
#
# --mode single : QR は 1 つ（<base>/ の「3 本まとめページ」を開き、どの絵にかざしても動く）
# --mode each   : サンプルごとに QR（<base>/<name>/ の個別ページ）。まとめページができるまでの暫定
# --targets DIR : 各サンプルの target.png がある親フォルダ（既定: このファイルの 1 つ上 = demos/flow-ar）
#
# 依存: reportlab, qrcode, Pillow。フォントは TrueType の日本語フォント（--font / --font-bold）。
# reportlab は CFF アウトライン（Noto CJK の .otf/.ttc、ヒラギノ .ttc）を読めないので、
# IPAexゴシック等の .ttf を使う。太字ファイルが無ければ擬似ボールド。
# --font の既定は default_font() が macOS / Ubuntu の順に探す（見つからなければ fc-list :lang=ja の先頭の .ttf）。
#
# 版面の考え方:
#   - ターゲットは幅 120mm で刷る。AR は紙の長辺で縮尺を決めるので、拡大縮小して刷っても重なりは崩れない。
#   - ターゲットの中には何も足さない。文字・QR はすべてターゲットの外。
#   - 家庭用プリンタで色が変わって認識が弱い場合は、刷った紙を撮った写真を追加登録する
#     （showcase/print/rectify_printed.py の手順と同じ）。

import argparse
import json
import os
import subprocess

import qrcode
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(os.path.dirname(HERE), 'config.json')  # 公開 URL を 1 か所で決める（{"base": ...}）

# --font の既定の候補（TrueType のみ。先に見つかったもの）
FONT_CANDIDATES = [
    '/Library/Fonts/ipaexg.ttf',                                   # macOS（IPAexゴシックを入れた場合）
    os.path.expanduser('~/Library/Fonts/ipaexg.ttf'),
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',        # macOS 標準
    '/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf',          # Ubuntu（fonts-ipafont-gothic）
    '/usr/share/fonts/opentype/ipaexfont-gothic/ipaexg.ttf',       # Ubuntu（fonts-ipaexfont-gothic）
]
MM = 72 / 25.4
PW, PH = A4  # 595.3 x 841.9 pt

SAMPLES = [
    # (folder, 用途ラベル, 見出し, 何が起きるか)
    ('sumi-ryu', '寺社・御朱印・掛け軸', '墨文字「龍」', '墨がにじみ、文字が龍になって動き出す。'),
    ('sakura', 'Tシャツ・土産物・工芸', '燕と桜', '刷られた柄の燕が飛び、花びらが舞う。'),
    ('ramen', '飲食店のチラシ・メニュー', 'ラーメン', '写真の丼から湯気が立ちのぼる。'),
]

INK = (0.1, 0.1, 0.1)
GRAY = (0.45, 0.45, 0.45)
LINE = (0.8, 0.8, 0.8)


def register_fonts(font_regular, font_bold):
    # reportlab は TrueType アウトラインのみ（Noto CJK の .ttc/.otf は CFF なので不可）。
    # 太字のファイルが無ければ Regular を登録し、描画側で輪郭を足して擬似ボールドにする。
    pdfmetrics.registerFont(TTFont('JP', font_regular))
    if font_bold and os.path.exists(font_bold):
        pdfmetrics.registerFont(TTFont('JP-B', font_bold))
        FAUX_BOLD[0] = False
    else:
        pdfmetrics.registerFont(TTFont('JP-B', font_regular))
        FAUX_BOLD[0] = True


FAUX_BOLD = [False]


def qr_image(url, box=10):
    q = qrcode.QRCode(border=1, box_size=box, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    q.make(fit=True)
    return ImageReader(q.make_image(fill_color='black', back_color='white').convert('RGB'))


def text(c, x, y, s, size, font='JP', color=INK, align='left'):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    draw = {'right': c.drawRightString, 'center': c.drawCentredString}.get(align, c.drawString)
    draw(x, y, s)
    if font == 'JP-B' and FAUX_BOLD[0]:
        # 擬似ボールド: 少しずらして重ね描き
        draw(x + size * 0.03, y, s)
        draw(x, y + size * 0.015, s)


def hline(c, x0, x1, y, w=0.4, color=LINE):
    c.setStrokeColorRGB(*color)
    c.setLineWidth(w)
    c.line(x0, y, x1, y)


def front(c, targets_dir, base, mode):
    m = 14 * MM
    x0, x1 = m, PW - m
    top = PH - m

    # ヘッダ
    text(c, x0, top - 6 * MM, 'antymark', 11, 'JP-B')
    text(c, x1, top - 6 * MM, '印刷物WebAR', 9, color=GRAY, align='right')
    hline(c, x0, x1, top - 9 * MM)

    # 見出し＋手順（single のときは QR をここに置く）
    text(c, x0, top - 24 * MM, '刷った絵が、そのまま動き出す。', 24, 'JP-B')
    text(c, x0, top - 31 * MM, 'この紙にスマホをかざしてください。アプリは要りません。', 11)
    if mode == 'single':
        qs = 26 * MM
        c.drawImage(qr_image(f'{base}/'), x1 - qs, top - 12 * MM - qs, qs, qs)
        text(c, x1 - qs - 4 * MM, top - 18 * MM, '① QRを読む', 9, align='right')
        text(c, x1 - qs - 4 * MM, top - 23 * MM, '② カメラを下の絵に向ける', 9, align='right')
        text(c, x1 - qs - 4 * MM, top - 28 * MM, '③ 8秒ほどの演出。タップでもう一度', 9, align='right')
        text(c, x1 - qs - 4 * MM, top - 34 * MM, 'どの絵でも動きます', 8, color=GRAY, align='right')

    # サンプル 3 段
    tw = 120 * MM
    th = tw * 9 / 16
    gap = 5 * MM
    y = top - 40 * MM
    for name, use, title, what in SAMPLES:
        y -= th
        c.drawImage(os.path.join(targets_dir, name, 'target.png'), x0, y, tw, th)
        tx = x0 + tw + 6 * MM
        text(c, tx, y + th - 5 * MM, use, 8, color=GRAY)
        text(c, tx, y + th - 12 * MM, title, 14, 'JP-B')
        # 2 行に折る（列幅 ≈ 56mm）
        for j, ln in enumerate(wrapn(what, x1 - tx, size=9)):
            text(c, tx, y + th - 19 * MM - j * 5 * MM, ln, 9)
        if mode == 'each':
            qs = 22 * MM
            c.drawImage(qr_image(f'{base}/{name}/'), tx, y + 2 * MM, qs, qs)
            text(c, tx + qs + 2 * MM, y + 6 * MM, 'QRを読んで', 7, color=GRAY)
            text(c, tx + qs + 2 * MM, y + 2.5 * MM, 'この絵にかざす', 7, color=GRAY)
        y -= gap

    # フッタ
    hline(c, x0, x1, m + 9 * MM)
    text(c, x0, m + 4 * MM, 'あなたの印刷物でも作れます。裏面をご覧ください。', 9)
    text(c, x1, m + 4 * MM, 'antymark.com/services/ar/', 9, color=GRAY, align='right')


def back(c, base):
    m = 14 * MM
    x0, x1 = m, PW - m
    top = PH - m

    text(c, x0, top - 6 * MM, 'antymark', 11, 'JP-B')
    text(c, x1, top - 6 * MM, '印刷物WebAR', 9, color=GRAY, align='right')
    hline(c, x0, x1, top - 9 * MM)

    y = top - 22 * MM
    text(c, x0, y, '印刷物WebARとは', 16, 'JP-B')
    y -= 8 * MM
    for s in [
        '名刺・チラシ・メニュー・パッケージ・Tシャツなど、すでにある印刷物にスマホをかざすと、',
        'ブラウザ上で刷られた絵そのものが動き出します。専用アプリのインストールは不要、',
        '月額もありません。表面の3つは見本です。お手元の印刷物でも同じように作れます。',
    ]:
        text(c, x0, y, s, 10)
        y -= 5.5 * MM

    y -= 6 * MM
    cols = [
        ('アプリ不要', 'QRかURLから、iPhoneのSafari・AndroidのChromeでそのまま動きます。'),
        ('買い切り・月額なし', '制作費のみ。納品はHTML一式のファイル納品が標準で、以後の費用はありません。'),
        ('素材はお手元の印刷物', '動かすのは、お持ちの印刷データ・写真・ロゴです。3Dモデルの新規制作は含みません。'),
    ]
    cw = (x1 - x0 - 2 * 6 * MM) / 3
    for i, (h, b) in enumerate(cols):
        cx = x0 + i * (cw + 6 * MM)
        text(c, cx, y, h, 11, 'JP-B')
        for j, ln in enumerate(wrapn(b, cw - 2 * MM)):
            text(c, cx, y - 6 * MM - j * 4.8 * MM, ln, 8.5)
    y -= 28 * MM

    hline(c, x0, x1, y)
    y -= 9 * MM
    text(c, x0, y, '価格（税別・印刷費別）', 12, 'JP-B')
    y -= 8 * MM
    rows = [
        ('Light', '30,000円'),
        ('Standard', '50,000円'),
        ('Custom', '80,000円〜'),
        ('試作（印刷物1点）', '15,000円  ※そのまま本制作に進む場合は各プラン価格との差額のみ'),
    ]
    for k, v in rows:
        text(c, x0, y, k, 10, 'JP-B')
        text(c, x0 + 42 * MM, y, v, 10)
        y -= 6 * MM
    text(c, x0, y, '演出の内容で段階が変わります。まず試作からお受けします。', 8.5, color=GRAY)
    y -= 5 * MM
    text(c, x0, y, 'オプション：antymarkホスティング 年額6,000円／年額保守（軽微修正・ブラウザ対応・問い合わせ）6,000円、併用で10,000円', 8.5, color=GRAY)
    y -= 12 * MM

    hline(c, x0, x1, y)
    y -= 9 * MM
    text(c, x0, y, 'ご依頼の流れ', 12, 'JP-B')
    y -= 8 * MM
    steps = [
        ('1', '印刷物のデータ（または現物）を1点お送りください'),
        ('2', '試作をお届け（通常3営業日）'),
        ('3', 'ご確認のうえ本制作。納期は通常3営業日、最長でLight 1週間／Standard 2週間'),
        ('4', 'HTML一式を納品（貴社サーバーに置くだけ）、またはantymarkでホスティング'),
    ]
    for n, s in steps:
        c.setFillColorRGB(*INK)
        c.circle(x0 + 2.5 * MM, y + 1.2 * MM, 2.5 * MM, fill=1, stroke=0)
        text(c, x0 + 2.5 * MM, y - 0.1 * MM, n, 8, 'JP-B', color=(1, 1, 1), align='center')
        text(c, x0 + 8 * MM, y, s, 10)
        y -= 6.5 * MM
    y -= 2 * MM
    text(c, x0, y, '対応端末：iPhone（Safari）、Pixel・Galaxy等の主要Android（Chrome）、ここ数年の機種。', 8.5, color=GRAY)
    y -= 5 * MM
    text(c, x0, y, '手書き御朱印のように毎回絵柄が変わるものは対象外です（1枚の絵柄を覚えて動かす仕組みのため）。', 8.5, color=GRAY)

    # お問い合わせ（下部）
    qs = 28 * MM
    yb = y - 14 * MM - qs
    hline(c, x0, x1, yb + qs + 6 * MM)
    c.drawImage(qr_image('https://antymark.com/services/ar/'), x1 - qs, yb, qs, qs)
    text(c, x0, yb + qs - 2 * MM, 'お問い合わせ・お申し込み', 12, 'JP-B')
    text(c, x0, yb + qs - 10 * MM, 'antymark.com/services/ar/ の申込フォーム、または info@antymark.com', 10)
    text(c, x0, yb + qs - 17 * MM, 'antymark合同会社', 10, 'JP-B')
    text(c, x0, yb + qs - 23 * MM, '映像・インタラクティブ演出・Web技術。', 9, color=GRAY)
    text(c, x0, yb + qs - 28 * MM, '実績：Matsumoto City Illumination 2021-22、GUNKANJIMA DIGITAL MUSEUM、TouchDesigner技術書2冊', 8, color=GRAY)
    text(c, x1 - qs, yb - 4 * MM, 'サービスページ', 7, color=GRAY)


def wrapn(s, width_pt, font='JP', size=8.5):
    # 文字幅で折り返す（英単語の途中では切らない）
    out, cur = [], ''
    for ch in s:
        if pdfmetrics.stringWidth(cur + ch, font, size) > width_pt and cur and ch not in '。、）」':
            # 直前が英数字の途中なら単語ごと次行へ
            k = len(cur)
            while k > 0 and cur[k - 1].isascii() and cur[k - 1].isalnum() and ch.isascii() and ch.isalnum():
                k -= 1
            if 0 < k < len(cur):
                out.append(cur[:k])
                cur = cur[k:] + ch
            else:
                out.append(cur)
                cur = ch
        else:
            cur += ch
    out.append(cur)
    return out


def config_base():
    try:
        with open(CONFIG) as f:
            return json.load(f)['base']
    except (OSError, KeyError, ValueError):
        return None


def default_font():
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return p
    try:
        out = subprocess.run(['fc-list', ':lang=ja', 'file'], capture_output=True, text=True).stdout
    except OSError:
        return None
    ttfs = sorted(ln.split(':')[0].strip() for ln in out.splitlines() if ln.split(':')[0].strip().endswith('.ttf'))
    # 英数字の無いフォント（DroidSansFallbackFull など）は価格や URL が抜けるので除く
    return next((p for p in ttfs if has_latin(p)), None)


def has_latin(path):
    try:
        cmap = TTFont('probe', path).face.charToGlyph
    except Exception:
        return False
    return all(ord(ch) in cmap for ch in 'Aa0,')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['single', 'each'], default='single')
    base = config_base()
    ap.add_argument('--base', default=base, required=base is None,
                    help=f'flow-ar の公開URL（末尾スラッシュなし。既定は {CONFIG} の base）')
    ap.add_argument('--targets', default=os.path.dirname(HERE), help='各サンプルの target.png がある親フォルダ')
    font = default_font()
    ap.add_argument('--font', default=font, required=font is None,
                    help='TrueType の日本語フォント（既定は macOS / Ubuntu の順に探したもの）')
    ap.add_argument('--font-bold', default='', help='太字の TrueType。無ければ擬似ボールド')
    ap.add_argument('--out', default=os.path.join(HERE, 'flow-ar-flyer.pdf'))
    a = ap.parse_args()
    print('base', a.base, '/ font', a.font)
    register_fonts(a.font, a.font_bold)
    c = canvas.Canvas(a.out, pagesize=A4)
    c.setTitle('antymark 印刷物WebAR 営業チラシ')
    front(c, a.targets, a.base.rstrip('/'), a.mode)
    c.showPage()
    back(c, a.base.rstrip('/'))
    c.save()
    print('wrote', a.out)


if __name__ == '__main__':
    main()
