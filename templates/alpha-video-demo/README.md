# Alpha Video AR Demo

## 概要
透過動画（アルファチャンネル / クロマキー）をAR空間に表示するデモ。
本デモでは動画ファイルの代わりに Canvas ベースのアニメーションで透過表示の概念を実演。
実際の案件ではクロマキー動画（グリーンバック撮影）に差し替えて使用。

## 使用している8th Wall機能
- **SLAM (xrweb)**: 地面検出とオブジェクト配置
- **THREE.CanvasTexture**: Canvas アニメーションをテクスチャとして使用
- **transparent material**: 透過マテリアルで背景が透ける表示

## 本番環境でのクロマキー動画使用方法

実際の動画ファイルを使用する場合:

```html
<!-- CDN からクロマキーマテリアルを読み込み -->
<script src="https://unpkg.com/aframe-chromakey-material@1.1.4/dist/aframe-chromakey-material.min.js"></script>

<!-- 動画アセット -->
<a-assets>
  <video id="myVideo" src="./assets/my-video.mp4"
    playsinline webkit-playsinline crossorigin="anonymous"
    loop autoplay muted></video>
</a-assets>

<!-- クロマキーマテリアルで表示 -->
<a-entity geometry="primitive: plane; width: 2; height: 2"
  material="shader: chromakey; src: #myVideo; color: 0.1 0.9 0.2">
</a-entity>
```

`color: 0.1 0.9 0.2` はキーイングする色（緑）のRGB値。

## 起動方法
    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセス: https://<サーバーIP>:8443/templates/alpha-video-demo/

## 操作方法
1. カメラを地面に向けて地面を検出
2. 地面をタップして透過プレーンを配置
3. 下部のボタンでエフェクトを切り替え（グラデーション / パルス / ウェーブ）
4. プレーンは常にカメラの方を向く（ビルボード）

## 技術メモ
- `THREE.CanvasTexture` で canvas のアニメーションをリアルタイムにテクスチャ化
- `transparent: true` + `depthWrite: false` で正しい透過表示
- ビルボード（常にカメラ方向を向く）は `lookAt` で実装
- 実際のクロマキーには `aframe-chromakey-material` ライブラリを使用

## カスタマイズ方法
### 動画ファイルの差し替え
`assets/` にグリーンバック動画を配置し、上記のクロマキーパターンで使用。

### プレーンのサイズ変更
`geometry="primitive: plane; width: 2; height: 2"` で幅・高さを調整。
