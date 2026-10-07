// showcase/ar/wind.js
//
// 「吹いた」の判定。
//
//   時間領域 RMS が閾値を holdS 以上連続で越える
//   かつ 150Hz 以下の帯域が全体の lowBandRatio 以上を占める
//
// 後者が無いと、会話・拍手・環境音で簡単に誤爆する。息はほぼ低域の乱流ノイズなので
// 帯域比で分けられる。閾値は config.js。
//
// 発火後 cooldownS の間は次の発火を受け付けない。強さは閾値超過量で
// strengthMin..strengthMax に正規化する（閾値ちょうどで min、閾値の strengthFullX 倍で max）。

import {WIND, WIND_PROFILE} from './config.js'

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
    this.lastFireAt = -Infinity  // update() の now 基準（秒）
    this.lastStrength = 0
    this.stream = null
    this._td = null
    this._fd = null
    // 以下は ?debug の表示用（判定には使わない）
    this.micState = 'idle'      // idle / requesting / granted / denied:<name> / unsupported
    this.rms = 0
    this.lowRatio = 0
    this.lastEvent = null       // {at: Date.now(), strength, source: 'mic' | 'longpress'}
  }

  /** 認識後の最初のタップから呼ぶ。拒否されたら false（長押しにフォールバック）。 */
  async request() {
    const ctx = this.audio.ensureCtx()
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.micState = 'unsupported'
      console.log(`[showcase] wind: getUserMedia unavailable (AudioContext=${!!ctx}, ` +
        `mediaDevices=${!!navigator.mediaDevices}, secure=${window.isSecureContext})`)
      return false
    }
    console.log(`[showcase] wind: profile=${WIND_PROFILE} rmsThreshold=${WIND.rmsThreshold} ` +
      `lowBandRatio=${WIND.lowBandRatio} holdS=${WIND.holdS} cooldownS=${WIND.cooldownS}`)
    console.log(`[showcase] wind: AudioContext state=${ctx.state} sampleRate=${ctx.sampleRate}`)
    this.micState = 'requesting'
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false},
      })
    } catch (e) {
      this.micState = `denied:${e && e.name}`
      console.log('[showcase] wind: getUserMedia failed, falling back to long press:',
        e && e.name, e && e.message)
      return false
    }
    const track = this.stream.getAudioTracks()[0]
    console.log(`[showcase] wind: getUserMedia ok: "${track && track.label}" ` +
      `readyState=${track && track.readyState} muted=${track && track.muted} ` +
      `settings=${JSON.stringify(track && track.getSettings ? track.getSettings() : {})}`)
    if (track) {
      track.addEventListener('ended', () => console.log('[showcase] wind: mic track ended'))
      track.addEventListener('mute', () => console.log('[showcase] wind: mic track muted'))
      track.addEventListener('unmute', () => console.log('[showcase] wind: mic track unmuted'))
    }
    const src = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.analyser.smoothingTimeConstant = 0.2
    src.connect(this.analyser)     // destination には繋がない（ハウリング防止）
    this._td = new Float32Array(this.analyser.fftSize)
    this._fd = new Float32Array(this.analyser.frequencyBinCount)
    this.granted = true
    this.micState = 'granted'
    console.log(`[showcase] wind: AnalyserNode connected: MediaStreamSource -> Analyser ` +
      `(fftSize=${this.analyser.fftSize}, bins=${this.analyser.frequencyBinCount}, ` +
      `lowBand bins=${this._lowCut()}, AudioContext state=${ctx.state})`)
    return true
  }

  _lowCut() {
    const nyquist = this.audio.ctx.sampleRate / 2
    return Math.max(1, Math.round(WIND.lowBandHz / nyquist * this._fd.length))
  }

  /** 毎フレーム呼ぶ。 */
  update(now) {
    if (!this.granted || !this.analyser) { return }
    const a = this.analyser
    a.getFloatTimeDomainData(this._td)
    let sum = 0
    for (let i = 0; i < this._td.length; i++) { sum += this._td[i] * this._td[i] }
    const rms = Math.sqrt(sum / this._td.length)
    this.rms = rms

    // 帯域比は ?debug で常に見えるよう毎フレーム出す（512 ビン、負荷は無視できる）
    a.getFloatFrequencyData(this._fd)
    const cut = this._lowCut()
    let lowE = 0
    let allE = 0
    for (let i = 0; i < this._fd.length; i++) {
      const e = Math.pow(10, this._fd[i] / 10)  // dB -> パワー
      allE += e
      if (i < cut) { lowE += e }
    }
    this.lowRatio = allE > 0 ? lowE / allE : 0
    const low = this.lowRatio >= WIND.lowBandRatio

    const over = rms > WIND.rmsThreshold && low
    if (over) {
      if (this.overSince < 0) { this.overSince = now }
      this.lastStrength = Math.max(this.lastStrength, Wind.strengthOf(rms))
      if (!this.blowing && now - this.overSince >= WIND.holdS &&
          now - this.lastFireAt >= WIND.cooldownS) {
        this.blowing = true
        this.lastFireAt = now
        this._fire(this.lastStrength, 'mic')
      }
    } else {
      this.overSince = -1
      this.lastStrength = 0
      if (this.blowing) {
        this.blowing = false
        this.onCalm()
      }
    }
  }

  /** RMS -> 強さ。閾値ちょうどで strengthMin、閾値の strengthFullX 倍以上で strengthMax。 */
  static strengthOf(rms) {
    const th = WIND.rmsThreshold
    const x = Math.min(1, Math.max(0, (rms - th) / Math.max(1e-6, th * (WIND.strengthFullX - 1))))
    return WIND.strengthMin + (WIND.strengthMax - WIND.strengthMin) * x
  }

  _fire(strength, source) {
    this.lastEvent = {at: Date.now(), strength, source}
    console.log(`[showcase] wind: fired (${source}, strength=${strength.toFixed(2)})`)
    this.onWind(strength)
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
        this._fire(0.85, 'longpress')
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
