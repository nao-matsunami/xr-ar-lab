// demos/flow-ar/core.js
//
// 「印刷物の絵が動き出す」デモの共通の本体。各ページ（sumi-ryu / sakura / ramen）は
// <body data-...> に自分の設定を書いて、これを読むだけ。
//
//   data-name       画像ターゲットの名前（ログと detail.name の照合に使う）
//   data-width-mm   印刷したときの幅（mm）。AR の縮尺は detail.scale（長辺）で決まるので、
//                   ここがずれても重なりは崩れない。physicalWidthInMeters に渡すだけ
//
// 素材の前提（build.sh 参照）: target.png は動画の最初のコマと同じ枠（16:9）を jpg から切り出したもの。
// なので動画をターゲットの板いっぱいに貼れば、最初のコマが印刷物とぴったり重なる。
//
// 動き:
//   認識 -> 板（動画）を出して頭から再生。終わったら最後のコマで止める（ループしない）
//   見失う -> 板を隠して一時停止。RESUME_MS 以内に再認識したら続きから（手ぶれ等の一瞬の見失い）。
//            それを過ぎたら最初のコマに戻して一時停止のまま待ち、次の認識で頭から再生
//            （最後まで再生し終わっていても同じ。向け直せばもう一度見られる）
//   タップ（認識中ならどこでも）-> 頭からもう一度
// 音声は無し（video.mp4 は音声トラック自体を抜いてある）。
//
// エンジン・three.js・xrextras はリポジトリ同梱のもの（samples-ar/sumi と同じ構成）。外部 URL は踏まない。
// ?debug: 板を半透明にして左上に黄色の目印を出す（重なりの確認用）
// ?anydevice: デスクトップ（ヘッドレス Chrome + 偽カメラ）でもパイプラインを回す

import * as THREE_NS from 'three'

// XR8 の three.js レンダラは window.THREE を見る
window.THREE = {...THREE_NS}
const THREE = window.THREE

const PARAMS = new URLSearchParams(location.search)
const DEBUG = PARAMS.has('debug')
const CFG = document.body.dataset
const NAME = CFG.name
const LOG = `[flow-ar:${NAME}]`

// target.png の実ピクセル寸法（build.sh が 1024x576 で出す）
const TARGET_PX = {width: 1024, height: 576}
// 板の寸法はピクセル単位のまま使う（長辺 1024 = detail.scale）
const W = TARGET_PX.width
const H = TARGET_PX.height
const LONG = Math.max(W, H)
// 見失ってからこの時間以内に再認識したら続きから。過ぎたら最初のコマに戻す
const RESUME_MS = 1000

const app = {
  scene: null,
  camera: null,
  root: null,     // ターゲットの姿勢 + px -> ワールドの倍率
  card: null,     // root の子。横長画像はエンジン内で 90° 回して読まれるので、ここで戻す
  video: null,
  visible: false,
  rewindTimer: 0,  // 見失い中に RESUME_MS 後の巻き戻しを待っているタイマー
  t0: performance.now(),
}

const hint = document.getElementById('hint')
const setHint = (text) => {
  if (!hint) { return }
  hint.textContent = text
  hint.hidden = !text
}

// --------------------------------------------------------------------------
// 動画
// --------------------------------------------------------------------------

const makeVideo = () => {
  const v = document.createElement('video')
  v.src = './video.mp4'
  v.muted = true
  v.defaultMuted = true
  v.playsInline = true
  v.setAttribute('playsinline', '')
  v.setAttribute('webkit-playsinline', '')
  v.setAttribute('muted', '')
  v.preload = 'auto'
  v.loop = false
  v.crossOrigin = 'anonymous'
  // 終わったら最後のコマのまま止まる（<video> の既定の動き）。案内だけ出す
  v.addEventListener('ended', () => {
    console.log(`${LOG} ended at ${v.currentTime.toFixed(2)}s`)
    if (app.visible) { setHint('タップでもう一度') }
  })
  v.load()
  return v
}

const playFromStart = () => {
  const v = app.video
  v.currentTime = 0
  setHint('')
  v.play().catch(e => console.warn(`${LOG} play() failed`, e))
}

// --------------------------------------------------------------------------
// 板
// --------------------------------------------------------------------------

const buildScene = () => {
  app.video = makeVideo()
  const tex = new THREE.VideoTexture(app.video)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  const mat = new THREE.MeshBasicMaterial({map: tex, toneMapped: false})
  if (DEBUG) {
    mat.transparent = true
    mat.opacity = 0.5
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat)
  const card = new THREE.Group()
  card.add(plate)
  if (DEBUG) {
    const m = H * 0.08
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(m, m),
      new THREE.MeshBasicMaterial({color: 0xffff00}))
    mark.position.set(-W / 2 + m / 2, H / 2 - m / 2, 1)
    card.add(mark)
  }
  const root = new THREE.Group()
  root.visible = false
  root.add(card)
  app.scene.add(root)
  app.root = root
  app.card = card
}

// --------------------------------------------------------------------------
// ターゲット
// --------------------------------------------------------------------------

const configureTargets = () => {
  const widthM = Number(CFG.widthMm || 260) / 1000
  XR8.XrController.configure({
    disableWorldTracking: true,
    imageTargetData: [{
      imagePath: './target.png',
      name: NAME,
      type: 'PLANAR',
      metadata: {},
      moveable: true,
      physicalWidthInMeters: widthM,
      properties: {
        left: 0,
        top: 0,
        width: W,
        height: H,
        originalWidth: W,
        originalHeight: H,
        isRotated: false,
        inputMode: 'BASIC',
        unit: 'mm',
        physicalWidthInMeters: widthM,
      },
    }],
  })
  console.log(`${LOG} image target registered: ${W}x${H}px`)
}

// detail.scale はターゲット長辺のワールド長。横長画像はエンジン内で 90° 回して縦長として
// 読まれるので、返ってくる姿勢の軸もその縦長画像のもの（showcase/ar/targets.js の実測と同じ）。
// 横長の板を Z 回りに -90° 回して合わせる。
const onImage = ({detail}, found) => {
  if (detail.name !== NAME || !app.root) { return }
  const sw = detail.scaledWidth || 1
  const sh = detail.scaledHeight || 1
  app.root.position.copy(detail.position)
  app.root.quaternion.copy(detail.rotation)
  app.root.scale.setScalar((detail.scale || 1) / LONG)
  app.card.rotation.z = sw > sh ? -Math.PI / 2 : 0
  if (found || !app.visible) {
    console.log(`${LOG} pose: scale=${(detail.scale || 0).toFixed(4)} ` +
      `scaled=${sw.toFixed(3)}x${sh.toFixed(3)} roll=${sw > sh ? -90 : 0}deg ` +
      `after ${((performance.now() - app.t0) / 1000).toFixed(2)}s`)
  }
  if (!app.visible) {
    app.visible = true
    const v = app.video
    const quick = !!app.rewindTimer
    clearTimeout(app.rewindTimer)
    app.rewindTimer = 0
    if (quick && v.ended) {
      console.log(`${LOG} refound within ${RESUME_MS}ms: stays ended`)
      setHint('タップでもう一度')
    } else if (quick && v.currentTime > 0) {
      console.log(`${LOG} refound within ${RESUME_MS}ms: resume at ${v.currentTime.toFixed(2)}s`)
      setHint('')
      v.play().catch(e => console.warn(`${LOG} play() failed`, e))
    } else {
      console.log(`${LOG} found: play from start`)
      playFromStart()
    }
  }
}

const onImageLost = ({detail}) => {
  if (detail.name !== NAME || !app.root) { return }
  app.visible = false
  const v = app.video
  if (!v.ended) { v.pause() }
  setHint('印刷物にカメラを向けてください')
  console.log(`${LOG} lost at ${v.currentTime.toFixed(2)}s`)
  clearTimeout(app.rewindTimer)
  app.rewindTimer = setTimeout(() => {
    app.rewindTimer = 0
    if (app.visible) { return }
    v.pause()
    v.currentTime = 0
    console.log(`${LOG} lost for ${RESUME_MS}ms: rewound to first frame`)
  }, RESUME_MS)
}

// --------------------------------------------------------------------------
// パイプライン
// --------------------------------------------------------------------------

const pipelineModule = () => ({
  name: 'flow-ar',
  onStart: ({canvas}) => {
    const {scene, camera} = XR8.Threejs.xrScene()
    app.scene = scene
    app.camera = camera
    canvas.addEventListener('touchmove', e => e.preventDefault(), {passive: false})
    XR8.XrController.updateCameraProjectionMatrix({
      origin: camera.position,
      facing: camera.quaternion,
    })
    buildScene()
    setHint('印刷物にカメラを向けてください')
  },
  // 動画の最初のコマが届くまでは板を出さない（黒い板が一瞬かぶるのを避ける。下は印刷物そのもの）
  onUpdate: () => {
    if (app.root) { app.root.visible = app.visible && app.video.readyState >= 2 }
  },
  listeners: [
    {event: 'reality.imagefound', process: e => onImage(e, true)},
    {event: 'reality.imageupdated', process: e => onImage(e, false)},
    {event: 'reality.imagelost', process: onImageLost},
  ],
})

// 認識中のタップで頭から。iOS は最初の play() がユーザー操作外だと拒まれることがあるので、
// 最初のタップでも play() を呼んで解禁しておく（muted なので通常は不要だが念のため）
document.addEventListener('pointerup', () => {
  if (!app.video) { return }
  if (app.visible) {
    playFromStart()
  } else if (app.video.paused && app.video.currentTime === 0) {
    app.video.play().then(() => { app.video.pause(); app.video.currentTime = 0 }).catch(() => {})
  }
})

const onxrloaded = () => {
  configureTargets()
  XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(),
    XR8.Threejs.pipelineModule(),
    XR8.XrController.pipelineModule(),
    XRExtras.FullWindowCanvas.pipelineModule(),
    pipelineModule(),
  ])
  XR8.run({
    canvas: document.getElementById('camerafeed'),
    ...(PARAMS.has('anydevice') ? {allowedDevices: XR8.XrConfig.device().ANY} : {}),
  })
}

if (window.XR8) {
  onxrloaded()
} else {
  window.addEventListener('xrloaded', onxrloaded)
}

window.__flowar = {app}
