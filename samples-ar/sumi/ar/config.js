// samples-ar/sumi/ar/config.js（importmap で 'ar-config'）
//
// 墨文字サンプルの設定。既定値は名刺の showcase（shared/ar-core/defaults.js）で、ここには差分だけを書く。
//
// 距離の単位について: 点群は本紙の実寸（520x1060mm）で作ってある。showcase の値は 85mm の名刺で
// 決めた mm なので、そのままでは紙に対して 1/12 の動きにしかならない。距離の値はすべて
// 「名刺に換算した mm」x K（= 紙の長辺 / 名刺の長辺）で書く。こうすると「showcase の 0.6 倍」が
// 紙の大きさに対しても 0.6 倍の見え方になる（A4 に刷っても同じ見え方。AR は紙の長辺で縮尺を決める）。

import {BREATHE as B, PARTICLES as P, REFORM as RF, SCATTER as S, TILT as T, AUDIO as A, RECORD as RC}
  from '../../../shared/ar-core/defaults.js'

export * from '../../../shared/ar-core/defaults.js'

export const LOG = '[sumi]'

// 白隠『徳』の本紙（表装を除く）
export const CARD = {
  widthMm: 520,
  heightMm: 1060,
}

export const VARIANTS = ['sumi']

// 名刺の長辺 85mm -> 紙の長辺
const K = Math.max(CARD.widthMm, CARD.heightMm) / 85

export const PARTICLES = {
  ...P,
  // 点の直径は make-sample.py が局所の間隔の 1.25 倍で出している。showcase ほど膨らませない
  sizeScale: 1.1,
  unitMm: K,
}

// 墨が「生きている」程度。振幅は showcase の半分（0.15mm 相当）、周期はゆっくり
export const BREATHE = {
  ...B,
  amplitudeMm: 0.15 * K,
  periodMinS: 4.0,
  periodMaxS: 6.0,
}

// 傾きは有効のまま。滑り量は showcase の 0.5 倍（墨は砂ほど動かない）
export const TILT = {
  ...T,
  biasMm: T.biasMm * 0.5 * K,
  slideGainMm: T.slideGainMm * 0.5 * K,
  gravityMm: T.gravityMm * K,
}

// 煙のように立ち上る: 紙面法線＋実際の上向き（上を強く）。初速は showcase の 0.6 倍。
// 空気抵抗を強めにして最初の吹き出しを早く止め、その後はゆっくり昇りながら揺れる
// （showcase の値のままだと 1 秒足らずで画面の外へ抜けて、煙に見える時間がない）
export const SCATTER = {
  ...S,
  speedMm: S.speedMm * 0.6 * K,
  speedMinMm: S.speedMinMm * 0.6 * K,
  drag: 3.5,
  // 負 = 散った瞬間の実際の「上」へ昇り続ける（終端速度）
  fallMm: -25 * K,
  lift: 2.0,
  worldDown: true,
  swirlMm: 6 * K,
}

// ゆっくり戻る。円相は描き始めから筆の順に、文字は上から順に集まる（delay は make-sample.py）
export const REFORM = {
  ...RF,
  durationS: 3.5,
  delaySpanS: 1.2,
  cycle: ['enso', 'sumi'],
}

// 散る瞬間に低い鐘 1 発（110Hz）＋散っている間は筆が紙を擦るような薄いノイズ。
// 読経・念仏・声明の音声は入れない（実案件でお寺の声を録って差し替える前提。レポート参照）
export const AUDIO = {
  ...A,
  scatterVoice: 'bell',
  gather: false,
}

export const RECORD = {
  ...RC,
  filePrefix: 'sumi',
}
