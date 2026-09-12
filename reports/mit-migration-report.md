# MIT エンジン移行・持ち越し不具合修正レポート

- リポジトリ: `nao-matsunami/xr-ar-lab` (`~/xr-ar-lab`)
- 作成日: 2026-09-12
- 前提: [`8thwall-license-report.md`](./8thwall-license-report.md) / [`8thwall-cdn-removal-report.md`](./8thwall-cdn-removal-report.md)
- ブランチ: `license-hardening` → `mit-image-targets` → `fix-gestures-and-card` を順に main へマージ・push 済み

**結果:** SLAM を必要としない **22 ページが MIT エンジン**に移行。残り 28 ページはバイナリ維持。
`cdn.8thwall.com` 要求は引き続きゼロ。持ち越しの不具合 3 件（配置誤爆・ピンチ無効・月切り替え／BGM）は全て原因を特定して修正した。

---

## 1. エンジン別ページ一覧

### 1.1 MIT エンジン `engine/mit/xr.js` — 22 ページ

| 分類 | ページ |
|---|---|
| **Image Target (18)** | `demos/print-shop/` … `can-demo` / `card-demo` / `flyer-demo` / `mug-demo` / `tshirt-demo`<br>`templates/print-shop/` … `can-demo` / `card-demo` / `flyer-demo` / `mug-demo` / `tshirt-demo`<br>`templates/` … `canvas-target-demo` / `curved-target-demo` / `image-target-demo` / `multi-target-demo`<br>`samples/` … `alpha-video` / `artgallery` / `flyer` / `threejs/flyer` |
| **Face (2)** | `templates/face-effects-demo/index.html` / `templates/face-effects-demo/debug.html` |
| **Sky (2)** | `templates/sky-effects-demo/index.html` / `samples/sky/index.html` |

各ページは `<head>` 先頭で `window.__XR_ENGINE_LICENSE = 'mit'` を宣言し、
`shared/attribution.js` がこれを見て ⓘ モーダルの文面を MIT 版に切り替える。

### 1.2 バイナリ `lib/xr.js` 維持 — 28 ページ

World/SLAM を使うため MIT 版では成立しないもの。

`samples/`: `animation-mixer` / `babylonjs/placeground` / `capturephoto` / `manipulate` / `placeground` / `portal` / `reactapp/public` / `threejs/placeground` / `threejs/swap-camera` / `threejs/vps` / `tossobject` / `vps`
`templates/`: `alpha-video-demo` / `animation-demo` / `audio-ar-demo` / `buri-slam-demo` / `capture-demo` / `geo-ar-demo` / `gesture-demo` / `himino-e-demo` / `image-target` / `minimal-test` / `occlusion-demo` / `physics-demo` / `portal-demo` / `raw-test` / `world-effects-demo` / `world-slam-demo`

### 1.3 棚卸し表の分類を 3 件修正した

指示は「棚卸し表から Image Target・Face・Sky を列挙」だったが、
**前回の棚卸し表（`8thwall-license-report.md` §1.2）に誤分類が 3 件あった**ので、
各ページとその兄弟 JS を実際に読み直して分類し直した。

| ページ | 旧分類 | 正 | 根拠 |
|---|---|---|---|
| `samples/artgallery` | World/SLAM | **Image Target** | `xrextras-generate-image-targets` + `xrweb="disableWorldTracking: true"` |
| `samples/sky` | World/SLAM | **Sky** | `xrlayers` / `xrlayerscene` を使用 |
| `samples/threejs/flyer` | World/SLAM | **Image Target** | `index.js` で `XrController.configure({disableWorldTracking: true})` を呼ぶ（**マークアップには出ないので HTML だけ見る走査では拾えない**） |

この結果、移行対象は指示の想定（12+2+1=15）より多い **18+2+2=22 ページ**になった。

### 1.4 意図的に除外したページ

**`samples/threejs/swap-camera`** — Face デモだが `data-preload-chunks="face,slam"` で、
背面カメラ側に本物の `WorldScene` を持つ（`initWorldScenePipelineModule.js`）。
MIT 版に SLAM は無いのでバイナリのまま残した。

**`templates/image-target`** — 名前に反して画像ターゲットのマークアップも
`disableWorldTracking` も無く、`xrweb="allowedDevices: any"` だけの素の
ワールドトラッキングページだった。触っていない。

### 1.5 `data-preload-chunks` は一切触っていない

指示どおり。MIT ビルドでもチャンク名 `slam` は `xr-tracking.js` に解決され、
それが `XR8.XrController` を生やす（前回レポート §4.4）。外すと初期化がハングする。

### 1.6 `card-demo-mit` は削除

役目を終えたので削除し、`demos/print-shop/card-demo` 自体を MIT 版にした。
レポート内の過去参照はそのまま残してある。

---

## 2. Face・Sky を含む全ページのヘッドレス結果

`python3 -m http.server` + headless Chrome。**差し替え前（バイナリ）と差し替え後（MIT）を同じ手順で 2 回**測って比較した。

| 指標 | 差し替え前 | 差し替え後 |
|---|---|---|
| 対象ページ | 22 | 22 |
| コンソールエラー総数 | **28** | **28** |
| **エラー内容が変化したページ** | — | **0 / 22** ✅ |
| `typeof XR8` | 全ページ `object` | 全ページ `object` |
| `XR8.XrController` | 全ページ定義あり | 全ページ定義あり |
| `XR8.FaceController` | 全ページ定義あり | 全ページ定義あり |
| `XR8.LayersController` | 全ページ定義あり | 全ページ定義あり |
| `cdn.8thwall.com` 要求 | 0 | **0** |
| `__XR_ENGINE_LICENSE === 'mit'` | — | **22 / 22** |

件数だけでなく**エラー文字列の集合をページ単位で突き合わせ**て、
1 ページも差が無いことを確認している（件数が同じで中身が違う、を潰すため）。

### Face・Sky の判定 — **差し戻し不要**

指示では「Face・Sky は MIT 版で動く保証が無いので、差があれば戻す」だったが、
**4 ページとも差分ゼロ**だった。

- Face 2 ページ: `XR8.FaceController` は MIT の `xr-face.js` に存在し、`face` チャンクで読める
- Sky 2 ページ: `LayersController` は MIT でも**コア側**（`xr.js`）にあり、チャンク不要

したがって差し戻したページは無い。ただし**ヘッドレスはカメラが無いため「初期化が通るか」までしか見ていない**。
顔追従の精度と空の置換の見た目は実機でしか分からないので §5 に確認項目として挙げた。

---

## 3. ジェスチャー実装の方式（`buri-slam-demo`）

### 3.1 方式: **xrextras のコンポーネントを使用**（自作しない）

指示の優先順位どおり、ベンダリング済み `lib/vendor/web/xrextras/xrextras.js` の中身を先に確認した。
必要なものは揃っていた:

| コンポーネント | 実装 |
|---|---|
| `xrextras-gesture-detector` | シーンに既に付いていた。`onefingermove` / `twofingermove` を `positionChange` / `spreadChange` 付きで発火 |
| `xrextras-one-finger-rotate` | `schema:{factor:6}` → `rotation.y += positionChange.x * factor`。**仕様の「横方向の移動量に比例した Y 軸回転」そのもの** |
| `xrextras-pinch-scale` | `schema:{min:.33, max:3, scale:0}` → `spreadChange/startSpread` で倍率を積算し min/max でクランプ |

自作した部分は**タップ判定だけ**（これは xrextras に無いため）。

### 3.2 原因と修正

**(a) 「回転しようと指を動かすと配置と判定される」**

原因: ground の `click` ハンドラが**あらゆるクリックで配置していた**。
A-Frame はドラッグの終わりにもタップと同じく `click` を発火する。
ガードは 2 本指用の `wasPinching` だけで、**1 本指ドラッグは素通り**していた。

修正: `touchstart` / `touchend` で開始位置・時刻を記録し、
**移動量 < 10px かつ時間 < 300ms のときだけ**配置を通す（仕様どおり）。

**(b) 「ピンチでのスケールも効かない」**

原因: 自前の `touchmove` ハンドラが `object3D.scale` を直接叩きつつ同時に
`rotation.y` もツイストしており、さらに別の `onefingermove` ハンドラが
同じモデルを**移動**させていた。3 つが同じオブジェクトを奪い合っていた。

修正: 自前のブロックを丸ごと削除し、上記 2 コンポーネントに委譲。

### 3.3 実装上の勘所 2 つ

**1. コンポーネントは選択中の 1 体にだけ付ける。**
`xrextras-one-finger-rotate` / `-pinch-scale` は **`sceneEl` を購読する**実装なので、
付けた entity が**全部同時に反応する**（最大 5 体置けるので全部回ってしまう）。
`selectModel()` で付与し `deselectModel()` で外すことで、選択中の 1 体だけが反応するようにした。

**2. クランプは「倍率」なので絶対スケールに換算する。**
`pinch-scale` の `min`/`max` は **init 時のスケールに対する倍率**であって絶対値ではない。
仕様の「0.3〜3.0 にクランプ」を絶対スケールとして満たすため、
現在のスケールで割って倍率に直して渡している:

```js
el.setAttribute('xrextras-pinch-scale',
  'scale: ' + cur + '; min: ' + (SCALE_MIN / cur) + '; max: ' + (SCALE_MAX / cur));
```

これで選択→ピンチ→解除→再選択を繰り返しても絶対スケールが 0.3〜3.0 から出ない。
併せて配置時点で wrapper のスケールを設定するようにした（従来は `model-loaded` まで
`1` のままで、換算が誤った値を読むため）。

### 3.4 `capture:true` ハンドラとの衝突について

タップ判定のリスナは `{capture:true, passive:true}` で、**`preventDefault` を一切呼ばない**。
そのため前回確認した帰属表示ボタンの当たり判定を塞がない。
ヘッドレスで ⓘ が最前面に居ること・クリックでモーダルが開くことを再確認済み。

### 3.5 検証（合成タッチイベント）

| 操作 | 期待 | 結果 |
|---|---|---|
| 短く小さくタップ | 配置する | `true` ✅ |
| 大きくドラッグ | **配置しない** | `false` ✅ |
| 長押し（400ms） | 配置しない | `false` ✅ |
| 2 本指 | 配置しない | `false` ✅ |
| `onefingermove` (0.05) | Y 回転 = 0.05×6 | `0.3` rad ✅ |
| ピンチ拡大を連打 | 3.0 で止まる | `3.0` ✅ |
| ピンチ縮小を連打 | 0.3 で止まる | `0.3` ✅ |
| 選択解除後にドラッグ | 回転しない | 回転せず ✅ |

### 3.6 切り替えボタン（ブリ小僧⇄かまぼこ）

**確認したが、既に正しく動いていた。** `toggleModel()` は `currentModel` を反転し、
アイコン（🐟⇄🍥）と枠色を更新する。ヘッドレスで `buri → kamaboko`、
アイコン `🍥`、枠色 `rgb(255,138,128)` への変化を確認。**修正していない。**

---

## 4. `card-demo` の原因

### 4.1 月切り替え — **機能自体が未実装だった**

`switchObject()` は **`// Object switcher (将来拡張用)` というコメント付きのスタブ**で、
ボタンの枠色と文字色を変えるだけ。**3D 側には一切触っていなかった。**
さらにシーンには `earth` しか存在せず、**月もクリスタルも作られていなかった**。

> 指示の切り分け（「イベントが飛んでいないのか／飛んでいるが `visible`・`src` の切り替えが効かないのか」）
> に対する答えは **どちらでもない**。イベントは正しく飛んでいて、
> 切り替える対象が最初から無かった。

修正:
- 既存の `earth` と同じ球ジオメトリを使って **`moon`（灰色）** と **`crystal`（八面体・半透明紫）** を追加
- **外部テクスチャは足していない**。月テクスチャを足すと外部 URL への依存が増え、
  cdn 排除の作業と逆行するため、シーン既存のマテリアル方針（`MeshPhongMaterial`）に合わせた
- `switchObject()` が 3 つの `visible` を切り替え、地球のときだけ大気圏シェルも一緒に出す
- `tick()` は**表示中の天体だけ**自転させる
- アクティブなボタンを `opacity:1` + シアンのグローで明るくする（**文字は追加も変更もしていない**）

### 4.2 BGM — **音声ファイルは元から存在しない**

まず指示どおりファイルの実在とパスを確認した。**`demos/print-shop/card-demo/` に音声ファイルは無く、
リポジトリのどこにも `.mp3`/`.m4a`/`.ogg`/`.wav` は無い。**
つまり「`demos/` 移動でパスが壊れた」のではなく、**最初から音声ファイルを使っていない**。

実体は `playAudienceSound()` — Web Audio API でホワイトノイズを合成して
バンドパスを掛けた**観客の歓声SE**。鳴らなかった原因は:

```js
function playAudienceSound() {
  var ctx = new (window.AudioContext || window.webkitAudioContext)();  // ← 毎回新規
  ...
}
```

`targetFound` のたびに **`AudioContext` を新規生成**していた。
ブラウザはユーザー操作なしに音を鳴らさないので、この context は **`suspended` のまま生成され、
一度も鳴らないままインスタンスだけが増えていく**。

修正（仕様どおり）:
- `AudioContext` は**1 つだけ**遅延生成し、**最初のタップ（シーンのどこでも）で `resume()`**
- 状態を **🔇 / 🔊** のアイコンで表示。**アイコンタップでミュート切り替え**
- `playAudienceSound()` は armed かつ非ミュートかつ `state === 'running'` のときだけ鳴らす
- ヘルプの「観客歓声SE」の一行は**削除**（記号表示に置き換わったため）

検証（`--autoplay-policy=user-gesture-required` 付き）:

| 時点 | アイコン | `soundArmed` | `AudioContext` |
|---|---|---|---|
| ロード直後 | 🔇 | `false` | **未生成** |
| 最初のタップ後 | 🔊 | `true` | `running` |
| アイコンをタップ | 🔇 | — | ミュート |
| もう一度タップ | 🔊 | — | 解除 |

### 4.3 回帰

`card-demo` のコンソールエラーは **2 件 → 2 件で変化なし**。
残る 2 件はいずれも**今回のスコープ外の既存問題**:

- Wikimedia の地球テクスチャが **400**（そのため**地球は現在テクスチャ無しで描画される**）
- A-Frame `vr-mode-ui` の `updateEnterInterfaces`（ヘッドレスで VR デバイスが無いため）

> 地球テクスチャの 400 は「演出（テクスチャ）」の話なので指示の *やらないこと* に該当し、触っていない。
> ただし**テクスチャが出ないと地球と月がどちらも無地の球で見分けづらい**。
> 大気圏シェルの有無とボタンのハイライトで判別はできるが、
> **テクスチャを自前ホストに置き直すのは次の課題**として挙げておく。

---

## 5. Nao が実機で確認する URL（GitHub Pages 本番）

ベース: `https://nao-matsunami.github.io/xr-ar-lab`

| # | URL | 確認項目 |
|---|---|---|
| 1 | `/demos/print-shop/card-demo/` | ⓘ が **MIT の文面**になっているか → 名刺ターゲットを**認識**するか → **🌍/🌙/💎 で表示物が切り替わるか**、アクティブなボタンが明るいか → **最初のタップで歓声が鳴るか**（🔇→🔊）→ **🔊 をタップでミュート/解除**できるか |
| 2 | `/templates/face-effects-demo/` | **MIT 版の Face**。フロントカメラが起動し、顔にエフェクトが追従するか。ⓘ が MIT 文面か |
| 3 | `/templates/sky-effects-demo/` | **MIT 版の Sky**。空が置換されるか、境界が不自然でないか。ⓘ が MIT 文面か |
| 4 | `/templates/buri-slam-demo/` | **タップで配置**できるか → **1 本指ドラッグで回転**するか（**配置が誤爆しないこと**が肝） → **2 本指ピンチで拡縮**するか、大きく/小さくしすぎないか → **🐟/🍥 切り替えボタン**が効くか。※このデモはバイナリのままなので ⓘ は従来文面 |

**共通で見てほしい点**: ⓘ の文面で**エンジン種別が判別できる**こと。
1〜3 は MIT、4 はバイナリ。ここが逆になっていたら差し替えミス。

補足: 2 と 3 は**デスクトップでは初期化が通ることしか確認できていない**。
認識精度・追従の安定・空の見た目は実機が初出の確認になる。

---

## 6. 所感

1. **棚卸し表を信じずに実物を読み直したのが効いた。** 3 件の誤分類のうち `samples/threejs/flyer` は設定が JS 側にあり、HTML だけ見る走査では原理的に拾えなかった。表は出発点として使い、最終判断はコードでやるのが正しい。
2. **持ち越し不具合 3 件は、どれも「壊れた」のではなく「最初から実装されていなかった」。** 月切り替えはスタブ、BGM は毎回 suspended な context を作り直し、ピンチは 3 つのハンドラが同じオブジェクトを奪い合っていた。3 月から直らなかったのは、症状から原因が想像しにくい形だったからだと思う。
3. **残る本丸は SLAM 28 本。** MIT 版に SLAM が無い以上ここは動かせず、買い切り3年ホスティングの観点ではバイナリのライセンス条件が唯一の残リスクとして残っている。

---

## 付録: `git log --oneline -15 main`

```
$ git log --oneline -15 main
74207e7 Fix card-demo object switcher and gate audience SE behind a user gesture
2a187f0 Fix buri-slam-demo gestures: drag rotates instead of placing, pinch scales
8bf9f82 Switch image-target/face/sky demos to MIT engine (SLAM demos stay on binary)
a76ef81 Remove 8i-hologram sample (unrecoverable external deps)
325a972 Re-establish test tunnel, fix same autoupdate bug in tools/tunnel.sh
cd63ffa Update test tunnel URL after cloudflared autoupdate killed the old one
80668c4 Add cdn.8thwall.com removal report
8b01afb Rebuild MIT engine with self-hosted decoder paths
5511937 Vendor xrextras/8frame/landing-page locally, drop cdn.8thwall.com script tags
82a86d0 Add 8th Wall license audit report
3f124fe Add MIT-engine variant of card-demo for license fallback testing
2e8cde4 Add required Niantic Spatial attribution to all AR demos
df59fa9 refactor: buri-slam-demo UI全面整理・操作シンプル化
d5d41c8 fix: groundクリックのレイキャスト処理を削除しシンプルな分岐に変更
0af7377 fix: モデルタップ選択と回転軸ずれを修正
```
