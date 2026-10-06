// showcase/ar/config.js
//
// 体験のつまみを一箇所に集めたもの。実機で振る舞いを詰めるときはここだけ触る。
// 距離は全て mm（カード実寸基準）、時間は秒。

export const CARD = {
  widthMm: 85,
  heightMm: 55,
}

export const VARIANTS = ['sparse', 'normal', 'dense']

export const PARTICLES = {
  // GPU ポイントの上限。particles-*.json がこれより多い場合は先頭 max 点だけ使う。
  // JSON 側は生成時にシャッフルしてあるので、先頭を切っても全面に散る。
  max: 30000,
  // fps が落ちたときに一段下げる数
  fallback: 15000,
  // 点の見かけの直径 (mm) にかける係数。印刷実寸そのままだと AR では細く見える。
  sizeScale: 1.35,
  minPixelSize: 1.0,
  maxPixelSize: 48.0,
}

export const BREATHE = {
  amplitudeMm: 0.3,      // 揺れの振幅
  periodMinS: 2.0,
  periodMaxS: 4.0,
}

export const TILT = {
  // BREATHE 中の「暗黙のチュートリアル」。傾けると点群全体がこれだけ低い側に寄る。
  biasMm: 0.5,
  // 傾きは認識時の姿勢からの相対角（tilt.js）。これ以下はトラッキングの揺れとみなして 0 にする。
  deadzoneDeg: 4,
  // ここを越えると本格的に滑り出す（カード面内重力の大きさ 0..1）
  slideThreshold: 0.18,
  // 閾値超過分 1.0 あたり何 mm 滑るか
  slideGainMm: 90.0,
  // 点ごとの摩擦のばらつき（0..1 の乱数にこれを掛けて滑り量を減らす）
  frictionSpread: 0.45,
  // これを越えたら縁からこぼれる
  spillDeg: 40,
  // こぼれた点が戻り始めるまでの待ち
  respawnDelayS: 2.0,
  respawnRiseS: 0.9,
  // 落下加速度 (mm/s^2)
  gravityMm: 9800,
}

export const WIND = {
  // 時間領域 RMS の閾値。これを holdS 以上連続で越えたら「風」。
  rmsThreshold: 0.055,
  holdS: 0.15,
  // 会話と区別するため、150Hz 以下の帯域が支配的であることも条件にする。
  lowBandHz: 150,
  lowBandRatio: 0.55,
  // 強さ 0..1 に正規化するときの上限 RMS
  rmsFull: 0.30,
  // 長押しフォールバック（マイクが使えない場合）
  longPressS: 0.5,
  // 風が止んでから再形成を始めるまで
  reformDelayS: 1.5,
}

// 風判定の代替設定。URL の ?wind=<名前> で選ぶ（?debug と併用すると画面上部に判定値が出る）。
//   low: Pixel 7 のマイク想定。息を吹いても RMS が既定の閾値に届かない端末向けに rmsThreshold を半分に
export const WIND_PROFILES = {
  default: {},
  low: {rmsThreshold: WIND.rmsThreshold / 2},
}
const windParam = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('wind')
export const WIND_PROFILE = Object.hasOwn(WIND_PROFILES, windParam) ? windParam : 'default'
Object.assign(WIND, WIND_PROFILES[WIND_PROFILE])

export const SCATTER = {
  // 風の強さ 1.0 のときの初速 (mm/s)
  speedMm: 420,
  speedMinMm: 150,
  // 空気抵抗 (1/s)
  drag: 1.9,
  // 終端落下速度 (mm/s)
  fallMm: 60,
  // 法線方向に対する横方向のばらつき
  spread: 0.85,
}

export const REFORM = {
  durationS: 2.5,
  // 点ごとの遅延の幅（0〜これ秒）
  delaySpanS: 0.5,
  // 目標形状の循環
  cycle: ['logotype', 'fish', 'logotype', 'ant'],
}

export const AUDIO = {
  scatterGain: 0.35,
  scatterBandHz: [2000, 6000],
  scatterDecayS: 0.9,
  gatherGain: 0.16,
  gatherSweepHz: [300, 1800],
  gatherDurS: 0.45,
}

export const PERF = {
  // 直近 N フレームの平均 fps を見る
  window: 60,
  // これを下回る状態が holdS 続いたら粒子数を半分にする（復帰はしない）
  minFps: 25,
  holdS: 3.0,
}

export const RECORD = {
  seconds: 5,
  fps: 30,
  videoBitsPerSecond: 6000000,
}
