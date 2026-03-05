# Capture Photo AR Demo

## 概要
AR画面のスクリーンショットを撮影し、ウォーターマーク付きで保存・共有できるデモ。
SLAM で地面を検出し、タップでUFOを配置してから撮影。

## 使用している8th Wall機能
- **xrextras-capture-button**: 撮影ボタンUI（capture-mode="photo"）
- **xrextras-capture-config**: ウォーターマーク・ファイル名設定
- **xrextras-capture-preview**: 撮影画像のプレビュー表示
- **SLAM (xrweb)**: 地面検出とオブジェクト配置
- **XR8.CanvasScreenshot**: 内部的にキャンバスからスクリーンショット生成

## 起動方法
    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセス: https://<サーバーIP>:8443/templates/capture-demo/

## 操作方法
1. カメラを地面に向けて地面を検出
2. 地面をタップしてUFOを配置（最大5個）
3. 画面下部の📷ボタンで撮影
4. プレビューが表示される → 保存/共有

## 技術メモ
- `xrextras-capture-button` は `capture-mode="photo"` で写真モードに設定
- `mediarecorder-photocomplete` イベントで撮影完了を検知
- ウォーターマークは `xrextras-capture-config` で設定（位置・サイズ指定可能）
- Web Share API 対応ブラウザでは共有ボタンが表示される

## カスタマイズ方法
### ウォーターマーク変更
`assets/` にカスタムロゴ画像を配置し、`watermark-image-url` を変更。

### 配置オブジェクトの変更
`<a-asset-item>` の `src` を別の GLB ファイルに差し替え。

### 動画撮影モード
`capture-mode="photo"` を `capture-mode="standard"` に変更すると動画撮影になる。
