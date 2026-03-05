# World SLAM AR Demo

## 概要
空間認識（SLAM）で地面や平面を検出し、タップで3Dオブジェクトを現実空間に配置するテンプレート。
4種類の形状（ボックス・球・シリンダー・コーン）をランダムな色で配置でき、取り消し・全削除が可能。

## ユースケース
- 展示会での仮想レイアウトシミュレーション
- 家具・インテリアの仮想配置
- ナビゲーション用マーカーの設置
- 教育用3Dオブジェクト教材の配置

## 起動方法

    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセスURL: https://<サーバーIP>:8443/templates/world-slam-demo/

## 使い方
1. カメラを起動したら、地面をゆっくりスキャン（左右に動かす）
2. 下部のUI で配置する形状を選択（Box / Sphere / Cylinder / Cone）
3. 画面をタップして3Dオブジェクトを配置
4. Undo で最後に置いたオブジェクトを削除、Clear All で全削除

## 使用しているAR機能
- **8th Wall SLAM (XrController)**: カメラの位置・姿勢をリアルタイム推定
- **xrweb**: A-Frame用のSLAMコンポーネント
- **raycaster**: タップ位置から地面への交差判定
- **shadow**: 影描画によるリアルな接地感
- **xrextras-attach**: ライトをカメラに追従させて自然なライティング

## カスタマイズ方法

### 3Dモデルの差し替え
`tap-place-multi` コンポーネント内の `switch` 文に新しいケースを追加:

    case 'tree':
      child = document.createElement('a-entity')
      child.setAttribute('gltf-model', './assets/tree.glb')
      child.setAttribute('scale', '0.5 0.5 0.5')
      break

GLB ファイルを `assets/` に配置し、UI ボタンを追加してください。

### UI の変更
`#shape-picker` 内のボタンを追加・変更。`data-shape` 属性を `selectShape()` の引数に対応させてください。

### 配置後のインタラクション追加
配置したオブジェクトに `xrextras-hold-drag`（ドラッグ移動）や
`xrextras-pinch-scale`（ピンチ拡大縮小）を追加可能:

    child.setAttribute('xrextras-hold-drag', '')
    child.setAttribute('xrextras-pinch-scale', '')

## 横展開ガイド
このテンプレートをコピーして案件プロジェクトを作成する手順:

    cp -r ~/xr-ar-lab/templates/world-slam-demo ~/xr-ar-lab/projects/my-slam-app
    # assets/ にカスタム3Dモデルを配置
    # index.html を編集してオブジェクトとUIをカスタマイズ

## 技術メモ
- スクリプト読み込み順: 8frame → xrextras → landing-page → xr.js (async, data-preload-chunks="slam")
- 動作確認済みテンプレート `templates/image-target/` をベースに拡張
- 地面プレーンは `shader: shadow` を使用（透明だが影を受ける）
- `raycaster="objects: .cantap"` で `.cantap` クラスの要素のみタップ可能
- カメラ初期位置 `y=8` はSLAMトラッキングの基準高さ
- ポップインアニメーションは `easeOutElastic` で弾むような演出
- 配置オブジェクトは JavaScript 配列で管理（Undo/Clear に使用）
