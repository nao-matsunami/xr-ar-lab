# Sky Effects AR Demo

## 概要
カメラで空を映すと、空の部分だけを検出してファンタジーな映像に置き換えるテンプレート。
4種類のスカイエフェクト（宇宙・夕焼け・オーロラ・ネオン）をリアルタイムで切り替え可能。

## ユースケース
- アートインスタレーション
- イベント会場での演出
- プロモーション動画撮影
- SNS映えする空加工フィルター

## 起動方法

    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセスURL: https://<サーバーIP>:8443/templates/sky-effects-demo/

**注意:** Sky Effects は背面カメラで空を映す必要があります。建物の内部等では動作しません。

## 使用しているAR機能
- **8th Wall Sky Effects (xrlayers)**: カメラ映像から空の領域をセグメンテーション（分離検出）
- **xrlayerscene**: 空として検出された領域に表示するシーンを定義
- **sky-coaching-overlay**: 空を映すようユーザーにガイドするオーバーレイ
- **edgeSmoothness**: 空と地上の境界のぼかし具合（0〜1）

## カスタマイズ方法

### 空テクスチャの差し替え
`<a-sky>` の `color` 属性を画像に変更:

1. 空画像を `assets/` に配置
2. `<a-assets>` でプリロード
3. `<a-sky>` の `src` で参照

例:

    <a-assets>
      <img id="mySky" src="./assets/galaxy.jpg">
    </a-assets>

    <a-entity xrlayerscene="name: sky; edgeSmoothness: 0.6">
      <a-sky src="#mySky"></a-sky>
    </a-entity>

### 空に浮かぶオブジェクトの追加
`<a-entity xrlayerscene>` 内に A-Frame エンティティを追加:

    <a-sphere position="0 15 -20" radius="3" color="#FFD700" material="shader: flat"></a-sphere>

### エッジのぼかし調整
`edgeSmoothness` の値を変更（0: シャープ、1: 最大ぼかし）:

    <a-entity xrlayerscene="name: sky; edgeSmoothness: 0.3">

### エフェクトの追加
1. 新しいオブジェクトグループを `<a-entity id="sky-objects-name">` で作成
2. `switchSky()` 関数に対応する色とロジックを追加
3. UI ボタンを追加

## 横展開ガイド
このテンプレートをコピーして案件プロジェクトを作成する手順:

    cp -r ~/xr-ar-lab/templates/sky-effects-demo ~/xr-ar-lab/projects/my-sky-app
    # assets/ にカスタムスカイテクスチャを配置
    # index.html を編集してエフェクトをカスタマイズ

## 技術メモ
- スクリプト読み込み順: 8frame → xrextras → landing-page → coaching-overlay → xr.js (async)
- LayersController はコア xr.js に内蔵。data-preload-chunks は不要（slam/face チャンクとは独立）
- semantics-model.tflite と semantics-worker.js が resources/ に必要（空のセマンティックセグメンテーション用）
- `xrlayers` コンポーネントは `xrweb` の代わりにシーンに設定する（併用しない）
- sky-recenter.js: コーチングオーバーレイが非表示になった時にシーンを再センタリング
- `material="shader: flat"` を使うとライティングの影響を受けないため、空のオブジェクトには推奨
- 境界部分の品質は `edgeSmoothness` で調整可能
