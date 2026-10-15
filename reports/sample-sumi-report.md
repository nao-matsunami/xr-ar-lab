# サンプル「墨文字」— ショーケース転用の最初の営業サンプル

- リポジトリ: `~/xr-ar-lab`、ブランチ `sample-sumi` → main にマージ・push 済み
- 作成日: 2026-10-15（前回 2026-10-14 は素材の取得で停止。今回は素材が置かれた状態から再開）
- 指示: `sample-sumi.md` の仕様 1〜5 ＋ 補足
  - 素材は `samples-ar/sumi/assets/sumi.jpg`：白隠『徳』一字書（Met Open Access、CC0）。ネットからは取得しない
  - 表装込みの画像なので、四隅検出で本紙だけを切り出す。本紙は **520×1060mm** として扱う
  - `samples-ar/index.html`（一覧）は作らない。sumi は直接 URL でのみ開く営業用
- 注: `sample-sumi.md` 本体は repo に無かったので、前回セッションに渡された同じ文面に従った

## 実機確認 URL

**https://nao-matsunami.github.io/xr-ar-lab/samples-ar/sumi/**
（入口からのリンクは張っていない。ページに `noindex` も付けた。`?debug` で赤い板と左上の黄色の目印が出る）

`samples-ar/sumi/print/target.png`（502×1024px）を刷ってカメラを向ける。A4 普通紙でよい
（AR は紙の長辺で縮尺を決めるので、刷る大きさが変わっても見え方の比率は変わらない）。

確認項目:

1. 紙に向けると認識し、白い紙色の板の上に墨色の点で『徳』が出る（点は印刷どおりの位置）。ゆっくり揺れている
2. 紙の上をタップすると、点が煙のように立ち上る（紙面から手前＋上へ。散った後もゆらぎながら昇る）
3. 散った瞬間に低い鐘が 1 回鳴り、約 4 秒で消える。散っている間は筆が紙を擦るような薄いノイズ
4. 3.5 秒ほどかけて円相に集まる（描き始めの左下から時計回りに、筆の順に集まる）。もう一度タップで散って文字に戻る（上から順に）
5. 紙を傾けると、点が低い側へ少し寄る（showcase の半分くらい）
6. 右下のアイコンは showcase と同じ 4 つ（🌬 マイク / 🔊 / ⏺ 録画 / ⓘ）。文字は出ない

---

## 1. 共通化

`showcase/ar/` のうちターゲットに依存しない部分を `shared/ar-core/` に移し、showcase と sumi が同じファイルを読む。
ページごとの違いは、importmap で解決する 2 つの指定子だけ:

| 指定子 | showcase | sumi |
|---|---|---|
| `ar-config` | `showcase/ar/config.js` | `samples-ar/sumi/ar/config.js` |
| `ar-targets` | `showcase/ar/targets.js` | `samples-ar/sumi/ar/targets.js` |

### 動かしたファイル

| 変更 | ファイル |
|---|---|
| 移動 | `showcase/ar/{main,particles,wind,tilt,audio,capture,ui,debug-hud}.js` → `shared/ar-core/` |
| 新規 | `shared/ar-core/defaults.js` — 演出の既定値（＝ showcase の現行値そのまま）。新しいつまみも既定値は showcase と同じ動きになる値 |
| 縮小 | `showcase/ar/config.js` — `defaults.js` を再エクスポートし、名刺の寸法とバリアントだけ持つ |
| 追加 | `showcase/ar/targets.js` — 点群 JSON の場所を返す `dataUrls()` を足した |
| 変更 | `showcase/index.html` — importmap に `ar-config` / `ar-targets` を足し、本体を `../shared/ar-core/main.js` から読む |
| 新規 | `tools/sampling.py` — `gen_front.py` からポアソンディスク・マスク内サンプリング・最近傍割当を切り出した |
| 変更 | `showcase/print/gen_front.py` — 上の 3 関数を `tools/sampling.py` から import する |
| 汎用化 | `tools/showcase-selftest.html` — `?sample=sumi` で sumi を検査（後述） |

ターゲット固有のもの（`targets.js`・`particles*.json`・`shapes*.json`・config の演出値）は各ディレクトリに残っている。

### 共通部に足したつまみ（既定値では showcase の動きは変わらない）

- `LOG`：コンソールの接頭辞。既定 `[showcase]`（前回レポートの確認手順がこれで grep している）、sumi は `[sumi]`
- `SCATTER.worldDown` / `lift` / `swirlMm`：散る向きに「上」を足す・散った瞬間の実際の下（`tilt.downLocal`）の逆へ昇る・横揺れ。
  シェーダの落下は `p.y -= uFall*(…)` を `p += uDown*uFall*(…)` に一般化した。showcase は `uDown=(0,-1,0)` 固定なので同じ式
- `PARTICLES.unitMm`：シェーダに直書きだった名刺サイズの mm（縁の余白 0.35、縁判定 0.25、湧き戻り 14、板の奥行き 0.2）に掛ける倍率。showcase は 1
- `AUDIO.scatterVoice`（`'grain'` / `'bell'`）と `AUDIO.gather`：散る音の種類と、再形成完了のスイープの有無
- `RECORD.filePrefix`：録画ファイル名の頭

### showcase の動作が変わっていないことの確認

| 確認 | 結果 |
|---|---|
| `showcase/` を偽カメラ（名刺の y4m）で開く | コンソールエラー 0、外部要求 0、`__XR_ENGINE_LICENSE='mit'`、認識して BREATHE。ログ 5 行は共通化前と**一字一句同じ**（`pose: scale=0.6319 scaled=1.544x1.000 … roll=-90deg, aspect=0.999` まで） |
| 同じ条件のスクリーンショット | 共通化前と同じ画（差は呼吸の乱数位相のみ） |
| `tools/showcase-selftest.html?variant=normal` / `dense` | 全項目 ok（pose / tilt / wind / audio / resume / slide / breatheStaysPrinted）、エラー 0、外部要求 0 |
| `gen_front.py --variant normal`（切り出し後） | `particles-normal.json`・`shapes-normal.json`・`front-target-normal.png` が現行ファイルと**バイト一致** |

---

## 2. 墨文字の点群化（`tools/make-sample.py`）

```bash
~/.venvs/showcase/bin/python tools/make-sample.py samples-ar/sumi/assets/sumi.jpg \
  --paper-mm 520x1060 --ardir samples-ar/sumi/ar --printdir samples-ar/sumi/print \
  --rest-name sumi --shape enso=samples-ar/sumi/assets/enso.svg
```

（約 70 秒。OpenCV は `~/.venvs/showcase` に入っていた（5.0.0）。前回レポートの pip install は不要だった）

### 四隅検出

- 紙 =「彩度が低く明るい」画素（HSV で S≤90, V≥165）。本紙は S≈55・V≈190、表装の金襴は S≈130・V≈150、上下の一文字は暗いので分かれる
- **はまったところ**：『徳』の「心」の上の太い横画が本紙の左右いっぱいに届いていて、紙のマスクが上下 2 つに割れていた。
  最大の断片だけを取ると下半分が落ちる（最初の実行では縦横比 1.488 になった）。最大の断片の 5% 以上ある断片をまとめて凸包を取るようにして直した
- 結果（元画像 900×1200 の px、左上から時計回り）：(177.2, 50.5) (721.8, 54.5) (720.8, 1160.5) (180.2, 1165.5)。
  縦横比は **2.048**、指定寸法 1060/520 = **2.038**（差 0.5%）。境の布が target に混ざらないよう 2px 内側に寄せている
- 外れたときは `--corners x,y,x,y,x,y,x,y` で手動指定できる

### 点群

| 項目 | 値 |
|---|---|
| 点数 | **15,678**（目標 16,000。12,000〜20,000 の範囲） |
| 密度 | 濃さ（紙の輝度 181 と墨の底 38 の間で正規化）に比例。点の間隔 r = r0/√濃さ、r0 = 2.94mm。濃さ 0.16 未満（紙の地合い・染み）には置かない |
| 明度 `l` | その場所の明るさ ÷ 紙の明るさ。0.175〜0.873、中央値 0.25（濃い墨 = 暗い点、かすれ・にじみ = 薄い点） |
| 直径 | 局所の間隔 × 1.25（±12%）。2.4〜7.7mm |
| 色 | シェーダは `uInk * aLum` なので、`ink` に元画像の紙色 `#c1b298` を入れた（`ink × l` = その場所の色）。板は白い紙色 `#f4f1ea`。シェーダは無改造 |
| 出力 | `samples-ar/sumi/ar/particles.json`（showcase と同じ形式、mm、左上原点）・`shapes.json`・`print/target.png`（502×1024）・`print/preview.png` |

`preview.png` は 元画像と検出した四隅 / 矩形化した target / 点群 / 円相 の 4 枚組。

### 形状循環（`shapes.json`）

`sumi`（元の文字そのもの。上から順に戻る）→ `enso` → `sumi` …。魚・蟻は入れていない。

円相は自作の SVG（`samples-ar/sumi/assets/enso.svg`、生成スクリプト `gen-enso.py` も同じ場所）。
一筆の円で、入りは押し付けて太く、途中で太さが波打ち、描き終わりは 4 本の筋に割れてかすれる。
紙幅の 84% に収めて中央に置き、点は描き始め（左下）から時計回りの順に集まる（SVG の `data-start-deg` / `data-direction` を読む）。

---

## 3. 演出（`samples-ar/sumi/ar/config.js`。showcase との差分だけ）

**距離の単位**：点群は本紙の実寸（長辺 1060mm）で作ったので、名刺（長辺 85mm）で決めた showcase の mm をそのまま使うと、
紙に対して 1/12 の動きにしかならない。距離の値はすべて「名刺に換算した mm × K（= 1060/85 = 12.5）」で書いた。
「showcase の 0.6 倍」は紙の大きさに対しても 0.6 倍に見える。仕様の「振幅 0.15mm」も名刺換算の 0.15mm として扱った（showcase 0.3mm の半分）。

| 項目 | 仕様 | 設定 |
|---|---|---|
| 板 | 白い紙色（showcase は黒） | `#f4f1ea`（particles.json の `paper`） |
| 点群 | 墨色 | `ink #c1b298 × l`（濃い所は ≈ `#231f1b`） |
| 呼吸 | 振幅 0.15mm、周期 4〜6 秒 | `0.15×K`、4〜6 秒 |
| 散る向き | 紙面法線＋上向きを強く（煙） | `lift: 2.0`、`worldDown: true`（散った瞬間の実際の上へ昇る）、終端の上昇 `25×K mm/s`、横揺れ `6×K` |
| 散る速さ | showcase の 0.6 倍 | `speedMm`・`speedMinMm` を 0.6 倍 |
| 再形成 | 3.5 秒かけてゆっくり | `durationS: 3.5`、点ごとの遅れ幅 `1.2` 秒（筆の順に集まるのを見せるため。showcase は 0.5） |
| 傾き | 有効。滑り量 0.5 倍 | `biasMm`・`slideGainMm` を 0.5 倍 |
| 音 | 鐘＋擦れ | 下記 |
| UI | showcase と同じ 4 アイコン、文字なし | 共通の `ui.js` そのまま |

**仕様から足した値**：`SCATTER.drag` を 1.9 → 3.5。showcase の空気抵抗のままだと、最初の吹き出しが紙の長さの 1.5 倍以上
飛んで 1 秒足らずで画面の外へ抜け、煙に見える時間がなかった（selftest の画で確認）。初速は仕様どおり 0.6 倍のまま。

**「上」の取り方**：DeviceMotion が許可されていれば実際の重力の逆。机に寝かせた紙なら手前（紙面法線）へ、
壁に掛けた紙なら紙の上方向へ昇る。許可が無い端末では、画面の下の逆（＝画面の上）へ昇る。散った瞬間の向きで固定する
（散っている途中に端末が動いても軌道が振れない）。

### 音

- 散る瞬間：低い鐘 1 発。正弦波 110Hz の基音＋倍音 3 つ（×2.32 / ×4.25 / ×6.63。鐘らしく整数倍からずらした）。
  基音は 4 秒で減衰、高い倍音ほど早く消える。立ち上がり 12ms の直線ランプ（クリック防止）
- 散っている間：1〜3kHz の帯域ノイズ（ハイパス 1k ＋ ローパス 3k）を 2.6 秒、振幅をゆっくり揺らして擦れのむらを付ける。鐘のピークの 1/6 程度
- 再形成完了のスイープ（showcase の音）は鳴らさない
- **読経・念仏・声明の音声は入れていない。** 理由：(1) 合成やフリー素材の声明は、お寺の方が聞けば宗派・節回しの違いがすぐ分かり、
  内見で信用を落とす。(2) 実案件ではそのお寺の僧侶の声を録らせてもらい、それを入れること自体が提案の中身になる。
  サンプルの段階で他所の声を当てると、その話がしにくくなる。(3) 録音素材を入れると「音声ファイルを持たない（外部 URL ゼロ・全部 WebAudio で合成）」の前提も崩れる。
  差し替えは `audio.js` の `bellAt` の後に `AudioBufferSourceNode` を 1 つ足すだけで済む

---

## 4. ページ

`samples-ar/sumi/index.html`：MIT 版エンジン（`engine/mit/xr.js`）、`__XR_ENGINE_LICENSE='mit'`、`shared/attribution.js`（ⓘ に MIT 版の文面）。
showcase の `index.html` と同じ構成で、パスと importmap の解決先だけが違う。`samples-ar/index.html` は作っていない。

画像ターゲットは縦長の `print/target.png` を 1 枚（名前 `sample-sumi`、`physicalWidthInMeters 0.52`）。

**縦長ターゲットの軸を実測した**（前回の設計メモで「未確認」としていた点）。偽カメラに target.png を正面から写したとき、
MIT エンジンの detail は `scale=0.6319 scaledWidth=0.490 scaledHeight=1`。scale は名刺のときと同じく長辺のワールド長で、
縦長画像は回されないので **roll は 0** でよい（`aspect=1.001`）。`?debug` の赤い板が本紙にぴったり重なり、黄色の目印が左上に来ることを画で確認した。

---

## 5. 確認

### ヘッドレス（Chrome + SwiftShader、偽カメラ）

| ページ | コンソールエラー | 外部要求 | ほか |
|---|---|---|---|
| `showcase/?anydevice`（名刺の y4m） | 0 | 0 | `mit`、BREATHE、ログは共通化前と同じ |
| `samples-ar/sumi/?anydevice`（target.png の y4m） | 0 | 0 | `mit`、認識 1.8 秒、15,678 点。タップ → SCATTER → 6 秒後に BREATHE で形は `enso` |

### selftest（`tools/showcase-selftest.html?sample=sumi`）

`?sample=` で importmap を差し替えて、そのサンプルの config / targets / 点群で同じ検査を回す（既定は showcase）。
showcase 固有だった値（実測の detail、左上の位置、タイルの形、滑り量の下限、音の検査）はサンプルごとの表に分けた。
sumi は 9 タイル（6 状態＋傾きの測定 3 枚）を描く:

| タイル | 内容 |
|---|---|
| 0 | 呼吸（印刷どおり）— 白い紙の上に墨の点で『徳』 |
| 1 | 傾き（滑り＋縁に溜まる） |
| 2 | 散る 0.45 秒 — 紙の上半分へ昇る墨の煙 |
| 3 | 散る 1.5 秒 — さらに昇って紙の上へ抜けていく |
| 4 | 円相に再形成 |
| 5 | 文字に再形成 |
| 6〜8 | 斜め 35° で認識直後（印刷どおりと同一の画）/ 相対 25° / 相対 10°（点だけ） |

結果：全項目 ok、コンソールエラー 0、外部要求 0。

| 検査 | sumi の値 |
|---|---|
| pose | 長辺 = detail.scale、短辺 = scale × 520/1060、左上がエンジンの軸で (-260, +530)、roll 0 |
| tilt / wind / resume | showcase と同じ検査がそのまま通る（WIND は上書きしていない） |
| slide | 相対 10° で 27.9mm 寄る（下限 12.5mm = showcase の 2mm × 0.5 × K） |
| smoke（新規） | 壁に掛けた姿勢で、点群の重心が 0.45 秒で 352mm、1.5 秒で 513mm 上へ（紙の高さの 15% 以上・昇り続けている） |
| audio（鐘） | 110Hz の成分が 80Hz・150Hz の 100 倍以上。倍音 3 つとも隣より 5 倍以上。1 秒後 31%、4 秒後 0.08%。擦れは 2kHz が 300Hz・7kHz の 10 倍以上、ピークは鐘の 17%。頭 5ms ほぼ 0（破裂音なし）、4 つ重ねても最大 0.80（クリップなし） |

確認コマンド:

```bash
python3 -m http.server 8811 --bind 127.0.0.1 &
node tools/headless-check.mjs "http://127.0.0.1:8811/tools/showcase-selftest.html?sample=sumi" \
  --wait 14000 --screenshot /tmp/sumi-selftest.png --eval "JSON.stringify(window.__selftest)"
node tools/headless-check.mjs "http://127.0.0.1:8811/tools/showcase-selftest.html?variant=normal" \
  --wait 14000 --eval "JSON.stringify(window.__selftest)"
# 偽カメラ: target.png を 灰色 640x480 の中央に高さ 440px で置いた静止画を
#   ffmpeg -loop 1 -i frame.png -t 4 -r 30 -pix_fmt yuv420p sumi.y4m
CHROME_EXTRA_ARGS="--use-file-for-fake-video-capture=/tmp/sumi.y4m" \
  node tools/headless-check.mjs "http://127.0.0.1:8811/samples-ar/sumi/?anydevice&debug" \
  --wait 22000 --screenshot /tmp/sumi-overlay.png --eval "window.__XR_ENGINE_LICENSE"
```

### 実機でまだ見ていないこと・気づいたこと

- **Pixel 7 / iPhone での見た目は未確認**（偽カメラとデスクトップでの確認のみ）
- ヘッドレス（SwiftShader）では sumi の fps が 5 前後で、3 秒後に点数を 15,000 に落とす処理が働いた。showcase では起きない。
  点が大きく（紙いっぱいに直径 2〜8mm × 1.1 倍）重なりが多いので、ソフトウェア描画では重い。実機の GPU で 25fps を割るようなら
  `make-sample.py --count 12000` で作り直すか、`PARTICLES.sizeScale` を下げる
- sumi では認識の直後に一度 `imagelost` が来て `paused (state=IDLE)` → `resumed after 0.50s` がログに出る（偽カメラの静止画で毎回）。
  点群の読み込み中に見失い判定が出ているだけで、再認識で通常どおり BREATHE に入る。実害はないが、実機でも出るかは見ておく
- 元画像は Met の Web 用（900×1200）で、本紙部分は 545×1110px しかない。A4 に刷る分には足りるが、大きく刷るなら高解像度版が要る
- 『徳』の画像を target にしているので、刷った紙そのものは白隠の書の写真。お寺に見せる際は、実案件ではそのお寺の書（または住職の書）に差し替える前提で話す
