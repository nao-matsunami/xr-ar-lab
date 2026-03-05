# xr-ar-lab

AR/VR開発基盤。8th Wallオープンソース版をベースに、各種AR機能のテンプレートを作成し、
他プロジェクト（氷見AIラボ、映像演出、プロモーション等）に横展開する。

## クイックスタート

サーバー起動:
  cd ~/xr-ar-lab
  ./tools/serve.sh vendor/web/examples/aframe 8443

モバイルでアクセス:
  https://<サーバーIP>:8443

## ディレクトリ構成

- vendor/     外部リポジトリ（8th Wall エンジン・サンプル）
- templates/  機能別テンプレート（横展開元）
- projects/   実案件プロジェクト
- shared/     共通アセット・3Dモデル
- tools/      開発ツール・SSL証明書・起動スクリプト
- docs/       ドキュメント

## テンプレート

- image-target/  画像認識AR（Phase 1）
- face-effects/  顔エフェクト（Phase 2）
- sky-effects/   空エフェクト（Phase 3）
- world-slam/    空間認識SLAM（Phase 4）

## 技術スタック

- 8th Wall XR Engine（バイナリ: SLAM / MIT: Face, Image Target, Sky）
- A-Frame / Three.js
- WebAR（ブラウザベース、アプリ不要）
