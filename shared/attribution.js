/*
 * shared/attribution.js
 *
 * Self-contained legal attribution widget for the 8th Wall engine.
 * No dependencies, no A-Frame coupling. Injects a small round "ⓘ" button in
 * the bottom-right corner; tapping it opens a modal with the required notice.
 *
 * Engine variant is selected by `window.__XR_ENGINE_LICENSE`:
 *   'mit'  -> open source engine (MIT) notice
 *   other  -> distributed engine binary (XR Engine License Agreement) notice
 */
(function () {
  'use strict';

  if (window.__xrAttributionInstalled) { return; }
  window.__xrAttributionInstalled = true;

  var BINARY_LINES = [
    'This experience uses the 8th Wall Engine.',
    '8th Wall Engine © Niantic Spatial, Inc. All rights reserved.',
    'Niantic Spatial, Inc. is the creator of the 8th Wall Engine.',
    'Licensed under the XR Engine License Agreement:',
    {url: 'https://github.com/8thwall/engine/blob/main/LICENSE'},
    'The Engine is provided "AS IS" without warranties of any kind. ' +
      'See the license for the full disclaimer.',
    'This experience is not affiliated with, sponsored, or endorsed by Niantic Spatial, Inc.'
  ];

  var MIT_LINES = [
    'This experience uses the open source 8th Wall Engine.',
    'Copyright (c) Niantic Spatial, Inc.',
    'Licensed under the MIT License:',
    {url: 'https://github.com/8thwall/8thwall/blob/main/LICENSE'}
  ];

  function install() {
    var lines = window.__XR_ENGINE_LICENSE === 'mit' ? MIT_LINES : BINARY_LINES;

    var style = document.createElement('style');
    style.textContent = [
      '#xr-attribution-btn{',
      'position:fixed;right:12px;bottom:12px;width:32px;height:32px;',
      'border-radius:50%;background:rgba(0,0,0,.45);color:#fff;',
      'border:1px solid rgba(255,255,255,.35);',
      'display:flex;align-items:center;justify-content:center;',
      'font:16px/1 sans-serif;cursor:pointer;padding:0;',
      'z-index:9999;pointer-events:auto;',
      '-webkit-tap-highlight-color:transparent;}',
      '#xr-attribution-modal{',
      'position:fixed;inset:0;display:none;align-items:center;',
      'justify-content:center;background:rgba(0,0,0,.75);',
      'z-index:10001;pointer-events:auto;padding:16px;',
      'box-sizing:border-box;}',
      '#xr-attribution-modal.open{display:flex;}',
      '#xr-attribution-panel{',
      'position:relative;max-width:520px;max-height:80vh;overflow-y:auto;',
      'background:#15151a;color:#e8e8ea;border-radius:12px;',
      'padding:20px 20px 16px;box-sizing:border-box;',
      'font:12px/1.65 sans-serif;-webkit-overflow-scrolling:touch;}',
      '#xr-attribution-panel p{margin:0 0 8px;}',
      '#xr-attribution-panel p:last-child{margin-bottom:0;}',
      '#xr-attribution-panel a{color:#7fb8ff;word-break:break-all;}',
      '#xr-attribution-close{',
      'position:absolute;top:8px;right:8px;width:28px;height:28px;',
      'border-radius:50%;background:rgba(255,255,255,.12);color:#fff;',
      'border:0;font:16px/1 sans-serif;cursor:pointer;padding:0;',
      'display:flex;align-items:center;justify-content:center;',
      '-webkit-tap-highlight-color:transparent;}'
    ].join('');
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'xr-attribution-btn';
    btn.type = 'button';
    btn.textContent = 'ⓘ';
    btn.setAttribute('aria-label', 'Legal notices / attribution');

    var modal = document.createElement('div');
    modal.id = 'xr-attribution-modal';

    var panel = document.createElement('div');
    panel.id = 'xr-attribution-panel';

    var close = document.createElement('button');
    close.id = 'xr-attribution-close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    panel.appendChild(close);

    lines.forEach(function (line) {
      var p = document.createElement('p');
      if (typeof line === 'string') {
        p.textContent = line;
      } else {
        var a = document.createElement('a');
        a.href = line.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = line.url;
        p.appendChild(a);
      }
      panel.appendChild(p);
    });

    modal.appendChild(panel);
    document.body.appendChild(modal);
    document.body.appendChild(btn);

    // stopPropagation only -- never preventDefault, so existing capture-phase
    // touch handlers in the demos keep working normally.
    function open(e) {
      e.stopPropagation();
      modal.classList.add('open');
    }
    function shut(e) {
      e.stopPropagation();
      modal.classList.remove('open');
    }

    btn.addEventListener('click', open);
    btn.addEventListener('touchend', open);
    close.addEventListener('click', shut);
    close.addEventListener('touchend', shut);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) { shut(e); }
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    panel.addEventListener('touchend', function (e) { e.stopPropagation(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
