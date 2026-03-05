# XR AR Lab アーキテクチャ

## システム構成図

```mermaid
graph TB
    subgraph "開発マシン"
        SH[serve.sh<br>HTTPSサーバー<br>:8443]
        XR[~/xr-ar-lab/]
        SH --> XR
    end

    subgraph "cloudflaredトンネル"
        CF[tunnel.sh<br>cloudflared]
        SH --> CF
    end

    subgraph "クライアント"
        PC[PC ブラウザ<br>https://localhost:8443]
        SP[スマートフォン<br>https://xxx.trycloudflare.com]
    end

    SH --> PC
    CF --> SP

    style SH fill:#1a1a2e,stroke:#00f0ff,color:#fff
    style CF fill:#1a1a2e,stroke:#f0a,color:#fff
    style SP fill:#1a1a2e,stroke:#0f0,color:#fff
```

## プロジェクト構成の関係

```mermaid
graph LR
    subgraph "vendor/ (外部・編集禁止)"
        ENGINE[engine/<br>xr-standalone/<br>xr.js, xr-slam.js, xr-face.js]
        WEB[web/<br>examples/, xrextras/]
        OSS[8thwall/<br>packages/, apps/]
    end

    subgraph "templates/ (横展開元)"
        IT[image-target-demo]
        FE[face-effects-demo]
        SE[sky-effects-demo]
        WS[world-slam-demo]
    end

    subgraph "projects/ (実案件)"
        P1[himi-tourism-ar]
        P2[event-photo-booth]
        P3[...]
    end

    subgraph "CDN (外部)"
        CDN1[cdn.8thwall.com<br>8frame, xrextras,<br>landing-page,<br>coaching-overlay]
    end

    WEB -->|参考| IT
    WEB -->|参考| FE
    WEB -->|参考| SE
    WEB -->|参考| WS

    IT -->|コピー| P1
    FE -->|コピー| P2

    ENGINE -->|相対パス参照| IT
    ENGINE -->|相対パス参照| FE
    ENGINE -->|相対パス参照| SE
    ENGINE -->|相対パス参照| WS
    ENGINE -->|相対パス参照| P1
    ENGINE -->|相対パス参照| P2

    CDN1 -->|HTTPS| IT
    CDN1 -->|HTTPS| FE
    CDN1 -->|HTTPS| SE
    CDN1 -->|HTTPS| WS
```

## 8th Wall エンジンモジュール構成

```mermaid
graph TB
    subgraph "xr-standalone/"
        XR[xr.js<br>コアエンジン 1MB<br>パイプライン管理<br>カメラ制御<br>Image Target]
        SLAM[xr-slam.js<br>SLAMチャンク 5.5MB<br>空間認識<br>平面検出<br>6DoFトラッキング]
        FACE[xr-face.js<br>Faceチャンク 7.7MB<br>顔検出・追跡<br>顔メッシュ<br>アタッチポイント]
        RES[resources/<br>TFLiteモデル<br>ワーカーJS<br>UI素材]
    end

    XR -->|data-preload-chunks=slam| SLAM
    XR -->|data-preload-chunks=face| FACE
    XR --> RES

    subgraph "CDN: xrextras"
        XREX[xrextras.js<br>A-Frameコンポーネント<br>ローディング画面<br>エラーハンドリング<br>顔メッシュユーティリティ<br>ジェスチャー検出]
    end

    subgraph "CDN: 8frame"
        FRAME[8frame-1.3.0.min.js<br>8th Wall版 A-Frame<br>xrweb/xrface/xrlayers<br>コンポーネント内蔵]
    end

    FRAME --> XR
    XREX --> XR
```

## スクリプト読み込みフロー

### A-Frame + SLAM（動作確認済みパターン）

```mermaid
sequenceDiagram
    participant B as ブラウザ
    participant CDN as cdn.8thwall.com
    participant L as ローカルサーバー

    B->>CDN: 1. 8frame-1.3.0.min.js (sync)
    CDN-->>B: A-Frame + XRコンポーネント登録

    B->>CDN: 2. xrextras.js (sync)
    CDN-->>B: XRExtras ユーティリティ登録

    B->>CDN: 3. landing-page.js (sync)
    CDN-->>B: Landing Page コンポーネント

    B->>L: 4. xr.js (async, preload=slam)
    Note over B: DOMパース継続
    L-->>B: XR8コアエンジン
    B->>L: 4a. xr-slam.js (自動ロード)
    L-->>B: SLAMチャンク

    Note over B: window.XR8 が利用可能に
    B->>B: 5. xrloaded イベント発火
    B->>B: 6. A-Frameシーン初期化
    B->>B: 7. AR起動（カメラ開始）
```

### Three.js + SLAM

```mermaid
sequenceDiagram
    participant B as ブラウザ
    participant CDN as cdn.8thwall.com
    participant NPM as unpkg.com
    participant L as ローカルサーバー

    B->>NPM: 1. three.module.min.js (importmap)
    NPM-->>B: Three.js → window.THREE

    B->>CDN: 2. xrextras.js (sync)
    CDN-->>B: XRExtras

    B->>L: 3. xr.js (async, preload=slam)
    L-->>B: XR8 → xrloaded イベント

    Note over B: window.onload 後
    B->>B: 4. XRExtras.Loading.showLoading({onxrloaded})
    B->>B: 5. onxrloaded → XR8.addCameraPipelineModules()
    B->>B: 6. XR8.run({canvas}) → AR起動
```

### Face Effects

```
読み込み順:
8frame (sync) → xrextras (sync) → landing-page (sync) → xr.js (async, preload=face)

シーン設定:
<a-scene xrface="allowedDevices: any">  ← xrweb ではなく xrface
```

### Sky Effects

```
読み込み順:
8frame (sync) → xrextras (sync) → landing-page (sync) → coaching-overlay (sync)
→ xr.js (async, preload=slam) → sky-recenter.js (sync)

シーン設定:
<a-scene xrlayers>  ← xrweb ではなく xrlayers
```

## テンプレートから案件プロジェクトへの横展開フロー

```mermaid
graph LR
    subgraph "1. テンプレート選定"
        TS[要件に合うテンプレートを選択<br>image-target / face / sky / slam]
    end

    subgraph "2. プロジェクト作成"
        CP[tools/new-project.sh で<br>テンプレートをコピー]
    end

    subgraph "3. カスタマイズ"
        C1[3Dモデル差し替え]
        C2[テキスト・UI変更]
        C3[ターゲット画像設定]
        C4[エフェクト調整]
    end

    subgraph "4. テスト"
        T1[serve.sh + tunnel.sh]
        T2[スマホで動作確認]
    end

    subgraph "5. デプロイ"
        D1[Vercel / Netlify /<br>GitHub Pages /<br>自社サーバー]
    end

    TS --> CP --> C1 --> T1 --> D1
    CP --> C2 --> T1
    CP --> C3 --> T1
    CP --> C4 --> T1
    T1 --> T2
```

## ファイル相対パス関係

テンプレートとvendorの相対パス（サーバールート = `~/xr-ar-lab/`）:

```
~/xr-ar-lab/                          ← サーバールート
├── vendor/engine/xr-standalone/
│   ├── xr.js                         ← エンジンバイナリ
│   ├── xr-slam.js
│   └── xr-face.js
├── templates/
│   └── image-target-demo/
│       └── index.html                ← ../../vendor/engine/xr-standalone/xr.js
├── samples/
│   └── placeground/
│       └── index.html                ← ../../vendor/engine/xr-standalone/xr.js
└── projects/
    └── himi-tourism-ar/
        └── index.html                ← ../../vendor/engine/xr-standalone/xr.js
```

templates/, samples/, projects/ はすべて深さ2なので、
エンジンバイナリへの相対パスは `../../vendor/engine/xr-standalone/xr.js` で統一。
