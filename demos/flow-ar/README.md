# flow-ar — 印刷物の絵が動き出す（Google Flow の映像を重ねる）

営業サンプル。印刷物を画像ターゲットとして認識し、その絵を最初のコマにして Google Flow で作った映像を、
印刷物の上へぴったり重ねて 1 回再生する。2026-10-19 作成。一覧・公開リンクは置かない（直接 URL のみ・noindex）。

| デモ | URL | 中身 |
|---|---|---|
| index（3 本まとめ） | https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar/ | QR 1 つで 3 つの絵のどれにかざしても動く（営業チラシの QR はここ） |
| sumi-ryu | https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar/sumi-ryu/ | お寺向け: 墨文字「龍」→ 墨がにじんで龍になる |
| sakura | https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar/sakura/ | ART シャツ: 燕と桜の柄が動き出す |
| ramen | https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar/ramen/ | 飲食店チラシ: ラーメンから湯気 |

印刷用:

| ファイル | 中身 |
|---|---|
| [`print/flow-ar-targets.pdf`](print/flow-ar-targets.pdf) | A4 横・1 枚に 1 つ・QR 付き（家庭のプリンタで試す用）。拡大縮小して刷ってよい |
| [`print/flow-ar-flyer.pdf`](print/flow-ar-flyer.pdf) | 営業チラシ（A4 縦・両面）。表は 3 つの絵＋まとめページの QR 1 つ（`--mode single`）、裏は説明と価格 |

公開 URL は [`config.json`](config.json) の `base` 1 か所で決める（チラシの QR はこれを読む。各ページは相対パスのみ）。

## 動き

- 認識したら頭から再生。終わったら最後のコマで止まる（ループしない）
- 認識中に画面をタップすると頭からもう一度
- 見失ったら隠して一時停止。1 秒以内に再認識したら続きから、それ以上見失ったら最初のコマに戻し、次の認識で頭から再生（再生し終わった後も同じ）
- 音声なし（動画から音声トラックを抜いてある）
- `?debug` で板が半透明になり左上に黄色の目印（重なりの確認用）

## 素材と枠

素材は Drive の `flow-materials/ar-samples/`（`<name>.jpg` 1024x1024 と `<name>.mp4` 1920x1080・24fps・8 秒）。
**動画の最初のコマは jpg の正方形そのままではなく、縦の中央 16:9（y=224〜800）を拡大したもの**だった
（SIFT＋RANSAC で 3 本とも倍率 0.5334・回転 0°・残差 0.5px 以下）。
そこで認識ターゲット（＝印刷物）も jpg から同じ帯を切り出した 1024x576 にした。これで動画の枠とターゲットの枠が一致し、
動画を板いっぱいに貼るだけで最初のコマが印刷物に重なる。jpg の上下の帯は印刷物に入らない。

```bash
demos/flow-ar/build.sh <素材フォルダ>              # target.png と video.mp4（720x406・H.264・音声なし）
~/.venvs/flowar/bin/python demos/flow-ar/print/make_print.py   # 印刷用 PDF
~/.venvs/flowar/bin/python demos/flow-ar/print/make_flyer.py   # 営業チラシ（base は config.json、--base で上書き）
```

チラシのフォントは TrueType の日本語フォント（reportlab は CFF の Noto CJK / ヒラギノを読めない）。
Ubuntu は `sudo apt install fonts-ipafont-gothic`（`ipagp.ttf`）。`~/.venvs/flowar` には reportlab・qrcode・Pillow を入れる。

```bash
python3 -m venv ~/.venvs/flowar && ~/.venvs/flowar/bin/pip install reportlab qrcode pillow
```

## 構成

`core.js` が共通の本体（MIT エンジン＋three.js、`samples-ar/sumi` と同じ同梱ファイルを読む）。
各単体ページは `body` の `data-name` / `data-width-mm` だけを持つ。まとめページ（`index.html`）は
`data-targets` に 3 本分の `{name, dir, widthMm}` を並べ、ターゲットごとに板と動画を 1 組ずつ作る。
同時に 2 つ見えたら最初に見つけた方だけを追う（`shared/ar-core/main.js` と同じ）。横長ターゲットはエンジン内で 90° 回して読まれるので、
板を Z 回りに -90° 回して合わせる（`showcase/ar/targets.js` の実測と同じ扱い）。

## vendor とミラー（antymark.com）

`demos/flow-ar/` はそれだけで完結する。エンジン・three.js・xrextras・帰属表示は `vendor/` に実ファイルでコピーしてあり、
各ページは `./vendor/`（単体ページは `../vendor/`）を読む。元ファイル（`engine/mit/`・`lib/vendor/`・`shared/attribution.js`）を
更新したら `tools/sync-flow-ar-vendor.sh` を流してコミットする。GitHub Pages でも同じ構成のまま動く。

antymark.com へのミラーは **Mac mini 上で** `tools/deploy-flow-ar.sh` を実行する（heteml の鍵は Mac mini 側のみ）。
ThinkPad の `demos/flow-ar/`（`print/`・README・build.sh を除く）を Mac mini に集めてから `ssh heteml` の
`HETEML_DIR` へ rsync し、公開 URL の 404 と Content-Type を curl で確認する。`HETEML_DIR` はスクリプト先頭で空にしてあり、
未設定なら止まる（Mac mini でサーバー側のパスを確かめて埋める）。`-n` で dry-run。

公開先（`config.json` の `base`）: https://antymark.com/demo/flow-ar/ 、各デモは `<base>/sumi-ryu/` など。
