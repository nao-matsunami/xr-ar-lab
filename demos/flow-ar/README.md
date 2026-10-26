# flow-ar — 印刷物の絵が動き出す（Google Flow の映像を重ねる）

営業サンプル。印刷物を画像ターゲットとして認識し、その絵を最初のコマにして Google Flow で作った映像を、
印刷物の上へぴったり重ねて 1 回再生する。2026-10-19 作成。一覧・公開リンクは置かない（直接 URL のみ・noindex）。

| デモ | URL | 中身 |
|---|---|---|
| sumi-ryu | https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar/sumi-ryu/ | お寺向け: 墨文字「龍」→ 墨がにじんで龍になる |
| sakura | https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar/sakura/ | ART シャツ: 燕と桜の柄が動き出す |
| ramen | https://nao-matsunami.github.io/xr-ar-lab/demos/flow-ar/ramen/ | 飲食店チラシ: ラーメンから湯気 |

印刷用: [`print/flow-ar-targets.pdf`](print/flow-ar-targets.pdf)（A4 横・1 枚に 1 つ・QR 付き）。拡大縮小して刷ってよい。

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
```

## 構成

`core.js` が共通の本体（MIT エンジン＋three.js、`samples-ar/sumi` と同じ同梱ファイルを読む）。
各ページは `body` の `data-name` / `data-width-mm` だけを持つ。横長ターゲットはエンジン内で 90° 回して読まれるので、
板を Z 回りに -90° 回して合わせる（`showcase/ar/targets.js` の実測と同じ扱い）。
