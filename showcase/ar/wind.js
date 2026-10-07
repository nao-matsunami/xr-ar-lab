// showcase/ar/wind.js
//
// 「吹いた」の判定。
//
//   時間領域 RMS が max(noiseFloor * floorX, minRms) を越え
//   かつ 150Hz 以下の帯域が全体の lowBandRatio 以上を占める状態が holdS 以上続き
//   かつ その状態に入るとき、RMS が直近 riseWindowS の平均の riseX 倍以上に急増していた
//
// noiseFloor は許可直後 calibS 秒の RMS 平均で初期化し、以後は時定数 floorTauS の
// 指数移動平均で追従する（判定中は止める）。固定閾値だと、端末や部屋によっては
// 周囲音だけで常に越えてしまう（Pixel 7 で確認）。
// 帯域比が無いと会話・拍手で、立ち上がり条件が無いと空調など一定の低い音で誤爆する。
// 息はほぼ低域の乱流ノイズで、急に始まる。値は config.js。
//
// 発火後 cooldownS の間は次の発火を受け付けない。強さはその時点の閾値に対する超過量で
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
    // ノイズフロア。calibStart から calibS 秒は較正中（発火しない）
    this.calibStart = -1
    this.calibSum = 0
    this.calibN = 0
    this.noiseFloor = 0
    this.lastUpdate = -1
    this.armed = false          // 今の超過区間の入りで立ち上がりを満たした
    this._hist = []             // 直近 riseWindowS の [t, rms]
    this.stream = null
    this._td = null
    this._fd = null
    // 以下は ?debug の表示用（判定には使わない）
    this.micState = 'idle'      // idle / requesting / granted / denied:<name> / unsupported
    this.rms = 0
    this.lowRatio = 0
    this.rise = 0               // rms / 直近 riseWindowS の平均
    this.threshold = WIND.minRms
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
    console.log(`[showcase] wind: profile=${WIND_PROFILE} calibS=${WIND.calibS} ` +
      `floorTauS=${WIND.floorTauS} floorX=${WIND.floorX} minRms=${WIND.minRms} ` +
      `riseX=${WIND.riseX}/${WIND.riseWindowS}s lowBandRatio=${WIND.lowBandRatio} ` +
      `holdS=${WIND.holdS} cooldownS=${WIND.cooldownS}`)
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
    const settings = track && track.getSettings ? track.getSettings() : {}
    console.log(`[showcase] wind: getUserMedia ok: "${track && track.label}" ` +
      `readyState=${track && track.readyState} muted=${track && track.muted} ` +
      `settings=${JSON.stringify(settings)}`)
    // 要求した 3 つが実際に切れたか。端末によっては無視される（undefined は未報告）
    const applied = ['autoGainControl', 'noiseSuppression', 'echoCancellation']
      .map(k => `${k}=${settings[k]}${settings[k] === false ? '' : ' (NOT off)'}`)
    console.log(`[showcase] wind: applied audio processing: ${applied.join(' ')}`)
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

    // 立ち上がり比: 今フレームを除く直近 riseWindowS の平均に対する比
    const hist = this._hist
    while (hist.length && hist[0][0] < now - WIND.riseWindowS) { hist.shift() }
    let ref = this.noiseFloor
    if (hist.length) {
      ref = 0
      for (const h of hist) { ref += h[1] }
      ref /= hist.length
    }
    this.rise = rms / Math.max(1e-6, ref)
    hist.push([now, rms])

    const dt = this.lastUpdate >= 0 ? Math.max(0, now - this.lastUpdate) : 0
    this.lastUpdate = now

    // 較正: 許可後 calibS 秒の平均をフロアの初期値にする。この間は発火しない
    if (this.calibStart < 0) { this.calibStart = now }
    if (now - this.calibStart < WIND.calibS) {
      this.calibSum += rms
      this.calibN++
      this.noiseFloor = this.calibSum / this.calibN
      this.threshold = Math.max(this.noiseFloor * WIND.floorX, WIND.minRms)
      return
    }

    const th = Math.max(this.noiseFloor * WIND.floorX, WIND.minRms)
    this.threshold = th
    const over = rms > th && low
    if (over) {
      if (this.overSince < 0) {
        this.overSince = now
        this.armed = false
      }
      // 超過区間のどこかで急増を見たら発火対象。一定の音が閾値の上に居座っても arm されない
      if (!this.armed && this.rise >= WIND.riseX) { this.armed = true }
      if (this.armed) { this.lastStrength = Math.max(this.lastStrength, Wind.strengthOf(rms, th)) }
      if (this.armed && !this.blowing && now - this.overSince >= WIND.holdS &&
          now - this.lastFireAt >= WIND.cooldownS) {
        this.blowing = true
        this.lastFireAt = now
        this._fire(this.lastStrength, 'mic')
      }
    } else {
      this.overSince = -1
      this.armed = false
      this.lastStrength = 0
      if (this.blowing) {
        this.blowing = false
        this.onCalm()
      }
    }

    // フロアの追従。息（arm 済みの超過区間）は混ぜない。ただし freezeMaxS を越えて
    // 続くなら息ではなく環境が変わったとみなして追従を再開する
    const freeze = this.armed && now - this.overSince < WIND.freezeMaxS
    if (!freeze && dt > 0) {
      this.noiseFloor += (rms - this.noiseFloor) * (1 - Math.exp(-dt / WIND.floorTauS))
    }
  }

  /** RMS -> 強さ。閾値 th ちょうどで strengthMin、th の strengthFullX 倍以上で strengthMax。 */
  static strengthOf(rms, th) {
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
