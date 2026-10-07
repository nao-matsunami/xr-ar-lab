// showcase/ar/debug-hud.js
//
// ?debug のときだけ画面上部に出す風判定の計器（RMS・閾値・ノイズフロア・立ち上がり比・帯域比）。通常表示（文字を置かない）には出さない。
// DOM なので ⏺ の録画（canvas）には写らない。値は Wind が毎フレーム更新したものを読むだけ。

import {WIND, WIND_PROFILE} from './config.js'

const CSS = `
#sc-debug{position:fixed;left:0;right:0;top:0;z-index:10000;pointer-events:none;
  padding:calc(env(safe-area-inset-top) + 4px) 8px 4px;
  background:rgba(0,0,0,.6);color:#e8e8e8;
  font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;white-space:pre;}
#sc-debug b{color:#7cff7c;font-weight:normal;}
#sc-debug i{color:#ff7070;font-style:normal;}
`

const pad = (n, w = 2) => String(n).padStart(w, '0')
const clock = (ms) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}
const mark = (ok, text) => (ok ? `<b>${text}</b>` : `<i>${text}</i>`)

export class DebugHud {
  constructor(wind, audio) {
    this.wind = wind
    this.audio = audio
    this.perm = '?'
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    this.el = document.createElement('div')
    this.el.id = 'sc-debug'
    document.body.appendChild(this.el)
    this._watchPermission()
    const loop = () => {
      this.render()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  async _watchPermission() {
    // Permissions API の 'microphone' は Chrome にはあるが Safari 等では投げる
    try {
      const st = await navigator.permissions.query({name: 'microphone'})
      this.perm = st.state
      st.addEventListener('change', () => { this.perm = st.state })
    } catch (e) {
      this.perm = 'n/a'
    }
  }

  render() {
    const w = this.wind
    const ctx = this.audio.ctx
    const ctxState = ctx ? ctx.state : 'none'
    const t = performance.now() / 1000
    const overS = w.overSince >= 0 ? t - w.overSince : 0
    const calibrating = w.granted && (w.calibStart < 0 || w.lastUpdate - w.calibStart < WIND.calibS)
    const ev = w.lastEvent
    const last = ev
      ? `${clock(ev.at)} ${ev.source} s=${ev.strength.toFixed(2)} (${((Date.now() - ev.at) / 1000).toFixed(1)}s ago)`
      : '-'
    this.el.innerHTML = [
      `mic   ${mark(w.micState === 'granted', w.micState)}  perm=${this.perm}  ` +
        `ctx=${mark(ctxState === 'running', ctxState)}  analyser=${w.analyser ? 'on' : 'off'}`,
      `rms   ${mark(w.rms > w.threshold, w.rms.toFixed(4))} / th ${w.threshold.toFixed(4)}` +
        `  [wind=${WIND_PROFILE}]`,
      `floor ${w.noiseFloor.toFixed(4)} x${WIND.floorX} (min ${WIND.minRms})` +
        `${calibrating ? '  <i>calibrating</i>' : ''}`,
      `rise  ${mark(w.rise >= WIND.riseX, w.rise.toFixed(2))} / th ${WIND.riseX.toFixed(2)}` +
        `  (vs ${WIND.riseWindowS * 1000}ms avg)  armed=${w.armed ? 'y' : 'n'}`,
      `low   ${mark(w.lowRatio >= WIND.lowBandRatio, w.lowRatio.toFixed(3))} / th ${WIND.lowBandRatio.toFixed(2)}` +
        `  (<=${WIND.lowBandHz}Hz)`,
      `wind  ${mark(w.blowing, w.blowing ? 'ON ' : 'OFF')}  over ${overS.toFixed(2)}s / hold ${WIND.holdS}s`,
      `last  ${last}`,
    ].join('\n')
  }
}
