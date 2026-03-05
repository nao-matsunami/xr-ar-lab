# ローカル化済みサンプル

`vendor/web/examples/` の旧ホスト版サンプルを、ローカルエンジンバイナリで動作するよう移植したもの。

## 起動方法

    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443
    # アクセス: https://<URL>/samples/<サンプル名>/

## A-Frame サンプル一覧

| サンプル | AR機能 | チャンク | 動作状態 | 備考 |
|---|---|---|---|---|
| placeground | SLAM | slam | ○ | タップで木を配置。動作確認済みパターンと同一構成 |
| manipulate | SLAM | slam | ○ | ドラッグ・ピンチ・回転操作 |
| tossobject | SLAM | slam | ○ | タップでオブジェクトを投げる物理演算デモ |
| animation-mixer | SLAM | slam | ○ | GLTFアニメーション再生 |
| capturephoto | SLAM | slam | ○ | AR画面のスクリーンショット撮影 |
| portal | SLAM | slam | ○ | ARポータル（異空間への入口） |
| flyer | Image Target | なし | △ | 画像認識デモ。要ターゲット画像設定（旧コンソール依存） |
| artgallery | Image Target | なし | △ | アートギャラリー。要ターゲット画像設定 |
| alpha-video | Image Target | なし | △ | クロマキー動画再生。要ターゲット画像設定 |
| sky | Sky Effects | slam | ○ | 空置換デモ。要sky用テクスチャ（space.png） |
| vps | VPS | slam | ✗ | Niantic VPS依存のため動作不可 |
| reactapp | SLAM | slam | △ | Reactビルドが必要（`npm install && npm start`） |

動作状態: ○=コード上は動作可能、△=追加対応が必要、✗=動作不可

## Three.js サンプル一覧

アクセス: `https://<URL>/samples/threejs/<サンプル名>/`

| サンプル | AR機能 | チャンク | 動作状態 | 備考 |
|---|---|---|---|---|
| placeground | SLAM | slam | ○ | Three.js版タップ配置 |
| 8i-hologram | SLAM | slam | ○ | ホログラム表示 |
| flyer | Image Target | なし | △ | Three.js版画像認識。要ターゲット設定 |
| swap-camera | Face + SLAM | face,slam | ○ | 前面/背面カメラ切替（顔+空間） |
| custom-pipeline-module | SLAM | slam | ○ | カスタムパイプライン作成例 |
| vps | VPS | slam | ✗ | Niantic VPS依存のため動作不可 |

## Babylon.js サンプル一覧

アクセス: `https://<URL>/samples/babylonjs/<サンプル名>/`

| サンプル | AR機能 | チャンク | 動作状態 | 備考 |
|---|---|---|---|---|
| placeground | SLAM | slam | ○ | Babylon.js版タップ配置 |

## 変更点

旧ホスト版からの変更:
- `//apps.8thwall.com/xrweb?appKey=XXXXX` → ローカルの `xr.js` に置換
- A-Frameサンプル: `../../vendor/engine/xr-standalone/xr.js`
- Three.js/Babylon.jsサンプル: `../../../vendor/engine/xr-standalone/xr.js`

## 注意事項

- Image Target系サンプルは、8th Wallコンソールでのターゲット画像アップロードが前提。
  ローカル版ではImage Target CLIでターゲットをコンパイルし、JSONを読み込む設定が必要。
- VPSサンプルはNiantic Lightship VPSが必要なため、オープンソース版では動作しない。
- skyサンプルはspace.pngテクスチャが同梱されている場合のみ動作。
- reactappはビルドが必要: `cd samples/reactapp && npm install && npm start`
