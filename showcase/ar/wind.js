// showcase/ar/wind.js
//
// 「吹いた」の判定。
//
//   時間領域 RMS が閾値を holdS 以上連続で越える
//   かつ 150Hz 以下の帯域が全体の lowBandRatio 以上を占める
//
// 後者が無いと、会話・拍手・環境音で簡単に誤爆する。息はほぼ低域の乱流ノイズなので
// 帯域比で分けられる。閾値は config.js。

import {WIND} from './config.js'

export class Wind {
  /**
   * @param audio  Audio（AudioContext を共有する）
   * @param onWind (strength 0..1) => void   風が始まったとき
   * @param onCalm () => void                風が止んだとき
   */
  constructor(audio, onWind, onCalm) {
    this.audio = audio
    this.onWind = onWind
    this.onCalm = onCalm
    this.granted = false
    this.blowing = false
    this.overSince = -1
    this.lastStrength = 0
    this.stream = null
    this._td = null
    this._fd = null
  }

  /** 認識後の最初のタップから呼ぶ。拒否されたら false（長押しにフォールバック）。 */
  async request() {
    const ctx = this.audio.ensureCtx()
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false},
      })
    } catch (e) {
      console.log('[showcase] microphone denied, falling back to long press:', e && e.name)
      return false
    }
    const src = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.analyser.smoothingTimeConstant = 0.2
    src.connect(this.analyser)     // destination には繋がない（ハウリング防止）
    this._td = new Float32Array(this.analyser.fftSize)
    this._fd = new Float32Array(this.analyser.frequencyBinCount)
    this.granted = true
    console.log('[showcase] microphone granted')
    return true
  }

  /** 毎フレーム呼ぶ。 */
  update(now) {
    if (!this.granted || !this.analyser) { return }
    const a = this.analyser
    a.getFloatTimeDomainData(this._td)
    let sum = 0
    for (let i = 0; i < this._td.length; i++) { sum += this._td[i] * this._td[i] }
    const rms = Math.sqrt(sum / this._td.length)

    let low = false
    if (rms > WIND.rmsThreshold) {
      a.getFloatFrequencyData(this._fd)
      const nyquist = this.audio.ctx.sampleRate / 2
      const cut = Math.max(1, Math.round(WIND.lowBandHz / nyquist * this._fd.length))
      let lowE = 0
      let allE = 0
      for (let i = 0; i < this._fd.length; i++) {
        const e = Math.pow(10, this._fd[i] / 10)  // dB -> パワー
        allE += e
        if (i < cut) { lowE += e }
      }
      low = allE > 0 && (lowE / allE) >= WIND.lowBandRatio
    }

    const over = rms > WIND.rmsThreshold && low
    if (over) {
      if (this.overSince < 0) { this.overSince = now }
      const strength = Math.min(1, Math.max(0,
        (rms - WIND.rmsThreshold) / Math.max(1e-6, WIND.rmsFull - WIND.rmsThreshold)))
      this.lastStrength = Math.max(this.lastStrength, strength)
      if (!this.blowing && now - this.overSince >= WIND.holdS) {
        this.blowing = true
        this.onWind(this.lastStrength)
      }
    } else {
      this.overSince = -1
      if (this.blowing) {
        this.blowing = false
        this.lastStrength = 0
        this.onCalm()
      }
    }
  }

  /** マイクが使えないときの代替。カードの長押し 500ms。 */
  attachLongPress(el) {
    let timer = null
    let fired = false
    const down = () => {
      if (this.granted) { return }
      fired = false
      timer = setTimeout(() => {
        fired = true
        this.blowing = true
        this.onWind(0.85)
      }, WIND.longPressS * 1000)
    }
    const up = () => {
      if (timer) { clearTimeout(timer); timer = null }
      if (fired) {
        fired = false
        this.blowing = false
        this.onCalm()
      }
    }
    el.addEventListener('pointerdown', down, {passive: true})
    el.addEventListener('pointerup', up, {passive: true})
    el.addEventListener('pointercancel', up, {passive: true})
    el.addEventListener('pointerleave', up, {passive: true})
  }
}
