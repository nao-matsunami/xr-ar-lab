# Image Target AR Demo

## 概要
カメラでターゲット画像（ポスター・看板・名刺等）を認識し、その上にARコンテンツ（3Dオブジェクト・テキスト）を表示するテンプレート。

## ユースケース
- 観光スポットの看板にスマホをかざして多言語情報を表示
- 展示会のポスターにかざして3D製品モデルを表示
- 名刺にかざしてプロフィール情報やSNSリンクを表示
- プロモーション印刷物にかざして動画やアニメーションを再生

## 起動方法

    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセスURL: https://<サーバーIP>:8443/templates/image-target-demo/

## 使用しているAR機能
- **8th Wall Image Target**: カメラ映像から登録済み画像を認識・追跡
- **xrextras-named-image-target**: 名前でターゲット画像とARコンテンツを紐付けるA-Frameコンポーネント
- **disableWorldTracking: true**: SLAM（空間認識）を無効化し、画像追跡に集中

## 動作確認手順

### 1. サンプルターゲット画像を使う（すぐに試せます）

サンプルターゲット画像（2枚）がコンパイル済みです。

    # サーバー起動
    cd ~/xr-ar-lab && ./tools/serve.sh . 8443

    # 別のPC/タブレットで target-display.html を開いてターゲット画像を表示
    # AR端末で index.html にアクセスし、ターゲット画像にカメラをかざす

ターゲット画像の表示・印刷: `target-display.html`

### 2. カスタムターゲット画像を使う

    # 非対話コンパイルスクリプトで追加
    cd ~/xr-ar-lab/templates/image-target-demo
    node compile-targets.mjs

    # または対話式 CLI を使用
    cd ~/xr-ar-lab/vendor/8thwall/apps/image-target-cli
    node src/index.js

## カスタマイズ方法

### 3Dモデルの差し替え
`<xrextras-named-image-target>` 内の `<a-box>` 等を `<a-entity gltf-model="...">` に変更。
GLBファイルを `assets/` に配置して参照してください。

    <xrextras-named-image-target name="my-target">
      <a-entity gltf-model="./assets/my-model.glb" scale="0.5 0.5 0.5"></a-entity>
    </xrextras-named-image-target>

### テキスト・UIの変更
`<a-text>` の `value` 属性でテキストを変更できます。

    <a-text value="表示したいテキスト" position="0 0.5 0" align="center" color="#FFF"></a-text>

## 横展開ガイド
このテンプレートをコピーして案件プロジェクトを作成する手順:

    cp -r ~/xr-ar-lab/templates/image-target-demo ~/xr-ar-lab/projects/my-project
    # index.html を編集してターゲット名とコンテンツをカスタマイズ

### 3. index.html の設定

`onxrloaded` 内の `imageTargetData` 配列を更新し、`<xrextras-named-image-target>` の `name` と一致させてください。

    <xrextras-named-image-target name="your-target-name">
      <!-- ここにARコンテンツを配置 -->
    </xrextras-named-image-target>

ターゲットデータはインラインで埋め込む必要があります（非同期 fetch では初期化タイミングに間に合わない）。

## 技術メモ
- スクリプト読み込み順: 8frame → xrextras → landing-page → xr.js (async, data-preload-chunks="slam")
- **`data-preload-chunks="slam"` は必須**: `XR8.XrController` は slam チャンク(xr-slam.js)に含まれる。このチャンクがないと XrController が undefined でハングする
- `disableWorldTracking: true` で SLAM 追跡を無効化し、Image Target 検出に集中
- `imageTargetData` は `xrloaded` イベント内で同期的に設定する（fetch 非同期は NG: xrweb の初期化と競合）
- ターゲット画像は高コントラストで特徴点の多い画像ほど認識精度が高い
- 1つのシーンに複数のターゲットを登録可能（`<xrextras-named-image-target>` を複数配置）
- 旧プラットフォームのコンソール経由の画像アップロードは使用不可、Image Target CLI を使用すること
