// showcase/ar/particles.js
//
// 印刷された粒子をそのまま GPU ポイントにする。
//
// 位置の補間は全部バーテックスシェーダの中でやる。CPU 側は
//   - 目標座標の配列を差し替える（setShape）
//   - モードと開始時刻の uniform を書く
// だけ。毎フレーム 3 万点を JS で触らない。
//
// 座標系: カードローカルの mm。x 右 (-42.5..42.5) / y 上 (-27.5..27.5) / z カード法線。
// particles.json と shapes.json は「左上原点・mm」なので読み込み時に変換する。

import {CARD, PARTICLES, BREATHE, SCATTER, REFORM, TILT} from './config.js'

export const MODE = {BREATHE: 0, SCATTER: 1, REFORM: 2}

const VERT = /* glsl */`
precision highp float;

attribute vec3  aA;       // 落ち着き先 A
attribute vec3  aB;       // 落ち着き先 B（ping-pong）
attribute float aSize;    // 直径 (mm)
attribute float aLum;     // 明度 0..1
attribute float aPhase;
attribute float aPeriod;
attribute float aDelay;   // 0..1（再形成の順序）
attribute vec3  aSeed;    // 0..1 の乱数

uniform float uTime;
uniform int   uMode;
uniform int   uSrc;          // 0: src=aA,dst=aB / 1: src=aB,dst=aA
uniform float uT0;           // 現モードの開始時刻
uniform float uScatterT0;

uniform float uBreatheAmp;

uniform float uWind;         // 0..1
uniform float uScatterSpeed;
uniform float uScatterSpeedMin;
uniform float uDrag;
uniform float uFall;
uniform float uSpread;

uniform float uReformDur;
uniform float uDelaySpan;

uniform vec2  uCardHalf;
uniform vec2  uGrav;         // カード面内の重力 (-1..1)
uniform float uTiltBias;
uniform float uTiltThresh;
uniform float uTiltGain;
uniform float uFriction;

uniform vec2  uSpillGrav;    // こぼれ判定に使う、ラッチした面内重力
uniform vec3  uSpillDown;    // こぼれていく向き（カードローカル・正規化）
uniform float uSpillT0;      // < 0 なら「こぼれていない」
uniform float uRespawnT0;    // < 0 なら「戻り中でない」
uniform float uGravityMm;
uniform float uRespawnRise;

uniform float uSizeScale;
uniform float uViewportH;
uniform float uWorldScale;   // mm -> ワールド単位
uniform float uMinPx;
uniform float uMaxPx;
uniform vec3  uInk;

varying vec3  vColor;
varying float vAlpha;

const float TAU = 6.2831853;

vec3 srcPos() { return uSrc == 0 ? aA : aB; }
vec3 dstPos() { return uSrc == 0 ? aB : aA; }

// 風で散る軌道。空気抵抗つきなので閉じた式で書ける（CPU で積分しない）。
vec3 scatterAt(vec3 base, float t) {
  t = max(t, 0.0);
  float sp = mix(uScatterSpeedMin, uScatterSpeed, uWind) * (0.55 + aSeed.z * 0.9);
  vec3 dir = normalize(vec3((aSeed.xy - 0.5) * 2.0 * uSpread, 1.0));
  float k = max(uDrag, 0.0001);
  float ramp = (1.0 - exp(-k * t)) / k;
  vec3 p = base + dir * sp * ramp;
  p.y -= uFall * (t - ramp);   // 終端速度つきの落下
  return p;
}

// 面内重力で低い側へ滑らせ、縁でクランプする。クランプがそのまま「縁に溜まる」になる。
vec3 slide(vec3 base, vec2 grav, out float atEdge) {
  float g = length(grav);
  atEdge = 0.0;
  if (g < 1e-5) { return base; }
  vec2 dir = grav / g;
  float amt = uTiltBias * min(g / max(uTiltThresh, 1e-4), 1.0)
            + uTiltGain * max(g - uTiltThresh, 0.0);
  amt *= (1.0 - uFriction * aSeed.x);
  vec2 lim = uCardHalf - vec2(0.35);
  vec2 un = base.xy + dir * amt;
  vec2 cl = clamp(un, -lim, lim);
  atEdge = step(0.25, length(un - cl));
  return vec3(cl, base.z);
}

void main() {
  vColor = uInk * aLum;
  vAlpha = 1.0;

  vec3 src = srcPos();
  vec3 pos;

  if (uMode == 1) {
    pos = scatterAt(src, uTime - uScatterT0);
  } else if (uMode == 2) {
    // 散った軌道を止めずに、目標へ easeOutCubic で寄せていく。
    // t=0 で e=0 なので、散っている位置から連続につながる。
    float t = (uTime - uT0 - aDelay * uDelaySpan) / max(uReformDur, 0.0001);
    float e = 1.0 - pow(1.0 - clamp(t, 0.0, 1.0), 3.0);
    pos = mix(scatterAt(src, uTime - uScatterT0), dstPos(), e);
  } else {
    float edge;
    vec3 p = slide(src, uGrav, edge);
    float w = TAU / aPeriod;
    p += vec3(sin(uTime * w + aPhase),
              cos(uTime * w * 0.83 + aPhase * 1.7),
              sin(uTime * w * 0.61 + aPhase * 2.3)) * uBreatheAmp;

    // こぼれ / 湧き戻り。判定にはこぼれ始めた瞬間の重力をラッチして使う
    // （戻し始めると uGrav は小さくなるので、現在値では判定が消えてしまう）。
    if (uSpillT0 >= 0.0 || uRespawnT0 >= 0.0) {
      float spillEdge;
      slide(src, uSpillGrav, spillEdge);
      if (spillEdge > 0.5) {
        if (uSpillT0 >= 0.0) {
          float ts = max(uTime - uSpillT0 - aSeed.y * 0.9, 0.0);
          p += uSpillDown * (0.5 * uGravityMm * ts * ts);
        } else {
          float tr = (uTime - uRespawnT0) / max(uRespawnRise, 0.0001);
          if (tr < 0.0) {
            vAlpha = 0.0;
          } else {
            float e = 1.0 - pow(1.0 - clamp(tr, 0.0, 1.0), 3.0);
            p += uSpillDown * (1.0 - e) * 14.0;
            vAlpha = e;
          }
        }
      }
    }
    pos = p;
  }

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float projScale = 0.5 * uViewportH * projectionMatrix[1][1];
  gl_PointSize = clamp(
    aSize * uSizeScale * uWorldScale * projScale / max(-mv.z, 0.0001),
    uMinPx, uMaxPx);
}
`

const FRAG = /* glsl */`
precision mediump float;
varying vec3  vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.34, d) * vAlpha;
  if (a <= 0.004) { discard; }
  gl_FragColor = vec4(vColor, a);
}
`

const hexToRgb = (hex) => {
  const n = parseInt((hex || '#c8c7c7').slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export class ParticleField {
  /**
   * @param THREE          window.THREE
   * @param particles      particles-<variant>.json の中身
   * @param shapes         shapes-<variant>.json の中身
   */
  constructor(THREE, particles, shapes) {
    this.THREE = THREE
    this.shapes = shapes.shapes
    this.paper = particles.paper || '#231f20'

    const n = Math.min(particles.count, PARTICLES.max)
    this.count = n
    this.drawCount = n
    this.srcIsA = true
    this.cycleIndex = -1

    const halfW = CARD.widthMm / 2
    const halfH = CARD.heightMm / 2

    // 印刷された座標（左上原点 mm）-> カードローカル mm
    const rest = new Float32Array(n * 3)
    const size = new Float32Array(n)
    const lum = new Float32Array(n)
    const phase = new Float32Array(n)
    const period = new Float32Array(n)
    const delay = new Float32Array(n)
    const seed = new Float32Array(n * 3)

    for (let i = 0; i < n; i++) {
      rest[i * 3] = particles.x[i] - halfW
      rest[i * 3 + 1] = halfH - particles.y[i]
      rest[i * 3 + 2] = 0
      size[i] = particles.d[i]
      lum[i] = particles.l[i]
      phase[i] = Math.random() * Math.PI * 2
      period[i] = BREATHE.periodMinS + Math.random() * (BREATHE.periodMaxS - BREATHE.periodMinS)
      delay[i] = Math.random()
      seed[i * 3] = Math.random()
      seed[i * 3 + 1] = Math.random()
      seed[i * 3 + 2] = Math.random()
    }

    this.restArray = rest

    const g = new THREE.BufferGeometry()
    // position は three の内部（バウンディング計算など）のためだけに置く
    g.setAttribute('position', new THREE.BufferAttribute(rest.slice(), 3))
    this.aA = new THREE.BufferAttribute(rest.slice(), 3)
    this.aB = new THREE.BufferAttribute(rest.slice(), 3)
    this.aA.setUsage(THREE.DynamicDrawUsage)
    this.aB.setUsage(THREE.DynamicDrawUsage)
    this.aDelay = new THREE.BufferAttribute(delay, 1)
    this.aDelay.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('aA', this.aA)
    g.setAttribute('aB', this.aB)
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aLum', new THREE.BufferAttribute(lum, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    g.setAttribute('aPeriod', new THREE.BufferAttribute(period, 1))
    g.setAttribute('aDelay', this.aDelay)
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    g.setDrawRange(0, n)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 400)

    this.uniforms = {
      uTime: {value: 0},
      uMode: {value: MODE.BREATHE},
      uSrc: {value: 0},
      uT0: {value: 0},
      uScatterT0: {value: -1e6},
      uBreatheAmp: {value: BREATHE.amplitudeMm},
      uWind: {value: 0},
      uScatterSpeed: {value: SCATTER.speedMm},
      uScatterSpeedMin: {value: SCATTER.speedMinMm},
      uDrag: {value: SCATTER.drag},
      uFall: {value: SCATTER.fallMm},
      uSpread: {value: SCATTER.spread},
      uReformDur: {value: REFORM.durationS},
      uDelaySpan: {value: REFORM.delaySpanS},
      uCardHalf: {value: new THREE.Vector2(halfW, halfH)},
      uGrav: {value: new THREE.Vector2(0, 0)},
      uTiltBias: {value: TILT.biasMm},
      uTiltThresh: {value: TILT.slideThreshold},
      uTiltGain: {value: TILT.slideGainMm},
      uFriction: {value: TILT.frictionSpread},
      uSpillGrav: {value: new THREE.Vector2(0, 0)},
      uSpillDown: {value: new THREE.Vector3(0, -1, 0)},
      uSpillT0: {value: -1},
      uRespawnT0: {value: -1},
      uGravityMm: {value: TILT.gravityMm},
      uRespawnRise: {value: TILT.respawnRiseS},
      uSizeScale: {value: PARTICLES.sizeScale},
      uViewportH: {value: 1080},
      uWorldScale: {value: 1},
      uMinPx: {value: PARTICLES.minPixelSize},
      uMaxPx: {value: PARTICLES.maxPixelSize},
      uInk: {value: new THREE.Vector3(...hexToRgb(particles.ink))},
    }

    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    })

    this.points = new THREE.Points(g, m)
    this.points.frustumCulled = false
    this.geometry = g
    this.material = m
  }

  /** カードを覆う単色の板（Canvas テクスチャではなく PlaneGeometry の単色）。 */
  makeCardPlane() {
    const THREE = this.THREE
    const geo = new THREE.PlaneGeometry(CARD.widthMm, CARD.heightMm)
    const mat = new THREE.MeshBasicMaterial({color: new THREE.Color(this.paper)})
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.z = -0.2      // mm。点群のすぐ下
    return mesh
  }

  /** 目標形状を書き込む（書き込み先は ping-pong の dst 側）。 */
  setShape(name, now) {
    const s = this.shapes[name]
    if (!s) { return false }
    const dst = this.srcIsA ? this.aB : this.aA
    const arr = dst.array
    const halfW = CARD.widthMm / 2
    const halfH = CARD.heightMm / 2
    const n = this.count
    const dly = this.aDelay.array
    for (let i = 0; i < n; i++) {
      arr[i * 3] = s.x[i] - halfW
      arr[i * 3 + 1] = halfH - s.y[i]
      arr[i * 3 + 2] = 0
      dly[i] = s.delay[i]
    }
    dst.needsUpdate = true
    this.aDelay.needsUpdate = true
    this.uniforms.uMode.value = MODE.REFORM
    this.uniforms.uT0.value = now
    this.shapeName = name
    return true
  }

  /** 循環の次の形へ。 */
  nextShape(now) {
    this.cycleIndex = (this.cycleIndex + 1) % REFORM.cycle.length
    return this.setShape(REFORM.cycle[this.cycleIndex], now)
  }

  /** 再形成が終わったら src/dst を入れ替える（配列コピーは発生しない）。 */
  settle() {
    this.srcIsA = !this.srcIsA
    this.uniforms.uSrc.value = this.srcIsA ? 0 : 1
    this.uniforms.uMode.value = MODE.BREATHE
  }

  startScatter(strength, now) {
    this.uniforms.uWind.value = Math.max(0, Math.min(1, strength))
    this.uniforms.uMode.value = MODE.SCATTER
    this.uniforms.uT0.value = now
    this.uniforms.uScatterT0.value = now
  }

  setBreathe() {
    this.uniforms.uMode.value = MODE.BREATHE
  }

  setGravity(gx, gy) {
    this.uniforms.uGrav.value.set(gx, gy)
  }

  setSpill(active, gravX, gravY, down, now) {
    if (active) {
      this.uniforms.uSpillGrav.value.set(gravX, gravY)
      this.uniforms.uSpillDown.value.copy(down)
      if (this.uniforms.uSpillT0.value < 0) {
        this.uniforms.uSpillT0.value = now
      }
      this.uniforms.uRespawnT0.value = -1
    } else if (this.uniforms.uSpillT0.value >= 0) {
      this.uniforms.uSpillT0.value = -1
      this.uniforms.uRespawnT0.value = now + TILT.respawnDelayS
    } else if (this.uniforms.uRespawnT0.value >= 0 &&
               now > this.uniforms.uRespawnT0.value + TILT.respawnRiseS) {
      this.uniforms.uRespawnT0.value = -1
    }
  }

  /** fps が落ちたときに粒子数を半分に。復帰はしない。 */
  halve() {
    const next = Math.max(PARTICLES.fallback, Math.floor(this.drawCount / 2))
    if (next >= this.drawCount) { return false }
    this.drawCount = next
    this.geometry.setDrawRange(0, next)
    return true
  }

  update(now, viewportH, worldScale) {
    this.uniforms.uTime.value = now
    this.uniforms.uViewportH.value = viewportH
    this.uniforms.uWorldScale.value = worldScale
  }
}
