// showcase/ar/capture.js
//
// ⏺ で 5 秒録画して端末に保存する。
// templates/capture-demo と同じく MediaRecorder + canvas.captureStream。
// 効果音も一緒に録るため、Audio 側の MediaStreamDestination を混ぜる。

import {RECORD} from './config.js'

const pickMime = () => {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const c of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) { return c }
  }
  return ''
}

export class Capture {
  constructor(audio) {
    this.audio = audio
    this.recording = false
  }

  get supported() {
    return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream)
  }

  /** @param onState (recording:boolean) => void */
  async record(canvas, onState) {
    if (this.recording || !this.supported) { return false }
    const stream = canvas.captureStream(RECORD.fps)
    if (this.audio && this.audio.recordDest) {
      this.audio.recordDest.stream.getAudioTracks().forEach(t => stream.addTrack(t))
    }

    const mimeType = pickMime()
    let rec
    try {
      rec = new MediaRecorder(stream, mimeType
        ? {mimeType, videoBitsPerSecond: RECORD.videoBitsPerSecond}
        : {videoBitsPerSecond: RECORD.videoBitsPerSecond})
    } catch (e) {
      console.warn('[showcase] MediaRecorder unavailable:', e)
      return false
    }

    const chunks = []
    rec.ondataavailable = (e) => { if (e.data && e.data.size) { chunks.push(e.data) } }

    const done = new Promise((resolve) => { rec.onstop = resolve })
    this.recording = true
    if (onState) { onState(true) }
    rec.start()
    setTimeout(() => { if (rec.state !== 'inactive') { rec.stop() } }, RECORD.seconds * 1000)
    await done
    this.recording = false
    if (onState) { onState(false) }

    const type = rec.mimeType || mimeType || 'video/webm'
    const ext = type.indexOf('mp4') >= 0 ? 'mp4' : 'webm'
    const blob = new Blob(chunks, {type})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `antymark-card-${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return true
  }
}
