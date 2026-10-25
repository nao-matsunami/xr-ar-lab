# 8th Wall 依存ライセンス棚卸し（templates/）

調査日: 2026-10-25 / 対象: `templates/` 配下の各デモの `index.html`（とそこから読み込んでいる JS）

## エンジンの 2 系統

| パス | 中身 | ライセンス |
|---|---|---|
| `engine/mit/xr.js`（+ `xr-tracking.js` / `xr-face.js`） | [8thwall/8thwall](https://github.com/8thwall/8thwall) `519b988` からの自前ビルド。Image Target / Face / Sky / カメラパイプライン。**SLAM・VPS・Hand Tracking は入っていない**（`engine/mit/README.md`） | MIT |
| `lib/xr.js`（+ `xr-slam.js` / `xr-face.js`） | Niantic Spatial 配布のエンジンバイナリ。冒頭に XR Engine License Agreement | XR Engine License Agreement |

MIT 版を使うページは `<head>` 先頭で `window.__XR_ENGINE_LICENSE = 'mit'` を宣言しており、`shared/attribution.js` の ⓘ モーダルはこのフラグで文面を切り替える。

## 区分の定義

- **MIT only** — エンジンバイナリ（`lib/xr.js`）を読まない。MIT 版エンジンのみ、または 8th Wall 自体を使わない。
- **Binary required** — `lib/xr.js` を読み込む。主に SLAM（ワールドトラッキング）が MIT 版に無いため。
- **Cloud-dependent（不可）** — VPS / Maps / Hand Tracking / Modules など 8th Wall のクラウドに依存。**2027-02-28 以降は動かない前提**。

## 判定表

| テンプレート | 使用機能 | エンジンバイナリ依存 | 区分 | 備考（判定根拠） |
|---|---|---|---|---|
| alpha-video-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js` `data-preload-chunks="slam"`、`xrweb="allowedDevices: any"`（`disableWorldTracking` なし） |
| animation-demo | world-tracking (SLAM) | あり | Binary required | 同上。aframe-extras を jsDelivr から読み込み |
| audio-ar-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`xrweb="allowedDevices: any"` |
| buri-slam-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`xrweb`、`xrextras-gesture-detector` / `pinch-scale` / `one-finger-rotate` |
| capture-demo | world-tracking (SLAM)、その他: 録画/撮影 (`XR8.MediaRecorder` / `CanvasScreenshot` via xrextras-capture-*) | あり | Binary required | `lib/xr.js`、`xrweb`、`xrextras-capture-button` / `-config` / `-preview` |
| geo-ar-demo | world-tracking (SLAM)、その他: GPS (`navigator.geolocation`) | あり | Binary required | 位置は端末 GPS + DeviceOrientation で計算。VPS / Maps は不使用 |
| gesture-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`xrweb`。ジェスチャーは画面タッチで、Hand Tracking ではない |
| himino-e-demo | world-tracking (SLAM)、その他: GPS (`navigator.geolocation`) | あり | Binary required | 距離判定は自前の Haversine 計算。VPS / Maps は不使用 |
| image-target | world-tracking (SLAM) | あり | Binary required | 名前は image-target だが中身は `<title>AR Minimal Test</title>` のワールド配置（box + plane）。`imageTargetData` も `xrextras-named-image-target` も無い |
| minimal-test | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`<a-scene xrweb="allowedDevices: any">` |
| occlusion-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`xrweb`、`xrextras-hider-material` |
| physics-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`xrweb`。cannon.js を cdnjs から読み込み |
| portal-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`xrweb`、`xrextras-hider-material`（"sky" は a-sky 要素で Sky Effects ではない） |
| raw-test | world-tracking (SLAM) | あり | Binary required | A-Frame 無し。`XR8.addCameraPipelineModules` で `XR8.XrController.pipelineModule` / `Threejs` / `GlTextureRenderer` を直接組み、`XR8.run` |
| world-effects-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`xrweb` |
| world-slam-demo | world-tracking (SLAM) | あり | Binary required | `lib/xr.js`、`xrweb`、`xrextras-attach` |
| canvas-target-demo | image-target | なし | MIT only | `engine/mit/xr.js`、`xrweb="...; disableWorldTracking: true"`、`XR8.XrController.configure({imageTargetData: [... type: 'PLANAR']})` |
| curved-target-demo | image-target（curved-target は**疑似**） | なし | MIT only | `engine/mit/xr.js`、`disableWorldTracking: true`、`xrextras-named-image-target name="curved-surface"`。ただし `imageTargetData` の設定が無く、曲面は `a-cylinder` で見た目だけ再現（CYLINDER 型ターゲットではない） |
| face-effects-demo（`debug.html` 含む） | face | なし | MIT only | `engine/mit/xr.js` `data-preload-chunks="face"`、`xrface="...; cameraDirection: front"`、`xrextras-faceanchor` |
| image-target-demo | image-target | なし | MIT only | `engine/mit/xr.js`、`disableWorldTracking: true`、`XR8.XrController.configure`（`image-targets/*.json`） |
| multi-target-demo | image-target | なし | MIT only | `engine/mit/xr.js`、`disableWorldTracking: true`、`xrextras-named-image-target` + `xrimagefound/lost`。`imageTargetData` の設定が見当たらない（後述） |
| sky-effects-demo | sky | なし | MIT only | `engine/mit/xr.js`（preload-chunks なし）、`xrlayers="allowedDevices: any"`、`xrlayerscene="name: sky"`、coaching-overlay |
| print-shop/can-demo | curved-target（CYLINDER） | なし | MIT only | `engine/mit/xr.js`、`disableWorldTracking: true`、`XR8.XrController.configure`。2026-10-25 に `PLANAR` から `CYLINDER` に変更（`docs/curved-target-plan.md`） |
| print-shop/card-demo | image-target | なし | MIT only | 同上（`PLANAR`） |
| print-shop/flyer-demo | image-target | なし | MIT only | 同上（`PLANAR`） |
| print-shop/mug-demo | image-target | なし | MIT only | 同上。マグだがターゲットは `PLANAR` |
| print-shop/tshirt-demo | image-target | なし | MIT only | 同上（`PLANAR`） |
| hand-tracking-demo | hand-tracking（**MediaPipe**、8th Wall ではない） | なし | MIT only（8th Wall 非依存） | 8th Wall エンジン・xrextras とも不使用。`@mediapipe/hands` 等をバージョン未固定で jsDelivr から読み込み |
| vr-mode-demo | その他: WebXR VR（素の A-Frame） | なし | MIT only（8th Wall 非依存） | `aframe.io/releases/1.4.0/aframe.min.js` のみ。8th Wall 不使用 |

対象外: `templates/face-effects/`・`templates/sky-effects/`・`templates/world-slam/` は `assets/` だけで HTML が無い。`templates/index.html` はギャラリーページ。

## Cloud-dependent（要注意）

**該当なし。** `templates/` 内に `XR8.Vps` / Maps / 8th Wall Hand Tracking / Modules の呼び出しや、`apps.8thwall.com`・`cdn.8thwall.com` への参照は無い（`image-target/index.html` のコメントに旧 `apps.8thwall.com/xrweb?appKey=XXXXX` が残っているだけで、読み込みはしていない）。
名前が紛らわしいものは次の通りで、いずれもクラウド非依存:

- geo-ar-demo / himino-e-demo — 端末 GPS のみ（VPS / Maps ではない）
- hand-tracking-demo — MediaPipe（8th Wall Hand Tracking ではない）
- gesture-demo — 画面タッチのジェスチャー

もし今後 VPS / Maps / Hand Tracking / Modules を使うテンプレートを追加する場合は、2027-02-28 以降は動かない前提で扱うこと。

## Binary required の帰属表示チェック

求める表示:

> This product includes the XR Engine software developed by Niantic Spatial, Inc.
> + https://github.com/8thwall/engine/blob/main/LICENSE へのリンク

結果: **16 件すべて、この文言は index.html に入っていない（追加候補）。**

現状、16 件とも `shared/attribution.js` を読み込んでおり、右下 ⓘ のモーダルで次を表示している:

- "This experience uses the 8th Wall Engine." / "8th Wall Engine © Niantic Spatial, Inc. All rights reserved." / "Niantic Spatial, Inc. is the creator of the 8th Wall Engine." ほか
- `https://github.com/8thwall/engine/blob/main/LICENSE` へのリンク — **あり**

つまり LICENSE へのリンクはあるが、(1) 指定の文言 "This product includes the XR Engine software developed by Niantic Spatial, Inc." は無い、(2) index.html に静的に書かれておらず、JS でモーダル内に入れているだけ。

追加候補（未対応）:

| テンプレート | 指定文言 | LICENSE リンク | attribution.js |
|---|---|---|---|
| alpha-video-demo | なし | モーダル内のみ | あり |
| animation-demo | なし | モーダル内のみ | あり |
| audio-ar-demo | なし | モーダル内のみ | あり |
| buri-slam-demo | なし | モーダル内のみ | あり |
| capture-demo | なし | モーダル内のみ | あり |
| geo-ar-demo | なし | モーダル内のみ | あり |
| gesture-demo | なし | モーダル内のみ | あり |
| himino-e-demo | なし | モーダル内のみ | あり |
| image-target | なし | モーダル内のみ | あり |
| minimal-test | なし | モーダル内のみ | あり |
| occlusion-demo | なし | モーダル内のみ | あり |
| physics-demo | なし | モーダル内のみ | あり |
| portal-demo | なし | モーダル内のみ | あり |
| raw-test | なし | モーダル内のみ | あり |
| world-effects-demo | なし | モーダル内のみ | あり |
| world-slam-demo | なし | モーダル内のみ | あり |

対応案: 16 ファイルを個別に直すより、`shared/attribution.js` の `BINARY_LINES` の先頭に指定文言を 1 行足せば全ページに反映される。index.html への静的な記載が必須なら、`</body>` 直前に `<noscript>` か非表示でない小さな footer として入れる。

**対応済み（2026-10-25, `9e0e439` "Add XR Engine attribution line"）**: `BINARY_LINES` の先頭に指定文言を追加。16 ページすべてで、ⓘ モーダルの 1 行目に "This product includes the XR Engine software developed by Niantic Spatial, Inc." が出て、同じモーダル内に `https://github.com/8thwall/engine/blob/main/LICENSE` へのリンクがある。ヘッドレス Chrome（390×844）でモーダルを開き、スクロールせずに両方が見えることを確認した。MIT 版のページ（`MIT_LINES`）は変えていない。index.html に静的に書く件は未対応。

## 判定に迷ったもの

1. **image-target** — ディレクトリ名は image-target なのに、中身はワールドトラッキングの最小シーン（`xrweb` に `disableWorldTracking` なし、ターゲット定義なし）。名前ではなく中身で判定し Binary required とした。MIT 版に移すなら、実際の Image Target デモに作り直す必要がある。
2. **curved-target-demo / multi-target-demo** — MIT 版エンジンを読み、`disableWorldTracking: true` で `xrextras-named-image-target` を置いているので image-target と判定。ただし両方とも `XR8.XrController.configure({imageTargetData})` が無く、ターゲットが 1 つも登録されないので、実機ではたぶん何も検出されない。curved-target は CYLINDER/CONICAL 型を使わず円柱メッシュで見た目を寄せているだけなので、「curved-target 機能を使っている」とはしなかった。
3. **hand-tracking-demo / vr-mode-demo** — 8th Wall に一切依存しないので、3 区分のどれにもきれいには当てはまらない。バイナリ不要という意味で MIT only に入れたが、MIT ライセンスの 8th Wall エンジンを使っているわけではない。hand-tracking-demo は MediaPipe を**バージョン未固定**で CDN から読んでおり、8th Wall の期限とは別に、CDN 側の更新で壊れるリスクがある。
4. **geo-ar-demo / himino-e-demo** — 「Geo AR」は VPS / Maps を連想させるが、`navigator.geolocation` と自前の距離計算だけ。クラウド非依存として Binary required（SLAM 用）にした。
5. **print-shop/mug-demo / can-demo** — 曲面の商品だが、ターゲット JSON は `"type": "PLANAR"`。curved-target ではなく image-target と判定した。（can-demo は 2026-10-25 に CYLINDER 化済み。mug-demo は PLANAR のまま）
   - `demos/print-shop/can-demo/`（templates とは別のコピー）は平面（PLANAR）のまま。templates 側への統合を要検討。
6. **xrextras / 8frame / coaching-overlay**（`lib/vendor/web/`）— MIT 版のページもこれを読んでいる。→ 出所とライセンスは下の「vendor ライブラリの出所」で確認した。区分は変わらない。

## vendor ライブラリの出所（2026-10-25 追記）

`lib/vendor/web/` の 3 つを、ローカルの [8thwall/8thwall](https://github.com/8thwall/8thwall) `519b988`（`~/build/8thwall`、MIT 版エンジンのビルド元と同じコミット）の同名ファイルと照合した。どのファイルにもライセンスヘッダが無いので、中身で照合している。取得元は `lib/vendor/LICENSES.md` にある通り `cdn.8thwall.com/web/...`（2026-09-07 取得）。

| ファイル | 対応する 8thwall/8thwall のディレクトリ | そのディレクトリの LICENSE | 照合結果 | 区分への影響 |
|---|---|---|---|---|
| `web/xrextras/xrextras.js` | `packages/xrextras/`（npm `@8thwall/xrextras`） | **MIT**（Copyright 2026 Niantic Spatial, Inc.）、`package.json` も `"license": "MIT"` | ソースの 18 文字以上の文字列リテラル 350 個のうち 207 個（59%）がバンドルに含まれる。`xr-components.ts` 37/47、`almost-there-module.html` 33/37、`media-preview.js` 14/17 など、コンポーネント定義と UI はほぼ一致。一致しないのは主に import パスと、`loading-module` の CSS クラス名。ソース側は `xrextras-loading-container` のような `xrextras-` 名前空間に移行済み（`test/css-namespace.test.js`）なのに、vendor 版は `loadingContainer` / `almostthereContainer` のまま。つまり **同じパッケージの、名前空間移行より前の CDN リリース**。加えて、取り込み時に URL を `/lib/vendor/web` に書き換えている（53 か所） | なし（MIT） |
| `web/coaching-overlay/coaching-overlay.js` | `packages/coaching-overlay/`（npm `@8thwall/coaching-overlay`） | **MIT**（Copyright 2025 Niantic Spatial, Inc.） | 文字列リテラル 47 個のうち 39 個（83%）が一致。一致しない 8 個は import パス、コメント断片、`window` 上に無いときのエラーメッセージ 2 つ | なし（MIT） |
| `web/aframe/8frame-1.3.0.min.js` | **8thwall/8thwall 内には無い**（`8frame` の名前は xrextras のバージョン表と README に出てくるだけ） | — | バンドル内の `package.json` は `"name":"aframe","version":"1.3.0","license":"MIT"` で、**A-Frame 1.3.0（MIT）に 8th Wall のパッチを当てたもの**。見つかったパッチは 2 つ。(1) `a-scene` が `window.XR8` か `xrloaded` を待ってから play する、(2) 読み込み時に `XR8.AFrame.xrwebComponent()` を `xrweb` として登録し、二重登録は警告で済ます | なし（A-Frame 本体は MIT）。ただしパッチ部分のライセンス表記は見つからない（下記） |

### 結論

- 3 つとも MIT 由来で、Niantic の XR Engine License Agreement 下のものは無い。**区分の見直しは不要**（MIT only の 13 件はそのまま）。
- 残る懸念（未対応・候補）:
  1. ~~**MIT の著作権表示が無い**~~ → **対応済み（2026-10-25）**。`lib/vendor/web/xrextras/LICENSE` と `coaching-overlay/LICENSE` は 8thwall/8thwall `519b988` の各 `packages/*/LICENSE` をそのままコピーした（Niantic Spatial, Inc.）。`aframe/LICENSE` は A-Frame の MIT 本文（npm `aframe@1.1.0/1.3.0/1.4.1/1.5.0` の LICENSE。4 版とも同一で "Copyright © 2015-2017 A-Frame authors."）に、8th Wall のパッチ部分は 8thwall/8thwall と同じく MIT（Niantic Spatial, Inc.）として扱う旨の注記を付けた。パッチ（`xrwebComponent` の登録と `xrloaded` 待ち）は 4 つの 8frame すべてに入っていることを確認した。
  2. **8frame のパッチ部分**（`aframe/LICENSE` の注記で MIT 扱いと明記済み）。8th Wall のパッチを当てた 8frame の配布元は CDN だけで、8thwall/8thwall にはソースもライセンス表記も無い。A-Frame の MIT は派生物の配布を許しているので、パッチ部分を独自ライセンスとする表記が無い以上、問題は小さいと考える。それでも気になるなら、素の `aframe@1.3.0` に置き換え、`xrweb` の登録は xrextras / XR8 側（`XR8.AFrame.xrwebComponent()`）で行う手もある（動作検証が必要）。
  3. **vendor 版 xrextras が古い**。ライセンスの問題ではないが、オープンソース版の `packages/xrextras` とはずれている。差し替えるなら、CSS クラス名の変更でローディング画面のスタイルが変わる点に注意する。
- 照合はオフラインで行った。素の A-Frame 1.3.0 とのバイト単位の比較は、npm からの取得ができなかったので未実施。
