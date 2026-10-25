// showcase/ar/targets.js（importmap で 'ar-targets'。shared/ar-core/main.js が読む）
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

// 登録するターゲット。gen_front.py の生成画像（variant ごと）に加えて、印刷した名刺の
// 写真 front-printed.jpg を rectify_printed.py で矩形化したもの（printed）。
// printed は手元の印刷物が normal だったので normal の点群を使う。印刷で右側 14% ほどが
// 切れているため、写真はカード座標に貼り直してあり（切れた部分は紙色）、姿勢と mm の
// 対応は生成画像と同じに扱える。
const TARGETS = [
  ...VARIANTS.map(variant => ({id: variant, variant, imagePath: `./print/front-target-${variant}.png`})),
  {id: 'printed', variant: 'normal', imagePath: './print/front-target-printed.png'},
]

export const buildImageTargetData = () => TARGETS.map(({id, variant, imagePath}) => ({
  imagePath,
  name: `antymark-card-${id}`,
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

// imagefound / imageupdated の detail から「カードローカル mm -> ターゲット姿勢」を作る。
//
// MIT エンジンの実際の値（ヘッドレス Chrome + 偽カメラで実測、レポート参照）:
//   scale        = max(widthInMeters, heightInMeters)。名前に反してメートルではなく、
//                  エンジンの任意単位での「ターゲット長辺のワールド長」。写る大きさに依らず一定で、
//                  近い・遠いは position の距離の方が変わる。
//   scaledWidth  = properties.width / properties.height = 1.544（横長 PNG・isRotated=false）
//   scaledHeight = 1
// ドキュメントの「scaledWidth * scale が幅」は当たらない（長辺が 1.544 倍に膨らむ）。
//
// さらに、横長画像はエンジン内で 90° 回して縦長として読まれる
// （detection-image-loader.cc の rotation_ = width > height ? 90 : 0）。返ってくる姿勢も
// その縦長画像の軸なので、ローカル +X はカードの短辺方向、+Y は長辺方向になる。
// カード（x 右・y 上・mm）をその軸に合わせるため Z 回りに TARGET_ROLL 回す。
export const TARGET_ROLL = -Math.PI / 2

export const cardPoseFromDetail = (detail) => {
  const sw = detail.scaledWidth || 1
  const sh = detail.scaledHeight || 1
  const longMm = Math.max(CARD.widthMm, CARD.heightMm)
  return {
    mmToWorld: (detail.scale || 1) / longMm,
    roll: sw > sh ? TARGET_ROLL : 0,
    // 画像のアスペクトとカード寸法の食い違い（1 に近いはず。663px の丸めで 0.999）
    aspectRatio: (Math.max(sw, sh) / Math.min(sw, sh)) / (CARD.widthMm / CARD.heightMm),
  }
}

// 点群の JSON（ページからの相対 URL）
export const dataUrls = (variant) => ({
  particles: `./ar/particles-${variant}.json`,
  shapes: `./ar/shapes-${variant}.json`,
})

export const variantOf = (targetName) => {
  const t = TARGETS.find(({id}) => `antymark-card-${id}` === targetName)
  return t ? t.variant : null
}

export const configureTargets = () => {
  const data = buildImageTargetData()
  XR8.XrController.configure({
    disableWorldTracking: true,
    imageTargetData: data,
  })
  // どのターゲットが登録されたかは実機比較のために出しておく。認識したターゲット名は
  // shared/ar-core/main.js の "target found" / "target switched" のログに出る
  console.log('[showcase] image targets registered:',
    data.map(d => `${d.name} [${d.metadata.variant}] (${d.properties.width}x${d.properties.height}px, ` +
      `${CARD.widthMm}x${CARD.heightMm}mm)`).join(', '))
}
