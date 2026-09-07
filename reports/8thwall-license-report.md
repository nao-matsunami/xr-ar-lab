# 8th Wall ライセンス対応レポート

- リポジトリ: `nao-matsunami/xr-ar-lab` (`~/xr-ar-lab`)
- 作業ブランチ: `license-hardening` (main へは未マージ・未 push)
- 作成日: 2026-09-07

---

## 1. 棚卸し表（Phase 0）

### 1.1 使用しているエンジン

このリポジトリは **8th Wall 配布バイナリを1系統だけ**使っている。

| 項目 | 値 |
|---|---|
| 実体 | `lib/xr.js` (1,036,552 B) / `lib/xr-slam.js` (5,537,864 B) / `lib/xr-face.js` (7,676,409 B) |
| 出所 | `vendor/engine/` (= `github.com/8thwall/engine` の `xr-standalone` 配布物) をリポジトリ直下の `lib/` にコピーしたもの |
| ライセンス | **XR Engine License Agreement**（`lib/xr.js` の先頭にライセンス全文が埋め込まれている。Niantic Spatial, Inc. の限定利用ライセンス） |
| Git 管理 | `lib/` は **通常の Git 管理下**（LFS 不使用。`.gitattributes` は空） |
| jsDelivr / `@8thwall/engine-binary` | **不使用**。CDN 経由ではなく全てローカル配信 |

補足：`data-preload-chunks="slam"` を付けている全ページが `xr-slam.js`（SLAM、プロプライエタリ）をロードしている。Image Target しか使っていないページでも、`XR8.XrController` が SLAM チャンク側で定義されるため slam の指定が必要になっている。これが MIT 版へ移行するときの最大の書き換えポイント。

### 1.2 ページ別一覧

`vendor/` 配下（上流リポジトリのクローン、未追跡・非公開）は除外。

| パス | エンジン `<script src>` | `data-preload-chunks` | トラッキング種別 | 帰属表示 |
|---|---|---|---|---|
| `demos/print-shop/can-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `demos/print-shop/card-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `demos/print-shop/flyer-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `demos/print-shop/index.html` | `—` | `—` | — (no engine) | なし |
| `demos/print-shop/mug-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `demos/print-shop/tshirt-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `qr/index.html` | `—` | `—` | — (no engine) | なし |
| `samples/alpha-video/index.html` | `../../lib/xr.js` | `—` | World/SLAM | あり (this branch) |
| `samples/animation-mixer/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/artgallery/index.html` | `../../lib/xr.js` | `—` | World/SLAM | あり (this branch) |
| `samples/babylonjs/placeground/index.html` | `../../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/capturephoto/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/flyer/index.html` | `../../lib/xr.js` | `—` | Image Target | あり (this branch) |
| `samples/manipulate/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/placeground/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/portal/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/reactapp/public/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/sky/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/threejs/8i-hologram/index.html` | `../../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/threejs/flyer/index.html` | `../../../lib/xr.js` | `—` | World/SLAM | あり (this branch) |
| `samples/threejs/placeground/index.html` | `../../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/threejs/swap-camera/index.html` | `../../../lib/xr.js` | `face,slam` | World/SLAM | あり (this branch) |
| `samples/threejs/vps/index.html` | `../../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/tossobject/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `samples/vps/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `showcase/index.html` | `—` | `—` | — (no engine) | なし |
| `targets/index.html` | `—` | `—` | — (no engine) | なし |
| `templates/alpha-video-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/animation-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/audio-ar-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/buri-slam-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/canvas-target-demo/index.html` | `../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/capture-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/curved-target-demo/index.html` | `../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/face-effects-demo/debug.html` | `../../lib/xr.js` | `face` | Face | あり (this branch) |
| `templates/face-effects-demo/index.html` | `../../lib/xr.js` | `face` | Face | あり (this branch) |
| `templates/geo-ar-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/gesture-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/hand-tracking-demo/index.html` | `—` | `—` | — (no engine) | なし |
| `templates/himino-e-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/image-target-demo/index.html` | `../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/image-target/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/index.html` | `—` | `—` | — (no engine) | なし |
| `templates/minimal-test/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/multi-target-demo/index.html` | `../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/occlusion-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/physics-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/portal-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/print-shop/can-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/print-shop/card-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/print-shop/flyer-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/print-shop/mug-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/print-shop/tshirt-demo/index.html` | `../../../lib/xr.js` | `slam` | Image Target | あり (this branch) |
| `templates/raw-test/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/sky-effects-demo/index.html` | `../../lib/xr.js` | `—` | Sky | あり (this branch) |
| `templates/vr-mode-demo/index.html` | `—` | `—` | — (no engine) | なし |
| `templates/world-effects-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |
| `templates/world-slam-demo/index.html` | `../../lib/xr.js` | `slam` | World/SLAM | あり (this branch) |

**集計**

| 区分 | 件数 |
|---|---|
| エンジンをロードする HTML | **51**（`index.html` 50 + `templates/face-effects-demo/debug.html`） |
| うち Image Target | 12 |
| うち Face | 2 |
| うち Sky | 1 |
| うち World/SLAM（その他） | 36 |
| エンジンをロードしない HTML（一覧ページ等） | 7 |

エンジンをロードしない 7 ファイル: `demos/print-shop/index.html`, `qr/index.html`, `showcase/index.html`, `targets/index.html`, `templates/index.html`, `templates/hand-tracking-demo/index.html`（MediaPipe のみ）, `templates/vr-mode-demo/index.html`（素の A-Frame のみ）。

**作業前の帰属表示: 全ページで 0 件**（`Niantic` の grep ヒットは `lib/` 内のライセンス全文と `docs/api-reference.md` の言及のみで、ユーザーに見える表示は存在しなかった）。

---

## 2. 旧 8thwall.com ホストへの依存

### 2.1 `apps.8thwall.com` — 該当なし ✅

`vendor/` を除くと **1件も存在しない**。過去に `//apps.8thwall.com/xrweb?appKey=...` からエンジンをロードしていた形跡はなく、既にローカル `lib/xr.js` へ移行済み。

### 2.2 `cdn.8thwall.com` — **要移行（重大）** ⚠️

対して `cdn.8thwall.com` への依存は **55 ファイル**に残っている。**2027-02-28 以降にこのホストが停止すると、リポジトリ内のほぼ全デモが起動しなくなる。**

**A. HTML から直接ロードしているスクリプト（起動に必須）**

| リソース | 参照数 | 影響 |
|---|---|---|
| `//cdn.8thwall.com/web/xrextras/xrextras.js` | 38 ファイル | **致命的**。`xrweb`/`xrface` A-Frame コンポーネント、ローディング UI、almost-there がここにある。落ちると全デモが起動しない |
| `//cdn.8thwall.com/web/aframe/8frame-1.3.0.min.js`（他 1.1.0 / 1.4.1 / 1.5.0） | 29 ファイル | **致命的**。A-Frame 本体 |
| `//cdn.8thwall.com/web/landing-page/landing-page.js` | 32 ファイル | 大。デバイス判定・ランディング |
| `//cdn.8thwall.com/web/coaching-overlay/coaching-overlay.js` | `templates/sky-effects-demo` 他 | 中 |
| `//cdn.8thwall.com/web/aframe/aframe-extras-6.1.1.min.js` | `samples/animation-mixer` | 中 |
| `//cdn.8thwall.com/web/aframe/aframe-physics-system-4.0.1.min.js` | `samples/tossobject` | 中 |
| `//cdn.8thwall.com/web/aframe/stats.16.min.js` | 1 | 小 |

**B. ローカルに置いた `lib/` エンジンが実行時に取りに行くもの**

ローカル配信に切り替えても、エンジンバイナリ自身が `cdn.8thwall.com` を参照している：

- `https://cdn.8thwall.com/web/resources/draco_wasm_wrapper-l325u8do.js`
- `https://cdn.8thwall.com/web/resources/draco-worker-l5sniji5.js`

（`lib/xr.js` / `lib/xr-slam.js` / `lib/xr-face.js` / `lib/resources/semantics-worker.js` の4ファイルに埋め込み。Draco 圧縮 GLB を読むときに必要。なお `templates/buri-slam-demo` は独自に `gstatic.com` の DRACOLoader を差している既存パッチがあるのでそこだけは無関係。）

**C. アセット・画像（動作はするが見た目が壊れる）**

ローディング画面のアイコン (`/web/img/loading/v2/*`)、almost-there の画像 (`/web/img/almostthere/*`)、"powered by" ロゴ、mediarecorder のアイコン群、`Nunito-SemiBold.woff/.ttf` フォント、および `samples/` が使うデモ用アセット（`assets/cube-texture.png`, `assets/video/alpaca.mp4`, 8i の `.hvrs` ファイル）。

> ローカル動作確認中にも `cdn.8thwall.com/web/fonts/Nunito-SemiBold.woff` が CORS で弾かれてコンソールエラーになっている（これは今回の変更前から存在する既存エラー）。

### 2.3 移行の方向

**A の最大の塊（xrextras）は、たぶん一番安く外せる。** `xrextras` は `github.com/8thwall/8thwall` の `packages/xrextras` に **MIT で公開**されており、README によれば npm と **jsDelivr** から取れる：

```html
<!-- 現状（2027-02-28 で死ぬ） -->
<script src="//cdn.8thwall.com/web/xrextras/xrextras.js"></script>
<!-- 移行先（MIT, jsDelivr） -->
<script src="https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1/dist/xrextras.js" crossorigin="anonymous"></script>
```

38ファイルの1行置換で済む可能性が高い（要検証：バージョン差による API 差分）。より堅くやるなら `npm pack` してリポジトリに同梱し、CDN 依存自体を消す。

`8frame` は A-Frame のフォークなので、同様に自前ホストへ持ってくるのが素直。`landing-page.js` / `coaching-overlay.js` は 8th Wall 独自の UI で代替が要る（あるいは自前実装に置き換える）。

B の Draco は `gstatic.com` の DRACOLoader への差し替えで解決する。**`templates/buri-slam-demo` が既にその形になっている**ので、そのパターンを他へ横展開すればよい。

C は素材を落としてリポジトリに置くだけ。

---

## 3. 帰属表示を入れたファイル一覧（Phase 1）

### 3.1 実装

新規ファイル **`shared/attribution.js`**（依存なし・A-Frame 非依存の自己完結スクリプト、5.2 KB）。

- 読み込み後に自分で DOM へ挿入する。画面右下に 32×32 の丸い `ⓘ` ボタン1つだけ（`position:fixed; right:12px; bottom:12px; z-index:9999`）。タップでモーダルが開き、法的表示を出す。閉じるボタンは `×`。
- ボタンの `click` / `touchend` は **`stopPropagation` のみ**で `preventDefault` は呼ばない。`templates/buri-slam-demo` の `{capture:true}` タッチハンドラ群には触れていない。
- モーダルの `z-index` だけは 10001 にした。既存デモのエラーオーバーレイ（9999）とヘルプオーバーレイ（9998）が全画面 `position:fixed` なので、10001 でないとモーダル本文が隠れるため。ボタン自体は指定どおり 9999。
- `window.__XR_ENGINE_LICENSE === 'mit'` がセットされていれば MIT 版の文面に切り替わる。

### 3.2 挿入したファイル（51件）

各ファイルの `</body>` 直前に、そのファイルの深さに合わせた相対パスで挿入。

```
demos/print-shop/{can,card,flyer,mug,tshirt}-demo/index.html          … ../../../shared/attribution.js  (5)
samples/{alpha-video,animation-mixer,artgallery,capturephoto,flyer,
         manipulate,placeground,portal,sky,tossobject,vps}/index.html … ../../shared/attribution.js     (11)
samples/reactapp/public/index.html                                    … ../../shared/attribution.js     (1)
samples/babylonjs/placeground/index.html                              … ../../../shared/attribution.js  (1)
samples/threejs/{8i-hologram,flyer,placeground,swap-camera,vps}/…     … ../../../shared/attribution.js  (5)
templates/{alpha-video,animation,audio-ar,buri-slam,canvas-target,
           capture,curved-target,face-effects,geo-ar,gesture,himino-e,
           image-target,multi-target,occlusion,physics,portal,
           sky-effects,world-effects,world-slam}-demo/index.html       … ../../shared/attribution.js    (19)
templates/{image-target,minimal-test,raw-test}/index.html             … ../../shared/attribution.js     (3)
templates/face-effects-demo/debug.html                                … ../../shared/attribution.js     (1)
templates/print-shop/{can,card,flyer,mug,tshirt}-demo/index.html      … ../../../shared/attribution.js  (5)
```

エンジンを読んでいない一覧ページ（`templates/index.html`, `demos/print-shop/index.html`, `showcase/`, `targets/`, `qr/`, `hand-tracking-demo`, `vr-mode-demo`）には**入れていない**。

差分は 51 ファイル・169 行追加、削除は `</body>` のインデント変更 16 行のみ（内容の削除はゼロ）。

### 3.3 デスクトップ確認結果（headless Chrome / `python3 -m http.server`）

`demos/print-shop/card-demo/index.html` で確認：

| 確認項目 | 結果 |
|---|---|
| `ⓘ` ボタンの DOM 挿入 | ✅ 34×34px、右下 12px、`z-index:9999`、`pointer-events:auto` |
| ボタン中心の hit test で最前面にいるか | ✅ true（ヘルプオーバーレイ 9998 より上） |
| クリックでモーダルが開く | ✅ `display:flex` になる |
| モーダル本文 | ✅ 指定文面が一字一句そのまま表示。URL は `<a href>` リンク |
| `×` で閉じる | ✅ |
| 既存4ボタン (`back-btn`/`capture-btn`/`help-btn`) | ✅ 変更前後で挙動同一。hit test を塞いでいるのはデモ自身の `help-overlay`(9998) であり、今回追加した要素ではない（変更前の `main` の同ファイルで比較して確認） |
| コンソールエラー | ✅ **変更前と完全に同一の9件**（8thwall CDN のフォント CORS / landing-page 400 / 既存の `updateEnterInterfaces` TypeError）。新規エラーはゼロ |

### 3.4 全51ページの一括確認

headless Chrome で 51 ページ全部を開き、`ⓘ` の挿入 → クリックでモーダル open → `Niantic Spatial` を含む本文の表示 → `×` で close、までを自動チェックした。

**結果: 48 / 51 PASS**

残り3件はいずれも**今回の変更とは無関係**。内訳：

| ページ | 症状 | 判定 |
|---|---|---|
| `samples/vps/index.html` | ナビゲーションタイムアウト（メインスレッドが張り付き、`Runtime.callFunctionOn` も返らない） | **変更前から同一**。`main` の同ファイルを同じディレクトリに置いて比較したところ、ベースラインも全く同じようにタイムアウトした。headless + カメラ/位置情報なしで VPS デモが回らないだけ |
| `samples/threejs/vps/index.html` | 同上 | **変更前から同一**（同じ方法で確認） |
| `samples/reactapp/public/index.html` | `ⓘ` が挿入されない | **既存の壊れたパスを踏襲した結果**。下記参照 |

`<script>` タグ自体は3ファイルとも正しく入っている（grep 確認済み）。VPS の2件は実機なら動くはず。

> **`samples/reactapp/public/index.html` について**
> このファイルは Create React App の `public/index.html` テンプレートで、エンジンの参照が既に `../../lib/xr.js` になっている。静的配信すると `samples/lib/xr.js` を指すことになり **この参照は元から壊れている**（`samples/lib/` は存在しない）。上流 `vendor/web/examples/aframe/reactapp/public/index.html` では `//apps.8thwall.com/xrweb?appKey=...` だった箇所を手で書き換えたときの取り残しと思われる。
> 帰属表示のパスは**エンジンの参照と同じ深さに揃えてある**（`../../shared/attribution.js`）。CRA でビルドされれば `public/` の中身はビルドルートに出るので両方同時に解決するし、静的配信のままならエンジンもロードされない＝帰属義務も発生しない。どちらの世界でも辻褄が合う。**エンジンのパスを直すときは帰属表示のパスも一緒に直すこと**（隣り合わせに置いてある）。

**実機確認は未実施**（Nao が実施。5章参照）。


---

## 4. MIT版エンジンのビルド結果（Phase 2）

### 4.1 結果: **成功** ✅

| 項目 | 値 |
|---|---|
| ソース | `github.com/8thwall/8thwall` を `~/build/8thwall` に `--depth 1` で clone |
| コミット | `519b988` |
| bazel | **7.2.1**（`.bazelversion` で固定。bazelisk (`npm i -g @bazel/bazelisk`) が自動で取得） |
| コマンド | `bazel build --config=wasmreleasesimd //reality/app/xr/js:bundle` |
| 所要時間 | **2,442 秒（約41分）** / 4,273 アクション / critical path 269.6s |
| 結果 | `INFO: Build completed successfully` — **一発で通った。フォールバック（`--config=wasmrelease`）は不要だった** |
| 制限時間 | 2時間枠に対して41分。余裕あり |

ビルド中の警告は emscripten の `wasm_simd128.h` の deprecation と caniuse-lite が古いという類のみ。エラーなし。

> 補足: タスク指示のビルドターゲット `//reality/app/xr/js:bundle` は現在の `packages/engine/README.md` と一致していた（リポジトリに以前 clone してあった `vendor/8thwall` の古い版では `:xr-js` になっていたので、そちらを見ていたら間違えていた）。

### 4.2 生成物 → `~/xr-ar-lab/engine/mit/`

`bundle.zip` (13,344,777 B) を展開したもの。

| ファイル | サイズ (B) |
|---|---|
| `xr.js` | 1,014,055 |
| `xr-tracking.js` | 3,885,945 |
| `xr-face.js` | 7,660,469 |
| `resources/dom-tablet-button.glb` | 38,236 |
| `resources/dom-tablet-frame.glb` | 43,028 |
| `resources/face-ear-model.tflite` | 1,173,520 |
| `resources/face-mesh-model.tflite` | 2,495,920 |
| `resources/face-model.tflite` | 423,340 |
| `resources/media-worker.js` | 4,995,543 |
| `resources/powered-by.svg` | 6,056 |
| `resources/semantics-model.tflite` | 2,526,160 |
| `resources/semantics-worker.js` | 4,998,145 |
| `LICENSE` | 1,069（下記） |
| `README.md` | 出所・コミット・ビルド条件を記録 |

**LFS には入れていない。** `.gitattributes` は空でこのリポジトリは LFS を一切使っておらず、既存の `lib/` (14MB の同種バイナリ) も通常の Git 管理下にあるので、それに揃えた。

### 4.3 バイナリとの差分

| ファイル | MIT (`engine/mit/`) | バイナリ (`lib/`) | 差 |
|---|---|---|---|
| `xr.js` | 1,014,055 | 1,036,552 | ほぼ同じ |
| `xr-tracking.js` / `xr-slam.js` | 3,885,945 | 5,537,864 | **-1.65MB**（SLAM が抜けた分） |
| `xr-face.js` | 7,660,469 | 7,676,409 | ほぼ同じ |
| `resources/` | 9ファイル | 9ファイル | **ファイル名リストは完全一致** |

### 4.4 ⚠️ 重要: チャンク名の落とし穴

**タスク指示の「`data-preload-chunks="slam"` は外す（SLAMは存在しない）」は、この実装では誤り。外すと動かない。**

`reality/app/xr/js/src/chunk-loader.ts` を読むと：

```ts
const chunkName = typeof chunk === 'string' ? chunk : chunk.name
...
} else if (chunkName === 'slam') {
  if (jsxr.XrController) { return }
  const url = urlOverride || `${defaultBaseUrl}xr-tracking.js`   // ← ここ
  const slamChunk = await import(url)
  const {XrControllerFactory} = slamChunk
  jsxr.XrController = await XrControllerFactory(...)
}
```

- `ChunkName` 型は MIT 版でも **`'face' | 'slam'` のまま**。`'tracking'` というチャンク名は存在しない。
- チャンク名 `slam` が **`xr-tracking.js` に解決される**。そしてそれが `XR8.XrController` を生やす。
- つまり **画像認識に `data-preload-chunks="slam"` は必須**。外すと `XR8.XrController` が undefined のまま初期化がハングする（ローディングスピナーが回りっぱなし）。
- 生成物に `xr-slam.js` というファイルは無い。SLAM アルゴリズム自体は確かに入っていない。名前が残っているだけ。

そのため Phase 3 では **`data-preload-chunks="slam"` を残した**。

### 4.5 ライセンスヘッダ

生成された `xr.js` / `xr-tracking.js` / `xr-face.js` の先頭を確認したが、**MIT ヘッダは入っていない**（minify 済みコードがいきなり始まる。`XR ENGINE LICENSE AGREEMENT` の文字列も当然入っていない＝バイナリではないことの裏付けにはなる）。

指示どおり、リポジトリの `LICENSE`（MIT, `Copyright 2026 Niantic Spatial, Inc.`）を **`engine/mit/LICENSE`** としてコピーした。出所を追えるように `engine/mit/README.md` も置いてある。

### 4.6 MIT版に無いもの

`packages/engine/README.md` より、**SLAM / VPS / Hand Tracking は Niantic Spatial のプロプライエタリのままで、MIT版には入っていない**。含まれるのは Image Target / Face / Sky Segmentation とカメラパイプライン。

なお上流 README には、**MIT版の `xr.js` をコアに使いつつ SLAM チャンクだけバイナリの `xr-slam.js` を読ませるハイブリッド構成**が記載されている：

```html
<script src="./engine/mit/xr.js" async data-preload-chunks="slam: ./lib/xr-slam.js"></script>
```

これが使えれば、World/SLAM 系デモもバイナリ依存を `xr-slam.js` 1本（5.5MB）だけに削れる。**未検証**。

---

## 5. 差し替え検証結果（Phase 3）と、実機で確認すべきこと

### 5.1 対象の選定

`demos/print-shop/` 配下の Image Target デモ5本のうち、**平面ターゲット**は `card-demo` / `flyer-demo` / `tshirt-demo` / `can-demo`、**曲面**は `mug-demo`（`curved`/`cylind` の記述あり）。指示の例示どおり **`card-demo`** を選んだ。

`demos/print-shop/card-demo` → **`demos/print-shop/card-demo-mit`** にコピー（**元は残してある**）。同じ階層なので画像ターゲット等の相対パスはそのまま生きる。

### 5.2 変更点（3箇所だけ。演出・モデル・UIは一切触っていない）

1. `<script async src="../../../lib/xr.js" data-preload-chunks="slam">`
   → `<script async src="../../../engine/mit/xr.js" data-preload-chunks="slam">`
   （**`data-preload-chunks="slam"` は 4.4 の理由で残した**）
2. `<head>` の先頭に `<script>window.__XR_ENGINE_LICENSE = 'mit'</script>`
3. `<title>` に `(MIT engine)` を付記（判別用）

### 5.3 デスクトップ確認結果

`python3` のローカルサーバー + headless Chrome。**バイナリ版の `card-demo` と MIT 版の `card-demo-mit` を同じ手順で並べて比較**した。

| 項目 | バイナリ版 `card-demo` | MIT版 `card-demo-mit` |
|---|---|---|
| `typeof XR8` | `object` | **`object`** ✅ |
| `XR8.XrController` | 定義あり | **定義あり** ✅ |
| `XR8.LayersController` | — | 定義あり（Sky はコアにある） |
| 帰属表示ボタン | 表示 | **表示** ✅ |
| モーダル本文 | XR Engine License Agreement 版 | **MIT 版に切り替わっている** ✅ |
| コンソールエラー数 | 9 | **8** |
| **MIT版だけに出るエラー** | — | **0件** ✅ |

**MIT版で新しく発生したエラーはゼロ。** むしろ1件少ない（バイナリ版側の余分な1件は `favicon.ico` の404だった）。

残る8件の内訳は全て**エンジンとは無関係**：
- `cdn.8thwall.com` の `Nunito-SemiBold.woff/.ttf` が CORS で弾かれる（`xrextras.js` 由来）
- `landing-page.js` 関連の `updateEnterInterfaces` TypeError（変更前から存在）
- デモが使っている Wikimedia の地球テクスチャが 400（外部URL、変更前から存在）

つまり **MIT版エンジンへの差し替えは、デスクトップで見る限り無風で通った。**

### 5.4 Nao が実機で確認すべきこと

`https://xr-ar-lab.netlify.app/` 配下（push 後）。**未 push なので、まずローカル or デプロイが必要。**

**(A) 帰属表示 — 全51ページ対象だが、代表としてこの6本**

| URL | 見るところ |
|---|---|
| `/demos/print-shop/card-demo/` | 右下の `ⓘ` が指で押せるか。既存の ← / 📷 / ? / 3つの切替ボタンが全部これまで通り効くか |
| `/templates/buri-slam-demo/` | **最重要**。ピンチ拡縮・ツイスト回転が壊れていないか（`capture:true` のタッチハンドラと同居している） |
| `/templates/face-effects-demo/` | フロントカメラ・顔エフェクトが従来どおりか |
| `/templates/sky-effects-demo/` | 空の置換が従来どおりか |
| `/templates/image-target-demo/` | ターゲット認識が従来どおりか |
| `/templates/print-shop/mug-demo/` | 曲面ターゲットが従来どおりか |

見るべきは3点：**① `ⓘ` が指で開くか ② モーダルの文字が読めるか（小さすぎないか）・URLがタップできるか ③ 既存の操作が何も壊れていないか**。

**(B) MIT版エンジンの実機動作 — ここが本丸**

| URL | 見るところ |
|---|---|
| `/demos/print-shop/card-demo-mit/` | **カメラが起動するか**／**名刺ターゲットを認識するか**／認識後のトラッキングがバイナリ版と比べて安定しているか |
| `/demos/print-shop/card-demo/` | 上の比較対象（バイナリ版）。**2つを並べて見比べるのが一番早い** |

`ⓘ` を開くと **MIT の文面**になっているはずなので、どちらのエンジンで動いているか目視で判別できる。

デスクトップでは「カメラ起動前」までしか検証できていない。**認識精度とトラッキングの安定性は実機でしか分からない。**

**(C) ついでに見ておくと良いもの**

- `card-demo-mit` は `disableWorldTracking` を使っていない（元の `card-demo` を踏襲）。MIT版は SLAM が無いので、World Tracking を要求したときの挙動が違う可能性がある。認識はするがドリフトする、といった症状が出たら `XR8.XrController.configure({disableWorldTracking: true})` を試す価値がある（MIT版の `tracking-controller.ts` に該当オプションは実装されている）。

---

## 6. 所感 — バイナリ依存から抜けるまでに残っている作業

1. **画像認識系12本とFace 2本・Sky 1本は、`engine/mit/` への差し替えだけで抜けられる見込みが高い**（`card-demo-mit` がデスクトップで無風だった。残りは実機での認識精度の確認が主）。
2. **本当のブロッカーは SLAM 系36本** — MIT版に SLAM は無いので、上流 README のハイブリッド構成（MITコア + バイナリの `xr-slam.js` のみ）で依存を 5.5MB に削るか、World Tracking を諦めるかの判断が要る。
3. **並行して `cdn.8thwall.com` からの離脱が必要**（2027-02-28）。`xrextras` は MIT + jsDelivr 配布があるので38ファイルの一行置換で済む可能性が高く、ここが一番費用対効果が良い。

---

## 付録: このブランチのコミット

```
$ git log --oneline license-hardening ^main
3f124fe Add MIT-engine variant of card-demo for license fallback testing
2e8cde4 Add required Niantic Spatial attribution to all AR demos
```

> 補足: リポジトリ直下に **`main` という 0 バイトの野良ファイル**が転がっていて（未追跡）、そのせいで `git log ... ^main` が
> `fatal: ambiguous argument 'main': both revision and filename` で落ちる。上の出力は `^refs/heads/main` で取得した。
> 消して良いファイルだと思われるが、今回のスコープ外なので触っていない。

**push はしていない。** `main` へのマージもしていない。
