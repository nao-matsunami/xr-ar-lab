# Face Effects AR Demo

## 概要
カメラに顔を映すと、顔にエフェクト（フェイスペイント・メガネ・王冠・マスク等）がリアルタイムで表示されるテンプレート。
xrextras の組み込みコンポーネント（`xrextras-basic-material` + `xrextras-face-mesh`）と
8th Wall 公式サンプルの `face-alpha.png` テクスチャを使用。

## ユースケース
- イベント会場でのフォトブース
- SNSプロモーション用のフィルター
- エンターテインメント施設でのインタラクティブ体験
- バーチャル試着（メガネ、帽子、アクセサリー）

## 起動方法

    cd ~/xr-ar-lab
    ./tools/serve.sh . 8443

アクセスURL: https://<サーバーIP>:8443/templates/face-effects-demo/

**注意:** Face Effects はフロントカメラ（自撮りカメラ）を使用します。

## エフェクト一覧

| ボタン | 内容 |
|--------|------|
| Paint | face-alpha.png テクスチャによるフェイスペイント（白）|
| Glasses | 青色フェイスペイント + メガネ（noseBridge） |
| Crown | 金色フェイスペイント + 王冠（forehead） |
| Mask | 紫色フェイスペイント + 仮面装飾（noseBridge） |
| Off | フェイスメッシュ非表示 |

## 使用しているAR機能・コンポーネント

### 8th Wall コア
- **xrface**: A-Frame用のフェイストラッキングコンポーネント
- **8th Wall Face Effects**: 顔を検出し、顔メッシュ（3D形状）にフィッティング

### xrextras 組み込みコンポーネント（マテリアル定義）
- **`<xrextras-resource>`**: テクスチャファイルパスの定義
- **`<xrextras-basic-material>`**: BasicMaterial を生成（tex + alpha マップ）
- **`<xrextras-face-mesh>`**: 顔の3Dメッシュを描画、`material-resource` でマテリアルを参照

### xrextras 組み込みコンポーネント（顔トラッキング）
- **`<xrextras-faceanchor>`**: 顔のワールド座標（position/rotation/scale）を適用
- **`<xrextras-face-attachment>`**: 顔の特定ポイントに3Dオブジェクトを固定

### 組み込みアセット
- **`face-alpha.png`**: 8th Wall 公式サンプル（swap-camera）の顔マスクテクスチャ。
  白い顔形状で目・口が透明のアルファマップ。`tex` と `alpha` の両方に使用。

## マテリアル定義パターン（xrextras 標準）

    <!-- 1. リソース定義 -->
    <xrextras-resource id="face-tex" src="./assets/face-alpha.png"></xrextras-resource>

    <!-- 2. マテリアル定義 -->
    <xrextras-basic-material id="face-paint-mat"
      tex="#face-tex" alpha="#face-tex" opacity="0.8">
    </xrextras-basic-material>

    <!-- 3. 顔メッシュに適用 -->
    <xrextras-face-mesh material-resource="#face-paint-mat"></xrextras-face-mesh>

**注意:** `xrextras-basic-material` の `tex` 属性にファイルパスを直接指定すると
`querySelector` が CSS セレクタとして解釈して失敗する。
必ず `<xrextras-resource>` で ID を付けて `#id` で参照すること。

## 必須構造: faceanchor + face-attachment

`xrextras-face-attachment` は必ず `xrextras-faceanchor` の子として配置すること。
faceanchor が顔のワールド座標（position/rotation/scale）を適用し、
face-attachment がその中の特定ポイントにオフセットする。

    <a-entity xrextras-faceanchor>
      <a-entity xrextras-face-attachment="point: noseBridge">
        <!-- 顔の鼻すじに表示されるオブジェクト -->
      </a-entity>
    </a-entity>

**注意:** faceanchor なしで face-attachment を使うと、オブジェクトが顔の相対座標のまま
ワールド空間に配置され、見えない位置に表示される。

## 重要: face-attachment の visible 制御

`xrextras-face-attachment` は `xrfaceupdated` イベント毎に
`this.el.object3D.visible = true` を強制する。
そのため **face-attachment エンティティ自体の visible 属性を切り替えても無効**。

エフェクトの表示/非表示を切り替えるには、**子のラッパーエンティティ**を使う:

    <a-entity xrextras-face-attachment="point: noseBridge">
      <a-entity id="glasses-effect" visible="false">
        <!-- ここに3Dオブジェクトを配置 -->
      </a-entity>
    </a-entity>

    // JavaScript
    document.getElementById('glasses-effect').setAttribute('visible', true)

### 顔のアタッチポイント
`xrextras-face-attachment` の `point` で指定可能:
- `forehead` — 額
- `noseBridge` — 鼻すじ
- `noseTip` — 鼻先
- `leftEye` / `rightEye` — 左右の目
- `leftEar` / `rightEar` — 左右の耳
- `leftCheek` / `rightCheek` — 左右の頬
- `chin` — あご
- `upperLip` / `lowerLip` — 上唇 / 下唇
- `mouth` — 口
- `leftIris` / `rightIris` — 左右の虹彩
- `leftEyebrowInner` / `leftEyebrowMiddle` / `leftEyebrowOuter` — 左眉
- `rightEyebrowInner` / `rightEyebrowMiddle` / `rightEyebrowOuter` — 右眉

## カスタマイズ方法

### フェイスペイントテクスチャの差し替え
`assets/` にカスタムテクスチャを配置し、`xrextras-resource` の src を変更:

    <xrextras-resource id="face-tex" src="./assets/my-face-paint.png"></xrextras-resource>

テクスチャ要件:
- 白い部分 = 表示、黒い部分 = 透明（alpha マップとして使用）
- 正方形推奨（顔メッシュの UV に合わせてマッピングされる）
- JavaScript で `material.color.set('#FF0000')` すると色を乗算で着色可能

### エフェクトの追加
`xrextras-faceanchor` 内に face-attachment + ラッパーを追加:

    <a-entity xrextras-face-attachment="point: forehead">
      <a-entity id="hat-effect" visible="false">
        <a-cylinder position="0 0.05 0" radius="0.04" height="0.08" color="#8B4513"></a-cylinder>
      </a-entity>
    </a-entity>

### 3Dモデルの差し替え
A-Frameプリミティブの代わりに GLB モデルを使用:

    <a-entity xrextras-face-attachment="point: forehead">
      <a-entity id="hat-effect">
        <a-entity gltf-model="./assets/hat.glb" scale="0.01 0.01 0.01"></a-entity>
      </a-entity>
    </a-entity>

### PBR マテリアルの使用
より高品質な顔テクスチャには `xrextras-pbr-material` を使用:

    <xrextras-resource id="face-color" src="./assets/face-color.png"></xrextras-resource>
    <xrextras-resource id="face-normal" src="./assets/face-normal.png"></xrextras-resource>
    <xrextras-resource id="face-rough" src="./assets/face-roughness.png"></xrextras-resource>

    <xrextras-pbr-material id="face-pbr-mat"
      tex="#face-color" normals="#face-normal" roughness="#face-rough" opacity="0.9">
    </xrextras-pbr-material>

    <xrextras-face-mesh material-resource="#face-pbr-mat"></xrextras-face-mesh>

## 横展開ガイド
このテンプレートをコピーして案件プロジェクトを作成する手順:

    cp -r ~/xr-ar-lab/templates/face-effects-demo ~/xr-ar-lab/projects/my-face-app
    # assets/ にカスタムテクスチャ・モデルを配置
    # index.html を編集してエフェクトをカスタマイズ

## 技術メモ
- スクリプト読み込み順: 8frame → xrextras → landing-page → xr.js (async, data-preload-chunks="face")
- `data-preload-chunks="face"` で xr-face.js（約7.7MB）をプリロード
- `xrface` のデフォルトは背面カメラ。`cameraDirection: front; mirroredDisplay: true` でセルフィーモードに設定
- 顔メッシュの座標系は顔のローカル座標（単位はメートル相当、顔サイズに対する比率）
- 顔のスケール値は position/scale とも小さめ（0.01〜0.1 単位）
- 同時に検出できる顔は通常1つ（`maxDetections` で変更可能）
- `xrextras-basic-material` は `XRExtras.ThreeExtras.basicMaterial()` を内部で呼び出し、Three.js の `MeshBasicMaterial` を生成
- JavaScript から `material.color.set()` で色を動的に変更可能（テクスチャとの乗算）
- `face-alpha.png` は 8th Wall 公式 swap-camera サンプル由来（vendor/web/examples/threejs/swap-camera/assets/）

## デバッグ方法

### 画面上デバッグ（USBケーブル不要）
    https://<トンネルURL>/templates/face-effects-demo/debug.html

画面上部の緑色テキストで内部状態が確認できます。

### Chrome リモートデバッグ（詳細）
1. Pixel 7 をUSBでPCに接続
2. Pixel 7: 設定 → 開発者オプション → USBデバッグ ON
3. PC Chrome: chrome://inspect → Pixel 7 のページを inspect
4. Console タブで `[face-debug]` ログを確認
