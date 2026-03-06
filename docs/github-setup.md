# GitHub リポジトリセットアップ手順

## 1. GitHubでリポジトリ作成

1. https://github.com/new にアクセス
2. Repository name: `xr-ar-lab`
3. Description: `WebAR/VR開発基盤 - 19種類のARデモテンプレート`
4. Public または Private を選択
5. **Initialize this repository with** のチェックは全て**外す**（既存コードをpushするため）
6. **Create repository** をクリック

## 2. ローカルリポジトリにリモートを追加

```bash
cd ~/xr-ar-lab

# リモートリポジトリを追加
git remote add origin https://github.com/<ユーザー名>/xr-ar-lab.git

# SSH の場合
# git remote add origin git@github.com:<ユーザー名>/xr-ar-lab.git

# リモート確認
git remote -v
```

## 3. 初回プッシュ

```bash
# mainブランチとしてプッシュ（-u で上流ブランチを設定）
git push -u origin main
```

### 認証について

- **HTTPS**: GitHub Personal Access Token (PAT) が必要
  - https://github.com/settings/tokens > Generate new token (classic)
  - `repo` スコープを選択
  - パスワードの代わりにトークンを使用

- **SSH**: SSH鍵の設定が必要
  - `ssh-keygen -t ed25519 -C "your-email@example.com"`
  - 公開鍵を GitHub Settings > SSH and GPG keys に追加

## 4. Netlify連携（オプション）

GitHub連携で自動デプロイを設定する場合:

1. https://app.netlify.com/ にログイン
2. **Add new site** > **Import an existing project**
3. **GitHub** を選択し、`xr-ar-lab` リポジトリを選択
4. Build settings:
   - Build command: (空欄のまま)
   - Publish directory: `.`
5. **Deploy site** をクリック

これにより、`main` ブランチへの push で自動デプロイされる。

## 5. 日常のワークフロー

```bash
# 変更をコミット
git add <files>
git commit -m "説明"

# プッシュ
git push

# リモートの変更を取得
git pull
```

## 注意事項

- `vendor/engine/xr-standalone/` に8th Wallバイナリが含まれる（サイズ大）
- `.gitignore` でnode_modulesや一時ファイルが除外されていることを確認
- シークレット情報（APIキー等）をコミットしないこと
