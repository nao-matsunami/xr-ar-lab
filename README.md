# xr-ar-lab

WebAR/VR開発基盤。8th Wallオープンソース版をベースに19種類のARデモテンプレートを提供。
アプリ不要、ブラウザだけで動作するAR体験を構築できる。

**Live Demo:** https://xr-ar-lab.netlify.app/templates/

## デモ一覧（19種類）

| # | デモ | 説明 | URL |
|---|------|------|-----|
| 1 | Image Target | 画像認識AR — 画像をカメラで認識して3Dオブジェクト表示 | [/templates/image-target-demo/](https://xr-ar-lab.netlify.app/templates/image-target-demo/) |
| 2 | Face Effects | 顔エフェクト — メガネ・クラウンを顔にAR表示 | [/templates/face-effects-demo/](https://xr-ar-lab.netlify.app/templates/face-effects-demo/) |
| 3 | Sky Effects | 空エフェクト — 空をspace/sunset/aurora/neonに置換 | [/templates/sky-effects-demo/](https://xr-ar-lab.netlify.app/templates/sky-effects-demo/) |
| 4 | World SLAM | 空間認識 — 地面検出＋タップでオブジェクト配置 | [/templates/world-slam-demo/](https://xr-ar-lab.netlify.app/templates/world-slam-demo/) |
| 5 | Capture | 写真撮影 — AR画面のスクリーンショット保存 | [/templates/capture-demo/](https://xr-ar-lab.netlify.app/templates/capture-demo/) |
| 6 | Gesture | ジェスチャー — ドラッグ・ピンチ・回転で操作 | [/templates/gesture-demo/](https://xr-ar-lab.netlify.app/templates/gesture-demo/) |
| 7 | Portal | ポータル — 地面タップで異世界の入口を配置 | [/templates/portal-demo/](https://xr-ar-lab.netlify.app/templates/portal-demo/) |
| 8 | Physics | 物理演算 — cannon.jsでボールを投げて跳ねる体験 | [/templates/physics-demo/](https://xr-ar-lab.netlify.app/templates/physics-demo/) |
| 9 | Alpha Video | 透過動画 — 背景透過動画をAR空間に表示 | [/templates/alpha-video-demo/](https://xr-ar-lab.netlify.app/templates/alpha-video-demo/) |
| 10 | Animation | 3Dアニメーション — GLBモデルのアニメーション再生 | [/templates/animation-demo/](https://xr-ar-lab.netlify.app/templates/animation-demo/) |
| 11 | Hand Tracking | ハンドトラッキング — MediaPipeで手の骨格を認識 | [/templates/hand-tracking-demo/](https://xr-ar-lab.netlify.app/templates/hand-tracking-demo/) |
| 12 | Multi Target | マルチターゲット — 複数画像を同時認識 | [/templates/multi-target-demo/](https://xr-ar-lab.netlify.app/templates/multi-target-demo/) |
| 13 | Curved Target | 湾曲面ターゲット — 缶・ボトルの曲面認識 | [/templates/curved-target-demo/](https://xr-ar-lab.netlify.app/templates/curved-target-demo/) |
| 14 | Canvas Target | Canvasターゲット — 動的テクスチャ表示 | [/templates/canvas-target-demo/](https://xr-ar-lab.netlify.app/templates/canvas-target-demo/) |
| 15 | World Effects | ワールドエフェクト — 環境に適応するエフェクト | [/templates/world-effects-demo/](https://xr-ar-lab.netlify.app/templates/world-effects-demo/) |
| 16 | Audio AR | 音声AR — 位置に応じた3Dサウンド | [/templates/audio-ar-demo/](https://xr-ar-lab.netlify.app/templates/audio-ar-demo/) |
| 17 | VR Mode | VRモード — 360度パノラマ（4シーン切替） | [/templates/vr-mode-demo/](https://xr-ar-lab.netlify.app/templates/vr-mode-demo/) |
| 18 | Occlusion | オクルージョン — 実物体によるAR遮蔽 | [/templates/occlusion-demo/](https://xr-ar-lab.netlify.app/templates/occlusion-demo/) |
| 19 | Geo AR | 位置情報AR — GPS座標にARオブジェクト配置 | [/templates/geo-ar-demo/](https://xr-ar-lab.netlify.app/templates/geo-ar-demo/) |

## セットアップ

### 前提条件

- Git
- ローカルHTTPSサーバー（開発用）
- iOS Safari または Android Chrome（実行環境）

### ローカル開発

```bash
git clone <repository-url>
cd xr-ar-lab

# ローカルHTTPSサーバー起動
./tools/serve.sh . 8443

# モバイルでアクセス（同一LAN）
# https://<サーバーIP>:8443/templates/
```

### デプロイ（Netlify）

```bash
# Netlify CLIでデプロイ
netlify deploy --prod --dir=.

# または GitHub連携で自動デプロイ
# Netlify Dashboard > New site from Git > リポジトリ選択
```

Netlify設定（`netlify.toml`）:
- `publish = "."`（プロジェクトルートをそのまま公開）
- COOP/COEP ヘッダー自動付与（SharedArrayBuffer対応）

## ディレクトリ構成

```
xr-ar-lab/
├── templates/        19種類のARデモテンプレート
│   ├── index.html    デモ一覧ページ
│   ├── image-target-demo/
│   ├── face-effects-demo/
│   └── ...
├── vendor/           8th Wall XRエンジン（ローカルバイナリ）
├── shared/           共通アセット・3Dモデル
├── tools/            開発ツール・SSL証明書・起動スクリプト
├── docs/             ドキュメント
├── showcase/         ショーケースページ
├── qr/               QRコード一覧
├── netlify.toml      Netlifyデプロイ設定
└── README.md
```

## 技術スタック

| 技術 | 用途 |
|------|------|
| **8th Wall XR Engine** | SLAM・顔認識・画像認識・空認識（オープンソース版） |
| **A-Frame (8frame 1.3.0)** | 3Dシーン記述（宣言的HTML） |
| **Three.js** | 3Dレンダリング（A-Frame内部） |
| **cannon.js** | 物理演算（Physics demo） |
| **MediaPipe** | ハンドトラッキング（Hand Tracking demo） |
| **Netlify** | ホスティング・CDN |

## ライセンス

- 8th Wall XR Engine: 各モジュールのライセンスに従う（SLAM=バイナリ / Face,ImageTarget,Sky=MIT）
- テンプレートコード: プロジェクト固有
