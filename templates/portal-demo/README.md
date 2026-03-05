# Portal AR Demo

## 概要
地面にポータル（異世界への入口）を配置するARデモ。
ポータルの向こうには幻想的な3D空間が広がり、近づいて中を覗くことができる。
`xrextras-hider-material` でポータル外からは壁で遮蔽し、開口部からのみ内部が見える。

## 使用している8th Wall機能
- **SLAM (xrweb)**: 地面検出とオブジェクト配置
- **xrextras-hider-material**: 透明だが背後のオブジェクトを遮蔽するマテリアル
- **A-Frame animation**: 浮遊・回転アニメーション

## 起動方法
    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセス: https://<サーバーIP>:8443/templates/portal-demo/

## 操作方法
1. カメラを地面に向けて地面を検出
2. 地面をタップしてポータルを配置
3. ポータルに近づくと中の世界が見える
4. ポータルをくぐると中に入れる

## 技術メモ
- `xrextras-hider-material` はレンダリングはしないがデプスバッファに書き込む特殊マテリアル
- ポータルの「穴」は、開口部以外を hider-material で覆うことで表現
- カメラのZ座標でポータルの内外を判定し、壁の表示/非表示を切り替え
- 内部の skybox は `<a-sphere>` + `side: back` で球体テクスチャ（簡易版）

## カスタマイズ方法
### 内部世界の変更
`portal-contents` 内のオブジェクトを差し替え。GLB モデルやパーティクルを追加可能。

### ポータルのサイズ変更
portal-wall の各 `<a-box>` の position/width/height を調整。

### フレームの色変更
`color="#00f0ff"` を任意のカラーコードに変更。
