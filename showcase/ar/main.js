// showcase/ar/main.js
//
// 状態機械: IDLE -> BREATHE -> SCATTER -> REFORM -> BREATHE ...  BREATHE 中に傾き。
//
// A-Frame は使わず、XR8.Threejs の three.js パイプラインに直接乗せる。
// three.js は lib/vendor/three/（ローカル）。外部URLはひとつも踏まない。

import * as THREE_NS from 'three'
import {CARD, PARTICLES, PERF, REFORM, TILT, WIND} from './config.js'
import {configureTargets, variantOf} from './targets.js'
import {ParticleField, MODE} from './particles.js'
import {Audio} from './audio.js'
import {Wind} from './wind.js'
import {Tilt} from './tilt.js'
import {Capture} from './capture.js'
import {Ui} from './ui.js'

// XR8 の three.js レンダラは window.THREE を見る（threejs-renderer.ts）。
window.THREE = {...THREE_NS}
const THREE = window.THREE

const STATE = {IDLE: 'IDLE', BREATHE: 'BREATHE', SCATTER: 'SCATTER', REFORM: 'REFORM'}

const app = {
  state: STATE.IDLE,
  variant: null,
  field: null,
  root: null,
  scene: null,
  camera: null,
  renderer: null,
  canvas: null,
  reformTimer: null,
  settleTimer: null,
  armed: false,
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

const onWind = (strength) => {
  if (!app.field || app.state === STATE.IDLE) { return }
  clearTimers()
  // 傾けている最中に風が来たら風が優先。こぼれの状態は畳む。
  app.field.uniforms.uSpillT0.value = -1
  app.field.uniforms.uRespawnT0.value = -1
  app.field.setGravity(0, 0)
  app.field.startScatter(strength, now())
  app.state = STATE.SCATTER
  audio.scatter(strength)
}

const onCalm = () => {
  if (!app.field || app.state !== STATE.SCATTER) { return }
  clearTimers()
  app.reformTimer = setTimeout(() => {
    app.reformTimer = null
    if (!app.field) { return }
    app.field.nextShape(now())
    app.state = STATE.REFORM
    const ms = (REFORM.durationS + REFORM.delaySpanS) * 1000
    app.settleTimer = setTimeout(() => {
      app.settleTimer = null
      if (!app.field) { return }
      app.field.settle()
      app.state = STATE.BREATHE
      audio.gather()
    }, ms)
  }, WIND.reformDelayS * 1000)
}

const wind = new Wind(audio, onWind, onCalm)

// --------------------------------------------------------------------------
// 認識後の最初のタップ: 音の解禁 + マイク許可 + DeviceMotion 許可
// --------------------------------------------------------------------------

const armOnFirstTap = async () => {
  if (app.armed) { return }
  app.armed = true
  // iOS の DeviceMotionEvent.requestPermission はユーザー操作の有効期限内に
  // 呼ぶ必要がある。await を挟むと切れるので、投げるところまでは同期で済ませる。
  const motionP = tilt.request()
  const armP = audio.arm()
  await armP
  ui.setMuted(audio.muted)
  const micOk = await wind.request()
  ui.setBlowVisible(!micOk)
  await motionP
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
  const [particles, shapes] = await Promise.all([
    loadJson(`./ar/particles-${variant}.json`),
    loadJson(`./ar/shapes-${variant}.json`),
  ])
  const field = new ParticleField(THREE, particles, shapes)
  const root = new THREE.Group()
  root.visible = false
  root.add(field.makeCardPlane())
  root.add(field.points)
  app.scene.add(root)
  app.field = field
  app.root = root
  app.variant = variant
  loadingVariant = null
  console.log(`[showcase] variant "${variant}" attached: ` +
    `${field.count} particles (json ${particles.count}, cap ${PARTICLES.max})`)
  installFirstTap()
  wind.attachLongPress(app.canvas)
}

const onImage = ({detail}) => {
  const variant = variantOf(detail.name)
  if (!variant) { return }
  if (!app.variant && !loadingVariant) {
    console.log(`[showcase] target found: ${detail.name} (variant=${variant}) ` +
      `after ${((performance.now() - app.t0) / 1000).toFixed(2)}s`)
    attachVariant(variant).catch(e => console.error('[showcase] load failed', e))
    return
  }
  if (variant !== app.variant) {
    // 3 枚のうち別のバリアントも同時に見えている場合。実機比較のために出すだけ。
    console.log(`[showcase] also visible: ${detail.name} (using ${app.variant})`)
    return
  }
  if (!app.root) { return }
  app.root.position.copy(detail.position)
  app.root.quaternion.copy(detail.rotation)
  // detail.scale はターゲットの物理サイズ、scaledHeight はカード高さの相対値。
  // 点群は mm で持っているので mm -> ワールドの倍率をここで作る。
  const h = detail.scaledHeight || 1.0
  app.root.scale.setScalar(detail.scale * h / CARD.heightMm)
  if (!app.root.visible) {
    app.root.visible = true
    if (app.state === STATE.IDLE) { app.state = STATE.BREATHE }
  }
}

const onImageLost = ({detail}) => {
  if (variantOf(detail.name) !== app.variant || !app.root) { return }
  app.root.visible = false
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
        console.log(`[showcase] fps ${avg.toFixed(1)} < ${PERF.minFps} for ${PERF.holdS}s ` +
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

    if (app.state === STATE.BREATHE) {
      tilt.update(app.camera, app.root)
      field.setGravity(tilt.downCard.x, tilt.downCard.y)
      const spilling = tilt.degrees > TILT.spillDeg
      field.setSpill(spilling, tilt.downCard.x, tilt.downCard.y, tilt.downCard, t)
    }
  },

  listeners: [
    {event: 'reality.imagefound', process: onImage},
    {event: 'reality.imageupdated', process: onImage},
    {event: 'reality.imagelost', process: onImageLost},
  ],
})

// --------------------------------------------------------------------------
// UI の配線
// --------------------------------------------------------------------------

ui.setMuted(false)
ui.setBlowVisible(true)

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

ui.blow.addEventListener('click', async (e) => {
  e.stopPropagation()
  await armOnFirstTap()
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
  XR8.run({canvas: document.getElementById('camerafeed')})
}

if (window.XR8) {
  onxrloaded()
} else {
  window.addEventListener('xrloaded', onxrloaded)
}

// デバッグ用（実機のコンソールから触れるように）
window.__showcase = {app, audio, wind, tilt, ui, MODE, STATE}
