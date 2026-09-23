// showcase/ar/targets.js
//
// 画像ターゲットをコードから登録する。クラウド（8thwall.com のプロジェクト）は使わない。
//
// MIT エンジンの現行 API は XR8.XrController.configure({imageTargetData: [...]}) で、
// 各要素の型は vendor/8thwall/reality/shared/engine/image-targets.ts の ImageTargetData:
//
//   {imagePath, metadata, moveable, name, physicalWidthInMeters, type, properties}
//
// imagePath はただの <img> の src として読まれる（tracking-controller.ts の
// loadRemoteImageUrl）。ローカルの PNG をそのまま渡せる。
// physicalWidthInMeters は PLANAR のときだけエンジンに渡る（extractTargetMetadata）。

import {CARD, VARIANTS} from './config.js'

// front-target-*.png の実ピクセル寸法。gen_front.py が 1024px 幅・85x55mm で出す。
export const TARGET_PX = {width: 1024, height: 663}

export const buildImageTargetData = () => VARIANTS.map(variant => ({
  imagePath: `./print/front-target-${variant}.png`,
  name: `antymark-card-${variant}`,
  type: 'PLANAR',
  metadata: {variant},
  moveable: true,
  // 物理サイズの明示。85mm。高さ 55mm は properties のアスペクト比から決まる。
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
}))

export const variantOf = (targetName) => {
  const m = /^antymark-card-(.+)$/.exec(targetName || '')
  return m ? m[1] : null
}

export const configureTargets = () => {
  const data = buildImageTargetData()
  XR8.XrController.configure({
    disableWorldTracking: true,
    imageTargetData: data,
  })
  // どのバリアントが読み込まれたかは実機比較のために出しておく
  console.log('[showcase] image targets registered:',
    data.map(d => `${d.name} (${d.properties.width}x${d.properties.height}px, ` +
      `${CARD.widthMm}x${CARD.heightMm}mm)`).join(', '))
}
