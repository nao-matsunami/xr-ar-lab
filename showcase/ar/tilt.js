// showcase/ar/tilt.js
//
// カードの傾き -> 「カード平面内の重力」を出す。
//
// 傾きは絶対重力ではなく、ターゲットを認識した瞬間の姿勢からの相対角で測る。
// 机に置いたカードを斜めから覗いて認識させても、その姿勢を「水平」とみなすので、
// 呼吸状態の点は印刷位置に留まる。基準は resetBase() で取り直す（main.js が
// imagefound のたびに呼ぶ）。
//
// 「下」の向きの第一候補は DeviceMotionEvent の重力成分。iOS は requestPermission が
// 要るので、最初のタップで音・マイクと一緒に投げる。取れない端末では、カメラ座標系の
// 下方向（画面の下）をカードの姿勢行列で引き戻して代用する。どちらの場合も基準との
// 相対で使うので、許可が下りて情報源が切り替わった瞬間にも基準を取り直す。

import {TILT} from './config.js'

export class Tilt {
  constructor(THREE) {
    this.THREE = THREE
    this.granted = false
    this.hasMotion = false
    this._downDevice = new THREE.Vector3(0, -1, 0)
    this._downWorld = new THREE.Vector3(0, -1, 0)
    // 今の「下」（カードローカル）。こぼれ落ちる向きに使う。
    this.downLocal = new THREE.Vector3(0, 0, -1)
    // 基準姿勢から見た相対の「下」。基準のままなら (0, 0, -1)。xy が面内重力。
    this.downCard = new THREE.Vector3(0, 0, -1)
    this.inPlane = 0
    this.degrees = 0
    this._base = new THREE.Vector3(0, 0, -1)
    this._baseQ = new THREE.Quaternion()
    this._baseMotion = null     // 基準を取ったときの情報源（null = 未取得）
    this._negZ = new THREE.Vector3(0, 0, -1)
    this._q = new THREE.Quaternion()
    this._v = new THREE.Vector3()
    this._onMotion = this._onMotion.bind(this)
  }

  /** 認識後の最初のタップから呼ぶ。 */
  async request() {
    const DM = window.DeviceMotionEvent
    if (!DM) { return false }
    try {
      if (typeof DM.requestPermission === 'function') {
        const res = await DM.requestPermission()
        if (res !== 'granted') {
          console.log('[showcase] devicemotion denied, using camera-down fallback')
          return false
        }
      }
    } catch (e) {
      return false
    }
    window.addEventListener('devicemotion', this._onMotion, {passive: true})
    this.granted = true
    return true
  }

  /** 次の update() の姿勢を傾き 0° の基準にする。 */
  resetBase() {
    this._baseMotion = null
  }

  _onMotion(e) {
    const a = e.accelerationIncludingGravity
    if (!a || (a.x === null && a.y === null && a.z === null)) { return }
    // 端末座標での「下」。静止時 accelerationIncludingGravity は上向きの抗力なので符号反転。
    let x = -(a.x || 0)
    let y = -(a.y || 0)
    let z = -(a.z || 0)
    const len = Math.hypot(x, y, z)
    if (len < 1e-3) { return }
    x /= len; y /= len; z /= len

    // 画面の回転を打ち消す
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0
    if (angle) {
      const r = -angle * Math.PI / 180
      const c = Math.cos(r)
      const s = Math.sin(r)
      const nx = x * c - y * s
      const ny = x * s + y * c
      x = nx; y = ny
    }
    this._downDevice.set(x, y, z)
    this.hasMotion = true
  }

  /**
   * @param camera  three のカメラ（XR8 が姿勢を入れている）
   * @param card    カードローカル（mm, x 右・y 上）の Group。ターゲット姿勢の子
   */
  update(camera, card) {
    const down = this.hasMotion ? this._downDevice : this._v.set(0, -1, 0)
    // カメラ（= 端末）座標 -> ワールド
    camera.getWorldQuaternion(this._q)
    this._downWorld.copy(down).applyQuaternion(this._q).normalize()
    // ワールド -> カードローカル
    card.getWorldQuaternion(this._q)
    this._q.invert()
    this.downLocal.copy(this._downWorld).applyQuaternion(this._q).normalize()

    if (this._baseMotion !== this.hasMotion) {
      // 基準の「下」を -Z（カードが水平に寝ている状態）へ回す回転を覚えておく
      this._base.copy(this.downLocal)
      this._baseQ.setFromUnitVectors(this._base, this._negZ)
      this._baseMotion = this.hasMotion
    }
    this.downCard.copy(this.downLocal).applyQuaternion(this._baseQ)

    // 基準からの相対角。トラッキングの揺れで点が動かないよう、deadzoneDeg までは 0 とみなす。
    this.degrees = Math.acos(Math.max(-1, Math.min(1, this.downLocal.dot(this._base)))) * 180 / Math.PI
    const raw = Math.hypot(this.downCard.x, this.downCard.y)
    const eff = Math.max(0, this.degrees - TILT.deadzoneDeg)
    if (raw < 1e-6 || eff <= 0) {
      this.downCard.x = 0
      this.downCard.y = 0
      this.inPlane = 0
    } else {
      const k = Math.sin(Math.min(eff, 90) * Math.PI / 180) / raw
      this.downCard.x *= k
      this.downCard.y *= k
      this.inPlane = raw * k
    }
  }
}
