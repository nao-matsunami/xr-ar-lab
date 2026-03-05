#!/usr/bin/env node
// Image Target CLI のコア関数を使って、非対話的にターゲット画像をコンパイルするスクリプト
//
// 使い方:
//   cd ~/xr-ar-lab/templates/image-target-demo
//   node compile-targets.mjs
//
// 前提: vendor/8thwall/apps/image-target-cli/node_modules に sharp がインストール済み

import {createRequire} from 'module'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliDir = path.resolve(__dirname, '../../vendor/8thwall/apps/image-target-cli')

// CLI の node_modules から sharp を読み込み
const require = createRequire(path.join(cliDir, 'src/'))
const sharp = require('sharp')

// CLI のコア関数を動的にインポート
const {getDefaultCrop} = await import(path.join(cliDir, 'src/crop.js'))
const {applyCrop} = await import(path.join(cliDir, 'src/apply.js'))

const outputDir = path.join(__dirname, 'image-targets')

// コンパイルするターゲット画像の定義
const targets = [
  {
    imagePath: path.resolve(__dirname, '../../vendor/web/examples/aframe/flyer/targets/model-target.jpg'),
    name: 'sample-target-1',
  },
  {
    imagePath: path.resolve(__dirname, '../../vendor/web/examples/aframe/flyer/targets/video-target.jpg'),
    name: 'sample-target-2',
  },
]

for (const target of targets) {
  console.log(`Processing: ${target.name} (${path.basename(target.imagePath)})`)
  try {
    const image = sharp(target.imagePath)
    const metadata = await image.metadata()
    console.log(`  Image size: ${metadata.width}x${metadata.height}`)

    // ポートレート画像のデフォルトクロップ（3:4 比率）
    const isRotated = metadata.width >= metadata.height
    const crop = {
      type: 'PLANAR',
      geometry: getDefaultCrop(metadata, isRotated),
    }
    console.log(`  Crop: ${JSON.stringify(crop.geometry)}`)

    const {dataPath} = await applyCrop(image, crop, outputDir, target.name, true)
    console.log(`  Saved: ${dataPath}`)
  } catch (err) {
    console.error(`  Error: ${err.message}`)
  }
}

console.log('\nDone! Compiled targets in:', outputDir)
