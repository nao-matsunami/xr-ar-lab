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
| **print-shop/can-demo** | `can-target` を `PLANAR` で登録。768×1024 の平面画像 | CLI で `cylinder` として作り直し、`type: 'CYLINDER'` の JSON に差し替える。中身は `xrextras-curved-target-container` に入れる | 実際の缶の円周（例: 350ml 缶は直径約 66mm → 円周約 207mm）と、ラベルの印刷幅。今の `target.png` を巻いたときの幅を決める |
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
