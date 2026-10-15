// shared/ar-core/main.js
//
// showcase（名刺）と samples-ar/*（墨文字など）の共通の本体。ページごとの違いは
// importmap で解決する 2 つのモジュールだけ:
//   'ar-config'  演出の値（shared/ar-core/defaults.js を再エクスポートして差分を上書き）
//   'ar-targets' 画像ターゲットの登録・姿勢の換算・点群 JSON の場所
//
// 状態機械: IDLE -> BREATHE -> SCATTER -> REFORM -> BREATHE ...  BREATHE 中に傾き。
// 入力は名刺上の短いタップ（第一）と、🌬 で許可したマイク（wind.js）。
// ターゲットを見失ったら粒子・板・音を止めて隠し、状態機械を一時停止する（pause / resume）。
//
// A-Frame は使わず、XR8.Threejs の three.js パイプラインに直接乗せる。
// three.js は lib/vendor/three/（ローカル）。外部URLはひとつも踏まない。

import * as THREE_NS from 'three'
import {AUDIO, CARD, PARTICLES, PERF, REFORM, SCATTER, TILT, WIND, LOG} from 'ar-config'
import {cardPoseFromDetail, configureTargets, dataUrls, variantOf} from 'ar-targets'
import {ParticleField, MODE} from './particles.js'
import {Audio} from './audio.js'
import {Wind} from './wind.js'
import {Tilt} from './tilt.js'
import {Capture} from './capture.js'
import {Ui} from './ui.js'
import {DebugHud} from './debug-hud.js'

// XR8 の three.js レンダラは window.THREE を見る（threejs-renderer.ts）。
window.THREE = {...THREE_NS}
const THREE = window.THREE

// ?debug: 占有板を半透明の赤にし、カード左上に黄色の目印を出す（重なりの確認用）
//         画面上部に入力の計器（マイク許可・RMS・中央値・倍率・判定・タップ・直近の発火）を出す
// ?anydevice: デスクトップ（ヘッドレス Chrome + 偽カメラ）でもパイプラインを回す
const PARAMS = new URLSearchParams(location.search)
const DEBUG = PARAMS.has('debug')

const STATE = {IDLE: 'IDLE', BREATHE: 'BREATHE', SCATTER: 'SCATTER', REFORM: 'REFORM'}

const app = {
  state: STATE.IDLE,
  variant: null,
  field: null,
  root: null,       // ターゲットの姿勢 + mm -> ワールドの倍率
  card: null,       // root の子。カードローカル mm（x 右・y 上）。板と点群はここに付ける
  plate: null,      // 占有板（タップの当たり判定にも使う）
  lastPose: null,
  scene: null,
  camera: null,
  renderer: null,
  canvas: null,
  reformTimer: null,
  settleTimer: null,
  settleAt: 0,      // settleTimer が発火する時刻（now() 基準）
  paused: false,    // ターゲットを見失っている間 true
  pausedAt: 0,
  armed: false,
  audioP: null,     // audio.arm() の Promise（最初のタップの音を取りこぼさないため）
  t0: performance.now(),
}

const ui = new Ui()
const audio = new Audio()
const capture = new Capture(audio)
const tilt = new Tilt(THREE)

// --------------------------------------------------------------------------
// 風 -> 散る / 再形成
// --------------------------------------------------------------------------

const now = () => performance.now() / 1000

const clearTimers = () => {
  if (app.reformTimer) { clearTimeout(app.reformTimer); app.reformTimer = null }
  if (app.settleTimer) { clearTimeout(app.settleTimer); app.settleTimer = null }
}

const startSettle = (ms) => {
  app.settleAt = now() + ms / 1000
  app.settleTimer = setTimeout(() => {
    app.settleTimer = null
    if (!app.field) { return }
    app.field.settle()
    app.state = STATE.BREATHE
    if (AUDIO.gather) { audio.gather() }
  }, ms)
}

const onWind = (strength) => {
  if (!app.field || app.state === STATE.IDLE || app.paused) { return }
  clearTimers()
  // 傾けている最中に風が来たら風が優先。こぼれの状態は畳む。
  app.field.uniforms.uSpillT0.value = -1
  app.field.uniforms.uRespawnT0.value = -1
  app.field.setGravity(0, 0)
  // worldDown: 散った瞬間の実際の「下」の逆へ昇る（墨の煙）。tilt.downLocal は毎フレーム更新している
  app.field.startScatter(strength, now(), SCATTER.worldDown ? tilt.downLocal : null)
  app.state = STATE.SCATTER
  if (!audio.ready && app.audioP) {
    // 最初のタップは pointerdown で AudioContext を resume し始め、pointerup で散る。間に合わなければ待つ
    app.audioP.then(() => { if (app.state === STATE.SCATTER && !app.paused) { audio.scatter(strength) } })
  } else {
    audio.scatter(strength)
  }
}

const onCalm = () => {
  if (!app.field || app.state !== STATE.SCATTER || app.paused) { return }
  clearTimers()
  app.reformTimer = setTimeout(() => {
    app.reformTimer = null
    if (!app.field) { return }
    app.field.nextShape(now())
    app.state = STATE.REFORM
    startSettle((REFORM.durationS + REFORM.delaySpanS) * 1000)
  }, WIND.reformDelayS * 1000)
}

// 見失った: 粒子・板を隠し（root ごと）、鳴っている音を切り、タイマーを止める。
// 風・タップは paused の間は無視する。
const pause = () => {
  if (app.paused) { return }
  app.paused = true
  app.pausedAt = now()
  clearTimers()
  audio.stopAll()
  if (app.root) { app.root.visible = false }
  if (app.field) {
    app.field.uniforms.uSpillT0.value = -1
    app.field.uniforms.uRespawnT0.value = -1
  }
  console.log(`${LOG} paused (state=${app.state})`)
}

// 再認識: 見失っていた時間だけ時計をずらして、止めた位置から続ける。
//   SCATTER（散っている途中・再形成待ち）-> 今の形への再形成から再開
//   REFORM -> 残りの時間で再形成を終える
const resume = () => {
  if (!app.paused) { return }
  app.paused = false
  const t = now()
  const field = app.field
  field.shiftClock(t - app.pausedAt)
  if (app.state === STATE.SCATTER) {
    field.reformToCurrent(t)
    app.state = STATE.REFORM
    startSettle((REFORM.durationS + REFORM.delaySpanS) * 1000)
  } else if (app.state === STATE.REFORM) {
    startSettle(Math.max(0, app.settleAt - app.pausedAt) * 1000)
  }
  console.log(`${LOG} resumed after ${(t - app.pausedAt).toFixed(2)}s (state=${app.state})`)
}

const wind = new Wind(audio, onWind, onCalm)
const hud = DEBUG ? new DebugHud(wind, audio) : null

// --------------------------------------------------------------------------
// 認識後の最初のタップ: 音の解禁 + DeviceMotion 許可（マイクは 🌬 を押したときだけ）
// --------------------------------------------------------------------------

const armOnFirstTap = async () => {
  if (app.armed) { return app.audioP }
  app.armed = true
  // iOS の DeviceMotionEvent.requestPermission はユーザー操作の有効期限内に
  // 呼ぶ必要がある。await を挟むと切れるので、投げるところまでは同期で済ませる。
  const motionP = tilt.request()
  app.audioP = audio.arm()
  await app.audioP
  ui.setMuted(audio.muted)
  await motionP
}

// タップ位置が名刺（占有板）の上か。板の 4 隅を画面に投影して、その四角形の内側かで見る
const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]]
const onCard = (clientX, clientY) => {
  if (!app.plate || !app.root || !app.root.visible || app.paused || !app.camera || !app.canvas) {
    return false
  }
  app.root.updateMatrixWorld(true)
  app.camera.updateMatrixWorld()
  const r = app.canvas.getBoundingClientRect()
  const px = ((clientX - r.left) / r.width) * 2 - 1
  const py = -((clientY - r.top) / r.height) * 2 + 1
  const q = corners.map(([sx, sy]) => new THREE.Vector3(sx * CARD.widthMm / 2, sy * CARD.heightMm / 2, 0)
    .applyMatrix4(app.plate.matrixWorld).project(app.camera))
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    const c = Math.sign((b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x))
    if (c === 0) { continue }
    if (sign && c !== sign) { return false }
    sign = c
  }
  return true
}

const installFirstTap = () => {
  const h = () => {
    document.removeEventListener('pointerdown', h)
    armOnFirstTap()
  }
  document.addEventListener('pointerdown', h)
}

// --------------------------------------------------------------------------
// ターゲット
// --------------------------------------------------------------------------

const loadJson = async (url) => {
  const r = await fetch(url)
  if (!r.ok) { throw new Error(`${url}: ${r.status}`) }
  return r.json()
}

let loadingVariant = null

const attachVariant = async (variant) => {
  if (loadingVariant || app.variant) { return }
  loadingVariant = variant
  const urls = dataUrls(variant)
  const [particles, shapes] = await Promise.all([loadJson(urls.particles), loadJson(urls.shapes)])
  const field = new ParticleField(THREE, particles, shapes)
  const root = new THREE.Group()
  root.visible = false
  const card = new THREE.Group()
  const plate = field.makeCardPlane()
  card.add(plate)
  card.add(field.points)
  if (DEBUG) {
    plate.material.transparent = true
    plate.material.opacity = 0.45
    plate.material.color.set(0xff0000)
    const m = Math.min(CARD.widthMm, CARD.heightMm) * 6 / 55   // 名刺で 6mm
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(m, m),
      new THREE.MeshBasicMaterial({color: 0xffff00}))
    mark.position.set(-CARD.widthMm / 2 + m / 2, CARD.heightMm / 2 - m / 2, 0.5 * PARTICLES.unitMm)
    card.add(mark)
  }
  root.add(card)
  app.scene.add(root)
  app.field = field
  app.root = root
  app.card = card
  app.plate = plate
  app.variant = variant
  loadingVariant = null
  console.log(`${LOG} variant "${variant}" attached: ` +
    `${field.count} particles (json ${particles.count}, cap ${PARTICLES.max})`)
  installFirstTap()
  wind.attachTap(app.canvas, onCard)
}

const onImage = ({detail}, found) => {
  const variant = variantOf(detail.name)
  if (!variant) { return }
  if (!app.variant && !loadingVariant) {
    console.log(`${LOG} target found: ${detail.name} (variant=${variant}) ` +
      `after ${((performance.now() - app.t0) / 1000).toFixed(2)}s`)
    attachVariant(variant).catch(e => console.error(`${LOG} load failed`, e))
    return
  }
  if (!app.variant) { return }     // 点群の読み込み中
  if (variant !== app.variant) {
    // 3 枚のうち別のバリアントも同時に見えている場合。実機比較のために出すだけ。
    console.log(`${LOG} also visible: ${detail.name} (using ${app.variant})`)
    return
  }
  if (!app.root) { return }
  // detail.scale はターゲット長辺のワールド長。横長画像なら姿勢の軸は 90° 回った縦長画像のもの。
  // 詳細は各ページの targets.js の cardPoseFromDetail。
  const pose = cardPoseFromDetail(detail)
  app.root.position.copy(detail.position)
  app.root.quaternion.copy(detail.rotation)
  app.root.scale.setScalar(pose.mmToWorld)
  app.card.rotation.z = pose.roll
  app.lastPose = pose
  if (found || !app.root.visible) {
    // 傾きの基準は認識した瞬間の姿勢。再認識のたびに取り直す。
    // 最初の imagefound は点群の読み込みに使われて root がまだ無いので、
    // 「root が見えるようになった最初の更新」も認識の瞬間として扱う。
    tilt.resetBase()
    console.log(`${LOG} pose: scale=${detail.scale.toFixed(4)} ` +
      `scaled=${(detail.scaledWidth || 1).toFixed(3)}x${(detail.scaledHeight || 1).toFixed(3)} ` +
      `-> mm=${pose.mmToWorld.toExponential(3)} world, roll=${Math.round(pose.roll * 180 / Math.PI)}deg, ` +
      `aspect=${pose.aspectRatio.toFixed(3)}`)
  }
  if (!app.root.visible) {
    app.root.visible = true
    if (app.state === STATE.IDLE) { app.state = STATE.BREATHE }
    resume()
  }
}

const onImageLost = ({detail}) => {
  if (variantOf(detail.name) !== app.variant || !app.root) { return }
  pause()
}

// --------------------------------------------------------------------------
// fps 監視
// --------------------------------------------------------------------------

const fps = {times: [], lowSince: -1, halved: false}

const trackFps = (t) => {
  fps.times.push(t)
  if (fps.times.length > PERF.window) { fps.times.shift() }
  if (fps.times.length < PERF.window) { return }
  const span = fps.times[fps.times.length - 1] - fps.times[0]
  if (span <= 0) { return }
  const avg = (fps.times.length - 1) / span
  if (avg < PERF.minFps) {
    if (fps.lowSince < 0) { fps.lowSince = t }
    if (!fps.halved && t - fps.lowSince >= PERF.holdS && app.field) {
      if (app.field.halve()) {
        fps.halved = true
        console.log(`${LOG} fps ${avg.toFixed(1)} < ${PERF.minFps} for ${PERF.holdS}s ` +
          `-> particles reduced to ${app.field.drawCount}`)
      }
    }
  } else {
    fps.lowSince = -1
  }
}

// --------------------------------------------------------------------------
// パイプラインモジュール
// --------------------------------------------------------------------------

const showcasePipelineModule = () => ({
  name: 'antymark-showcase',

  onStart: ({canvas}) => {
    const {scene, camera, renderer} = XR8.Threejs.xrScene()
    app.scene = scene
    app.camera = camera
    app.renderer = renderer
    app.canvas = canvas
    canvas.addEventListener('touchmove', e => e.preventDefault(), {passive: false})
    XR8.XrController.updateCameraProjectionMatrix({
      origin: camera.position,
      facing: camera.quaternion,
    })
  },

  onUpdate: () => {
    const t = now()
    ui.hideLoading()
    trackFps(t)
    wind.update(t)

    const field = app.field
    if (!field || !app.root || !app.root.visible) { return }

    const gl = app.renderer && app.renderer.getContext()
    field.update(t, gl ? gl.drawingBufferHeight : 1080, app.root.scale.x)

    // 傾きは毎フレーム測る（散っている最中に再認識しても、その瞬間の姿勢を基準にするため）。
    // 使うのは BREATHE 中だけ。
    tilt.update(app.camera, app.card)
    if (app.state === STATE.BREATHE) {
      field.setGravity(tilt.downCard.x, tilt.downCard.y)
      const spilling = tilt.degrees > TILT.spillDeg
      field.setSpill(spilling, tilt.downCard.x, tilt.downCard.y, tilt.downLocal, t)
    }
  },

  listeners: [
    {event: 'reality.imagefound', process: e => onImage(e, true)},
    {event: 'reality.imageupdated', process: e => onImage(e, false)},
    {event: 'reality.imagelost', process: onImageLost},
  ],
})

// --------------------------------------------------------------------------
// UI の配線
// --------------------------------------------------------------------------

ui.setMuted(false)
ui.setBlowActive(false)

ui.sound.addEventListener('click', async (e) => {
  e.stopPropagation()
  if (!app.armed) { await armOnFirstTap() }
  audio.setMuted(!audio.muted)
  ui.setMuted(audio.muted)
})

ui.rec.addEventListener('click', async (e) => {
  e.stopPropagation()
  if (!app.canvas) { return }
  await capture.record(app.canvas, v => ui.setRecording(v))
})

// 🌬: マイクの許可。通れば吹いても散る（タップはそのまま使える）
ui.blow.addEventListener('click', async (e) => {
  e.stopPropagation()
  await armOnFirstTap()
  ui.setBlowActive(await wind.request())
})

// --------------------------------------------------------------------------
// 起動
// --------------------------------------------------------------------------

const onxrloaded = () => {
  configureTargets()
  XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(),
    XR8.Threejs.pipelineModule(),
    XR8.XrController.pipelineModule(),
    XRExtras.FullWindowCanvas.pipelineModule(),
    showcasePipelineModule(),
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

// デバッグ用（実機のコンソールから触れるように）
window.__showcase = {app, audio, wind, tilt, ui, hud, MODE, STATE}
