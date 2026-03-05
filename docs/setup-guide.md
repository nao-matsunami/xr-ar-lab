# XR AR Lab セットアップガイド

## プロジェクト概要

`~/xr-ar-lab/` は 8th Wall オープンソース版をベースにした AR/VR 開発基盤です。
各種AR機能（画像認識・顔エフェクト・空置換・SLAM空間配置）のテンプレートを作成し、
他プロジェクト（氷見AIラボ、映像演出、プロモーション等）に横展開します。

WebAR 方式のため、アプリのインストールは不要。ブラウザだけで動作します。

## ディレクトリ構成

```
~/xr-ar-lab/
├── vendor/                    外部リポジトリ（編集禁止）
│   ├── engine/                8th Wall エンジンバイナリ
│   │   └── xr-standalone/    展開済みエンジン
│   │       ├── xr.js           コアエンジン（1MB）
│   │       ├── xr-slam.js      SLAMチャンク（5.5MB）
│   │       ├── xr-face.js      顔認識チャンク（7.7MB）
│   │       └── resources/       モデル・ワーカー等
│   ├── web/                   サンプル・xrextras（MIT）
│   │   ├── examples/            A-Frame / Three.js / Babylon.js サンプル
│   │   └── xrextras/            XR Extras ライブラリソース
│   └── 8thwall/               オープンソースエンジン（MIT部分）
│       ├── apps/                Image Target CLI 等のツール
│       └── packages/            xrextras 等のパッケージソース
│
├── templates/                 機能別テンプレート（横展開元）
│   ├── image-target/            SLAM基本（動作確認済み）
│   ├── minimal-test/            A-Frame最小構成（動作確認済み）
│   ├── raw-test/                Three.js直接制御（動作確認済み）
│   ├── image-target-demo/       画像認識ARデモ
│   ├── face-effects-demo/       顔エフェクトデモ
│   ├── sky-effects-demo/        空置換デモ
│   ├── world-slam-demo/         SLAM空間配置デモ
│   └── index.html               テンプレート一覧ページ
│
├── samples/                   旧サンプルのローカル化版
├── projects/                  実案件プロジェクト
├── shared/                    共通アセット
│   ├── styles/                  共通CSS
│   ├── scripts/                 共通JS
│   └── models/                  共通3Dモデル
│
├── tools/                     開発ツール
│   ├── serve.sh                 HTTPSサーバー起動
│   ├── tunnel.sh                cloudflaredトンネル
│   ├── new-project.sh           案件プロジェクト作成
│   ├── list-templates.sh        テンプレート一覧表示
│   ├── list-projects.sh         プロジェクト一覧表示
│   ├── clean-project.sh         プロジェクト削除
│   └── ssl/                     SSL証明書（cert.pem, key.pem）
│
├── docs/                      ドキュメント
├── README.md
└── .gitignore
```

## 前提条件

| ツール | バージョン | 確認コマンド |
|---|---|---|
| Node.js | v18 以上 | `node --version` |
| npm | 8 以上 | `npm --version` |
| git | 2.x | `git --version` |
| git-lfs | 3.x | `git lfs version` |
| openssl | - | `openssl version` |
| cloudflared | - | `cloudflared --version`（リモートテスト用） |

### git-lfs のインストール（必須）

エンジンバイナリは Git LFS で管理されています。

```bash
# Ubuntu/Debian (sudoあり)
sudo apt-get install git-lfs

# ユーザーローカル（sudoなし）
cd /tmp
curl -sLO https://github.com/git-lfs/git-lfs/releases/download/v3.5.1/git-lfs-linux-amd64-v3.5.1.tar.gz
tar xzf git-lfs-linux-amd64-v3.5.1.tar.gz
cp git-lfs-3.5.1/git-lfs ~/.local/bin/
chmod +x ~/.local/bin/git-lfs
git lfs install
```

## 環境構築手順

### 1. ディレクトリ作成

```bash
mkdir -p ~/xr-ar-lab/vendor
mkdir -p ~/xr-ar-lab/templates/{image-target/assets,image-target/image-targets,face-effects/assets,sky-effects/assets,world-slam/assets}
mkdir -p ~/xr-ar-lab/projects
mkdir -p ~/xr-ar-lab/shared/{styles,scripts,models}
mkdir -p ~/xr-ar-lab/tools/ssl
mkdir -p ~/xr-ar-lab/docs
```

### 2. リポジトリクローン

```bash
cd ~/xr-ar-lab/vendor
git clone https://github.com/8thwall/web.git
git clone https://github.com/8thwall/engine.git
git clone https://github.com/8thwall/8thwall.git
```

### 3. エンジンバイナリ展開

```bash
cd ~/xr-ar-lab/vendor/engine

# Git LFS でバイナリを取得（クローン直後はポインタファイルの場合がある）
git lfs pull

# ZIP展開
unzip xr-standalone.zip -d xr-standalone
```

確認: `xr-standalone/xr.js` が約1MBあること。

### 4. SSL証明書の生成

WebARはHTTPS必須です。開発用の自己署名証明書を生成します。

```bash
cd ~/xr-ar-lab/tools/ssl
openssl req -newkey rsa:2048 -new -nodes -x509 \
  -days 3650 -keyout key.pem -out cert.pem \
  -subj "/CN=localhost"
```

### 5. http-server のインストール

```bash
which http-server || npm install -g http-server
```

### 6. Image Target CLI の依存インストール

```bash
cd ~/xr-ar-lab/vendor/8thwall/apps/image-target-cli
npm install
```

## サーバー起動方法

### ローカルHTTPSサーバー

```bash
cd ~/xr-ar-lab
./tools/serve.sh . 8443
```

PCブラウザ: `https://localhost:8443`
モバイル（同一LAN）: `https://<サーバーIP>:8443`

### 特定テンプレートのみ配信

```bash
./tools/serve.sh templates/world-slam-demo 8443
```

**重要:** テンプレートからvendorへの相対パス（`../../vendor/...`）を維持するため、
通常は `~/xr-ar-lab/` 全体をルートとして配信してください。

### cloudflared トンネル（リモートアクセス）

別ターミナルで:

```bash
./tools/tunnel.sh 8443
```

表示される `*.trycloudflare.com` URLをスマホで開きます。

## リモート環境でのモバイルテスト

1. `./tools/serve.sh . 8443` でサーバー起動
2. `./tools/tunnel.sh 8443` でトンネル起動
3. 表示されたURLをスマホブラウザで開く
4. カメラアクセスを許可
5. 自己署名証明書の警告は「詳細設定 → 続行」で進む

## テンプレート一覧

| テンプレート | AR機能 | チャンク | 状態 |
|---|---|---|---|
| image-target | SLAM基本 | slam | 動作確認済み |
| minimal-test | SLAM最小 | slam | 動作確認済み |
| raw-test | Three.js直接 | slam | 動作確認済み |
| image-target-demo | 画像認識 | なし | 要ターゲット設定 |
| face-effects-demo | 顔エフェクト | face | テスト推奨 |
| sky-effects-demo | 空置換 | slam | テスト推奨 |
| world-slam-demo | 空間配置 | slam | テスト推奨 |

## vendorリポジトリの役割

| リポジトリ | 内容 | ライセンス |
|---|---|---|
| `8thwall/engine` | エンジンバイナリ（xr.js, xr-slam.js, xr-face.js） | 8th Wall Engine License |
| `8thwall/web` | サンプルコード、xrextras ライブラリ | MIT |
| `8thwall/8thwall` | オープンソースエンジン（Face, ImageTarget, Sky）、Image Target CLI | MIT |

## 8th Wall オープンソース版の機能制約

### 利用可能な機能

| 機能 | ライセンス | チャンク |
|---|---|---|
| SLAM（空間認識） | Engine License（バイナリ） | xr-slam.js |
| Face Effects（顔認識） | MIT + Engine License | xr-face.js |
| Image Target（画像認識） | MIT | コアxr.js |
| Sky Effects（空セグメンテーション） | MIT | xr-slam.js |
| Lightship VPS | **利用不可** | - |
| Hand Tracking | **利用不可** | - |
| Lightship Maps | **利用不可** | - |

### 旧ホスト版との違い

- `apps.8thwall.com/xrweb?appKey=XXXXX` → ローカルの `xr.js` に置き換え
- 8th Wall コンソールでの画像ターゲットアップロード → Image Target CLI で代替
- VPSウェイスポット → 利用不可
- アナリティクス → 利用不可

## 対応フレームワーク

- **A-Frame**: 8frame（8th Wall版）を使用。最もサンプルが豊富
- **Three.js**: importmap + moduleパターンで `window.THREE` を設定
- **Babylon.js**: サンプルあり（vendor/web/examples/babylonjs/）
- **PlayCanvas**: 8th Wall は PlayCanvas 対応だが、サンプルは限定的

## デプロイ方法

### 静的ホスティング

テンプレートを静的HTMLとしてデプロイ可能:

```bash
# 1. プロジェクトディレクトリをデプロイ
cp -r projects/my-project/ /path/to/deploy/

# 2. vendor/ のエンジンバイナリもコピー
cp -r vendor/engine/xr-standalone/ /path/to/deploy/vendor/engine/xr-standalone/
```

### デプロイ先

- **Vercel**: `vercel deploy` でゼロコンフィグデプロイ
- **Netlify**: `netlify deploy --dir=.` で配信
- **GitHub Pages**: リポジトリをpushしてPages有効化
- **自社サーバー**: Nginx/Apache でHTTPS配信（SSL証明書が必要）

**注意:** エンジンバイナリ（xr.js等）は必ず同一ドメインから配信すること（CORS制約）。

## 重要なリンク集

- 8th Wall オープンソース: https://8thwall.org
- GitHub (engine): https://github.com/8thwall/engine
- GitHub (web): https://github.com/8thwall/web
- GitHub (8thwall): https://github.com/8thwall/8thwall
- Discord: https://discord.gg/8thwall
- 8th Wall ドキュメント: https://www.8thwall.com/docs/web/

## トラブルシューティング

### Git LFS が必要

**症状:** `xr-standalone.zip` が133バイトしかない
**原因:** Git LFS がインストールされていない、またはLFSオブジェクトが未取得
**対処:**
```bash
git lfs install
cd ~/xr-ar-lab/vendor/engine
git lfs pull
```

### 旧ホスト版URLの置き換え

**症状:** `apps.8thwall.com` への接続エラー
**原因:** 旧サンプルは `//apps.8thwall.com/xrweb?appKey=XXXXX` を参照している
**対処:** ローカルパスに置換
```html
<!-- 旧 -->
<script async src="//apps.8thwall.com/xrweb?appKey=XXXXX"></script>
<!-- 新 -->
<script async src="../../vendor/engine/xr-standalone/xr.js" data-preload-chunks="slam"></script>
```

### `<a-camera>` 要素が必要

**症状:** `You need an <a-camera> element for augmented reality.`
**原因:** A-Frameシーンに `<a-camera>` が存在しない
**対処:** `<a-scene>` 内に追加
```html
<a-camera id="camera" position="0 8 0"></a-camera>
```

### `window.THREE` が必要

**症状:** `window.THREE does not exist but is required by the Threejs pipeline module`
**原因:** Three.js版で `window.THREE` が設定されていない
**対処:** importmap + module で Three.js をロードし `window.THREE` を設定
```html
<script type="importmap">
  { "imports": { "three": "https://unpkg.com/three@0.172.0/build/three.module.min.js" } }
</script>
<script type="module">
  import * as THREE from 'three';
  window.THREE = { ...THREE };
</script>
```

### サーバールートの指定

**症状:** テンプレートからvendorへの相対パスが解決できない
**原因:** `serve.sh` でテンプレートディレクトリのみを配信している
**対処:** `~/xr-ar-lab/` 全体をルートとして配信
```bash
# ✗ テンプレートだけ配信すると vendor/ にアクセスできない
./tools/serve.sh templates/image-target 8443

# ○ xr-ar-lab 全体を配信
./tools/serve.sh . 8443
# アクセス: https://localhost:8443/templates/image-target/
```

### XR8初期化が完了しない（ローディングが終わらない）

**症状:** ローディングアイコンが回り続ける
**原因:** エンジンのチャンクファイルがロードできない、または依存CDNが読み込めない
**対処:**
1. ブラウザのDevToolsでネットワークタブを確認
2. xr.js, xr-slam.js（またはxr-face.js）が正常に配信されているか確認
3. CDN（cdn.8thwall.com）へのアクセスがブロックされていないか確認

### 自己署名証明書の警告

**症状:** ブラウザが接続を拒否する
**対処:**
- Chrome: 「詳細設定」→「(安全でない)ページに進む」
- Safari: 「詳細を表示」→「Webサイトを閲覧」
- cloudflaredトンネルを使えば正規の証明書で配信可能
