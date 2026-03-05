# デプロイガイド

## 概要
xr-ar-lab を各種ホスティングサービスにデプロイする手順。
8th Wall AR は HTTPS が必須のため、SSL対応のホスティングサービスを使用する。

**重要:** `vendor/` ディレクトリは .gitignore で除外されている（256MB）。
デプロイ前に `tools/setup-vendor.sh` で vendor/ をセットアップする必要がある。

## 1. Vercel

### 手順
1. GitHub にリポジトリをプッシュ
2. [vercel.com](https://vercel.com) にログイン
3. "Import Project" → GitHub リポジトリを選択
4. 設定はそのまま（vercel.json が自動読み込みされる）
5. "Deploy" をクリック

### コマンドラインでのデプロイ
```bash
npm i -g vercel
cd ~/xr-ar-lab
vercel
```

### 注意事項
- `vercel.json` で COOP/COEP ヘッダーを設定済み
- COEP は `credentialless` を使用（CDN リソースとの互換性のため）
- vendor/ が含まれていない場合、デプロイ前にセットアップが必要

## 2. Netlify

### 手順
1. GitHub にリポジトリをプッシュ
2. [netlify.com](https://netlify.com) にログイン
3. "New site from Git" → GitHub リポジトリを選択
4. Build command: 空欄
5. Publish directory: `.`
6. "Deploy site" をクリック

### コマンドラインでのデプロイ
```bash
npm i -g netlify-cli
cd ~/xr-ar-lab
netlify deploy --prod --dir=.
```

### 注意事項
- `netlify.toml` で COOP/COEP ヘッダーを設定済み
- `_redirects` ファイルも配置済み

## 3. GitHub Pages

### 手順
1. GitHub リポジトリの Settings → Pages
2. Source: "GitHub Actions" を選択
3. `.github/workflows/deploy.yml` が自動実行される
4. Actions タブでデプロイ状況を確認

### 注意事項
- GitHub Pages では COOP/COEP ヘッダーのカスタマイズが制限される
- SharedArrayBuffer が必要な機能は動作しない可能性がある
- 代替: Cloudflare Pages + Workers でヘッダーをカスタマイズ

## HTTPS 要件

8th Wall AR はカメラアクセスのため HTTPS が必須:
- ローカル開発: `tools/serve.sh` で自己署名証明書の HTTPS サーバーを起動
- 本番: 上記サービスはすべて自動的に HTTPS を提供

## CORS ヘッダーについて

- **COOP (Cross-Origin-Opener-Policy)**: `same-origin` — SharedArrayBuffer に必要
- **COEP (Cross-Origin-Embedder-Policy)**: `credentialless` — CDN からのスクリプト読み込みと互換性を保つ
- `require-corp` を使うと CDN (cdn.8thwall.com) からの読み込みがブロックされる場合がある

## カスタムドメイン設定

### Vercel
1. Project Settings → Domains → Add Domain
2. DNS に CNAME レコードを追加: `cname.vercel-dns.com`

### Netlify
1. Site Settings → Domain Management → Add custom domain
2. DNS に CNAME レコードを追加

### GitHub Pages
1. Settings → Pages → Custom domain
2. DNS に CNAME レコードを追加
3. `CNAME` ファイルをリポジトリルートに作成

## vendor/ の扱い

vendor/ は 256MB あるため .gitignore で除外している。
デプロイ時の選択肢:

1. **ビルドステップで vendor/ をセットアップ**
   - CI/CD のビルドコマンドで `tools/setup-vendor.sh` を実行
   - リポジトリの3つのソースから自動取得

2. **vendor/ を含めてデプロイ**
   - .gitignore から vendor/ を一時的に削除
   - 直接デプロイ（Netlify CLI `--dir=.` など）
   - 注意: GitHub の 100MB ファイルサイズ制限に注意

3. **CDN で配信**
   - vendor/ の静的ファイルを別の CDN にアップロード
   - HTML のパスを CDN URL に変更

## ライセンス表記

8th Wall オープンソースエンジンは Apache 2.0 ライセンス。
デプロイ時に以下を確認:
- LICENSE ファイルがリポジトリに含まれていること
- 8th Wall のクレジット表記（フッターまたは About ページ）
