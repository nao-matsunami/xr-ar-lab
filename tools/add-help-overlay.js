#!/usr/bin/env node
/**
 * add-help-overlay.js
 * Injects a help overlay (CSS + HTML + JS) into each demo's index.html.
 * Skips files that already contain "help-btn" or "help-overlay".
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

const DEMOS = {
  'image-target-demo': {
    name: 'Image Target',
    usage: 'カメラを画像ターゲットに向ける',
    features: ['画像認識でARオブジェクト表示', 'アニメーション確認'],
  },
  'face-effects-demo': {
    name: 'Face Effects',
    usage: 'カメラを顔に向ける',
    features: ['顔にメッシュ・グラス・クラウンのエフェクト', 'ボタンで切り替え'],
  },
  'sky-effects-demo': {
    name: 'Sky Effects',
    usage: 'カメラを空に向ける',
    features: ['空をspace/sunset/aurora/neonに置き換え'],
  },
  'world-slam-demo': {
    name: 'World SLAM',
    usage: 'カメラで床・地面をスキャン',
    features: ['地面検出後にARオブジェクト配置'],
  },
  'capture-demo': {
    name: 'Capture',
    usage: 'カメラでARを表示してシャッター',
    features: ['AR付き写真撮影', 'ウォーターマーク付き保存・共有'],
  },
  'gesture-demo': {
    name: 'Gesture',
    usage: '地面をタップしてオブジェクト配置',
    features: ['ドラッグで移動', 'ピンチでスケール', '2本指で回転'],
  },
  'portal-demo': {
    name: 'Portal',
    usage: 'カメラで地面をスキャン',
    features: ['異世界へのポータル表示', 'のぞき込むと別の世界が見える'],
  },
  'physics-demo': {
    name: 'Physics',
    usage: '地面を検出してタップ',
    features: ['物理演算でトマトを投げる', '重力・跳ね返りを体験'],
  },
  'alpha-video-demo': {
    name: 'Alpha Video',
    usage: 'カメラを起動するだけ',
    features: ['透過動画をAR空間に表示', 'クロマキー合成の体験'],
  },
  'animation-demo': {
    name: 'Animation',
    usage: '地面を検出してタップ',
    features: ['Mixamoキャラのアニメーション表示', '動作切り替え'],
  },
  'hand-tracking-demo': {
    name: 'Hand Tracking',
    usage: '非対応（将来実装予定）',
    features: ['ハンドトラッキングによるジェスチャー操作'],
  },
  'multi-target-demo': {
    name: 'Multi Target',
    usage: '複数の画像ターゲットにカメラを向ける',
    features: ['複数ターゲットを同時認識', '各ターゲットに異なるARオブジェクト'],
  },
  'curved-target-demo': {
    name: 'Curved Target',
    usage: '缶・ボトルにカメラを向ける',
    features: ['湾曲面トラッキング', '円柱形オブジェクトへのAR'],
  },
  'canvas-target-demo': {
    name: 'Canvas Target',
    usage: '画像ターゲットにカメラを向ける',
    features: ['動的に変化するテクスチャのAR表示', 'リアルタイム更新'],
  },
  'world-effects-demo': {
    name: 'World Effects',
    usage: '地面を検出してタップで配置',
    features: ['雨・雪・炎のパーティクルエフェクト', 'ボタンで切り替え'],
  },
  'audio-ar-demo': {
    name: 'Spatial Audio',
    usage: '地面を検出してカメラを動かす',
    features: ['空間オーディオ体験', '音源に近づくと音が大きくなる'],
  },
  'vr-mode-demo': {
    name: 'VR Mode',
    usage: 'カメラは不要 / 画面をドラッグ',
    features: ['360度パノラマVRビューア', '宇宙・夕焼け・オーロラ・ネオン'],
  },
  'occlusion-demo': {
    name: 'Occlusion',
    usage: '地面を検出してカメラを低くする',
    features: ['ARオブジェクトが壁の後ろに隠れるリアル遮蔽体験'],
  },
  'geo-ar-demo': {
    name: 'Geo AR',
    usage: '屋外でGPSを許可してカメラを向ける',
    features: ['GPS位置情報でARオブジェクトを現実空間に配置'],
  },
};

function buildCSS(demoDir) {
  const btnRight = demoDir === 'vr-mode-demo' ? '130px' : '20px';

  return `<style>
  #help-btn {
    position: fixed; top: 20px; right: ${btnRight}; z-index: 998;
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.4);
    color: #fff; font-size: 18px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  #help-overlay {
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    z-index: 9998; background: rgba(0,0,0,0.8);
    align-items: center; justify-content: center;
  }
  #help-overlay.visible { display: flex; }
  #help-content {
    background: #1a1a2e; border: 1px solid rgba(0,240,255,0.3);
    border-radius: 16px; padding: 24px; max-width: 300px; width: 90%;
    color: #fff; font-family: sans-serif;
  }
  #help-content h3 { margin: 0 0 12px; font-size: 18px; color: #00f0ff; }
  #help-content .sep { border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 10px 0; }
  #help-content .row { font-size: 13px; line-height: 1.8; }
  #help-content .row b { color: #00f0ff; }
  #help-content ul { margin: 4px 0 0 0; padding-left: 18px; font-size: 13px; line-height: 1.8; color: #ccc; }
  #help-content .close-help {
    margin-top: 16px; width: 100%; padding: 10px; border: none;
    border-radius: 8px; background: rgba(0,240,255,0.15); color: #00f0ff;
    font-size: 14px; font-weight: 600; cursor: pointer;
  }
</style>`;
}

function buildHTML(demo) {
  const featuresLi = demo.features.map(f => `      <li>${f}</li>`).join('\n');

  return `<button id="help-btn" onclick="toggleHelp()">?</button>
<div id="help-overlay" onclick="toggleHelp()">
  <div id="help-content" onclick="event.stopPropagation()">
    <h3>${demo.name}</h3>
    <hr class="sep">
    <div class="row"><b>使い方:</b> ${demo.usage}</div>
    <hr class="sep">
    <div class="row"><b>できること:</b></div>
    <ul>
${featuresLi}
    </ul>
    <button class="close-help" onclick="toggleHelp()">閉じる</button>
  </div>
</div>`;
}

function buildJS() {
  return `<script>
  // Help overlay
  function toggleHelp() {
    document.getElementById('help-overlay').classList.toggle('visible');
  }
  // Auto-show after 1s, auto-hide after 5s or on first touch
  setTimeout(function() {
    document.getElementById('help-overlay').classList.add('visible');
    setTimeout(function() {
      document.getElementById('help-overlay').classList.remove('visible');
    }, 5000);
  }, 1000);
  document.addEventListener('touchstart', function _h() {
    document.getElementById('help-overlay').classList.remove('visible');
    document.removeEventListener('touchstart', _h);
  });
</script>`;
}

let modified = 0;
let skipped = 0;
let errors = 0;

for (const [demoDir, demo] of Object.entries(DEMOS)) {
  const filePath = path.join(TEMPLATES_DIR, demoDir, 'index.html');

  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${filePath} — file not found`);
    skipped++;
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // Check if already injected
  if (html.includes('help-btn') || html.includes('help-overlay')) {
    console.log(`[SKIP] ${demoDir} — already has help overlay`);
    skipped++;
    continue;
  }

  // 1. Inject CSS before </head>
  const cssBlock = buildCSS(demoDir);
  if (!html.includes('</head>')) {
    console.log(`[ERROR] ${demoDir} — no </head> tag found`);
    errors++;
    continue;
  }
  html = html.replace('</head>', cssBlock + '\n</head>');

  // 2. Inject HTML after the error-overlay div's closing </div>
  //    The pattern is: the line with "デモ一覧に戻る" link, followed by "  </div>"
  const htmlBlock = buildHTML(demo);
  const errorOverlayEndPattern = /(    <a href="\/templates\/"[^>]*>デモ一覧に戻る<\/a>\n  <\/div>)/;
  if (errorOverlayEndPattern.test(html)) {
    html = html.replace(errorOverlayEndPattern, '$1\n\n  ' + htmlBlock.split('\n').join('\n  '));
  } else {
    console.log(`[ERROR] ${demoDir} — could not find error-overlay closing pattern`);
    errors++;
    continue;
  }

  // 3. Inject JS before </body>
  const jsBlock = buildJS();
  if (!html.includes('</body>')) {
    console.log(`[ERROR] ${demoDir} — no </body> tag found`);
    errors++;
    continue;
  }
  html = html.replace('</body>', '\n  ' + jsBlock + '\n</body>');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`[OK] ${demoDir} — help overlay injected`);
  modified++;
}

console.log(`\nDone: ${modified} modified, ${skipped} skipped, ${errors} errors`);
