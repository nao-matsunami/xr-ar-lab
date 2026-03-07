#!/usr/bin/env node
// 印刷屋デモ用ダミーターゲット画像を生成し、image-target-cliでコンパイルする
//
// 使い方:
//   cd ~/xr-ar-lab
//   node tools/generate-dummy-targets.mjs

import {createRequire} from 'module'
import path from 'path'
import {fileURLToPath} from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const cliDir = path.resolve(rootDir, 'vendor/8thwall/apps/image-target-cli')

// CLI の node_modules から sharp を読み込み
const require = createRequire(path.join(cliDir, 'src/'))
const sharp = require('sharp')

// CLI のコア関数
const {getDefaultCrop} = await import(path.join(cliDir, 'src/crop.js'))
const {applyCrop} = await import(path.join(cliDir, 'src/apply.js'))

const W = 768
const H = 1024

// SVG生成ヘルパー
function svgWrap(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#f5f5f0"/>
${inner}
</svg>`
}

// 特徴点を増やすためのノイズパターン
function noisePattern(seed) {
  let lines = ''
  // 疑似乱数
  let s = seed
  function rand() {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return (s % 1000) / 1000
  }
  // 小さな円・四角をランダム配置（特徴点用）
  for (let i = 0; i < 120; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = 2 + rand() * 6
    const gray = Math.floor(80 + rand() * 120)
    const opacity = 0.15 + rand() * 0.25
    if (rand() > 0.5) {
      lines += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgb(${gray},${gray},${gray})" opacity="${opacity.toFixed(2)}"/>\n`
    } else {
      lines += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${(r * 2).toFixed(1)}" fill="rgb(${gray},${gray},${gray})" opacity="${opacity.toFixed(2)}" transform="rotate(${(rand() * 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>\n`
    }
  }
  return lines
}

// ===== can-demo: サッポロ風の星マーク + 円形パターン =====
function canSvg() {
  let inner = noisePattern(42)
  // 大きな星
  const cx = W / 2, cy = H * 0.4
  const points = []
  for (let i = 0; i < 5; i++) {
    const a1 = (i * 72 - 90) * Math.PI / 180
    const a2 = ((i * 72) + 36 - 90) * Math.PI / 180
    points.push(`${(cx + 120 * Math.cos(a1)).toFixed(1)},${(cy + 120 * Math.sin(a1)).toFixed(1)}`)
    points.push(`${(cx + 50 * Math.cos(a2)).toFixed(1)},${(cy + 50 * Math.sin(a2)).toFixed(1)}`)
  }
  inner += `<polygon points="${points.join(' ')}" fill="#c8a415" stroke="#8b7000" stroke-width="3"/>\n`
  // 同心円
  for (let r = 30; r <= 180; r += 25) {
    inner += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="1.5" opacity="0.3"/>\n`
  }
  // 下部にテキスト的パターン
  for (let i = 0; i < 8; i++) {
    const y = H * 0.7 + i * 22
    const w = 200 + (i % 3) * 80
    inner += `<rect x="${(W - w) / 2}" y="${y}" width="${w}" height="10" rx="2" fill="#555" opacity="0.25"/>\n`
  }
  // "BEER" 風ラベル
  inner += `<text x="${cx}" y="${H * 0.62}" text-anchor="middle" font-family="serif" font-size="64" font-weight="bold" fill="#8b6914" opacity="0.7">SAMPLE</text>\n`
  return svgWrap(inner)
}

// ===== card-demo: 名刺風の横長レイアウト =====
function cardSvg() {
  let inner = noisePattern(101)
  // 名刺枠（中央に配置）
  const cw = 560, ch = 320
  const cx = (W - cw) / 2, cy = (H - ch) / 2
  inner += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="12" fill="#fff" stroke="#222" stroke-width="3"/>\n`
  // ロゴ的な円
  inner += `<circle cx="${cx + 70}" cy="${cy + 80}" r="35" fill="#1a5276" opacity="0.8"/>\n`
  inner += `<circle cx="${cx + 70}" cy="${cy + 80}" r="18" fill="#fff"/>\n`
  // テキスト行
  const lines = [
    {x: cx + 130, y: cy + 65, w: 280, h: 18},
    {x: cx + 130, y: cy + 95, w: 200, h: 12},
    {x: cx + 40, y: cy + 160, w: 350, h: 10},
    {x: cx + 40, y: cy + 185, w: 300, h: 10},
    {x: cx + 40, y: cy + 210, w: 250, h: 10},
    {x: cx + 40, y: cy + 260, w: 480, h: 8},
    {x: cx + 40, y: cy + 280, w: 400, h: 8},
  ]
  for (const l of lines) {
    inner += `<rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="2" fill="#333" opacity="0.35"/>\n`
  }
  // 地球アイコン
  inner += `<circle cx="${W / 2}" cy="${H * 0.18}" r="60" fill="none" stroke="#1a5276" stroke-width="2" opacity="0.4"/>\n`
  inner += `<ellipse cx="${W / 2}" cy="${H * 0.18}" rx="30" ry="60" fill="none" stroke="#1a5276" stroke-width="1.5" opacity="0.3"/>\n`
  inner += `<line x1="${W / 2 - 60}" y1="${H * 0.18}" x2="${W / 2 + 60}" y2="${H * 0.18}" stroke="#1a5276" stroke-width="1.5" opacity="0.3"/>\n`
  return svgWrap(inner)
}

// ===== flyer-demo: チラシ風のグリッド + 幾何学模様 =====
function flyerSvg() {
  let inner = noisePattern(77)
  // グリッドライン
  for (let x = 0; x <= W; x += 64) {
    inner += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#ccc" stroke-width="0.5"/>\n`
  }
  for (let y = 0; y <= H; y += 64) {
    inner += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#ccc" stroke-width="0.5"/>\n`
  }
  // 大きな時計アイコン
  const cx = W / 2, cy = H * 0.35
  inner += `<circle cx="${cx}" cy="${cy}" r="110" fill="none" stroke="#cc0000" stroke-width="4"/>\n`
  inner += `<circle cx="${cx}" cy="${cy}" r="105" fill="none" stroke="#222" stroke-width="1"/>\n`
  // 時計の針
  inner += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 80}" stroke="#222" stroke-width="4" stroke-linecap="round"/>\n`
  inner += `<line x1="${cx}" y1="${cy}" x2="${cx + 55}" y2="${cy - 20}" stroke="#222" stroke-width="3" stroke-linecap="round"/>\n`
  inner += `<circle cx="${cx}" cy="${cy}" r="6" fill="#cc0000"/>\n`
  // ランナーシルエット
  for (let i = 0; i < 4; i++) {
    const rx = 120 + i * 150
    const ry = H * 0.7
    inner += `<circle cx="${rx}" cy="${ry - 30}" r="10" fill="#222" opacity="0.6"/>\n`
    inner += `<line x1="${rx}" y1="${ry - 20}" x2="${rx}" y2="${ry + 10}" stroke="#222" stroke-width="3" opacity="0.6"/>\n`
    inner += `<line x1="${rx}" y1="${ry - 5}" x2="${rx - 12}" y2="${ry - 20}" stroke="#222" stroke-width="2.5" opacity="0.6"/>\n`
    inner += `<line x1="${rx}" y1="${ry - 5}" x2="${rx + 12}" y2="${ry - 20}" stroke="#222" stroke-width="2.5" opacity="0.6"/>\n`
    inner += `<line x1="${rx}" y1="${ry + 10}" x2="${rx - 10}" y2="${ry + 30}" stroke="#222" stroke-width="2.5" opacity="0.6"/>\n`
    inner += `<line x1="${rx}" y1="${ry + 10}" x2="${rx + 10}" y2="${ry + 30}" stroke="#222" stroke-width="2.5" opacity="0.6"/>\n`
  }
  // テキスト行（イベント情報風）
  inner += `<text x="${cx}" y="${H * 0.58}" text-anchor="middle" font-family="sans-serif" font-size="42" font-weight="bold" fill="#cc0000" opacity="0.7">5K RUN</text>\n`
  for (let i = 0; i < 5; i++) {
    const y = H * 0.85 + i * 20
    const w = 300 + (i % 2) * 100
    inner += `<rect x="${(W - w) / 2}" y="${y}" width="${w}" height="8" rx="2" fill="#555" opacity="0.2"/>\n`
  }
  return svgWrap(inner)
}

// ===== tshirt-demo: ドア・窓の枠線パターン =====
function tshirtSvg() {
  let inner = noisePattern(200)
  const cx = W / 2, cy = H * 0.42
  // ドア枠
  const dw = 220, dh = 380
  inner += `<rect x="${cx - dw / 2}" y="${cy - dh / 2}" width="${dw}" height="${dh}" rx="4" fill="#e8d5b8" stroke="#5C3317" stroke-width="8"/>\n`
  // ドアパネル上下
  inner += `<rect x="${cx - dw / 2 + 20}" y="${cy - dh / 2 + 20}" width="${dw - 40}" height="${dh / 2 - 35}" rx="3" fill="none" stroke="#5C3317" stroke-width="3"/>\n`
  inner += `<rect x="${cx - dw / 2 + 20}" y="${cy + 10}" width="${dw - 40}" height="${dh / 2 - 35}" rx="3" fill="none" stroke="#5C3317" stroke-width="3"/>\n`
  // ドアノブ
  inner += `<circle cx="${cx + dw / 2 - 40}" cy="${cy + 10}" r="10" fill="#DAA520" stroke="#8B6914" stroke-width="2"/>\n`
  // 鳥のシルエット
  for (let i = 0; i < 5; i++) {
    const bx = 100 + i * 140
    const by = H * 0.12 + (i % 3) * 30
    const ws = 15 + (i % 2) * 5
    inner += `<path d="M${bx},${by} Q${bx - ws},${by - 10} ${bx - ws * 1.5},${by - 15} M${bx},${by} Q${bx + ws},${by - 10} ${bx + ws * 1.5},${by - 15}" fill="none" stroke="#222" stroke-width="2.5" opacity="0.5"/>\n`
  }
  // 窓から見える景色（矩形パターン）
  inner += `<rect x="${cx - dw / 2 + 25}" y="${cy - dh / 2 + 25}" width="${dw - 50}" height="${dh / 2 - 45}" fill="#87CEEB" opacity="0.3"/>\n`
  // 太陽
  inner += `<circle cx="${cx + 40}" cy="${cy - dh / 2 + 70}" r="25" fill="#ff8c00" opacity="0.4"/>\n`
  // Tシャツアウトライン
  const ty = H * 0.78
  inner += `<path d="M${cx - 80},${ty} L${cx - 130},${ty - 30} L${cx - 100},${ty - 60} L${cx - 60},${ty - 40} L${cx - 40},${ty - 55} Q${cx},${ty - 65} ${cx + 40},${ty - 55} L${cx + 60},${ty - 40} L${cx + 100},${ty - 60} L${cx + 130},${ty - 30} L${cx + 80},${ty} L${cx + 80},${ty + 80} L${cx - 80},${ty + 80} Z" fill="none" stroke="#333" stroke-width="2.5" opacity="0.4"/>\n`
  return svgWrap(inner)
}

// ===== mug-demo: マグカップの円形 + ハンドル形状 =====
function mugSvg() {
  let inner = noisePattern(333)
  const cx = W / 2, cy = H * 0.45
  // マグカップ本体
  inner += `<rect x="${cx - 100}" y="${cy - 80}" width="200" height="220" rx="10" fill="#f0ebe0" stroke="#aaa" stroke-width="3"/>\n`
  // 底の丸み
  inner += `<ellipse cx="${cx}" cy="${cy + 140}" rx="100" ry="20" fill="#e0dbd0" stroke="#aaa" stroke-width="2"/>\n`
  // ハンドル
  inner += `<path d="M${cx + 100},${cy - 30} Q${cx + 170},${cy - 20} ${cx + 170},${cy + 40} Q${cx + 170},${cy + 100} ${cx + 100},${cy + 90}" fill="none" stroke="#aaa" stroke-width="12" stroke-linecap="round"/>\n`
  // コーヒー液面
  inner += `<ellipse cx="${cx}" cy="${cy - 60}" rx="85" ry="25" fill="#3d1a00" opacity="0.7"/>\n`
  // ラテアート（ハート）
  inner += `<path d="M${cx},${cy - 40} C${cx},${cy - 45} ${cx - 20},${cy - 68} ${cx - 20},${cy - 72} C${cx - 20},${cy - 80} ${cx - 10},${cy - 82} ${cx},${cy - 74} C${cx + 10},${cy - 82} ${cx + 20},${cy - 80} ${cx + 20},${cy - 72} C${cx + 20},${cy - 68} ${cx},${cy - 45} ${cx},${cy - 40} Z" fill="#f5e6d3" opacity="0.6"/>\n`
  // 湯気
  for (let i = 0; i < 3; i++) {
    const sx = cx - 30 + i * 30
    inner += `<path d="M${sx},${cy - 90} Q${sx + 8},${cy - 115} ${sx - 5},${cy - 140} Q${sx + 10},${cy - 160} ${sx},${cy - 180}" fill="none" stroke="#999" stroke-width="2" opacity="0.3"/>\n`
  }
  // カフェロゴ的な円
  inner += `<circle cx="${cx}" cy="${cy + 40}" r="45" fill="none" stroke="#8b6914" stroke-width="2" opacity="0.3"/>\n`
  inner += `<circle cx="${cx}" cy="${cy + 40}" r="35" fill="none" stroke="#8b6914" stroke-width="1" opacity="0.25"/>\n`
  inner += `<text x="${cx}" y="${cy + 46}" text-anchor="middle" font-family="serif" font-size="20" fill="#8b6914" opacity="0.35">CAFE</text>\n`
  return svgWrap(inner)
}

// ===== メイン処理 =====
const demos = [
  {name: 'can-demo', targetName: 'can-target', svg: canSvg},
  {name: 'card-demo', targetName: 'card-target', svg: cardSvg},
  {name: 'flyer-demo', targetName: 'flyer-target', svg: flyerSvg},
  {name: 'tshirt-demo', targetName: 'tshirt-target', svg: tshirtSvg},
  {name: 'mug-demo', targetName: 'mug-target', svg: mugSvg},
]

for (const demo of demos) {
  const demoDir = path.join(rootDir, 'templates/print-shop', demo.name)
  const outputDir = path.join(demoDir, 'image-targets')
  const pngPath = path.join(outputDir, 'target.png')

  console.log(`\n=== ${demo.name} ===`)

  // 1. SVG → PNG
  const svgBuffer = Buffer.from(demo.svg())
  await sharp(svgBuffer).png().toFile(pngPath)
  console.log(`  Generated: target.png (${W}x${H})`)

  // 2. Image Target コンパイル
  try {
    const image = sharp(pngPath)
    const metadata = await image.metadata()
    const isRotated = metadata.width >= metadata.height
    const crop = {
      type: 'PLANAR',
      geometry: getDefaultCrop(metadata, isRotated),
    }
    console.log(`  Crop: ${JSON.stringify(crop.geometry)}`)

    const {dataPath} = await applyCrop(image, crop, outputDir, demo.targetName, true)
    console.log(`  Compiled: ${dataPath}`)
  } catch (err) {
    console.error(`  Compile error: ${err.message}`)
  }
}

console.log('\nDone!')
