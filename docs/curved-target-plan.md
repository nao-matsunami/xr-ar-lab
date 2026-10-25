# MIT 版エンジンで曲面・複数ターゲットを実際に検出させる計画

対象: `templates/curved-target-demo`、`templates/multi-target-demo`、`templates/print-shop/can-demo`、`templates/print-shop/mug-demo`
作成: 2026-10-25 / 状態: **計画のみ（未実装）**

## 結論

**MIT 版エンジン（`engine/mit/`）で曲面ターゲット（CYLINDER / CONICAL）は使える。** ソース・ビルド成果物ともに確認できた。ただし実機での検出はまだ確認していない（下記「リスク」）。

## 1. MIT 版 xr.js に CYLINDER / CONICAL が入っているか

| 確認箇所 | 結果 |
|---|---|
| ソース `reality/app/xr/js/src/tracking-controller.ts`（8thwall/8thwall `519b988`） | `imageTargetData[].type` が `CYLINDER` / `CONICAL` のとき、`ImageTargetTypeMsg.CURVY` と曲面形状（`cylinderCircumferenceTop/Bottom`、`cylinderSideLength`、`targetCircumferenceTop`）を WASM に渡す（L851–）。検出イベントには `radiusTop` / `radiusBottom` / `height` / `arcLengthRadians` / `arcStartRadians` が入る（L907–） |
| ビルド設定 `reality/app/xr/js/BUILD` の `xr-tracking-cc` | `//reality/engine/imagedetection:detection-image` と `:detection-image-loader` に依存している。`detection-image.cc` に `DetectionImageType::CURVY` と `toCurvyGeometry` がある |
| チャンク `reality/app/xr/js/src/chunk-loader.ts` | `data-preload-chunks="slam"` は MIT 版では `xr-tracking.js` に解決される（`engine/mit/README.md` と同じ） |
| ビルド成果物 `engine/mit/xr-tracking.js`（JS 部分） | `CYLINDER` / `CONICAL` / `CURVY` / `lastProcessedCurvyGeometry` / `cylinderCircumferenceTop` / `targetCircumferenceTop` の出現数が、配布バイナリ `lib/xr-slam.js` と**同数** |
| ビルド成果物 `engine/mit/xr-tracking.js`（埋め込み WASM 2.6MB） | base64 を展開すると `curvy` 15 件、`Curvy` 7 件で、`lib/xr-slam.js` の WASM と同数。一方 `vps`/`Vps` は MIT 版 0 件、バイナリ版 90 件。**VPS だけが抜けていて、曲面検出は残っている** |

型名の表記: 設定（`imageTargetData`）では `PLANAR` / `CYLINDER` / `CONICAL`、イベントの `detail.type` では `FLAT` / `CYLINDRICAL` / `CONICAL`。"CONIC" という型名は無い。

A-Frame 側: vendor 版 xrextras（`lib/vendor/web/xrextras/xrextras.js`）に `xrextras-curved-target-container` と `xrextras-target-mesh` が入っている。検出された曲面形状（`xrextrasimagegeometry` イベント）に合わせて円柱メッシュを作るので、`a-cylinder` を手で置く必要はない。

## 2. imageTargetData の登録方法

既存の MIT ページ（image-target-demo、print-shop 各種）と同じく、`xrloaded` のあとに `XR8.XrController.configure` で登録する。

```js
const onxrloaded = () => {
  XR8.XrController.configure({
    imageTargetData: [ /* image-target-cli が出力した JSON の中身 */ ],
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
```

- エンジン側の処理: `imagePath` の画像を `<img crossorigin=anonymous>` で読み込み、特徴量を抽出する。`imagePath` はページからの相対パスで、CLI は `image-targets/<name>_luminance.<ext>` を出力する
- `name` が `<xrextras-named-image-target name="...">` と一致している必要がある
- 曲面のときの `properties`: CLI が出力する `cylinderCircumferenceTop`、`cylinderCircumferenceBottom`、`targetCircumferenceTop`、`cylinderSideLength`（＋ `arcAngle` / `coniness` / `topRadius` / `bottomRadius` / `inputMode` / `unit`）。エンジンが実際に読むのは上の 4 つと、クロップ系（`left` / `top` / `width` / `height` / `originalWidth` / `originalHeight` / `isRotated`）
- 埋め込み方: 既存ページは JSON をインラインで貼っている（`require()` はビルドが無いので使えない）。`fetch('image-targets/x.json')` で読む方式にすれば、JSON の二重管理が無くなる。どちらにするかは実装時に決める（推奨は fetch）
- `configure` を呼び直すと、`imagePath` の差分だけ読み込み・破棄される（L1132–）。複数ターゲットは 1 回の配列で渡せばよい

## 3. ターゲット画像の生成ツール（旧 8th Wall コンソールの代替）

**`@8thwall/image-target-cli`**（8thwall/8thwall の `apps/image-target-cli/`、MIT）。

- 実行: `npx @8thwall/image-target-cli@latest`。ローカルのソースから実行するなら `cd ~/build/8thwall/apps/image-target-cli && npm install && node src/index.js`。依存は `sharp` だけ（**npm からの取得が必要**。ローカルにはまだ `node_modules` が無い）
- 対話式で、画像パス → 種類（flat / cylinder / cone）→ 寸法 → クロップ → 出力先を順に聞かれる。フラグによる非対話モードは無い。答えを標準入力にパイプすれば流せるので、再現できるよう答えを `tools/` にスクリプトとして残す
- cylinder: 円柱の円周と、ラベルの幅（円周のうちどれだけを覆うか）を聞かれる。単位は mm / inch のどちらでもよい（比率しか使わない）
- cone: ラベルを扇形で用意し、外半径・内半径・円錐の角度を入力する。CLI が平らに展開した `_geometry` 画像を作り、それをクロップする
- 出力: JSON、original、cropped、thumbnail（263×350）、luminance（グレースケール 480×640）、cone のときは geometry

## 4. テンプレートごとの直し方

| テンプレート | 現状 | 直し方 | 必要な素材・情報 |
|---|---|---|---|
| **print-shop/can-demo**（**2026-10-25 実装済み・実機未確認**、下記「実機確認手順」） | `can-target` を `PLANAR` で登録。768×1024 の平面画像 | CLI で `cylinder` として作り直し、`type: 'CYLINDER'` の JSON に差し替える。中身は `xrextras-curved-target-container` に入れる | 実際の缶の円周（例: 350ml 缶は直径約 66mm → 円周約 207mm）と、ラベルの印刷幅。今の `target.png` を巻いたときの幅を決める |
| **print-shop/mug-demo** | `mug-target` を `PLANAR` で登録 | 同上（`cylinder`）。マグが末広がりなら `cone` | マグの上下の直径と、印刷範囲の幅・高さ |
| **curved-target-demo** | `imageTargetData` 未登録。`a-cylinder` で見た目だけ再現 | ターゲット画像を 1 枚用意して CLI で `cylinder` にし、`configure` を追加する。`a-cylinder` は `xrextras-curved-target-container` に置き換える。`xrimagefound/lost` のハンドラ（`name === 'curved-surface'`）はそのまま使える | 巻き付ける画像と、巻く対象（紙コップなど）の寸法 |
| **multi-target-demo** | `target-a` / `-b` / `-c` を置いているが、`imageTargetData` 未登録 | 平面ターゲットを 3 枚 CLI で作り（`sample-target-1/2` の流用 ＋ 1 枚追加でもよい）、1 回の `configure` で 3 件まとめて登録する。名前を `target-a/b/c` に合わせる | 特徴点の多い画像 3 枚（互いに似ていないもの） |

共通の作業:

1. `image-target-cli` を使えるようにする（`npm install` で sharp を取得。ネットワーク許可が必要）
2. 各ターゲットを生成し、CLI への入力を `tools/` に残す
3. index.html に `configure` を追加するか、既存の `type` を差し替える。曲面は `xrextras-curved-target-container` にする
4. `target-display.html` の扱い: 曲面ターゲットは**モニタ表示では検出テストできない**（平面に映るため）。can / mug / curved は印刷して実物に巻いて試す。`target-display.html` には「印刷して巻く」案内と、印刷用 PDF / PNG を置く
5. 実機（iOS Safari / Android Chrome）で found / lost / 追従を確認する

## リスク・未確認事項

- **MIT 版で曲面の実機検出は未検証**。コードとシンボルは配布バイナリと同じだが、MIT 版の README では「Image Target 対応」とだけ書かれており、曲面を試した記録は無い。最初に can-demo 1 件で検証してから残りに広げる
- MIT 版には SLAM が無い。これら 4 件はすべて `disableWorldTracking: true` なので影響しない想定
- vendor 版 xrextras は古い CDN 版（`docs/license-audit.md` 参照）。`xrextras-curved-target-container` は入っているが、オープンソース版との挙動差は未確認
- 缶・マグは反射や曲率で特徴点が減る。ラベルのデザイン（コントラストと模様の多さ）次第で検出率が大きく変わる

---

## 実機確認手順（can-demo）

2026-10-25 に can-demo を CYLINDER 型ターゲットに切り替えた。実機での確認はまだ。

### 今回入れたもの

| ファイル | 内容 |
|---|---|
| `templates/print-shop/can-demo/assets/can-label.png` | テスト用ラベル。架空ブランド「星風サイダー / HOSHIKAZE CIDER」、208×105mm、12px/mm（2496×1260） |
| `templates/print-shop/can-demo/assets/print/can-label-A4.pdf` | A4 横。ラベル実寸 ＋ トンボ ＋ 50mm スケールバー |
| `templates/print-shop/can-demo/assets/print/can-label-208x105mm.pdf` | 用紙サイズ＝ラベル（208×105mm） |
| `templates/print-shop/can-demo/image-targets/can-target*.{json,png}` | `@8thwall/image-target-cli@1.0.0` の出力。`type: CYLINDER`、円周 208mm、ラベル幅 208mm（arcAngle 360）、クロップは CLI 標準（中央の 4:3 横長範囲 = ラベル中央 約140mm、`isRotated: true`） |
| `templates/print-shop/can-demo/index.html` | JSON を `fetch` して `XR8.XrController.configure` で登録。検出面に水色のワイヤーフレーム（`xrextras-target-mesh`）を重ね、演出の原点を缶の上端（`height/2 + 0.08·height`）に移動 |
| `templates/print-shop/can-demo/target-display.html` | 画面表示では検出できない旨と、印刷用 PDF へのリンク（旧 `target.png` は削除） |
| `tools/make-can-label.py` | ラベル PNG / PDF の再生成（固定シードなので毎回同じ画像になる） |
| `tools/image-target-cli/` | CLI を 1.0.0 に固定（`npm install` で入る。`node_modules` は追跡しない）。`make-can-target.sh` で CLI への入力を再現 |
| `tools/render-can-fake-camera.py` | 缶に巻いた合成映像を作り、Chrome の偽カメラで PC 上で事前確認する |

### PC での事前確認（実施済み）

合成映像（缶が ±25° 回転し、カメラも前後・上下に動く）を偽カメラに流し、MIT 版エンジンで can-demo を開いた。

- `xrextras-named-image-target` が表示状態になり、**検出された**
- エンジンが返した形状: `height: 1`、`radiusTop = radiusBottom = 0.315`。実寸の 33.1mm ÷ 105mm = 0.315 と一致
- `XR8.CanvasScreenshot` で撮った画像で、ワイヤーフレームがラベルの上下端・左右輪郭にほぼぴったり重なっていた
- ここで確認できたのはあくまで合成映像。実カメラのノイズ・反射・ピンぼけ・照明は未確認

### 1. 印刷

1. `assets/print/can-label-A4.pdf` を開き、**「実際のサイズ」/「100%」**で印刷する（「ページに合わせる」「用紙に合わせて縮小」は不可）
2. 印刷した 50mm スケールバーを定規で測り、**50mm ±0.5mm** であることを確かめる。ずれていたら倍率設定を見直して刷り直す
3. 用紙は**マット（普通紙・マット紙）**がよい。光沢紙は缶の曲面で照り返しが帯状に出て、特徴点が消える
4. トンボの内側（208×105mm）をカッターで切り出す

### 2. 缶に巻く

1. 350ml 缶（直径約 66mm）を用意する。ラベルの上下は、缶の胴のまっすぐな部分（上下のくびれを避ける）に収める
2. 左上の「TOP ↑」が上。タイトルパネル（星風サイダー）の中央を正面に向けると、継ぎ目（ラベル両端）は真裏に来る
3. 両端を突き合わせて（重なりは 1mm 以下）、縦にテープで留める。たるみ・浮き・しわが無いよう、ぴったり巻く
4. 缶が直径 66mm 前後でない場合（例: 細身の 250ml 缶）、ラベルは一周しないかはみ出す。そのときはワイヤーフレームとラベルにずれが出るので、メモしておく

### 3. URL を開く

- **デプロイ版**（push 後、Netlify に反映されてから）: `https://xr-ar-lab.netlify.app/templates/print-shop/can-demo/`
- **ローカル**（push 前に試すとき）: PC で `./tools/serve.sh . 8443` を実行し、スマホで表示される `https://<PCのIP>:8443/templates/print-shop/can-demo/` を開く（自己署名証明書の警告は許可する）。http-server はキャッシュするので、ターゲットを差し替えたら再読み込み前にサーバーを再起動する
- iOS は Safari、Android は Chrome。カメラの許可を求められたら許可する

### 4. 期待する挙動

| # | 操作 | 期待する挙動 |
|---|---|---|
| 1 | ページを開く | 背面カメラの映像が出る。右下 ⓘ のモーダルが **MIT License** の文面（MIT 版エンジンで動いている印） |
| 2 | 缶の正面（タイトルパネル）を 20〜40cm の距離で、缶が画面の縦 1/3〜1/2 になるよう映す | **1〜2 秒以内に検出**。水色のワイヤーフレーム円柱がラベルに重なる |
| 3 | 重なり具合を見る | ワイヤーフレームの上下端がラベルの上下端に、左右の輪郭が缶の輪郭に、**数 mm 以内**で一致する |
| 4 | 演出 | 缶の上端より少し上に金色のオーラと星が出て、泡が上に湧き続ける |
| 5 | 缶をゆっくり左右に回す（±60° くらい） | ワイヤーフレームがラベルに張り付いたまま追従する。演出も缶の上に付いてくる |
| 6 | 缶を手に持って傾ける・近づける・遠ざける | 同様に追従する（大きく傾けると外れるのは許容） |
| 7 | 缶を画面外に出す | 演出とワイヤーフレームが消える（lost）。もう一度映すと再検出される |
| 8 | 最初から真裏（バーコード・栄養成分側）だけを映す | **検出されなくて正常**。追跡に使う範囲はラベル中央の約 140mm で、裏側は含まれない |

### 5. 記録してほしいこと

機種 / OS / ブラウザ、照明（室内灯・窓際など）、検出までの秒数、追従できた回転角の目安、ワイヤーフレームのずれ（どの辺が何 mm くらい）、#1〜#8 の可否。

### 6. うまくいかないとき

| 症状 | 見るところ |
|---|---|
| まったく検出しない | 印刷倍率（50mm バー）、照り返し（光沢紙・強い照明）、距離（近すぎ・遠すぎ）、ピンぼけ。PC でコンソールを見られるなら `[can-demo] failed to load image target` が出ていないか |
| 検出するがワイヤーフレームが大きい／小さい | 印刷倍率か缶の直径の違い。円周 208mm（直径 66.2mm）前提 |
| ワイヤーフレームが回転方向にずれる | ラベルの巻き始め位置。継ぎ目が真裏に来ているか |
| ワイヤーフレームが上下にずれる | ラベルを缶の胴の中央に巻いているか |
| すぐ外れる・ガタつく | 照明不足、手ぶれ。缶を机に置き、スマホのほうを動かして試す |
| ⓘ が XR Engine License の文面 | MIT 版でなくバイナリ版で動いている。`index.html` の `engine/mit/xr.js` と `__XR_ENGINE_LICENSE` を確認 |

### 未対応・メモ

- `demos/print-shop/can-demo/`（別コピー）は旧来の PLANAR のまま。今回は `templates/` 側だけを変えた
- 演出の大きさ（オーラ半径 0.12 など）は平面ターゲット用に作られたもの。曲面の単位（ラベル高さ = 1、缶の半径 0.315）でも破綻はしないが、見た目の調整は実機確認後に行う
- ヘッドレス確認では、8frame の `updateEnterInterfaces` に関する例外が出る。変更していない card-demo でも同じなので既存の問題で、今回の変更とは無関係
