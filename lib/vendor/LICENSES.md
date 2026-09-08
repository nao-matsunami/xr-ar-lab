# lib/vendor — 出所とライセンス

`cdn.8thwall.com` は **2027-02-28 に停止**する。ここに置いてあるファイルは、
その日以降もデモが動くように**すべて自前ホストへ取り込んだもの**。
第三者CDN（jsDelivr 等）も恒久的な依存先にはしていない。取得元として使っただけ。

取得日: **2026-09-07**（全ファイル HTTP 200 で取得。取得時点では cdn.8thwall.com は生きていた）

## ディレクトリ構成

`web/` 以下は **cdn.8thwall.com のパス構造をそのまま鏡像化**している。
（`https://cdn.8thwall.com/web/X` → `/lib/vendor/web/X`）
こうすることで、`xrextras.js` 内部に埋め込まれた CSS の `url()` や HTML の
`src=` を、**単一の文字列置換だけで**書き換えられる。

## ライセンス一覧

| ファイル | 出所 | 版 | ライセンス | 確認方法 |
|---|---|---|---|---|
| `web/xrextras/xrextras.js` | `cdn.8thwall.com/web/xrextras/xrextras.js` | CDN配信版 | **MIT** | `github.com/8thwall/8thwall` の `packages/xrextras/LICENSE`（Copyright 2026 Niantic Spatial, Inc.）でMIT本文を確認 |
| `web/coaching-overlay/coaching-overlay.js` | `cdn.8thwall.com/web/coaching-overlay/coaching-overlay.js` | CDN配信版 | **MIT** | 同上 `packages/coaching-overlay/LICENSE`（Copyright 2025 Niantic Spatial, Inc.） |
| `web/aframe/8frame-1.1.0.min.js` | `cdn.8thwall.com/web/aframe/` | A-Frame 1.1.0 | **MIT** | バンドル内 `"license":"MIT"` |
| `web/aframe/8frame-1.3.0.min.js` | 同上 | A-Frame 1.3.0 (2022-02-04, commit cc3516ce) | **MIT** | バンドル内 `"license":"MIT"` / npm `aframe@1.3.0` = MIT |
| `web/aframe/8frame-1.4.1.min.js` | 同上 | A-Frame 1.4.1 | **MIT** | 同上 |
| `web/aframe/8frame-1.5.0.min.js` | 同上 | A-Frame 1.5.0 | **MIT** | 同上 |
| `web/aframe/aframe-extras-6.1.1.min.js` | 同上 | aframe-extras 6.1.1 | **MIT** | npm registry `aframe-extras@6.1.1` → `license: MIT`（Don McCurdy） |
| `web/aframe/aframe-physics-system-4.0.1.min.js` | 同上 | aframe-physics-system 4.0.1 | **MIT** | npm registry `aframe-physics-system@4.0.1` → `license: MIT`。同梱の cannon.js は MIT、ammo.js は zlib（いずれも許容的） |
| `web/aframe/stats.16.min.js` | 同上 | stats.js r16 | **MIT** | ファイル先頭に `// stats.js - http://github.com/mrdoob/stats.js`、npm `stats.js` = MIT |
| `qrcode-generator/qrcode.js` | npm `qrcode-generator@2.0.4` (tarball) | 2.0.4 | **MIT** | ファイル先頭にMITヘッダ（Copyright (c) 2009 Kazuhiko Arase）。依存ゼロ |
| `web/fonts/*` (10ファイル) | `cdn.8thwall.com/web/fonts/` | — | Nunito / Varela Round / Raleway = **SIL Open Font License 1.1** | いずれもGoogle Fonts由来の定番書体。xrextras のUIが参照 |
| `web/img/**` (18ファイル) | `cdn.8thwall.com/web/img/` | — | 8th Wall (Niantic Spatial) のUIアセット。xrextras/MIT の一部として配布されているもの | ローディング/almost-there/mediarecorder/runtimeerror のUI画像 |
| `web/assets/cube-texture.png` | `cdn.8thwall.com/web/assets/` | — | 8th Wall サンプル用アセット | `samples/sky`, `samples/threejs/swap-camera` が参照 |
| `web/assets/video/alpaca.mp4` | 同上 | — | 8th Wall サンプル用アセット | `samples/alpha-video` が参照 |
| `web/resources/draco_wasm_wrapper-l325u8do.js` | `cdn.8thwall.com/web/resources/` | — | Draco (Google) = **Apache-2.0** | エンジンの `resolveDracoWrapper` 用。現状エンジンは実際にはfetchしない（下記） |
| `web/resources/draco-worker-l5sniji5.js` | 同上 | — | 同上 | 同上 |

**MIT以外だったもの**: フォント（OFL 1.1）と Draco（Apache-2.0）。どちらも
再配布可能な許容的ライセンスなので、自前ホストを止める理由はない。
`aframe-physics-system` が同梱する ammo.js は zlib ライセンス。
**差し替えを中止すべきものは無かった。**

## 削除したもの

### `web/landing-page/landing-page.js`（取得したが不採用）

8th Wall の `landing-page.js` は、デスクトップ向けランディングの**中核である
QRコードを `https://8th.io/qr` から画像として取得**しており、さらに 3Dプレビュー用に
`cdn.jsdelivr.net` から three.js r131 を読む。どちらも外部ホストで、
`8th.io` は 8th Wall 自身のインフラなので cdn.8thwall.com と同時に消える可能性が高い。

→ **不採用**とし、依存ゼロの `shared/landing.js` + `qrcode-generator`（MIT）で
置き換えた。QRはブラウザ内でSVGとして生成するので、外部通信は一切ない。

### `web/assets/envmap/*`（5ファイル, 約1.25MB）

`landing-page.js` だけが参照していたため、不採用に伴い削除。

### `web/assets/8i/*`（2ファイル, 約95MB）— **取り込み見送り（デモは残置）**

`samples/threejs/8i-hologram/` だけが参照していた。取り込まなかった理由:

1. 2ファイルで約95MB。LFS 未使用のこのリポジトリに入れるにはサイズが大きすぎる。
2. そもそも再生に必要な `player.8i.com`（8i 社の Web Playback SDK）は
   cdn.8thwall.com とは**無関係の第三者ホスト**で、8i 社は既にサービス終了。
   アセットを取り込んでも**このデモは動作しない**。

**デモ自体は削除していない**（`samples/threejs/8i-hologram/` は残置）。
`xrextras.js` の参照だけ `lib/vendor/` に差し替え、`index.js` 冒頭に
KNOWN-DEAD の注記を入れてある。**削除の可否は Nao の判断待ち**。
印刷屋プロダクトでは未使用なので、削除しても実害はない見込み。
