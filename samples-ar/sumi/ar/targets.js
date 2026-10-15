// samples-ar/sumi/ar/targets.js（importmap で 'ar-targets'。shared/ar-core/main.js が読む）
//
// 画像ターゲットは make-sample.py が矩形化した本紙の画像（print/target.png、502x1024 の縦長）。
// 登録の形式は showcase/ar/targets.js と同じ（MIT エンジンの ImageTargetData）。

import {CARD, LOG} from './config.js'

// target.png の実ピクセル寸法（長辺 1024px）
export const TARGET_PX = {width: 502, height: 1024}

const NAME = 'sample-sumi'

export const buildImageTargetData = () => [{
  imagePath: './print/target.png',
  name: NAME,
  type: 'PLANAR',
  metadata: {variant: 'sumi'},
  moveable: true,
  physicalWidthInMeters: CARD.widthMm / 1000,
  properties: {
    left: 0,
    top: 0,
    width: TARGET_PX.width,
    height: TARGET_PX.height,
    originalWidth: TARGET_PX.width,
    originalHeight: TARGET_PX.height,
    isRotated: false,
    inputMode: 'BASIC',
    unit: 'mm',
    physicalWidthInMeters: CARD.widthMm / 1000,
  },
}]

// detail -> 「紙ローカル mm -> ターゲット姿勢」。
// scale はターゲット長辺のワールド長（showcase/ar/targets.js の実測と同じ性質）。
// エンジンは横長画像だけを 90° 回して読むので、縦長の target.png では roll は 0 になる。
export const cardPoseFromDetail = (detail) => {
  const sw = detail.scaledWidth || 1
  const sh = detail.scaledHeight || 1
  const longMm = Math.max(CARD.widthMm, CARD.heightMm)
  return {
    mmToWorld: (detail.scale || 1) / longMm,
    roll: sw > sh ? -Math.PI / 2 : 0,
    aspectRatio: (Math.max(sw, sh) / Math.min(sw, sh)) /
      (Math.max(CARD.widthMm, CARD.heightMm) / Math.min(CARD.widthMm, CARD.heightMm)),
  }
}

export const dataUrls = () => ({
  particles: './ar/particles.json',
  shapes: './ar/shapes.json',
})

export const variantOf = (targetName) => (targetName === NAME ? 'sumi' : null)

export const configureTargets = () => {
  const data = buildImageTargetData()
  XR8.XrController.configure({
    disableWorldTracking: true,
    imageTargetData: data,
  })
  console.log(`${LOG} image targets registered:`,
    data.map(d => `${d.name} (${d.properties.width}x${d.properties.height}px, ` +
      `${CARD.widthMm}x${CARD.heightMm}mm)`).join(', '))
}
