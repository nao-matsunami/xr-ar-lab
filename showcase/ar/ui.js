// showcase/ar/ui.js
//
// UI は記号アイコンだけ。文字は 1 文字も置かない。
// 見た目は shared/attribution.js の ⓘ ボタンに合わせてある（同じ丸・同じ枠・同じ背景）。
// ⓘ 自身は attribution.js が right:12 bottom:12 に出すので、その上に積む。

const CSS = `
#sc-icons{position:fixed;right:12px;bottom:52px;z-index:9999;
  display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none;}
#sc-icons button{width:32px;height:32px;border-radius:50%;
  background:rgba(0,0,0,.45);color:#fff;border:1px solid rgba(255,255,255,.35);
  display:flex;align-items:center;justify-content:center;
  font:16px/1 sans-serif;cursor:pointer;padding:0;pointer-events:auto;
  -webkit-tap-highlight-color:transparent;transition:opacity .25s;}
#sc-icons button[hidden]{display:none;}
#sc-blow{opacity:.45;}
#sc-rec.sc-on{border-color:rgba(255,70,70,.95);color:#ff4646;
  animation:sc-pulse 1s ease-in-out infinite;}
@keyframes sc-pulse{0%,100%{opacity:1}50%{opacity:.35}}

#sc-loading{position:fixed;inset:0;z-index:9998;display:flex;
  align-items:center;justify-content:center;background:#000;
  transition:opacity .4s;pointer-events:none;}
#sc-loading.sc-gone{opacity:0;}
#sc-loading i{display:block;width:10px;height:10px;border-radius:50%;
  background:#c8c7c7;animation:sc-dot 1.6s ease-in-out infinite;}
@keyframes sc-dot{0%,100%{transform:scale(.55);opacity:.35}
  50%{transform:scale(1.15);opacity:1}}
`

export class Ui {
  constructor() {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)

    this.loading = document.createElement('div')
    this.loading.id = 'sc-loading'
    this.loading.appendChild(document.createElement('i'))
    document.body.appendChild(this.loading)

    const wrap = document.createElement('div')
    wrap.id = 'sc-icons'

    // flex-direction:column-reverse なので、先に append したものが下に来る。
    this.rec = this._btn('sc-rec', '⏺', 'Record 5 seconds')
    this.sound = this._btn('sc-sound', '🔊', 'Mute / unmute')
    this.blow = this._btn('sc-blow', '🌬', 'Blow on the card')
    wrap.appendChild(this.rec)
    wrap.appendChild(this.sound)
    wrap.appendChild(this.blow)
    document.body.appendChild(wrap)
  }

  _btn(id, glyph, label) {
    const b = document.createElement('button')
    b.id = id
    b.type = 'button'
    b.textContent = glyph
    b.setAttribute('aria-label', label)
    return b
  }

  hideLoading() {
    if (this._hidden) { return }
    this._hidden = true
    this.loading.classList.add('sc-gone')
    setTimeout(() => this.loading.remove(), 500)
  }

  setBlowVisible(v) {
    this.blow.hidden = !v
  }

  setMuted(m) {
    this.sound.textContent = m ? '🔇' : '🔊'
    this.sound.style.borderColor = m ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.75)'
  }

  setRecording(on) {
    this.rec.classList.toggle('sc-on', !!on)
  }
}
