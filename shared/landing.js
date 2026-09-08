/*
 * shared/landing.js
 *
 * Minimal desktop landing overlay. Replaces 8th Wall's landing-page.js, which
 * fetched its QR code from https://8th.io/qr and pulled three.js from
 * cdn.jsdelivr.net -- both external hosts we cannot depend on.
 *
 * On a desktop browser this shows the current URL as a locally generated QR
 * code so the page can be opened on a phone. On mobile it does nothing.
 *
 * Symbols only -- no prose, in any language.
 * Requires lib/vendor/qrcode-generator/qrcode.js to be loaded first.
 */
(function () {
  'use strict';

  if (window.__xrLandingInstalled) { return; }
  window.__xrLandingInstalled = true;

  // Exposed for the vendored xrextras.js, whose "almost there" screen used to
  // pull its QR image from https://8th.io/qr. Returns an inline SVG string.
  window.__xrQrSvg = function (url, px) {
    px = px || 250;
    try {
      var q = window.qrcode(0, 'M');
      q.addData(String(url));
      q.make();
      return '<div style="width:' + px + 'px;height:' + px + 'px;background:#fff;' +
             'padding:8px;box-sizing:border-box">' +
             q.createSvgTag({cellSize: 4, margin: 0, scalable: true}) + '</div>';
    } catch (e) {
      return '';
    }
  };

  function isMobile() {
    var ua = navigator.userAgent || '';
    if (/Android|iPhone|iPod|IEMobile|Opera Mini/i.test(ua)) { return true; }
    // iPadOS 13+ reports as Macintosh but is multi-touch.
    if (/iPad/i.test(ua)) { return true; }
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) { return true; }
    return false;
  }

  function install() {
    if (isMobile()) { return; }

    var style = document.createElement('style');
    style.textContent = [
      '#xr-landing{position:fixed;inset:0;z-index:9990;display:flex;',
      'align-items:center;justify-content:center;flex-direction:column;',
      'gap:18px;background:#101118;color:#fff;',
      'font:14px/1.4 system-ui,sans-serif;}',
      '#xr-landing-qr{background:#fff;padding:14px;border-radius:10px;',
      'line-height:0;}',
      '#xr-landing-qr svg{display:block;width:220px;height:220px;}',
      '#xr-landing-glyph{font-size:34px;letter-spacing:10px;}',
      '#xr-landing-close{position:absolute;top:12px;right:12px;width:32px;',
      'height:32px;border-radius:50%;background:rgba(255,255,255,.12);',
      'color:#fff;border:0;font:18px/1 sans-serif;cursor:pointer;padding:0;',
      'display:flex;align-items:center;justify-content:center;}'
    ].join('');
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'xr-landing';

    var glyph = document.createElement('div');
    glyph.id = 'xr-landing-glyph';
    glyph.textContent = '📱 ←';
    // aria-label carries no prose; the QR itself is the instruction.
    glyph.setAttribute('aria-hidden', 'true');

    var qrBox = document.createElement('div');
    qrBox.id = 'xr-landing-qr';
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(location.href);
      qr.make();
      qrBox.innerHTML = qr.createSvgTag({cellSize: 6, margin: 0, scalable: true});
    } catch (e) {
      // If the QR library is missing, show nothing rather than a broken box.
      return;
    }

    var close = document.createElement('button');
    close.id = 'xr-landing-close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', function (e) {
      e.stopPropagation();
      wrap.parentNode && wrap.parentNode.removeChild(wrap);
    });

    wrap.appendChild(qrBox);
    wrap.appendChild(glyph);
    wrap.appendChild(close);
    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
