# Physics AR Demo

## 概要
画面タップでトマトを投げ、地面にぶつかるとスプラットするARデモ。
物理エンジン（aframe-physics-system）による重力・衝突判定を使用。

## 使用している8th Wall機能
- **SLAM (xrweb)**: 地面検出
- **aframe-physics-system**: Ammo.js ベースの物理シミュレーション
- **body/shape コンポーネント**: 物理ボディの定義
- **collide イベント**: 衝突検出

## 起動方法
    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセス: https://<サーバーIP>:8443/templates/physics-demo/

## 操作方法
1. カメラを地面に向けて地面を検出
2. 画面をタップするとカメラの向いている方向にトマトが飛ぶ
3. 地面に衝突するとスプラットエフェクト + 効果音
4. 右上にトスカウント表示

## 技術メモ
- aframe-physics-system v4.2.2 を CDN から読み込み
- `body="type: dynamic"` で重力の影響を受けるオブジェクト生成
- `body="type: static"` で地面（動かない物体）を設定
- `velocity` 属性でカメラ方向への初速を設定
- 同時に存在するトマトは最大10個（パフォーマンス保護）
- 衝突は `collide` イベントで検出、`e.detail.body.el` で相手を特定

## カスタマイズ方法
### 投げるオブジェクトの変更
`<a-asset-item>` の src を別の GLB モデルに変更。
`sphereRadius` を物体サイズに合わせて調整。

### 投げる速度の変更
`new THREE.Vector3(0, 0, -10)` の `-10` を変更（大きいほど速い）。

### 重力の変更
`<a-scene physics="gravity: -9.8">` で重力を調整（デフォルト: -9.8）。
