// showcase/ar/config.js（importmap で 'ar-config'）
//
// 名刺の showcase の設定。演出の値は shared/ar-core/defaults.js が既定値＝showcase の値なので、
// ここにはターゲット（名刺）の寸法とバリアントだけを置く。実機で振る舞いを詰めるときは defaults.js。
// 距離は全て mm（カード実寸基準）、時間は秒。

export * from '../../shared/ar-core/defaults.js'

export const CARD = {
  widthMm: 85,
  heightMm: 55,
}

export const VARIANTS = ['sparse', 'normal', 'dense']
