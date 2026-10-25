#!/usr/bin/env python3
"""
Render the can-demo label wrapped around a virtual 350ml can into PNG frames,
for feeding Chrome's fake camera (desktop pre-check of the CYLINDER target).

  python3 tools/render-can-fake-camera.py templates/print-shop/can-demo/assets/can-label.png /tmp/frames
  ffmpeg -framerate 30 -i /tmp/frames/f%03d.png -pix_fmt yuv420p /tmp/can.y4m
  python3 -m http.server 8811 --bind 127.0.0.1 &
  CHROME_EXTRA_ARGS="--use-file-for-fake-video-capture=/tmp/can.y4m" \
    node tools/headless-check.mjs http://127.0.0.1:8811/templates/print-shop/can-demo/ --wait 25000 \
    --eval "document.querySelector('xrextras-named-image-target').object3D.visible"

Needs numpy (run without python -I if numpy is in user site-packages).
640x480, 120 frames: the can spins +-25 deg while the camera dollies and pitches.
"""
import math
import sys

import numpy as np
from PIL import Image, ImageFilter
label_path, out_dir = sys.argv[1], sys.argv[2]
W, H = 640, 480
f = (H / 2) / math.tan(math.radians(25))
R = 208 / (2 * math.pi); LH = 105; CANH = 122
lab = Image.open(label_path).convert('RGB').resize((1040, 525), Image.LANCZOS)
L = np.asarray(lab).astype(np.float32)
rng = np.random.default_rng(1)
bg = Image.fromarray((rng.random((H // 4, W // 4)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(3))
BG = np.repeat(np.asarray(bg)[..., None], 3, 2).astype(np.float32) * 0.6 + 60
ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
N = 120
for i in range(N):
    s = math.sin(2 * math.pi * i / N)
    theta = math.radians(25) * s          # can spin
    D = 210 + 25 * math.cos(2 * math.pi * i / N)
    tilt = math.radians(8) * s            # camera pitch
    ox = 12 * s
    dx = (xs - W / 2) / f; dy = -(ys - H / 2) / f; dz = -np.ones_like(dx)
    # pitch camera around x
    c, si = math.cos(tilt), math.sin(tilt)
    dy, dz = dy * c - dz * si, dy * si + dz * c
    Ox, Oy, Oz = ox, 0.0, D
    a = dx * dx + dz * dz; b = 2 * (Ox * dx + Oz * dz); cc = Ox * Ox + Oz * Oz - R * R
    disc = b * b - 4 * a * cc
    hit = disc > 0
    t = np.where(hit, (-b - np.sqrt(np.maximum(disc, 0))) / (2 * a), 0)
    px, py, pz = Ox + t * dx, Oy + t * dy, Oz + t * dz
    phi = np.arctan2(px, pz) - theta
    u = (0.5 + phi / (2 * math.pi)) % 1.0
    v = 0.5 - py / LH
    img = BG.copy()
    shade = np.clip((px * 0.6 + pz) / R, 0.25, 1.0)[..., None]  # light from front-right
    body = hit & (np.abs(py) <= CANH / 2)
    img[body] = (np.array([175, 178, 185], np.float32) * shade)[body]
    onlab = hit & (np.abs(py) <= LH / 2)
    ui = np.clip((u * L.shape[1]).astype(int), 0, L.shape[1] - 1)
    vi = np.clip((v * L.shape[0]).astype(int), 0, L.shape[0] - 1)
    img[onlab] = (L[vi, ui] * (0.35 + 0.65 * shade))[onlab]
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(f'{out_dir}/f{i:03d}.png')
