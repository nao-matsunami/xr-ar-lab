// showcase/ar/audio.js
//
// 効果音は全部 WebAudio で合成する。音声ファイルは持たない（外部URLゼロの一部）。
// AudioContext は 1 つだけ作り、最初のユーザー操作で resume する。
//
//   各音 -> master(Gain, ミュート) -> DynamicsCompressor -> destination / 録画

import {AUDIO} from './config.js'

export class Audio {
  constructor() {
    this.ctx = null
    this.armed = false
    this.muted = false
    this.master = null
  }

  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) { return null }
      this.ctx = new AC()
      this.wire()
      console.log(`[showcase] AudioContext created: state=${this.ctx.state} sampleRate=${this.ctx.sampleRate}`)
      this.ctx.addEventListener('statechange', () => {
        console.log(`[showcase] AudioContext state -> ${this.ctx.state}`)
      })
    }
    return this.ctx
  }

  /** master -> コンプレッサ -> 出力。selftest は OfflineAudioContext を ctx に入れてこれを呼ぶ。 */
  wire() {
    const ctx = this.ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    // ピーク抑え。強い風で散る音が重なっても耳に刺さらないように
    this.comp = ctx.createDynamicsCompressor()
    this.comp.threshold.value = AUDIO.compThresholdDb
    this.comp.knee.value = AUDIO.compKneeDb
    this.comp.ratio.value = AUDIO.compRatio
    this.comp.attack.value = AUDIO.compAttackS
    this.comp.release.value = AUDIO.compReleaseS
    this.master.connect(this.comp)
    this.comp.connect(ctx.destination)
    // 録画に音を載せるための分岐（OfflineAudioContext には無い）
    if (ctx.createMediaStreamDestination) {
      this.recordDest = ctx.createMediaStreamDestination()
      this.comp.connect(this.recordDest)
    }
  }

  /** 最初のタップで呼ぶ。 */
  async arm() {
    const ctx = this.ensureCtx()
    if (!ctx) { return false }
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch (e) {
        // ユーザー操作が要る端末では次のタップで通る
        console.log('[showcase] AudioContext resume failed:', e && e.name, e && e.message)
      }
    }
    this.armed = ctx.state === 'running'
    console.log(`[showcase] AudioContext arm: state=${ctx.state}`)
    return this.armed
  }

  setMuted(m) {
    this.muted = m
    if (this.master) { this.master.gain.value = m ? 0 : 1 }
  }

  get ready() {
    return !!(this.ctx && this.armed && this.ctx.state === 'running' && !this.muted)
  }

  /** 散る瞬間: ホワイトノイズ -> バンドパス 2〜6kHz -> 短いエンベロープ。 */
  scatter(strength) {
    if (!this.ready) { return }
    this.scatterAt(this.ctx.currentTime, strength)
  }

  scatterAt(t, strength) {
    const ctx = this.ctx
    const dur = AUDIO.scatterDecayS
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) { data[i] = Math.random() * 2 - 1 }

    const src = ctx.createBufferSource()
    src.buffer = buf

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    const [lo, hi] = AUDIO.scatterBandHz
    bp.frequency.setValueAtTime(lo, t)
    bp.frequency.exponentialRampToValueAtTime(hi, t + dur * 0.6)
    bp.Q.value = 0.8

    const g = ctx.createGain()
    const peak = AUDIO.scatterGain * (0.35 + 0.65 * Math.max(0, Math.min(1, strength)))
    // 0 から直線で立ち上げる。指数ランプは終端で急に立つので破裂音っぽくなる
    const attack = AUDIO.scatterAttackS
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    src.connect(bp)
    bp.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + dur)
  }

  /** 再形成完了: フィルタスイープ 1 つ。 */
  gather() {
    if (!this.ready) { return }
    const ctx = this.ctx
    const t = ctx.currentTime
    const dur = AUDIO.gatherDurS
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    const [lo, hi] = AUDIO.gatherSweepHz
    osc.frequency.setValueAtTime(lo, t)
    osc.frequency.exponentialRampToValueAtTime(hi, t + dur)

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(lo * 3, t)
    lp.frequency.exponentialRampToValueAtTime(hi * 2.5, t + dur)
    lp.Q.value = 3

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(AUDIO.gatherGain, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    osc.connect(lp)
    lp.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }
}
