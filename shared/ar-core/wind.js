// shared/ar-core/wind.js
//
// 「散る」のきっかけ。第一の入力は名刺上の短いタップ、マイクで吹くのは 🌬 で許可したときの追加入力。
//
// タップ: pointerdown -> pointerup の移動が tapMaxMovePx 未満、時間が tapMaxS 未満で、
//         押した位置が名刺の上（main.js が判定して渡す）なら、散る -> 再形成を 1 回発火する。
//
// マイク: 時間領域 RMS が max(直近 medianWindowS 秒の RMS 中央値 * medianX, minRms) を
//         holdS 続けて越えたら発火。発火後 cooldownS は次を受け付けない。値は config.js。
//
// マイク判定はわざと単純にしてある（帯域比・立ち上がり・ノイズフロアの凍結は持たない）。
// 会話・拍手・机を叩く音・急に始まった持続音でも発火し得る。これは許容する誤発火で、
// 散って再形成するだけなので実害は無い。止めたければ 🌬 を押さなければよい（タップだけで遊べる）。
// 持続音は中央値がおよそ medianWindowS / 2 で追いつくので、鳴り続けても発火は 1 回で止む。
//
// 強さはその時点の閾値に対する超過量で strengthMin..strengthMax に正規化する
// （閾値ちょうどで min、閾値の strengthFullX 倍で max）。タップは tapStrength 固定。

import {WIND, LOG} from 'ar-config'

const median = (xs) => {
  const s = xs.slice().sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

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
    // 最後の発火時刻（秒、performance.now() 基準。update() の now と同じ）。タップもここを更新するので、
    // タップで画面を叩いた音がマイクで二重に発火することはない
    this.lastFireAt = -Infinity
    this.lastStrength = 0
    this._hist = []             // 直近 medianWindowS の [t, rms]
    this.stream = null
    this._td = null
    // 以下は ?debug の表示用（判定には使わない）
    this.micState = 'idle'      // idle / requesting / granted / denied:<name> / unsupported
    this.rms = 0
    this.median = 0
    this.ratio = 0              // rms / median
    this.threshold = WIND.minRms
    this.lastEvent = null       // {at: Date.now(), strength, source: 'mic' | 'tap'}
    this.lastTap = null         // {at: Date.now(), movePx, ms, onCard, fired}
  }

  /** 🌬 から呼ぶ。拒否・非対応なら false（タップだけで続ける）。 */
  async request() {
    if (this.granted) { return true }
    const ctx = this.audio.ensureCtx()
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.micState = 'unsupported'
      console.log(`${LOG} wind: getUserMedia unavailable (AudioContext=${!!ctx}, ` +
        `mediaDevices=${!!navigator.mediaDevices}, secure=${window.isSecureContext})`)
      return false
    }
    console.log(`${LOG} wind: medianWindowS=${WIND.medianWindowS} medianX=${WIND.medianX} ` +
      `minRms=${WIND.minRms} holdS=${WIND.holdS} cooldownS=${WIND.cooldownS}`)
    console.log(`${LOG} wind: AudioContext state=${ctx.state} sampleRate=${ctx.sampleRate}`)
    this.micState = 'requesting'
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false},
      })
    } catch (e) {
      this.micState = `denied:${e && e.name}`
      console.log(`${LOG} wind: getUserMedia failed, tap only:`, e && e.name, e && e.message)
      return false
    }
    const track = this.stream.getAudioTracks()[0]
    const settings = track && track.getSettings ? track.getSettings() : {}
    console.log(`${LOG} wind: getUserMedia ok: "${track && track.label}" ` +
      `readyState=${track && track.readyState} muted=${track && track.muted} ` +
      `settings=${JSON.stringify(settings)}`)
    // 要求した 3 つが実際に切れたか。端末によっては無視される（undefined は未報告）
    const applied = ['autoGainControl', 'noiseSuppression', 'echoCancellation']
      .map(k => `${k}=${settings[k]}${settings[k] === false ? '' : ' (NOT off)'}`)
    console.log(`${LOG} wind: applied audio processing: ${applied.join(' ')}`)
    if (track) {
      track.addEventListener('ended', () => console.log(`${LOG} wind: mic track ended`))
      track.addEventListener('mute', () => console.log(`${LOG} wind: mic track muted`))
      track.addEventListener('unmute', () => console.log(`${LOG} wind: mic track unmuted`))
    }
    const src = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 1024
    src.connect(this.analyser)     // destination には繋がない（ハウリング防止）
    this._td = new Float32Array(this.analyser.fftSize)
    this.granted = true
    this.micState = 'granted'
    console.log(`${LOG} wind: AnalyserNode connected: MediaStreamSource -> Analyser ` +
      `(fftSize=${this.analyser.fftSize}, AudioContext state=${ctx.state})`)
    return true
  }

  /** 毎フレーム呼ぶ。 */
  update(now) {
    if (!this.granted || !this.analyser) { return }
    this.analyser.getFloatTimeDomainData(this._td)
    let sum = 0
    for (let i = 0; i < this._td.length; i++) { sum += this._td[i] * this._td[i] }
    const rms = Math.sqrt(sum / this._td.length)
    this.rms = rms

    // 基準は今フレームを除く直近 medianWindowS の中央値。履歴が空なら minRms だけで判定する
    const hist = this._hist
    while (hist.length && hist[0][0] < now - WIND.medianWindowS) { hist.shift() }
    this.median = hist.length ? median(hist.map(h => h[1])) : 0
    hist.push([now, rms])
    this.ratio = rms / Math.max(1e-6, this.median)

    const th = Math.max(this.median * WIND.medianX, WIND.minRms)
    this.threshold = th
    if (rms > th) {
      if (this.overSince < 0) { this.overSince = now }
      this.lastStrength = Math.max(this.lastStrength, Wind.strengthOf(rms, th))
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

  /** RMS -> 強さ。閾値 th ちょうどで strengthMin、th の strengthFullX 倍以上で strengthMax。 */
  static strengthOf(rms, th) {
    const x = Math.min(1, Math.max(0, (rms - th) / Math.max(1e-6, th * (WIND.strengthFullX - 1))))
    return WIND.strengthMin + (WIND.strengthMax - WIND.strengthMin) * x
  }

  _fire(strength, source) {
    this.lastEvent = {at: Date.now(), strength, source}
    console.log(`${LOG} wind: fired (${source}, strength=${strength.toFixed(2)})`)
    this.onWind(strength)
  }

  /** タップ 1 回分: 散る -> すぐ止む（再形成は main.js の onCalm から）。クールダウンは見ない。 */
  tap(now = performance.now() / 1000) {
    this.lastFireAt = now
    this._fire(WIND.tapStrength, 'tap')
    if (!this.blowing) { this.onCalm() }
  }

  /**
   * 名刺上の短いタップを拾う。
   * @param el      pointer イベントを受ける要素（XR8 の canvas）
   * @param onCard  (clientX, clientY) => bool   押した位置が名刺の上か
   */
  attachTap(el, onCard) {
    let down = null
    const start = (e) => {
      // 2 本目の指が来たらタップではない（ピンチ等）
      if (down) { down = null; return }
      down = {id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now()}
    }
    const end = (e) => {
      if (!down || e.pointerId !== down.id) { return }
      const movePx = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      const ms = performance.now() - down.t
      const short = movePx < WIND.tapMaxMovePx && ms < WIND.tapMaxS * 1000
      const on = short && !!onCard(down.x, down.y)
      down = null
      this.lastTap = {at: Date.now(), movePx, ms, onCard: on, fired: short && on}
      if (short && on) { this.tap() }
    }
    const cancel = (e) => {
      if (down && e.pointerId === down.id) { down = null }
    }
    el.addEventListener('pointerdown', start, {passive: true})
    el.addEventListener('pointerup', end, {passive: true})
    el.addEventListener('pointercancel', cancel, {passive: true})
  }
}
