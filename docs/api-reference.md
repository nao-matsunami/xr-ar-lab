# 8th Wall エンジン API リファレンス

## エンジンバイナリ情報

| ファイル | サイズ | 説明 |
|---|---|---|
| `xr.js` | 1,013KB | コアエンジン（パイプライン管理、カメラ制御、Image Target） |
| `xr-slam.js` | 5,538KB | SLAMチャンク（空間認識、平面検出、6DoFトラッキング） |
| `xr-face.js` | 7,676KB | Faceチャンク（顔検出・追跡、顔メッシュ） |

### resourcesディレクトリ

| ファイル | 説明 |
|---|---|
| `face-model.tflite` | 顔検出用TFLiteモデル |
| `face-mesh-model.tflite` | 顔メッシュ生成用TFLiteモデル |
| `face-ear-model.tflite` | 耳検出用TFLiteモデル |
| `semantics-model.tflite` | セマンティクス（空認識等）用TFLiteモデル |
| `media-worker.js` | メディア処理Web Worker |
| `semantics-worker.js` | セマンティクス処理Web Worker |
| `dom-tablet-button.glb` | UI用3Dモデル（タブレットボタン） |
| `dom-tablet-frame.glb` | UI用3Dモデル（タブレットフレーム） |
| `powered-by.svg` | Powered by ロゴ |

---

## XR8 グローバルAPI

`window.XR8` に公開されるAPIモジュール。

### コアメソッド

| メソッド | 説明 |
|---|---|
| `XR8.run({canvas})` | ARセッションを開始。canvasにカメラ映像を描画 |
| `XR8.stop()` | ARセッションを停止 |
| `XR8.pause()` | ARセッションを一時停止 |
| `XR8.resume()` | 一時停止したセッションを再開 |
| `XR8.isInitialized()` | エンジンが初期化済みか確認 |
| `XR8.getCompatibility()` | デバイスの互換性情報を取得 |

### パイプライン管理

| メソッド | 説明 |
|---|---|
| `XR8.addCameraPipelineModule(module)` | パイプラインモジュールを1つ追加 |
| `XR8.addCameraPipelineModules([modules])` | パイプラインモジュールを複数追加 |
| `XR8.removeCameraPipelineModule(module)` | パイプラインモジュールを1つ削除 |
| `XR8.removeCameraPipelineModules([modules])` | パイプラインモジュールを複数削除 |
| `XR8.clearCameraPipelineModules()` | 全パイプラインモジュールをクリア |

### レンダリング制御

| メソッド | 説明 |
|---|---|
| `XR8.runPreRender()` | プリレンダーパスを手動実行 |
| `XR8.runRender()` | レンダーパスを手動実行 |
| `XR8.runPostRender()` | ポストレンダーパスを手動実行 |
| `XR8.drawTexForComputeTex()` | コンピュートテクスチャ用の描画テクスチャ |

### サブモジュール

| モジュール | 説明 |
|---|---|
| `XR8.XrController` | SLAMトラッキングコントローラー |
| `XR8.FaceController` | 顔トラッキングコントローラー |
| `XR8.LayersController` | レイヤー（空セグメンテーション等）コントローラー |
| `XR8.GlTextureRenderer` | WebGLテクスチャレンダラー |
| `XR8.Threejs` | Three.js統合モジュール |
| `XR8.AFrame` | A-Frame統合モジュール |
| `XR8.PlayCanvas` | PlayCanvas統合モジュール |
| `XR8.XrConfig` | XR設定 |
| `XR8.XrDevice` | デバイス情報 |
| `XR8.CameraPixelArray` | カメラピクセルデータアクセス |
| `XR8.CanvasScreenshot` | キャンバススクリーンショット |

---

## XR8.XrController

SLAMトラッキング（空間認識）を制御するモジュール。

| メソッド | 説明 |
|---|---|
| `XR8.XrController.configure(config)` | SLAMの設定を行う |
| `XR8.XrController.pipelineModule()` | SLAMパイプラインモジュールを取得 |
| `XR8.XrController.recenter()` | シーンの原点を現在位置にリセット |
| `XR8.XrController.updateCameraProjectionMatrix({origin, facing})` | カメラ投影行列を更新 |

### configure() のオプション

```javascript
XR8.XrController.configure({
  disableWorldTracking: false,  // true: Image Targetのみ使用（SLAMオフ）
  imageTargets: [],             // Image Target CLI で生成したデータ
})
```

---

## XR8.FaceController

顔トラッキングを制御するモジュール。

| メソッド | 説明 |
|---|---|
| `XR8.FaceController.configure(config)` | 顔トラッキングの設定 |
| `XR8.FaceController.pipelineModule()` | 顔トラッキングパイプラインモジュールを取得 |

### configure() のオプション

```javascript
XR8.FaceController.configure({
  meshGeometry: [XR8.FaceController.MeshGeometry.FACE],
  // FACE: 顔メッシュ
  // EYES: 目メッシュ
  // MOUTH: 口メッシュ
})
```

### 顔トラッキングイベント

パイプラインモジュールで受け取るイベント:

| イベント | 説明 |
|---|---|
| `facecontroller.faceloading` | 顔モデルの読み込み中 |
| `facecontroller.facefound` | 顔が検出された |
| `facecontroller.faceupdated` | 顔の位置・姿勢が更新された |
| `facecontroller.facelost` | 顔が検出範囲外になった |

各イベントのコールバックデータ:

```javascript
{
  transform: {
    position: {x, y, z},       // 顔の3D位置
    rotation: {x, y, z, w},    // 顔の回転（クォータニオン）
    scale: number,             // 顔のスケール
  },
  attachmentPoints: { ... },   // アタッチポイント座標
  vertices: Float32Array,      // 顔メッシュ頂点
  normals: Float32Array,       // 顔メッシュ法線
}
```

---

## XR8.GlTextureRenderer

WebGLテクスチャの描画を制御するモジュール。

| メソッド | 説明 |
|---|---|
| `GlTextureRenderer.configure(config)` | レンダラー設定 |
| `GlTextureRenderer.create()` | レンダラーインスタンスを生成 |
| `GlTextureRenderer.pipelineModule()` | パイプラインモジュールを取得 |
| `GlTextureRenderer.fillTextureViewport()` | テクスチャでビューポートを埋める |
| `GlTextureRenderer.getGLctxParameters()` | WebGLコンテキストパラメータを取得 |
| `GlTextureRenderer.setGLctxParameters(params)` | WebGLコンテキストパラメータを設定 |
| `GlTextureRenderer.setTextureProvider(provider)` | テクスチャプロバイダーを設定 |
| `GlTextureRenderer.setForegroundTextureProvider(provider)` | 前景テクスチャプロバイダーを設定 |

---

## XR8.Threejs

Three.js統合モジュール。

| メソッド / プロパティ | 説明 |
|---|---|
| `XR8.Threejs.pipelineModule()` | Three.jsパイプラインモジュールを取得 |
| `XR8.Threejs.xrScene()` | Three.jsシーンオブジェクトを取得 |
| `XR8.Threejs.ThreejsRenderer` | Three.jsレンダラークラス |

### xrScene() の戻り値

```javascript
const {scene, camera, renderer, gl} = XR8.Threejs.xrScene()
// scene: THREE.Scene
// camera: THREE.PerspectiveCamera
// renderer: THREE.WebGLRenderer
// gl: WebGLRenderingContext
```

---

## チャンクシステム

エンジンは機能別にチャンクとして分割されている。

### 利用可能なチャンク

| チャンク | ファイル | サイズ | 機能 |
|---|---|---|---|
| `slam` | `xr-slam.js` | 5.3MB | 空間認識、平面検出、SLAM |
| `face` | `xr-face.js` | 7.4MB | 顔検出・追跡、顔メッシュ |

### ロード方法

#### HTML属性で事前ロード（推奨）

```html
<script async src="xr.js" data-preload-chunks="slam"></script>
<script async src="xr.js" data-preload-chunks="face"></script>
<script async src="xr.js" data-preload-chunks="face,slam"></script>
```

#### JavaScript APIでロード

```javascript
await XR8.loadChunk('slam')
await XR8.loadChunk('face')
```

---

## XRExtras API

CDN（`cdn.8thwall.com/web/xrextras/xrextras.js`）から提供されるユーティリティ。

### パイプラインモジュール

| モジュール | 説明 |
|---|---|
| `XRExtras.AlmostThere.pipelineModule()` | 非対応ブラウザ検出・ヒント表示 |
| `XRExtras.FullWindowCanvas.pipelineModule()` | キャンバスをウィンドウいっぱいに |
| `XRExtras.Loading.pipelineModule()` | ローディング画面管理 |
| `XRExtras.RuntimeError.pipelineModule()` | ランタイムエラー表示 |
| `XRExtras.PauseOnBlur.pipelineModule()` | タブ非アクティブ時に一時停止 |
| `XRExtras.Stats.pipelineModule()` | パフォーマンス統計表示 |
| `XRExtras.MediaRecorder` | AR画面の録画 |
| `XRExtras.PwaInstaller` | PWAインストールプロンプト |
| `XRExtras.DebugWebViews` | デバッグ用WebView情報 |
| `XRExtras.Lifecycle` | ライフサイクル管理 |

### ローディング画面API

```javascript
XRExtras.Loading.showLoading({onxrloaded})
// onxrloaded: XR8ロード後に呼ばれるコールバック
```

### Three.jsユーティリティ

| メソッド | 説明 |
|---|---|
| `XRExtras.ThreeExtras.pbrMaterial(config)` | PBRマテリアル生成 |
| `XRExtras.ThreeExtras.basicMaterial(config)` | Basicマテリアル生成 |
| `XRExtras.ThreeExtras.videoMaterial(config)` | ビデオテクスチャマテリアル生成 |
| `XRExtras.ThreeExtras.faceMesh()` | 顔メッシュジオメトリ生成 |
| `XRExtras.ThreeExtras.createTargetGeometry(type)` | ターゲット形状ジオメトリ生成 |

---

## A-Frame コンポーネント一覧

### XRコアコンポーネント（8frame内蔵）

| コンポーネント | 説明 |
|---|---|
| `xrweb` | SLAMベースのAR（背面カメラ） |
| `xrface` | 顔トラッキングAR（前面カメラ） |
| `xrlayers` | レイヤーベースAR（空置換等） |
| `xrlayerscene` | レイヤーシーンの定義 |
| `xrconfig` | XRエンジン設定 |

### XRExtrasコンポーネント

#### 基本UI・ライフサイクル

| コンポーネント | 説明 |
|---|---|
| `xrextras-loading` | ローディング画面表示 |
| `xrextras-runtime-error` | ランタイムエラー表示 |
| `xrextras-almost-there` | 非対応ブラウザヒント |
| `xrextras-stats` | パフォーマンス統計 |
| `xrextras-log-to-screen` | 画面上にログ表示 |
| `xrextras-pause-on-blur` | 非アクティブ時に一時停止 |
| `xrextras-pause-on-hidden` | 非表示時に一時停止 |
| `xrextras-pwa-installer` | PWAインストール促進 |
| `xrextras-opaque-background` | 不透明背景 |
| `xrextras-hide-camera-feed` | カメラフィード非表示 |
| `xrextras-session-reconfigure` | セッション再設定 |

#### ジェスチャー・操作

| コンポーネント | 説明 |
|---|---|
| `xrextras-gesture-detector` | ジェスチャー検出（1本指・2本指） |
| `xrextras-one-finger-rotate` | 1本指で回転 |
| `xrextras-two-finger-rotate` | 2本指で回転 |
| `xrextras-pinch-scale` | ピンチで拡縮 |
| `xrextras-hold-drag` | 長押しドラッグ移動 |
| `xrextras-tap-recenter` | タップでリセンター |
| `xrextras-spin` | 自動回転 |

#### Image Target

| コンポーネント | 説明 |
|---|---|
| `xrextras-named-image-target` | 名前付きImage Targetに子要素を紐付け |
| `xrextras-generate-image-targets` | 画像からImage Targetを動的生成 |
| `xrextras-target-mesh` | ターゲット形状メッシュ |
| `xrextras-target-video-fade` | ターゲット上で動画フェード |
| `xrextras-target-video-sound` | ターゲット上で動画+音声 |
| `xrextras-curved-target-container` | 曲面ターゲットコンテナ |
| `xrextras-play-video` | ターゲット上で動画再生 |

#### 顔エフェクト

| コンポーネント | 説明 |
|---|---|
| `xrextras-face-mesh` | 顔メッシュ描画（色・透明度指定可） |
| `xrextras-face-attachment` | 顔のポイントに3Dオブジェクト固定 |
| `xrextras-faceanchor` | 顔アンカー |
| `xrextras-ear-attachment` | 耳にオブジェクト固定 |

#### ハンドトラッキング

| コンポーネント | 説明 |
|---|---|
| `xrextras-hand-anchor` | 手のアンカー |
| `xrextras-hand-attachment` | 手にオブジェクト固定 |
| `xrextras-hand-mesh` | 手メッシュ描画 |
| `xrextras-hand-occluder` | 手によるオクルージョン |
| `xrextras-wrist-mesh` | 手首メッシュ |

#### マテリアル・レンダリング

| コンポーネント | 説明 |
|---|---|
| `xrextras-pbr-material` | PBRマテリアル |
| `xrextras-basic-material` | Basicマテリアル |
| `xrextras-video-material` | ビデオマテリアル |
| `xrextras-hider-material` | オクルージョン用マテリアル |

#### メディア撮影

| コンポーネント | 説明 |
|---|---|
| `xrextras-capture-button` | 撮影ボタン |
| `xrextras-capture-preview` | 撮影プレビュー |
| `xrextras-capture-config` | 撮影設定 |

#### ユーティリティ

| コンポーネント | 説明 |
|---|---|
| `xrextras-attach` | エンティティを別のエンティティに追従 |
| `xrextras-resource` | リソース管理 |

### カスタムプリミティブ

| プリミティブ | 説明 |
|---|---|
| `<sky-scene>` | スカイレイヤーシーンプリミティブ |
| `<artgallery-frame>` | アートギャラリーフレーム（サンプル専用） |

### サンプル固有コンポーネント

| コンポーネント | サンプル | 説明 |
|---|---|---|
| `tap-place` | placeground | タップで配置 |
| `shoot-tomato` | tossobject | トマト発射 |
| `portal` | portal | ポータル表示切替 |
| `bob` | portal | 浮遊アニメーション |
| `cubemap-static` | portal | キューブマップ反射 |
| `sky-recenter` | sky | 空検出後リセンター |
| `artgalleryframe` | artgallery | ギャラリーフレーム |
| `target-video` | alpha-video | クロマキー動画 |
| `named-location` | vps | VPSロケーション |
| `shadow-shader` | vps | 影シェーダー |
| `hider-material` | vps | オクルージョンマテリアル |
| `desktop-development` | vps | デスクトップ開発モード |
| `info-display` | artgallery | 情報パネル |

---

## オープンソース（MIT）モジュール

`vendor/8thwall/` で公開されているソースコード。

### パッケージ構成

| パッケージ | 内容 |
|---|---|
| `packages/engine/` | XRエンジンのソースコード（TypeScript） |
| `packages/xrextras/` | XRExtrasライブラリのソースコード |

### エンジンソース構成（91ファイル）

| カテゴリ | 主要ファイル |
|---|---|
| A-Frameコンポーネント | `xr-web-component.ts`, `xr-config-component.ts`, `xr-layer-scene-component.ts` |
| コントローラー | `tracking-controller.ts`, `face-controller.ts`, `layers-controller.ts` |
| パイプライン | `lifecycle.ts`, `loop.ts`, `camera-loop.ts` |
| チャンクローダー | `chunk-loader.ts` |
| レンダリング | `gl-renderer.ts`, `threejs-renderer.ts` |
| デバイス | `js-device.ts`, `compatibility.ts` |
| セッション管理 | `session-manager-desktop3d.ts`, `session-manager-getusermedia.ts` |
| WebXR対応 | `webxr-compatibility.ts`, `webxr-controller.js` |
| メディア | `media-recorder.ts`, `canvas-operations.ts`, `wasm-recorder.ts` |

### ネイティブエンジン（C++/Bazel）

| ディレクトリ | 内容 |
|---|---|
| `reality/engine/faces/` | 顔検出・追跡エンジン |
| `reality/engine/imagedetection/` | 画像認識エンジン |
| `reality/engine/semantics/` | セマンティクス（空検出等） |
| `c8/geometry/` | 顔ジオメトリ生成 |
| `c8/pixels/` | ピクセル処理 |

---

## 制約事項

### 利用不可な機能

| 機能 | 理由 |
|---|---|
| Lightship VPS | Niantic VPSサーバーが必要 |
| Hand Tracking | コンポーネントはあるが動作は未確認 |
| Lightship Maps | Niantic Mapsサーバーが必要 |
| Cloud Studio | Nianticプラットフォーム連携が必要 |
| アナリティクス | Nianticバックエンド依存 |
| Multiplayer/Shared AR | サーバーサイドが必要 |

### バイナリ vs MIT

| 部分 | ライセンス | ソース公開 |
|---|---|---|
| xr.js / xr-slam.js / xr-face.js | 8th Wall Engine License | 非公開（ミニファイ済み） |
| xrextras | MIT | 公開（ビルド必要） |
| A-Frameコンポーネント | MIT | 公開 |
| エンジンソース（TypeScript） | MIT | 公開（ビルド必要） |
| ネイティブエンジン（C++） | MIT | 公開（Bazelビルド必要） |
