// demos/flow-ar/core.js
//
// 「印刷物の絵が動き出す」デモの共通の本体。各ページは <body data-...> に自分の設定を書いて、これを読むだけ。
//
// 単体ページ（sumi-ryu / sakura / ramen）:
//   data-name       画像ターゲットの名前（ログと detail.name の照合に使う）
//   data-width-mm   印刷したときの幅（mm）。AR の縮尺は detail.scale（長辺）で決まるので、
//                   ここがずれても重なりは崩れない。physicalWidthInMeters に渡すだけ
//   素材はページと同じフォルダの target.png / video.mp4
//
// まとめページ（demos/flow-ar/index.html）:
//   data-targets    '[{"name": "flow-ramen", "dir": "ramen", "widthMm": 260}, ...]'
//   素材は ./<dir>/target.png / ./<dir>/video.mp4（ページからの相対）
//
// 素材の前提（build.sh 参照）: target.png は動画の最初のコマと同じ枠（16:9）を jpg から切り出したもの。
// なので動画をターゲットの板いっぱいに貼れば、最初のコマが印刷物とぴったり重なる。
//
// 動き（ターゲットごとに板と <video> を 1 組ずつ持つ）:
//   認識 -> 板（動画）を出して頭から再生。終わったら最後のコマで止める（ループしない）
//   見失う -> 板を隠して一時停止。RESUME_MS 以内に再認識したら続きから（手ぶれ等の一瞬の見失い）。
//            それを過ぎたら最初のコマに戻して一時停止のまま待ち、次の認識で頭から再生
//            （最後まで再生し終わっていても同じ。向け直せばもう一度見られる）
//   タップ（認識中ならどこでも）-> 今見えている板の動画を頭からもう一度
//   同時に 2 つ見えたら、最初に見つけた方だけを追う。そちらを見失っている間に見つかった別のターゲットへは
//   乗り換える（shared/ar-core/main.js と同じ扱い）
// 音声は無し（video.mp4 は音声トラック自体を抜いてある）。
//
// エンジン・three.js・xrextras は同梱ファイルのコピー（./vendor/。tools/sync-flow-ar-vendor.sh で更新）。外部 URL は踏まない。
// ?debug: 板を半透明にして左上に黄色の目印を出す（重なりの確認用）
// ?anydevice: デスクトップ（ヘッドレス Chrome + 偽カメラ）でもパイプラインを回す

import * as THREE_NS from 'three'

// XR8 の three.js レンダラは window.THREE を見る
window.THREE = {...THREE_NS}
const THREE = window.THREE

const PARAMS = new URLSearchParams(location.search)
const DEBUG = PARAMS.has('debug')
const CFG = document.body.dataset

// data-targets があればまとめページ、無ければ単体ページ（data-name / data-width-mm）
const TARGETS = CFG.targets
  ? JSON.parse(CFG.targets).map(t => ({name: t.name, dir: `./${t.dir}`, widthMm: Number(t.widthMm || 260)}))
  : [{name: CFG.name, dir: '.', widthMm: Number(CFG.widthMm || 260)}]
const LOG = TARGETS.length === 1 ? `[flow-ar:${TARGETS[0].name}]` : '[flow-ar]'

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
  // ターゲットごとの組。name -> {name, dir, widthMm, log, video, root, card, visible, rewindTimer}
  slots: new Map(),
  active: null,   // いま追っているターゲットの slot（最初に見つけた方）
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

const makeVideo = (slot) => {
  const v = document.createElement('video')
  v.src = `${slot.dir}/video.mp4`
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
    console.log(`${slot.log} ended at ${v.currentTime.toFixed(2)}s`)
    if (slot.visible) { setHint('タップでもう一度') }
  })
  v.load()
  return v
}

const playFromStart = (slot) => {
  const v = slot.video
  v.currentTime = 0
  setHint('')
  v.play().catch(e => console.warn(`${slot.log} play() failed`, e))
}

// --------------------------------------------------------------------------
// 板
// --------------------------------------------------------------------------

const buildSlot = (slot) => {
  slot.video = makeVideo(slot)
  const tex = new THREE.VideoTexture(slot.video)
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
  slot.root = root
  slot.card = card
}

const buildScene = () => {
  for (const t of TARGETS) {
    const slot = {...t, log: `[flow-ar:${t.name}]`, visible: false, rewindTimer: 0}
    buildSlot(slot)
    app.slots.set(t.name, slot)
  }
}

// --------------------------------------------------------------------------
// ターゲット
// --------------------------------------------------------------------------

const configureTargets = () => {
  XR8.XrController.configure({
    disableWorldTracking: true,
    imageTargetData: TARGETS.map((t) => {
      const widthM = t.widthMm / 1000
      return {
        imagePath: `${t.dir}/target.png`,
        name: t.name,
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
      }
    }),
  })
  console.log(`${LOG} image targets registered: ${TARGETS.map(t => t.name).join(', ')} (${W}x${H}px)`)
}

// detail.scale はターゲット長辺のワールド長。横長画像はエンジン内で 90° 回して縦長として
// 読まれるので、返ってくる姿勢の軸もその縦長画像のもの（showcase/ar/targets.js の実測と同じ）。
// 横長の板を Z 回りに -90° 回して合わせる。
const onImage = ({detail}, found) => {
  const slot = app.slots.get(detail.name)
  if (!slot) { return }
  if (app.active && app.active !== slot) {
    // 別のターゲットも同時に見えている。追っている方が見えている間は乗り換えない
    if (app.active.visible) {
      if (found) { console.log(`${slot.log} also visible (using ${app.active.name})`) }
      return
    }
    console.log(`${LOG} target switched: ${app.active.name} -> ${slot.name}`)
  }
  app.active = slot
  const sw = detail.scaledWidth || 1
  const sh = detail.scaledHeight || 1
  slot.root.position.copy(detail.position)
  slot.root.quaternion.copy(detail.rotation)
  slot.root.scale.setScalar((detail.scale || 1) / LONG)
  slot.card.rotation.z = sw > sh ? -Math.PI / 2 : 0
  if (found || !slot.visible) {
    console.log(`${slot.log} pose: scale=${(detail.scale || 0).toFixed(4)} ` +
      `scaled=${sw.toFixed(3)}x${sh.toFixed(3)} roll=${sw > sh ? -90 : 0}deg ` +
      `after ${((performance.now() - app.t0) / 1000).toFixed(2)}s`)
  }
  if (!slot.visible) {
    slot.visible = true
    const v = slot.video
    const quick = !!slot.rewindTimer
    clearTimeout(slot.rewindTimer)
    slot.rewindTimer = 0
    if (quick && v.ended) {
      console.log(`${slot.log} refound within ${RESUME_MS}ms: stays ended`)
      setHint('タップでもう一度')
    } else if (quick && v.currentTime > 0) {
      console.log(`${slot.log} refound within ${RESUME_MS}ms: resume at ${v.currentTime.toFixed(2)}s`)
      setHint('')
      v.play().catch(e => console.warn(`${slot.log} play() failed`, e))
    } else {
      console.log(`${slot.log} found: play from start`)
      playFromStart(slot)
    }
  }
}

const onImageLost = ({detail}) => {
  const slot = app.slots.get(detail.name)
  if (!slot || !slot.visible) { return }
  slot.visible = false
  const v = slot.video
  if (!v.ended) { v.pause() }
  setHint('印刷物にカメラを向けてください')
  console.log(`${slot.log} lost at ${v.currentTime.toFixed(2)}s`)
  clearTimeout(slot.rewindTimer)
  slot.rewindTimer = setTimeout(() => {
    slot.rewindTimer = 0
    if (slot.visible) { return }
    v.pause()
    v.currentTime = 0
    console.log(`${slot.log} lost for ${RESUME_MS}ms: rewound to first frame`)
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
    for (const slot of app.slots.values()) {
      slot.root.visible = slot.visible && slot.video.readyState >= 2
    }
  },
  listeners: [
    {event: 'reality.imagefound', process: e => onImage(e, true)},
    {event: 'reality.imageupdated', process: e => onImage(e, false)},
    {event: 'reality.imagelost', process: onImageLost},
  ],
})

// 認識中のタップで、今見えている板の動画を頭から。iOS は最初の play() がユーザー操作外だと拒まれることが
// あるので、何も見えていないときのタップでも各動画の play() を呼んで解禁しておく（muted なので通常は不要だが念のため）
document.addEventListener('pointerup', () => {
  const slot = app.active
  if (slot && slot.visible) {
    playFromStart(slot)
    return
  }
  for (const s of app.slots.values()) {
    const v = s.video
    if (v.paused && v.currentTime === 0) {
      v.play().then(() => { v.pause(); v.currentTime = 0 }).catch(() => {})
    }
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
