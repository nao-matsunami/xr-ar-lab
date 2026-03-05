# Hand Tracking AR Demo

## 概要
カメラに手をかざすと、手の3Dメッシュと指先エフェクトが表示されるデモ。
xrextras のハンドトラッキングコンポーネント群を使用。

## ⚠️ 対応状況
ハンドトラッキングは 8th Wall の比較的新しい機能で、以下の制約があります:
- **オープンソース版エンジン**: hand チャンクが含まれていない場合、動作しません
- **クラウドエンジン（有料版）**: 完全対応
- **デバイス**: iOS Safari, Android Chrome の一部で対応
- **フォールバック**: 15秒間手が検出されない場合、未対応の通知を表示

## 使用している8th Wall機能
- **xrhand**: ハンドトラッキングエンジン
- **xrextras-hand-mesh**: 手の3Dメッシュ表示（ワイヤーフレーム対応）
- **xrextras-hand-anchor**: 手のワールド座標追従
- **xrextras-hand-attachment**: 手の特定ポイント（指先・手のひら）にオブジェクトを固定
- **xrextras-hand-occluder**: 手によるオクルージョン（遮蔽）

## 起動方法
    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセス: https://<サーバーIP>:8443/templates/hand-tracking-demo/

## 操作方法
1. カメラに手を向ける（フロントカメラ使用）
2. 手が検出されると3Dメッシュと指先エフェクトが表示
3. 下部のボタンでエフェクト切り替え:
   - **Mesh**: ワイヤーフレームメッシュ + 指先マーカー
   - **Sparkle**: 手のひらに色変化するスパークルエフェクト
   - **Trail**: メッシュ + 指先トレイル（実験的）
   - **Off**: エフェクトなし

## ハンドアタッチメントポイント
`xrextras-hand-attachment` の `point` で指定可能:
- `palm` — 手のひら中央
- `thumb` — 親指
- `index` — 人差し指
- `middle` — 中指
- `ring` — 薬指
- `pinky` — 小指

各ポイントの `pointType`:
- `center` — 中央（デフォルト）
- `inner` — 内側
- `outer` — 外側（指先）

## 技術メモ
- `data-preload-chunks="hand"` で hand チャンクをプリロード
- `xrhand="allowedDevices: any; cameraDirection: front"` でフロントカメラのハンドトラッキング
- `xrhandfound` / `xrhandupdated` / `xrhandlost` イベントで手の検出状態を監視
- hand-attachment は face-attachment と同様に、`show` 時に `visible = true` を強制する可能性あり
  → 子のラッパーエンティティで visible 制御すること

## カスタマイズ方法
### エフェクトの追加
hand-anchor 内に hand-attachment を追加:

    <a-entity xrextras-hand-attachment="point: pinky; pointType: outer">
      <a-entity id="pinky-effect">
        <a-sphere radius="0.01" color="#ff00ff"></a-sphere>
      </a-entity>
    </a-entity>

### 手メッシュのマテリアル変更
xrextras-basic-material を定義して material-resource で参照:

    <xrextras-basic-material id="hand-mat" opacity="0.5"></xrextras-basic-material>
    <xrextras-hand-mesh material-resource="#hand-mat"></xrextras-hand-mesh>

### オクルージョンの追加
手で背後の3Dオブジェクトを遮蔽する:

    <xrextras-hand-occluder></xrextras-hand-occluder>
