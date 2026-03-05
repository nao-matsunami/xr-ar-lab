# 開発ワークフロー

## 新規テンプレート作成手順

### 1. ディレクトリ作成

```bash
mkdir -p ~/xr-ar-lab/templates/my-template/assets
```

### 2. index.html 作成

動作確認済みパターンを踏襲してください。

**A-Frame + SLAM テンプレート:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>My Template</title>

  <!-- 必ずこの順序で読み込む -->
  <script src="//cdn.8thwall.com/web/aframe/8frame-1.3.0.min.js"></script>
  <script src="//cdn.8thwall.com/web/xrextras/xrextras.js"></script>
  <script src="//cdn.8thwall.com/web/landing-page/landing-page.js"></script>
  <script async src="../../vendor/engine/xr-standalone/xr.js" data-preload-chunks="slam"></script>
</head>
<body>
  <a-scene
    landing-page
    xrextras-loading
    xrextras-runtime-error
    renderer="colorManagement: true"
    xrweb="allowedDevices: any">

    <a-camera id="camera" position="0 8 0"></a-camera>
    <!-- コンテンツをここに追加 -->

  </a-scene>
</body>
</html>
```

**チャンク指定の選び方:**

| AR機能 | data-preload-chunks | シーンコンポーネント |
|---|---|---|
| SLAM（空間配置） | `slam` | `xrweb` |
| 画像認識のみ | なし | `xrweb="disableWorldTracking: true"` |
| 顔エフェクト | `face` | `xrface` |
| 空置換 | `slam` | `xrlayers` |
| 顔 + SLAM | `face, slam` | `xrweb` |

### 3. README.md 作成

以下の構造で統一:

```markdown
# テンプレート名

## 概要
## ユースケース
## 起動方法
## 使用しているAR機能
## カスタマイズ方法
## 横展開ガイド
## 技術メモ
```

### 4. テンプレート一覧に追加

`~/xr-ar-lab/templates/index.html` にカードを追加。

---

## テンプレートから案件プロジェクト作成手順

### スクリプトを使う方法（推奨）

```bash
cd ~/xr-ar-lab
./tools/new-project.sh world-slam-demo himi-tourism-ar
```

### 手動で作成する方法

```bash
cp -r ~/xr-ar-lab/templates/world-slam-demo ~/xr-ar-lab/projects/himi-tourism-ar
cd ~/xr-ar-lab/projects/himi-tourism-ar

# 1. タイトル変更
# index.html の <title> を編集

# 2. アセット差し替え
# assets/ にカスタム3Dモデル・テクスチャを配置

# 3. コンテンツ編集
# index.html 内のA-Frameエンティティを編集
```

---

## テスト手順

### ローカルテスト（同一LAN）

```bash
# ターミナル1: サーバー起動
cd ~/xr-ar-lab
./tools/serve.sh . 8443
```

- PC: `https://localhost:8443/templates/my-template/`
- スマホ（同一LAN）: `https://<サーバーIP>:8443/templates/my-template/`

### リモートテスト（cloudflaredトンネル）

```bash
# ターミナル1: サーバー起動
cd ~/xr-ar-lab
./tools/serve.sh . 8443

# ターミナル2: トンネル起動
./tools/tunnel.sh 8443
```

表示される `https://xxxx.trycloudflare.com` URLにスマホでアクセス。

### テスト項目チェックリスト

- [ ] ローディング画面が表示されるか
- [ ] カメラアクセス許可ダイアログが出るか
- [ ] カメラ映像が表示されるか
- [ ] ARコンテンツが正しく表示されるか
- [ ] タッチインタラクションが動作するか
- [ ] iOS Safari で動作するか
- [ ] Android Chrome で動作するか
- [ ] 横向き・縦向き両方で正常か
- [ ] DevTools のコンソールにエラーがないか

### デバッグのコツ

- Chrome DevTools のリモートデバッグ: `chrome://inspect` でスマホのログを確認
- ネットワークタブでCDN・バイナリの読み込み状態を確認
- `allowedDevices: any` でPCでもAR表示可能（モバイル専用機能は除く）

---

## デプロイ手順

### 1. デプロイ用ファイルの準備

```bash
# プロジェクトディレクトリ
cd ~/xr-ar-lab/projects/my-project

# デプロイ用ディレクトリを作成
mkdir -p /tmp/deploy/vendor/engine/xr-standalone

# プロジェクトファイルをコピー
cp -r . /tmp/deploy/

# エンジンバイナリをコピー
cp ~/xr-ar-lab/vendor/engine/xr-standalone/xr.js /tmp/deploy/vendor/engine/xr-standalone/
cp ~/xr-ar-lab/vendor/engine/xr-standalone/xr-slam.js /tmp/deploy/vendor/engine/xr-standalone/
cp ~/xr-ar-lab/vendor/engine/xr-standalone/xr-face.js /tmp/deploy/vendor/engine/xr-standalone/
cp -r ~/xr-ar-lab/vendor/engine/xr-standalone/resources/ /tmp/deploy/vendor/engine/xr-standalone/
```

### 2. 相対パスの調整

デプロイ先のディレクトリ構造に応じて `index.html` 内の相対パスを調整:

```html
<!-- 開発時（templates/配下） -->
<script async src="../../vendor/engine/xr-standalone/xr.js" ...></script>

<!-- デプロイ時（ルート直下） -->
<script async src="./vendor/engine/xr-standalone/xr.js" ...></script>
```

### 3. Vercel へのデプロイ

```bash
cd /tmp/deploy
npx vercel deploy
```

### 4. GitHub Pages へのデプロイ

```bash
cd /tmp/deploy
git init
git add .
git commit -m "Deploy AR project"
git remote add origin https://github.com/user/repo.git
git push -u origin main
# リポジトリ Settings → Pages → main ブランチを選択
```

---

## Image Target CLI の使い方

### 概要

Image Target CLI は、ターゲット画像をコンパイルしてAR認識用のデータファイルを生成するツールです。

### インストール

```bash
cd ~/xr-ar-lab/vendor/8thwall/apps/image-target-cli
npm install
```

### 使い方

```bash
node src/index.js
```

CLI のインタラクティブプロンプトに従って:

1. ターゲット画像ファイル（.jpg/.png）のパスを指定
2. ターゲット名を設定
3. コンパイルを実行
4. 出力された JSON ファイルをプロジェクトにコピー

### 出力ファイルの配置

```bash
cp output/my-target.json ~/xr-ar-lab/projects/my-project/image-targets/
```

### index.html での設定

```html
<script>
  const onxrloaded = () => {
    fetch('./image-targets/my-target.json')
      .then(r => r.json())
      .then(data => {
        XR8.XrController.configure({imageTargets: data})
      })
  }
  window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
</script>
```

### ターゲット画像のベストプラクティス

- 高コントラストで特徴点の多い画像を使用
- テキストのみの画像は避ける（特徴点が少ない）
- 最低300x300ピクセル以上推奨
- 回転対称な画像は避ける（認識方向が曖昧になる）
- 繰り返しパターンは避ける
