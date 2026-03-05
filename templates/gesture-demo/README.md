# Gesture Manipulation AR Demo

## 概要
AR空間に配置した3Dオブジェクトを、タッチジェスチャー（ドラッグ・ピンチ・回転）で
操作するデモ。xrextras の組み込みジェスチャーコンポーネントを使用。

## 使用している8th Wall機能
- **xrextras-gesture-detector**: タッチジェスチャーの検出と分類
- **xrextras-hold-drag**: 長押し+ドラッグで3Dオブジェクトを移動
- **xrextras-two-finger-rotate**: 2本指回転でY軸回転
- **xrextras-pinch-scale**: ピンチイン/アウトで拡大縮小
- **SLAM (xrweb)**: 地面検出

## 起動方法
    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセス: https://<サーバーIP>:8443/templates/gesture-demo/

## 操作方法
1. カメラを地面に向けて地面を検出
2. 地面をタップして砂の城を配置
3. 長押し+ドラッグで移動
4. 2本指ピンチで拡大/縮小（0.2x〜5x）
5. 2本指回転で回転

## 技術メモ
- `xrextras-gesture-detector` は `<a-scene>` に必須。これがないとジェスチャーイベントが発火しない
- `xrextras-hold-drag` は `dragDelay: 300` で長押し判定（短タップと区別）
- `xrextras-pinch-scale` の `min`/`max` でスケール範囲を制限
- raycaster の `objects: .cantap` とオブジェクトの `class="cantap"` が必須

## カスタマイズ方法
### 3Dモデルの変更
`assets/` に GLB ファイルを配置し、`<a-asset-item>` の src を変更。

### スケール範囲の変更
`xrextras-pinch-scale="min: 0.1; max: 10"` で範囲を調整。

### 回転感度の調整
`xrextras-two-finger-rotate="factor: 10"` で回転速度を変更（デフォルト: 5）。

### 複数オブジェクト対応
`placed` フラグを削除し、タップごとに新しいオブジェクトを生成すれば複数配置可能。
各オブジェクトにジェスチャーコンポーネントを付与すること。
