# MIT-licensed 8th Wall engine (self-built)

Built from source, **not** the distributed engine binary.

| | |
|---|---|
| Source | https://github.com/8thwall/8thwall |
| Commit | `519b988136d2d22a40405f2ab7f3b04823003c45` (`519b988`) |
| Built | 2026-09-07 |
| Bazel | 7.2.1 (via bazelisk, pinned by `.bazelversion`) |
| Command | `bazel build --config=wasmreleasesimd //reality/app/xr/js:bundle` |
| Build time | 2442 s / 4273 actions |
| License | MIT — see `LICENSE` (copied from the source repo; the minified artifacts carry no header of their own) |

## What this does and does not contain

Included: Image Target tracking, Face tracking, Sky segmentation, the camera pipeline.
**Not** included: SLAM, VPS, Hand Tracking — those remain proprietary to Niantic Spatial
and only exist in the distributed binary (`lib/xr-slam.js`).

## Chunk naming

`data-preload-chunks="slam"` is **still required** for image targets. In this build the
chunk name `slam` resolves to **`xr-tracking.js`** (see `reality/app/xr/js/src/chunk-loader.ts`),
which is what defines `XR8.XrController`. There is no `xr-slam.js` here.
Dropping the attribute leaves `XR8.XrController` undefined and initialization hangs.

## Size comparison against the binary in `lib/`

| File | MIT (this dir) | Binary (`lib/`) |
|---|---|---|
| `xr.js` | 1,014,055 | 1,036,552 |
| `xr-tracking.js` / `xr-slam.js` | 3,885,945 | 5,537,864 |
| `xr-face.js` | 7,660,469 | 7,676,409 |

`resources/` is the same file set as `lib/resources/`.

---

## 再ビルド手順（パッチ適用込み）

```bash
git clone --depth 1 https://github.com/8thwall/8thwall.git ~/build/8thwall
cd ~/build/8thwall
git apply /path/to/xr-ar-lab/engine/mit/PATCHES/0001-self-hosted-draco-paths.patch
bazel build --config=wasmreleasesimd //reality/app/xr/js:bundle
unzip -o bazel-bin/reality/app/xr/js/bundle.zip -d /path/to/xr-ar-lab/engine/mit/
```

初回ビルドは約41分（4,273アクション）。bazelキャッシュが温まっていれば
JSバンドルの再生成のみで **約43秒 / 8アクション**。

## パッチ

### `PATCHES/0001-self-hosted-draco-paths.patch`

`reality/app/xr/js/src/resources.ts` の `resolveDracoWorker` /
`resolveDracoWrapper` が持つ `cdn.8thwall.com` のURL文字列を、自前ホストの
`/lib/vendor/web/resources/` に向ける。

**注意: これは動作を変えないコスメティックな変更。** この2つは
`unsupported()` でラップされており、実体は

```js
const unsupported = (resource: string) => () => {
  throw new Error(`[XR] Resource "${resource}" is not supported in this environment.`)
}
```

つまり**URLは投げられる例外のメッセージにしか使われず、fetchは一度も走らない**
（配布バイナリ `lib/xr.js` 側も同じ `dI=A=>()=>{throw new Error(...)}` で同一）。
パッチの目的は、リポジトリを `cdn.8thwall.com` で grep したときにゼロになること、
および将来この機能が有効化されたときに自前ホストを指していること。
実ファイルは `lib/vendor/web/resources/` に配置済み。


---

## どのページが MIT 版を使っているか

2026-09-12 以降、**Image Target / Face / Sky の 22 ページは MIT 版**、
**World/SLAM の 28 ページはバイナリ `lib/xr.js`** というハイブリッド構成。
MIT 版には SLAM アルゴリズムが入っていないため、平面検出・ワールドトラッキングを
使うデモはバイナリのままにしてある。

### 判別方法 1: ソース

```bash
# MIT 版を読んでいるページ
grep -rl "engine/mit/xr.js" --include=index.html --include=debug.html .

# バイナリを読んでいるページ
grep -rl "lib/xr.js" --include=index.html . | grep -v vendor/
```

### 判別方法 2: 実行時フラグ

MIT 版のページは `<head>` の先頭で次を宣言している:

```html
<script>window.__XR_ENGINE_LICENSE = 'mit'</script>
```

ブラウザのコンソールで `window.__XR_ENGINE_LICENSE` を評価すると、
MIT 版なら `'mit'`、バイナリなら `undefined` が返る。

### 判別方法 3: ⓘ モーダルの文面

`shared/attribution.js` はこのフラグを見てライセンス文面を切り替える。
右下の ⓘ を開いたとき:

| 表示 | エンジン |
|---|---|
| **MIT License** の文面 | `engine/mit/` |
| **XR Engine License Agreement**（Niantic Spatial）の文面 | `lib/xr.js` |

実機で「今どちらのエンジンで動いているか」を確認する一番早い方法がこれ。

### 注意

- `data-preload-chunks="slam"` は **MIT 版でも外さないこと**。チャンク名 `slam` は
  `xr-tracking.js` に解決され、それが `XR8.XrController` を生やす（§4.4 の落とし穴）。
- `samples/threejs/swap-camera/` は Face と World の両方を使うため、
  Face デモだがバイナリのまま。MIT 版に SLAM が無く、背面カメラの WorldScene が成立しない。
