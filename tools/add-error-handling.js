#!/usr/bin/env node
// Batch-insert unified error handling into all demo index.html files
const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

const ERROR_OVERLAY_HTML = `
  <!-- Unified Error Overlay -->
  <div id="error-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; flex-direction:column; align-items:center; justify-content:center; color:white; text-align:center; padding:20px; box-sizing:border-box;">
    <div style="font-size:48px; margin-bottom:16px;" id="error-icon"></div>
    <div style="font-size:20px; font-weight:bold; margin-bottom:12px;" id="error-title">Error</div>
    <div style="font-size:14px; line-height:1.6; max-width:300px; white-space:pre-line;" id="error-message"></div>
    <button onclick="location.reload()" style="margin-top:24px; padding:12px 24px; background:#fff; color:#000; border:none; border-radius:8px; font-size:16px; cursor:pointer;">再試行</button>
    <a href="/templates/" style="margin-top:12px; color:#aaa; font-size:14px; text-decoration:none;">デモ一覧に戻る</a>
  </div>`;

const ERROR_JS_COMMON = `
  <script>
    // Unified error handling
    function showError(type) {
      var messages = {
        camera: { icon: '📷', title: 'カメラへのアクセスが必要です', message: 'ブラウザの設定からカメラのアクセスを許可してください。\\n\\nSettings > Safari/Chrome > Camera > Allow' },
        gps: { icon: '📍', title: '位置情報へのアクセスが必要です', message: 'このデモはGPS位置情報を使用します。\\nブラウザの設定から位置情報のアクセスを許可してください。' },
        browser: { icon: '🌐', title: 'ブラウザが対応していません', message: 'このARデモはiOS Safari またはAndroid Chromeでご利用ください。\\n\\niOS: Safari最新版\\nAndroid: Chrome最新版' },
        https: { icon: '🔒', title: 'HTTPSが必要です', message: 'このデモはHTTPS環境が必要です。\\nhttps://xr-ar-lab.netlify.app からアクセスしてください。' }
      };
      var m = messages[type] || messages.browser;
      document.getElementById('error-icon').textContent = m.icon;
      document.getElementById('error-title').textContent = m.title;
      document.getElementById('error-message').textContent = m.message;
      document.getElementById('error-overlay').style.display = 'flex';
    }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      showError('https');
    }
    if (typeof navigator.mediaDevices === 'undefined' || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      showError('browser');
    }
  </script>`;

// VR mode doesn't use camera, so skip browser check
const ERROR_JS_VR = `
  <script>
    // Unified error handling (VR mode - no camera required)
    function showError(type) {
      var messages = {
        browser: { icon: '🌐', title: 'ブラウザが対応していません', message: 'このVRデモはiOS Safari またはAndroid Chromeでご利用ください。\\n\\niOS: Safari最新版\\nAndroid: Chrome最新版' },
        https: { icon: '🔒', title: 'HTTPSが必要です', message: 'このデモはHTTPS環境が必要です。\\nhttps://xr-ar-lab.netlify.app からアクセスしてください。' }
      };
      var m = messages[type] || messages.browser;
      document.getElementById('error-icon').textContent = m.icon;
      document.getElementById('error-title').textContent = m.title;
      document.getElementById('error-message').textContent = m.message;
      document.getElementById('error-overlay').style.display = 'flex';
    }
  </script>`;

// Geo demo needs GPS error handling added to existing geolocation code
const ERROR_JS_GEO_EXTRA = `
  <script>
    // Unified error handling
    function showError(type) {
      var messages = {
        camera: { icon: '📷', title: 'カメラへのアクセスが必要です', message: 'ブラウザの設定からカメラのアクセスを許可してください。\\n\\nSettings > Safari/Chrome > Camera > Allow' },
        gps: { icon: '📍', title: '位置情報へのアクセスが必要です', message: 'このデモはGPS位置情報を使用します。\\nブラウザの設定から位置情報のアクセスを許可してください。' },
        browser: { icon: '🌐', title: 'ブラウザが対応していません', message: 'このARデモはiOS Safari またはAndroid Chromeでご利用ください。\\n\\niOS: Safari最新版\\nAndroid: Chrome最新版' },
        https: { icon: '🔒', title: 'HTTPSが必要です', message: 'このデモはHTTPS環境が必要です。\\nhttps://xr-ar-lab.netlify.app からアクセスしてください。' }
      };
      var m = messages[type] || messages.browser;
      document.getElementById('error-icon').textContent = m.icon;
      document.getElementById('error-title').textContent = m.title;
      document.getElementById('error-message').textContent = m.message;
      document.getElementById('error-overlay').style.display = 'flex';
    }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      showError('https');
    }
    if (typeof navigator.mediaDevices === 'undefined' || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      showError('browser');
    }
    if (!('geolocation' in navigator)) {
      showError('gps');
    }
  </script>`;

const demos = fs.readdirSync(TEMPLATES_DIR)
  .filter(d => d.endsWith('-demo') && fs.statSync(path.join(TEMPLATES_DIR, d)).isDirectory());

let modified = 0;
for (const demo of demos) {
  const filePath = path.join(TEMPLATES_DIR, demo, 'index.html');
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has error-overlay
  if (content.includes('error-overlay')) {
    console.log(`SKIP ${demo} (already has error-overlay)`);
    continue;
  }

  // Insert error overlay HTML after <body> or <body ...>
  content = content.replace(/(<body[^>]*>)/, `$1\n${ERROR_OVERLAY_HTML}`);

  // Choose appropriate JS based on demo type
  let errorJS;
  if (demo === 'vr-mode-demo') {
    errorJS = ERROR_JS_VR;
  } else if (demo === 'geo-ar-demo') {
    errorJS = ERROR_JS_GEO_EXTRA;
  } else {
    errorJS = ERROR_JS_COMMON;
  }

  // Insert error JS before </body>
  content = content.replace('</body>', `${errorJS}\n</body>`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`OK   ${demo}`);
  modified++;
}

console.log(`\nDone: ${modified} files modified, ${demos.length - modified} skipped`);
