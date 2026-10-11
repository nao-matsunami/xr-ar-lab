// showcase/ar/debug-hud.js
//
// ?debug のときだけ画面上部に出す入力の計器（RMS・閾値・中央値・倍率・クールダウン・タップの判定）。通常表示（文字を置かない）には出さない。
// DOM なので ⏺ の録画（canvas）には写らない。値は Wind が毎フレーム更新したものを読むだけ。

import {WIND} from './config.js'

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
    const cool = Math.max(0, WIND.cooldownS - (t - w.lastFireAt))
    const ev = w.lastEvent
    const last = ev
      ? `${clock(ev.at)} ${ev.source} s=${ev.strength.toFixed(2)} (${((Date.now() - ev.at) / 1000).toFixed(1)}s ago)`
      : '-'
    const tp = w.lastTap
    const tap = tp
      ? `${clock(tp.at)} ${mark(tp.fired, tp.fired ? 'FIRED' : 'no')}  ` +
        `${mark(tp.movePx < WIND.tapMaxMovePx, `${tp.movePx.toFixed(1)}px`)}/<${WIND.tapMaxMovePx}  ` +
        `${mark(tp.ms < WIND.tapMaxS * 1000, `${Math.round(tp.ms)}ms`)}/<${WIND.tapMaxS * 1000}  ` +
        `card=${mark(tp.onCard, tp.onCard ? 'y' : 'n')}`
      : '-'
    this.el.innerHTML = [
      `mic   ${mark(w.micState === 'granted', w.micState)}  perm=${this.perm}  ` +
        `ctx=${mark(ctxState === 'running', ctxState)}  analyser=${w.analyser ? 'on' : 'off'}`,
      `rms   ${mark(w.rms > w.threshold, w.rms.toFixed(4))} / th ${w.threshold.toFixed(4)}` +
        `  (min ${WIND.minRms})`,
      `med   ${w.median.toFixed(4)}  (${WIND.medianWindowS}s median)`,
      `ratio ${mark(w.ratio >= WIND.medianX, w.ratio.toFixed(2))} / x${WIND.medianX}`,
      `wind  ${mark(w.blowing, w.blowing ? 'ON ' : 'OFF')}  over ${overS.toFixed(2)}s / hold ${WIND.holdS}s` +
        `  cool ${cool > 0 ? `<i>${cool.toFixed(1)}s</i>` : '0'}`,
      `tap   ${tap}`,
      `last  ${last}`,
    ].join('\n')
  }
}
