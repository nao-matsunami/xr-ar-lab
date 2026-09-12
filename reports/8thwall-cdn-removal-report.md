# cdn.8thwall.com 依存の排除レポート

- リポジトリ: `nao-matsunami/xr-ar-lab` (`~/xr-ar-lab`)
- 作業ブランチ: `license-hardening`（**push 済み・main へは未マージ**）
- 作成日: 2026-09-08
- 前提レポート: [`reports/8thwall-license-report.md`](./8thwall-license-report.md)

**結論から:** リポジトリのアプリケーションコードから `cdn.8thwall.com` への
**ネットワーク要求はゼロになった**（全52ページをヘッドレス実測）。
残る文字列参照はプロプライエタリバイナリ内の **fetch されない死んだ文字列** と、
元から動作不能な 8i デモ 1 本のみ。

---

## 1. 依存分類表（Phase 0）

### 1.1 URL 単位の棚卸し（変更前 = コミット `82a86d0` 時点）

`vendor/`（上流クローン、未追跡）を除いた **62 ファイル・のべ 170 参照**。
URL でユニーク化すると 15 種類：

| URL (`https://cdn.8thwall.com/` 以下) | 種別 | 参照ファイル数 | 版 |
|---|---|---:|---|
| `web/xrextras/xrextras.js` | xrextras | **51** | CDN 配信版（版番号なし） |
| `web/landing-page/landing-page.js` | landing-page | **46** | 同上 |
| `web/aframe/8frame-1.3.0.min.js` | 8frame | **42** | A-Frame 1.3.0 |
| `web/resources/draco_wasm_wrapper-l325u8do.js` | エンジン内部 | 8 | 内容ハッシュ付き |
| `web/resources/draco-worker-l5sniji5.js` | エンジン内部 | 8 | 内容ハッシュ付き |
| `web/coaching-overlay/coaching-overlay.js` | その他(UI) | 4 | CDN 配信版 |
| `web/assets/cube-texture.png` | その他(素材) | 2 | — |
| `web/assets/8i/Odyssey_S46B_T01_...hvrs` | その他(素材) | 2 | — |
| `web/assets/8i/Web600_ANIMALS2-...hvrs` | その他(素材) | 1 | — |
| `web/assets/video/alpaca.mp4` | その他(素材) | 1 | — |
| `web/aframe/8frame-1.1.0.min.js` | 8frame | 1 | A-Frame 1.1.0 |
| `web/aframe/8frame-1.4.1.min.js` | 8frame | 1 | A-Frame 1.4.1 |
| `web/aframe/8frame-1.5.0.min.js` | 8frame | 1 | A-Frame 1.5.0 |
| `web/aframe/aframe-extras-6.1.1.min.js` | その他(lib) | 1 | aframe-extras 6.1.1 |
| `web/aframe/aframe-physics-system-4.0.1.min.js` | その他(lib) | 1 | aframe-physics-system 4.0.1 |

> 前回レポートは「55 ファイル」と書いていたが、これは `.html`/`.js` に限った
> 概算だった。今回スクリプト参照だけでなく素材 URL も含めて数え直した結果が
> **62 ファイル**。差は 8i の `.hvrs` や画像素材を拾ったぶん。

### 1.2 8frame の版が混在している 3 ファイル

| ファイル | 版 |
|---|---|
| `samples/tossobject/index.html` | 1.1.0 |
| `samples/sky/index.html` | 1.4.1 |
| `samples/vps/index.html` | 1.5.0 |

**統一しなかった。** 残り 42 ファイルは 1.3.0。A-Frame は 1.1→1.5 の間に
コンポーネントのライフサイクルとマテリアル周りに破壊的変更が入っており、
これらは上流 8th Wall のサンプルが**その版を明示的にピン留めしている**。
「cdn 依存の排除」というスコープの外で演出が壊れるリスクを取る理由がないため、
**4 版すべてをそのままベンダリング**した（計 4 ファイル・約 5.6MB）。
統一は必要になった時点で個別に回帰確認して行うべき、別タスク。

### 1.3 エンジンバイナリ / MIT 版が内部で持つ URL

`grep -o "https://cdn.8thwall.com[^\"' ]*"` の結果：

| ファイル | 内部 URL | 用途 |
|---|---|---|
| `lib/xr.js`（バイナリ） | `web/resources/draco-worker-l5sniji5.js`<br>`web/resources/draco_wasm_wrapper-l325u8do.js` | Draco デコーダ |
| `lib/xr-slam.js`（バイナリ） | 同上 | 同上 |
| `lib/xr-face.js`（バイナリ） | 同上 | 同上 |
| `lib/resources/semantics-worker.js`（バイナリ） | 同上 | 同上 |
| `engine/mit/*.js`（MIT 版・変更前） | 同上 | 同上 |

**両者ともまったく同じ 2 つの URL のみ**で、それ以外の内部参照は無い。
この 2 つが実際には fetch されないことの検証は §4 に書いた。

---

## 2. ベンダリングしたファイル一覧（Phase 1）

すべて `lib/vendor/` 配下。**45 ファイル / 9.9MB**。
`web/` 以下は **cdn.8thwall.com のパス構造をそのまま鏡像化**してある
（`https://cdn.8thwall.com/web/X` → `/lib/vendor/web/X`）。
これにより `xrextras.js` 内部に埋め込まれた CSS の `url()` や HTML の `src=` を
**単一の文字列置換だけ**で書き換えられた。

| グループ | 件数 | 出所 | ライセンス |
|---|---:|---|---|
| `web/xrextras/xrextras.js` | 1 | `cdn.8thwall.com`（2026-09-07 取得, HTTP 200） | **MIT**（`github.com/8thwall/8thwall` の `packages/xrextras/LICENSE` で本文確認） |
| `web/coaching-overlay/coaching-overlay.js` | 1 | 同上 | **MIT**（同 `packages/coaching-overlay/LICENSE`） |
| `web/aframe/*`（8frame 1.1.0/1.3.0/1.4.1/1.5.0, aframe-extras 6.1.1, aframe-physics-system 4.0.1, stats.js r16） | 7 | 同上 | **MIT**（バンドル内 `"license":"MIT"` / npm registry で確認） |
| `web/fonts/*`（Nunito, Varela Round, Raleway） | 10 | 同上 | **SIL OFL 1.1** |
| `web/img/**`（loading / almost-there / mediarecorder / runtimeerror の UI 画像） | 20 | 同上 | 8th Wall (Niantic Spatial) の UI アセット。xrextras/MIT の一部として配布 |
| `web/assets/`（`cube-texture.png`, `video/alpaca.mp4`） | 2 | 同上 | 8th Wall サンプル素材 |
| `web/resources/`（Draco wrapper / worker） | 2 | 同上 | **Apache-2.0**（Google Draco） |
| `qrcode-generator/qrcode.js` | 1 | npm `qrcode-generator@2.0.4` tarball | **MIT**（Kazuhiko Arase）。依存ゼロ |

**MIT 以外だったもの**: フォント（OFL 1.1）と Draco（Apache-2.0）。
どちらも再配布可能な許容的ライセンスなので自前ホストを止める理由はない。
`aframe-physics-system` 同梱の ammo.js は zlib。
**差し替えを中止すべきものは無かった。**

詳細は [`lib/vendor/LICENSES.md`](../lib/vendor/LICENSES.md)。

> **jsDelivr は使っていない。** 取得元としても使ったのは
> `qrcode-generator` の npm tarball のみで、実行時の依存先はすべて自前ホスト。

### 2.1 相対パスの置換

51 ファイルの `<script src="https://cdn.8thwall.com/...">` を `lib/vendor/` への
相対パスへ置換。深さは各ファイルの階層に合わせた（前回 `attribution.js` で
使った計算を流用）。

**検証: リポジトリ全体の `<script src>` 相対参照 327 本すべてがディスク上で解決する**
ことをスクリプトで確認済み（未解決 0 件）。

その過程で `samples/reactapp/public/index.html` の既存バグを 1 件直した。
このファイルはエンジンと帰属表示の参照が `../../`（1 階層浅い）で、
前回レポート §3.4 に「元から壊れている」と記録されていたもの。今回
ベンダリングした行が正しい `../../../` になったことで**同一ファイル内で
深さが食い違い**、xrextras だけ読めてエンジンは読めないという中途半端な
状態になってしまうため、`../../../` に揃えた。静的配信でページが完全に成立するようになる。

---

## 3. `landing-page.js` の扱いと理由（Phase 1-4）

### 3.1 判断: **不採用**（(b) 自前の最小ランディングに置き換え）

`landing-page.js` を取得して中身を精査した結果、**外部依存が中核にあった**：

| 依存先 | 何に使っているか |
|---|---|
| `https://8th.io/qr` | **QR コードを画像として取得**。ランディングの中核機能そのもの |
| `cdn.jsdelivr.net`（three.js r131） | デスクトップ用 3D プレビュー |

`8th.io` は **8th Wall 自身のインフラ**なので、`cdn.8thwall.com` と同時に
消える可能性が高い。「消える CDN への依存をゼロにする」のが今回の目的なので、
依存先を `8th.io` に付け替えるのは意味がない。(a) の「依存しない範囲だけ使う」も、
QR が中核である以上ほぼ何も残らない。

→ **`shared/landing.js`（107行, 新規）に置き換えた。**

- デスクトップ検出時のみオーバーレイを表示（モバイルでは何もしない）
- 現在 URL の QR を **ブラウザ内でインライン SVG として生成**（`qrcode-generator`, MIT, 依存ゼロ）
- **外部通信は一切なし**
- 文字は記号のみ（`📱 ←` と閉じる `×`）。**日本語・英語の文章は置いていない**（指示どおり）
- `z-index: 9990` — 前回の `shared/attribution.js`（9999）より下。**attribution.js は一切変更していない**

さらに、vendored `xrextras.js` の "almost there" 画面も `8th.io/qr` を叩いていたため、
`window.__xrQrSvg` フックを `shared/landing.js` 側に用意して差し替えた。

**検証: ベンダリング後の `lib/vendor/web/xrextras/xrextras.js` に残る絶対 URL は 0 件**
（`grep -o "https\?://[a-zA-Z0-9.-]*"` の結果が空）。

### 3.2 併せて不採用にしたもの

- `web/assets/envmap/*`（5ファイル, 約1.25MB）— `landing-page.js` 専用だったため

---

## 4. エンジン内部参照の結果（Phase 2）

### 4.1 バイナリ側 — **設定変更も Service Worker も不要だった**

結論: **`lib/xr.js` は cdn.8thwall.com へ一切リクエストを出さない。**
埋め込まれた 2 つの Draco URL は **例外メッセージの中にしか使われない死んだ文字列**。

バイナリを読むと、リソース URL の解決子が 2 種類ある：

```js
hI = A => () => wI() + A                      // 実際に URL を組み立てる
dI = A => () => { throw new Error(`[XR] Resource "${A}" is not supported in this environment.`) }
```

Draco の 2 つは **`dI` でラップされている**：

```js
resolvePoweredLogo: hI("resources/powered-by.svg"),          // ← 実 fetch
resolveDracoWorker: dI("https://cdn.8thwall.com/web/resources/draco-worker-l5sniji5.js"),   // ← 例外を投げるだけ
resolveDracoWrapper: dI("https://cdn.8thwall.com/web/resources/draco_wasm_wrapper-l325u8do.js"),
```

つまり **URL は「サポートされていない」というエラー文言に埋め込まれているだけ**で、
呼ばれた瞬間に throw する。ネットワークには出ない。
**実測でも全52ページで cdn への要求は 0 件**（§5）だったため、これは裏付けが取れている。

→ **`XR8` の公開 API に読み込み先を差し替える設定は不要。Service Worker も不要。**
バイナリを改変しないという制約と矛盾せずに目的が達成できている。
（Nao の「SW は複雑さが跳ねるので非推奨」という見立ては正しく、そもそも出番が無かった。）

Draco 圧縮 GLB を読む必要が出た場合は、`templates/buri-slam-demo` が既にやっているように
**three.js 側の `DRACOLoader` にデコーダパスを渡す**のが正攻法（このリポジトリで
実績のある方法）。エンジン内蔵の Draco 経路はそもそも標準ビルドで無効。

### 4.2 MIT 側 — パッチ適用のうえ再ビルド済み

`~/build/8thwall` のソースを grep したところ、cdn URL は
`reality/app/xr/js/src/resources.ts` の 2 行だけがソース定数だった。

パッチ `engine/mit/PATCHES/0001-self-hosted-draco-paths.patch`:

```diff
-  resolveDracoWorker: unsupported('https://cdn.8thwall.com/web/resources/draco-worker-l5sniji5.js'),
-  resolveDracoWrapper: unsupported('https://cdn.8thwall.com/web/resources/draco_wasm_wrapper-l325u8do.js'),
+  resolveDracoWorker: unsupported('/lib/vendor/web/resources/draco-worker-l5sniji5.js'),
+  resolveDracoWrapper: unsupported('/lib/vendor/web/resources/draco_wasm_wrapper-l325u8do.js'),
```

**この変更は動作を変えないコスメティックなもの**（`unsupported()` は上記 `dI` と同じ
throw するだけの関数）。目的は「リポジトリを grep したときにゼロになること」と
「将来この経路が有効化されたときに自前ホストを指していること」の 2 点。
実ファイルは `lib/vendor/web/resources/` に配置済み。

ビルド結果:

| 項目 | 値 |
|---|---|
| 再ビルド | 成功。bazel キャッシュが効いて **約43秒 / 8アクション**（前回の初回フルビルドは41分） |
| `engine/mit/` の `cdn.8thwall.com` 出現数 | `xr.js` 0 / `xr-tracking.js` 0 / `xr-face.js` 0 / `resources/*.js` 0 — **全ファイル 0** |
| `card-demo-mit` の cdn 要求 | **0 件**（実測、§5） |
| `card-demo-mit` の初期化 | `XR8` = object, `XR8.XrController` = object, `a-scene` あり — バイナリ版と同一 |

再ビルド手順は `engine/mit/README.md` に追記済み。

> **注意（既知の制約）**: パッチのパスは `/lib/vendor/...` とルート相対。
> サイトをドメイン直下に配信する前提（Netlify の現構成はこれ）。サブパス配信に
> する場合はここを直す必要がある。ただし前述のとおりこの経路は fetch されないので、
> 実害が出るのは Draco 経路が有効化された将来だけ。

---

## 5. 差し替え後の `cdn.8thwall.com` 残存数

### 5.1 ネットワーク要求: **0 件（目標達成）**

ヘッドレス Chrome で **エンジンを読み込む全 52 ページ**を実際に開き、
`cdn.8thwall.com` 宛のリクエストを全数記録した結果：

| 指標 | 結果 |
|---|---|
| 対象ページ | **52**（前回 51 + `card-demo-mit`） |
| **cdn.8thwall.com へのリクエスト総数** | **0** ✅ |
| cdn へリクエストしたページ | **0 件** ✅ |
| `typeof XR8 === 'object'` | **50 / 52** |
| コンソールエラー総数 | 56 |

`XR8` を取れなかった 2 件は `samples/vps` と `samples/threejs/vps` で、
**前回レポート §3.4 で「変更前から同一のタイムアウト」と記録済みの 2 本**。
今回も同じ症状（メインスレッドが張り付き `Runtime.callFunctionOn` が返らない）。
**前回と同じ状態なので指示どおり合格扱い**。

> ログ上「ナビゲーションが `networkidle2` に到達しない」ページが 39 件あるが、
> これは**計測条件の副作用**。AR ページは rAF とカメラパイプラインで常時ビジーなので
> `networkidle2` は原理的に発火しない。`domcontentloaded` で測り直した
> スポットチェックでは下記のとおり全項目が成立している。

代表 3 ページの DOM 実測（`domcontentloaded` + 4秒待ち）:

| ページ | `XR8` | `XrController` | `AFRAME` | `a-scene` | ⓘ帰属 | 新landing | cdn要求 |
|---|---|---|---|---|---|---|---|
| `demos/print-shop/card-demo/` | object | object | object | ✅ | ✅ | ✅ | **0** |
| `demos/print-shop/card-demo-mit/` | object | object | object | ✅ | ✅ | ✅ | **0** |
| `templates/buri-slam-demo/` | object | object | object | ✅ | ✅ | ✅ | **0** |

### 5.2 コンソールエラーは前回から**減った**

`card-demo` は前回レポート §3.3 時点で **9 件** → 今回 **2 件**。
cdn 由来のフォント CORS エラーと `landing-page.js` の 400 が消えたぶん。

残る 56 件の内訳（新規エラーはゼロ）:

| 件数 | 内容 | 判定 |
|---:|---|---|
| 38 | `TypeError: ... reading 'updateEnterInterfaces'` | **A-Frame 本体（`vr-mode-ui` コンポーネント）の内部**。ヘッドレスで VR デバイスが無く `enterVREl` が null。`8frame-*.min.js` に元から存在し、CDN 配信版でも同じ。前回レポートでも計上済み |
| 4 | 404 | デモ固有の欠損アセット（変更前から） |
| 4 | `... reading 'configure'` | カメラ未許可のヘッドレス環境由来 |
| 2 | `%PUBLIC_URL%/manifest.json` 404 | CRA テンプレートの未展開プレースホルダ（元から） |
| 2 | 400 | デモが参照する外部 URL（Wikimedia の地球テクスチャ等、変更前から） |
| 6 | セッションマネージャ / 投影行列など | カメラ未許可のヘッドレス環境由来 |

### 5.3 文字列としての残存: 5 ファイル（すべて意図的）

| ファイル | 残る理由 |
|---|---|
| `lib/xr.js` | **バイナリ。ライセンスで改変禁止。** §4.1 のとおり fetch されない死んだ文字列 |
| `lib/xr-slam.js` | 同上 |
| `lib/xr-face.js` | 同上 |
| `lib/resources/semantics-worker.js` | 同上 |
| `samples/threejs/8i-hologram/index.js` | 下記 |

`vendor/`（上流クローンの未追跡ディレクトリ）は配信対象外なので除外。

#### `samples/threejs/8i-hologram/` について — **Nao の判断待ち**

このデモだけは cdn 依存を外せなかった。理由は 2 つ：

1. 再生する `.hvrs` ホログラムが **cdn.8thwall.com にしか無く、2 ファイルで約 95MB**。
   LFS 未使用のこのリポジトリに入れるにはサイズが大きすぎる。
2. そもそも再生に必要な `player.8i.com`（8i 社の Web Playback SDK）は
   **cdn.8thwall.com とは無関係の第三者ホストで、8i 社は既にサービス終了**。
   アセットを取り込んでも**このデモは動作しない**。

つまりこれは cdn 移行では救えず、`.hvrs` を持ってきても直らない。
**今回は削除せず残置**し、`xrextras.js` の参照だけ `lib/vendor/` に差し替え、
`index.js` 冒頭に KNOWN-DEAD の注記を入れた。

> 作業途中の一時点でこのデモを削除する変更が入っていたが、**削除は依頼に含まれていない**ため
> 元に戻した。印刷屋プロダクトでは未使用なので**削除しても実害は無い見込み**だが、
> リポジトリからサンプルを消すかどうかは Nao が決めること。**削除してよければ次回まとめて消す。**

---

## 6. 実機テスト（Phase 4）

ブランチは `origin/license-hardening` に **push 済み**（main へは未マージ）。
GitHub Pages は main しか配信しないため、ローカル配信 + Cloudflare トンネルを立ててある。

### 6.1 開く URL（この順で）

**ベース URL（2026-09-12 時点で稼働中）: `https://maria-atom-drilling-set.trycloudflare.com`**

> ⚠️ **この URL は使い捨てで、頻繁に変わる。**（§6.2 に立て直し手順）
> ここまでに 2 回失効している — 1 回目は cloudflared の自動アップデート（24時間後）、
> 2 回目はマシンのスワップ枯渇による OOM で http.server ごと停止。
> **URL が死んでいたら §6.2 のコマンドで立て直して、新しい URL を使えばよい。**
> 確認すべきパスは URL が変わっても同じ。

| # | URL | 確認項目 |
|---|---|---|
| 1 | `/demos/print-shop/card-demo/` | **バイナリ版**。ⓘモーダルが *XR Engine License Agreement* 版であることを確認 → 名刺ターゲットの認識までの秒数を数える → 追従が安定しているか |
| 2 | `/demos/print-shop/card-demo-mit/` | **MIT版**。ⓘモーダルが *MIT* 版に変わっていることでエンジン種別を判別 → 1 と同じ名刺で認識秒数を比較 → 追従の安定を 1 と見比べる |
| 3 | `/templates/buri-slam-demo/` | **cdn 差し替え後の SLAM 回帰**。カメラ起動 → 面認識 → ピンチ拡縮・ツイスト回転が従来どおり効くか（`capture:true` のタッチハンドラは未変更） |

**前回レポート §5.4 の残り**（帰属表示の実機確認、今回のベンダリング後も再確認）:

| # | URL | 確認項目 |
|---|---|---|
| 4 | `/templates/face-effects-demo/` | フロントカメラ・顔エフェクトが従来どおりか（`xrextras` 差し替えの影響を最も受けやすい） |
| 5 | `/templates/sky-effects-demo/` | 空の置換が従来どおりか（`coaching-overlay.js` をベンダリングした唯一系統） |
| 6 | `/templates/image-target-demo/` | ターゲット認識が従来どおりか |
| 7 | `/templates/print-shop/mug-demo/` | 曲面ターゲットが従来どおりか |
| 8 | `/demos/print-shop/card-demo/` | ⓘが指で押せるか・文字が読めるか・URL がタップできるか／既存の ← 📷 ? と切替ボタンが全部これまで通り効くか |

**全ページ共通で見てほしい 1 点**: ローディング画面とアイコンが**以前と同じ見た目で出るか**。
ローディング UI の画像・フォントは cdn から `lib/vendor/` に移したので、
ここが崩れていたら取り込み漏れ。

> コンソールは `chrome://inspect`（Android）/ Safari の Web インスペクタ（iOS）で見る。
> **`cdn.8thwall.com` へのリクエストが 1 本でも出ていたら報告してほしい**（デスクトップ実測では 0 件）。
> デスクトップで開くと QR オーバーレイ（自前の `shared/landing.js`）が出るので、
> それをスマホで読めばそのページに飛べる。

### 6.2 停止コマンド

プロセスは**起動したまま残してある**（http.server 8080 と cloudflared）。
不要になったら:

```bash
pkill -f "http.server 8080"; pkill -f "cloudflared tunnel"
```

> トンネル URL は cloudflared を再起動すると変わる。PC がスリープすると切れる。
> 立て直す場合は `nohup python3 -m http.server 8080 > /tmp/xr-http.log 2>&1 &` と
> `nohup cloudflared tunnel --no-autoupdate --url http://localhost:8080 > /tmp/xr-tunnel.log 2>&1 &` を
> リポジトリルートで実行し、後者のログから `https://*.trycloudflare.com` を拾う。
>
> **`--no-autoupdate` を必ず付けること。** 最初に立てたトンネルは
> ちょうど 24 時間後に cloudflared の自動アップデートが走り、
> `ERR Initiating shutdown error="cloudflared has been updated to version 2026.8.3"`
> で**自分から落ちた**（exit 11）。
> 同じ穴が `tools/tunnel.sh` にも空いていたので、そちらにもフラグを追加した。
>
> **トンネルは長期運用向けではない。** 2 回目の失効は
> マシンのスワップ枯渇（4.0Gi 全消費）で OOM killer が
> `http.server` と `cloudflared` を巻き添えにしたもの。
> どちらも数十MB のプロセスなので原因は別にあるが、いずれにせよ
> **実機確認は立てたその場で一気に済ませるのが吉**。

---

## 7. 所感

1. **一番の収穫は「バイナリが Draco を実際には fetch していない」と確定できたこと。** 前回「エンジン内部の cdn 参照をどう外すか」を最大の未解決事項として残したが、実体は throw するだけの死んだ文字列で、Service Worker も設定差し替えも不要だった。買い切り商品の耐用年数を脅かす要因が 1 つ丸ごと消えた。
2. **`landing-page.js` を捨てて自作したのが結果的に正解だった。** これが `8th.io/qr` を叩いていた（=乗り換え先も同時に死ぬ）ことは中身を読むまで分からず、jsDelivr に差し替えるだけの方針だったら 2027-02-28 に道連れで壊れていた。
3. **残課題は 8i デモの可否判断だけで、それも印刷屋プロダクトには無関係。** 一方で SLAM 36本のバイナリ依存（前回 §6-2）は手つかずのままなので、「3年ホスティング」の本丸は依然そちら。

---

## 付録: このブランチのコミット

```
$ git log --oneline license-hardening ^main
8b01afb Rebuild MIT engine with self-hosted decoder paths
5511937 Vendor xrextras/8frame/landing-page locally, drop cdn.8thwall.com script tags
82a86d0 Add 8th Wall license audit report
3f124fe Add MIT-engine variant of card-demo for license fallback testing
2e8cde4 Add required Niantic Spatial attribution to all AR demos
```
