# Claude Code 指示書: 夜間追加作業（4タスク順次実行）

## 概要

テクニカルデモ作成の後に実行する追加タスクです。
ユーザーは寝ています。**全作業を自律的に完了させてください。質問はしないでください。**

---

## タスク 1/4: Git 初期化 + 全ファイルコミット

### 1-1. Git初期化

```bash
cd ~/xr-ar-lab

# 既にGit管理下か確認
git status 2>/dev/null || git init
```

### 1-2. .gitignore の確認・更新

```bash
cat ~/xr-ar-lab/.gitignore
```

以下が含まれていることを確認。なければ追加：

```
node_modules/
.DS_Store
*.log
tools/certs/
.overnight-logs/

# vendor はサイズが大きいのでサブモジュール化を推奨
# ただし現時点では通常コミット（後でサブモジュール化可能）
```

### 1-3. vendor/ の扱い判断

```bash
# vendorのサイズを確認
du -sh ~/xr-ar-lab/vendor/
du -sh ~/xr-ar-lab/vendor/web/
du -sh ~/xr-ar-lab/vendor/engine/
du -sh ~/xr-ar-lab/vendor/8thwall/
```

- **100MB未満:** 通常コミット
- **100MB以上:** vendor/ を .gitignore に追加し、README に vendor セットアップ手順を記載。
  代わりに `tools/setup-vendor.sh` スクリプトを作成（git clone 3リポジトリ + engine展開）

### 1-4. Git LFS 設定（必要な場合）

```bash
# 大きなバイナリファイルを確認
find ~/xr-ar-lab -not -path "*/vendor/*" -not -path "*/.git/*" -not -path "*/node_modules/*" \
  -type f -size +5M | head -20

# xr.js のサイズ確認
ls -lh ~/xr-ar-lab/vendor/engine/xr-standalone/xr.js
```

5MB以上のファイルがある場合はGit LFS trackを設定：

```bash
cd ~/xr-ar-lab
git lfs install
git lfs track "*.glb"
git lfs track "*.mp4"
git lfs track "vendor/engine/xr-standalone/xr.js"
git add .gitattributes
```

### 1-5. 初回コミット

```bash
cd ~/xr-ar-lab
git add -A
git status

# コミット（ユーザー設定がなければ仮設定）
git config user.email "nao@xr-ar-lab.local" 2>/dev/null || true
git config user.name "nao" 2>/dev/null || true

git commit -m "Initial commit: xr-ar-lab AR/VR development base

- 8th Wall open source engine + samples
- Templates: image-target, face-effects, sky-effects, world-slam
- Tech demos: capture, gesture, portal, physics, alpha-video, animation, hand-tracking
- Tools: serve.sh, tunnel.sh, new-project.sh, list-templates.sh, list-projects.sh, clean-project.sh
- Docs: setup-guide, architecture, development-workflow, api-reference
- Localized samples: 19 samples (A-Frame 12 + Three.js 6 + Babylon.js 1)"
```

### タスク1 完了チェック

```bash
echo "===== タスク1: Git ====="
cd ~/xr-ar-lab
git log --oneline -1
echo ""
git status --short | head -20
echo ""
echo "リポジトリサイズ:"
du -sh ~/xr-ar-lab/.git/
```

---

## タスク 2/4: デプロイ設定

### 2-1. デプロイ方式の判断

8th Wall ARはHTTPS必須 + エンジンバイナリが必要なので、
静的ホスティングが最適。以下の3サービスの設定を全て用意する。

### 2-2. Vercel 設定

`~/xr-ar-lab/vercel.json` を作成：

```json
{
  "buildCommand": "",
  "outputDirectory": ".",
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

**注意:** CORPヘッダーはSharedArrayBufferに必要だが、CDNからの読み込みと競合する可能性がある。
その場合は COEP を `credentialless` に変更。

### 2-3. Netlify 設定

`~/xr-ar-lab/netlify.toml` を作成：

```toml
[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

`~/xr-ar-lab/_redirects` も作成（SPA用）

### 2-4. GitHub Pages 設定

`~/xr-ar-lab/.github/workflows/deploy.yml` を作成：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - uses: actions/deploy-pages@v4
```

### 2-5. デプロイガイドの作成

`~/xr-ar-lab/docs/deploy-guide.md` を作成。以下を含める：

- 3サービスそれぞれのデプロイ手順（コマンド付き）
- vendor/ が大きい場合の対処法
- カスタムドメイン設定方法
- HTTPS要件の説明
- CORSヘッダーの説明
- 本番環境での注意事項（APIキー不要であること、ライセンス表記等）

### タスク2 完了チェック

```bash
echo "===== タスク2: デプロイ設定 ====="
for f in vercel.json netlify.toml _redirects .github/workflows/deploy.yml docs/deploy-guide.md; do
  [ -f ~/xr-ar-lab/$f ] && echo "✓ $f" || echo "✗ $f"
done
```

---

## タスク 3/4: ショーケースページ（営業用LP）

### 目的

クライアントや社内にデモ一覧を見せるための、見栄えの良いランディングページを作成する。
`templates/index.html` はデベロッパー向けだが、これは非エンジニア向け。

### 3-1. ページ作成

`~/xr-ar-lab/showcase/index.html` を作成。

**デザイン要件:**
- モダンでクリーンなデザイン（ダーク背景 + アクセントカラー）
- レスポンシブ（スマホで見ることが多い）
- 外部CSSフレームワークは不要（インラインCSS）
- 日本語

**コンテンツ構成:**

```
ヘッダー
  - タイトル: 「XR/AR テクノロジーデモ」
  - サブタイトル: 「8th Wall オープンソースエンジンによるWebAR体験」

セクション1: AR Features（主要機能）
  - Image Target: 画像認識AR
  - Face Effects: 顔エフェクト
  - Sky Effects: 空の演出
  - World SLAM: 空間認識

セクション2: Interaction（インタラクション）
  - Gesture: ジェスチャー操作
  - Physics: 物理演算
  - Capture: 写真撮影

セクション3: Advanced（応用）
  - Portal: ポータル
  - Alpha Video: 透過動画
  - Animation: 3Dアニメーション

各デモカード:
  - デモ名（日本語）
  - 1行説明
  - 使用技術タグ
  - 「デモを見る」ボタン（../templates/<name>/ へリンク）

フッター
  - 「Powered by 8th Wall Open Source」
  - 技術仕様（A-Frame, Three.js, 8th Wall Engine）
  - 「このページ自体も AR デモサーバーから配信されています」
```

**各カードの説明文（日本語）を以下の観点で書く:**
- エンドユーザーにとって何が体験できるか
- ビジネス活用例（1-2行）

### 3-2. OGPタグ設定

SNSでシェアされた時に見栄えがするよう、OGPタグを設定：

```html
<meta property="og:title" content="XR/AR テクノロジーデモ">
<meta property="og:description" content="8th Wall オープンソースエンジンによるWebAR体験">
<meta property="og:type" content="website">
```

### タスク3 完了チェック

```bash
echo "===== タスク3: ショーケース ====="
[ -f ~/xr-ar-lab/showcase/index.html ] && echo "✓ showcase/index.html" || echo "✗ showcase/index.html"
wc -l ~/xr-ar-lab/showcase/index.html 2>/dev/null
grep "og:title" ~/xr-ar-lab/showcase/index.html 2>/dev/null && echo "✓ OGP" || echo "✗ OGP"
```

---

## タスク 4/4: Face Effects デバッグ準備

### 目的

Face Effects デモ（`templates/face-effects-demo/index.html`）で
mesh/paint が表示されない問題のデバッグ用ログを埋め込む。
次回ユーザーがUSBデバッグで接続した際に、すぐ原因がわかるようにする。

### 4-1. 現在のコードを確認

```bash
cat ~/xr-ar-lab/templates/face-effects-demo/index.html
```

### 4-2. デバッグログの追加

**既存コードを壊さず、console.log を追加するだけ：**

以下のポイントにログを追加：

1. ページロード時: `console.log('[face-debug] DOMContentLoaded')`
2. XR8ロード確認: `console.log('[face-debug] XR8 loaded:', typeof XR8)`
3. face-mesh 要素の取得: `console.log('[face-debug] face-mesh element:', meshEl)`
4. face-mesh のコンポーネント一覧: `console.log('[face-debug] face-mesh components:', meshEl ? Object.keys(meshEl.components || {}) : 'N/A')`
5. headMesh 検出ポーリング: 毎回 `console.log('[face-debug] polling #' + pollCount, 'found:', !!found)` 
6. headMesh 内のメッシュノード: `console.log('[face-debug] mesh nodes found:', count)`
7. マテリアル適用時: `console.log('[face-debug] applying material:', name)`
8. face-alpha.png テクスチャロード: `console.log('[face-debug] texture loaded:', !!tex)`
9. switchEffect 呼び出し: `console.log('[face-debug] switchEffect:', name)`
10. Three.js バージョン: `console.log('[face-debug] THREE version:', THREE.REVISION)`

### 4-3. デバッグ版の作成（別ファイル）

既存の index.html は変更せず、デバッグ版を別ファイルとして作成：

`~/xr-ar-lab/templates/face-effects-demo/debug.html`

- index.html をコピーしてデバッグログを追加
- 画面上部にデバッグ情報オーバーレイを追加（div#debug-info）
- コンソールに加えて画面上にも主要情報を表示（USBデバッグなしでも確認可能）

```html
<div id="debug-info" style="
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 9999; background: rgba(0,0,0,0.8);
  color: #0f0; font-family: monospace; font-size: 11px;
  padding: 8px; max-height: 30vh; overflow-y: auto;
">
  Loading debug info...
</div>
```

```javascript
function debugLog(msg) {
  console.log(msg)
  const info = document.getElementById('debug-info')
  if (info) {
    info.innerHTML += msg + '<br>'
    info.scrollTop = info.scrollHeight
  }
}
```

### 4-4. デバッグ手順のREADME追記

`~/xr-ar-lab/templates/face-effects-demo/README.md` にデバッグ手順を追記：

```markdown
## デバッグ方法

### 画面上デバッグ（USBケーブル不要）
https://<トンネルURL>/templates/face-effects-demo/debug.html

画面上部の緑色テキストで内部状態が確認できます。

### Chrome リモートデバッグ（詳細）
1. Pixel 7 をUSBでPCに接続
2. Pixel 7: 設定 → 開発者オプション → USBデバッグ ON
3. PC Chrome: chrome://inspect → Pixel 7 のページを inspect
4. Console タブで [face-debug] ログを確認
```

### タスク4 完了チェック

```bash
echo "===== タスク4: Face Effects デバッグ ====="
[ -f ~/xr-ar-lab/templates/face-effects-demo/debug.html ] && echo "✓ debug.html" || echo "✗ debug.html"
grep -c "face-debug\|debugLog" ~/xr-ar-lab/templates/face-effects-demo/debug.html 2>/dev/null
```

---

## 全タスク完了後の最終サマリー

```
================================================================
  夜間追加作業 完了レポート
================================================================

【タスク1: Git】
  リポジトリ: [初期化済み/既存]
  コミット: [ハッシュ]
  vendor対応: [通常コミット/gitignore+setup script]
  LFS: [設定あり/なし]
────────────────────────────────────────
【タスク2: デプロイ設定】
  Vercel: [vercel.json 作成済み]
  Netlify: [netlify.toml + _redirects 作成済み]
  GitHub Pages: [workflow 作成済み]
  デプロイガイド: [作成済み]
────────────────────────────────────────
【タスク3: ショーケースページ】
  ファイル: [showcase/index.html]
  デモカード数: [X個]
  OGP: [設定済み]
────────────────────────────────────────
【タスク4: Face Effects デバッグ】
  debug.html: [作成済み]
  ログポイント数: [X個]
  画面オーバーレイ: [あり]

================================================================
```

## 注意事項

- ユーザーは寝ています。質問はせず自律的に完了させてください。
- `vendor/` 内のファイルは編集しないこと
- サーバーやトンネルは起動しないこと
- 外部からの大容量ダウンロードはしないこと
- エラーが出ても記録して次のタスクに進むこと
- テクニカルデモ作成タスクの成果物（templates/内の新規ファイル）は、
  Git コミットに含めること
