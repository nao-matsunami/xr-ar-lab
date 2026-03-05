# 3D Animation AR Demo

## 概要
アニメーション付きの3Dキャラクターモデル（Mixamo）をAR空間に配置し、
ボタンで複数のアニメーションを切り替えるデモ。
aframe-extras の animation-mixer コンポーネントを使用。

## 使用している8th Wall機能
- **SLAM (xrweb)**: 地面検出とオブジェクト配置
- **aframe-extras animation-mixer**: glTF アニメーションの再生・切り替え
- **gltf-model**: glTF/GLB 3Dモデルの読み込み

## 起動方法
    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセス: https://<サーバーIP>:8443/templates/animation-demo/

## 操作方法
1. カメラを地面に向けて地面を検出
2. 地面をタップしてキャラクターを配置
3. 下部のボタンでアニメーション切り替え:
   - 😐 Idle — 待機ポーズ
   - 🚶 Pockets — ポケットに手を入れて歩く
   - 💃 HipHop — ヒップホップダンス
   - 🐔 Chicken — チキンダンス

## 技術メモ
- aframe-extras v7.5.0 を CDN から読み込み
- `animation-mixer` の `clip` でアニメーション名を指定
- `crossFadeDuration: 0.4` でアニメーション間のスムーズな遷移
- `loop: 'repeat'` で無限ループ再生
- glTF 内のアニメーション名は Blender/Mixamo でのエクスポート時に決まる

## カスタマイズ方法
### 3Dモデルの差し替え
1. Mixamo (mixamo.com) でキャラクターとアニメーションを選択
2. glTF/GLB 形式でダウンロード
3. `assets/` に配置し、`src` を変更
4. ボタンの `clip` 名をモデル内のアニメーション名に合わせる

### アニメーション名の確認
glTF Viewer (https://gltf-viewer.donmccurdy.com/) でモデルを開くと
含まれるアニメーション名が確認できる。

### アニメーション速度の変更
`animation-mixer` に `timeScale: 2` を追加すると2倍速になる。
