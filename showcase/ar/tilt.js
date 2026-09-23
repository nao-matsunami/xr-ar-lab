// showcase/ar/tilt.js
//
// カードの傾き -> 「カード平面内の重力」を出す。
//
// 第一候補は DeviceMotionEvent の重力成分。iOS は requestPermission が要るので、
// 最初のタップで音・マイクと一緒に投げる。取れない端末では、カメラ座標系の
// 下方向（画面の下）をカードの姿勢行列で引き戻して代用する。

export class Tilt {
  constructor(THREE) {
    this.THREE = THREE
    this.granted = false
    this.hasMotion = false
    this._downDevice = new THREE.Vector3(0, -1, 0)
    this._downWorld = new THREE.Vector3(0, -1, 0)
    this.downCard = new THREE.Vector3(0, -1, 0)
    this.inPlane = 0
    this.degrees = 0
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
   * @param root    カードのルート Group（detail.rotation が入っている）
   */
  update(camera, root) {
    const down = this.hasMotion ? this._downDevice : this._v.set(0, -1, 0)
    // カメラ（= 端末）座標 -> ワールド
    camera.getWorldQuaternion(this._q)
    this._downWorld.copy(down).applyQuaternion(this._q).normalize()
    // ワールド -> カードローカル
    root.getWorldQuaternion(this._q)
    this._q.invert()
    this.downCard.copy(this._downWorld).applyQuaternion(this._q).normalize()

    this.inPlane = Math.hypot(this.downCard.x, this.downCard.y)
    this.degrees = Math.asin(Math.min(1, this.inPlane)) * 180 / Math.PI
  }
}
