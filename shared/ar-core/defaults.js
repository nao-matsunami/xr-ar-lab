// shared/ar-core/defaults.js
//
// 体験のつまみの既定値（= 名刺の showcase の値）。各ページの config.js（importmap で 'ar-config'）は
// これを再エクスポートし、ターゲット寸法と、変えたい値だけを上書きする。
// 距離は全て mm（ターゲット実寸基準）、時間は秒。

// コンソールの接頭辞。showcase の確認手順はこの文字列で grep している
export const LOG = '[showcase]'

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
  // シェーダに直書きの小さな距離（縁の余白・縁に溜まった判定・湧き戻りの距離。名刺の mm で決めた値）に
  // 掛ける倍率。ターゲットが名刺より大きいときに大きくする。
  unitMm: 1,
}

export const BREATHE = {
  amplitudeMm: 0.3,      // 揺れの振幅
  periodMinS: 2.0,
  periodMaxS: 4.0,
}

export const TILT = {
  // BREATHE 中の「暗黙のチュートリアル」。傾けると点群全体がこれだけ低い側に寄る。
  biasMm: 0.75,
  // 傾きは認識時の姿勢からの相対角（tilt.js）。これ以下はトラッキングの揺れとみなして 0 にする。
  deadzoneDeg: 4,
  // ここを越えると本格的に滑り出す（カード面内重力の大きさ 0..1）。
  // 0.07 は相対 8° 前後（deadzone 込み）。10° 傾ければ平均 4mm ほど低い側へ寄る。
  slideThreshold: 0.07,
  // 閾値超過分 1.0 あたり何 mm 滑るか
  slideGainMm: 135.0,
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
  // 第一の入力: 名刺上の短いタップ（wind.js の attachTap）。移動がこれ未満・時間がこれ未満ならタップ
  tapMaxMovePx: 10,
  tapMaxS: 0.3,
  tapStrength: 0.85,
  // 🌬 でマイクを許可したときの追加入力。
  //   rms > max(直近 medianWindowS 秒の RMS 中央値 * medianX, minRms) が holdS 続いたら発火。
  // 帯域比・立ち上がり・ノイズフロアの凍結は持たない。会話や物音での誤発火は許容する
  // （散って再形成するだけ。気になるならマイクを使わずタップで遊ぶ）。
  medianWindowS: 2.0,
  medianX: 3,
  minRms: 0.008,
  holdS: 0.08,
  // 一度発火したら、この間はマイクの次の発火を受け付けない（タップは受け付ける）
  cooldownS: 2.0,
  // 強さはその時点の閾値に対する超過量で [strengthMin, strengthMax] に正規化する。
  // RMS が閾値の strengthFullX 倍に達したら strengthMax。
  strengthMin: 0.3,
  strengthMax: 1.0,
  strengthFullX: 5,
  // 風が止んでから再形成を始めるまで
  reformDelayS: 1.5,
}

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
  // 初速の向きに「上」を足す量（0 = 法線＋横のばらつきだけ）
  lift: 0,
  // 落下（fallMm > 0）/ 上昇（fallMm < 0）の向き。
  //   false: カードの -y に固定（名刺の showcase）
  //   true : 散った瞬間の実際の「下」（tilt.js の downLocal）。紙を壁に掛けても机に置いても上へ昇る
  worldDown: false,
  // 散った点の横揺れ（mm）。煙のゆらぎ
  swirlMm: 0,
}

export const REFORM = {
  durationS: 2.5,
  // 点ごとの遅延の幅（0〜これ秒）
  delaySpanS: 0.5,
  // 目標形状の循環
  cycle: ['logotype', 'fish', 'logotype', 'ant'],
}

export const AUDIO = {
  // 散る瞬間の音: 'grain'（帯域ノイズのざっ）/ 'bell'（鐘＋筆が紙を擦るノイズ、audio.js）
  scatterVoice: 'grain',
  // 再形成が終わったときのスイープを鳴らすか
  gather: true,
  scatterGain: 0.21,
  // 立ち上がりのランプ。短いと破裂音（クリック）になる
  scatterAttackS: 0.06,
  scatterBandHz: [2000, 6000],
  scatterDecayS: 0.9,
  gatherGain: 0.16,
  gatherSweepHz: [300, 1800],
  gatherDurS: 0.45,
  // 'bell' のときの鐘（audio.js の bellAt）と、添える擦れのノイズ（brushAt）
  bellHz: 110,
  bellGain: 0.32,
  bellAttackS: 0.012,
  // [基音に対する比, 振幅, 減衰秒]。比は鐘らしく整数倍からずらす
  bellPartials: [[1, 1.0, 4.0], [2.32, 0.45, 2.6], [4.25, 0.22, 1.6], [6.63, 0.10, 0.9]],
  brushBandHz: [1000, 3000],
  brushGain: 0.05,
  brushAttackS: 0.15,
  brushDurS: 2.6,
  // 出力段のコンプレッサ（ピーク抑え）
  compThresholdDb: -18,
  compKneeDb: 12,
  compRatio: 6,
  compAttackS: 0.003,
  compReleaseS: 0.25,
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
  // 保存するファイル名の頭
  filePrefix: 'antymark-card',
}
