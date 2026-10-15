#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/sampling.py

粒子の点群づくりで共通に使う部品。showcase/print/gen_front.py（名刺）と
tools/make-sample.py（任意の画像から作るサンプル）の両方が import する。

  poisson_disk   可変半径のポアソンディスク（Bridson）
  sample_mask    bool マスクの内側にちょうど count 点
  greedy_assign  粒子 index -> 目標形状の点（貪欲な最近傍割当）

依存: numpy
"""

import math

import numpy as np

# --------------------------------------------------------------------------
# ポアソンディスクサンプリング（可変半径 / Bridson）
# --------------------------------------------------------------------------

def poisson_disk(width, height, radius_fn, r_min, r_max, rng, k=14, accept_fn=None,
                 x0=0.0, y0=0.0):
    """[x0, x0+width) x [y0, y0+height) 上の可変半径ポアソンディスク（Bridson）。

    radius_fn(xs, ys) -> 各点の最小間隔 (numpy, ベクトル化されている前提)
    accept_fn(x, y)   -> False なら候補を捨てる（マスク内サンプリング用）
    戻り値: (N, 2) の float 配列
    """
    cell = r_min / math.sqrt(2.0)
    gw = int(math.ceil(width / cell))
    gh = int(math.ceil(height / cell))
    grid = np.full(gw * gh, -1, dtype=np.int32)

    reach = int(math.ceil(r_max / cell)) + 1
    offs = np.array([(dx, dy)
                     for dy in range(-reach, reach + 1)
                     for dx in range(-reach, reach + 1)], dtype=np.int32)

    active = []

    def try_insert(x, y):
        gx = int((x - x0) / cell)
        gy = int((y - y0) / cell)
        nx = gx + offs[:, 0]
        ny = gy + offs[:, 1]
        ok = (nx >= 0) & (nx < gw) & (ny >= 0) & (ny < gh)
        idx = grid[ny[ok] * gw + nx[ok]]
        idx = idx[idx >= 0]
        r_here = float(radius_fn(np.array([x]), np.array([y]))[0])
        if idx.size:
            dx = px[idx] - x
            dy = py[idx] - y
            d2 = dx * dx + dy * dy
            need = np.maximum(pr[idx], r_here)
            if np.any(d2 < need * need):
                return None
        return gx, gy, r_here

    # 成長する python list と numpy view を同期させるための小さなバッファ管理
    cap = 4096
    px = np.zeros(cap)
    py = np.zeros(cap)
    pr = np.zeros(cap)
    n = 0

    def push(x, y, r, gx, gy):
        nonlocal n, px, py, pr, cap
        if n == cap:
            cap *= 2
            px = np.resize(px, cap)
            py = np.resize(py, cap)
            pr = np.resize(pr, cap)
        px[n] = x
        py[n] = y
        pr[n] = r
        grid[gy * gw + gx] = n
        active.append(n)
        n += 1

    def reseed(attempts=3000):
        """新しい種を蒔く。

        Bridson は種のある連結成分しか埋められない。ロゴタイプのように
        字が 8 個に分かれたマスクだと、1 個目の字しかサンプルされない。
        active が枯れたら別の場所に種を蒔き直して全成分を埋める。
        """
        for _ in range(attempts):
            sx = x0 + rng.uniform(0, width)
            sy = y0 + rng.uniform(0, height)
            if accept_fn is not None and not accept_fn(sx, sy):
                continue
            ins = try_insert(sx, sy)
            if ins is not None:
                push(sx, sy, ins[2], ins[0], ins[1])
                return True
        return False

    while True:
        while active:
            # active からは「末尾と入れ替えて pop」で消す。list.remove は O(len) で、
            # 点数が万単位になると全体が O(N^2) に落ちる。
            ii = int(rng.integers(0, len(active)))
            ai = active[ii]
            ax, ay, ar = px[ai], py[ai], pr[ai]
            placed = False
            for _ in range(k):
                ang = rng.uniform(0, 2 * math.pi)
                rad = ar * (1.0 + rng.random())
                x = ax + math.cos(ang) * rad
                y = ay + math.sin(ang) * rad
                if not (x0 <= x < x0 + width and y0 <= y < y0 + height):
                    continue
                if accept_fn is not None and not accept_fn(x, y):
                    continue
                ins = try_insert(x, y)
                if ins is None:
                    continue
                push(x, y, ins[2], ins[0], ins[1])
                placed = True
                break
            if not placed:
                active[ii] = active[-1]
                active.pop()
        if not reseed():
            break

    if n == 0:
        return np.zeros((0, 2))
    return np.stack([px[:n].copy(), py[:n].copy()], axis=1)


def sample_mask(mask, width_mm, height_mm, count, rng):
    """bool マスクの内側にポアソンディスクで丁度 count 点を取る。"""
    h, w = mask.shape
    ys_i, xs_i = np.nonzero(mask)
    if xs_i.size == 0:
        raise RuntimeError('空のマスク')
    area = float(xs_i.size) / (w * h) * width_mm * height_mm
    r = math.sqrt(0.70 * area / max(count, 1))

    # マスクの bbox だけを走査範囲にする
    bx0 = xs_i.min() / w * width_mm
    bx1 = (xs_i.max() + 1) / w * width_mm
    by0 = ys_i.min() / h * height_mm
    by1 = (ys_i.max() + 1) / h * height_mm

    sx = w / width_mm
    sy = h / height_mm

    def accept(x, y):
        ix = int(x * sx)
        iy = int(y * sy)
        if ix < 0 or ix >= w or iy < 0 or iy >= h:
            return False
        return bool(mask[iy, ix])

    def radius_fn(xs, ys):
        return np.full(xs.shape, r)

    pts = np.zeros((0, 2))
    for _ in range(24):
        pts = poisson_disk(bx1 - bx0, by1 - by0, radius_fn, r, r, rng, k=12,
                           accept_fn=accept, x0=bx0, y0=by0)
        if len(pts) >= count:
            break
        r *= 0.90

        def radius_fn(xs, ys, _r=r):  # noqa: F811
            return np.full(xs.shape, _r)
    if len(pts) < count:
        raise RuntimeError(f'マスク内に {count} 点を取れなかった ({len(pts)})')
    sel = rng.permutation(len(pts))[:count]
    return pts[sel]


# --------------------------------------------------------------------------
# 貪欲最近傍割当（粒子 index -> 形状の点）
# --------------------------------------------------------------------------

def greedy_assign(src, dst, width_mm, height_mm, cell_mm=1.5):
    """src[i] に最も近い未使用の dst 点を貪欲に割り当てる。out[i] = dst の index。

    hungarian は使わない（N が万単位）。近傍グリッドのリングを外へ広げながら
    未使用の最近傍を取り、余った src には残りの dst をそのまま配る。
    取られた点はバケットから遅延削除するので、後半ほどバケットは軽くなる。
    """
    n = len(src)
    assert len(dst) == n
    gw = max(1, int(math.ceil(width_mm / cell_mm)))
    gh = max(1, int(math.ceil(height_mm / cell_mm)))
    max_ring = gw + gh

    dx_all = dst[:, 0]
    dy_all = dst[:, 1]

    buckets = [[] for _ in range(gw * gh)]
    for j in range(n):
        gx = min(gw - 1, max(0, int(dx_all[j] / cell_mm)))
        gy = min(gh - 1, max(0, int(dy_all[j] / cell_mm)))
        buckets[gy * gw + gx].append(j)

    taken = bytearray(n)
    out = np.full(n, -1, dtype=np.int64)
    leftovers = []

    order = np.arange(n)
    np.random.default_rng(0).shuffle(order)

    for i in order:
        x = src[i, 0]
        y = src[i, 1]
        gx = min(gw - 1, max(0, int(x / cell_mm)))
        gy = min(gh - 1, max(0, int(y / cell_mm)))
        best = -1
        best_d = 1e18
        ring = 0
        while True:
            for dy in range(-ring, ring + 1):
                yy = gy + dy
                if yy < 0 or yy >= gh:
                    continue
                if abs(dy) == ring:
                    xr = range(gx - ring, gx + ring + 1)
                else:
                    xr = (gx - ring, gx + ring)
                row = yy * gw
                for xx in xr:
                    if xx < 0 or xx >= gw:
                        continue
                    b = buckets[row + xx]
                    if not b:
                        continue
                    alive = [j for j in b if not taken[j]]
                    if len(alive) != len(b):
                        buckets[row + xx] = alive
                    for j in alive:
                        ddx = dx_all[j] - x
                        ddy = dy_all[j] - y
                        d = ddx * ddx + ddy * ddy
                        if d < best_d:
                            best_d = d
                            best = j
            # ring まで見終えた時点で、未走査の点は必ず ring*cell 以上先にある
            if best >= 0 and (ring * cell_mm) ** 2 >= best_d:
                break
            ring += 1
            if ring > max_ring:
                break
        if best < 0:
            leftovers.append(i)
        else:
            taken[best] = 1
            out[i] = best

    if leftovers:
        rest = [j for j in range(n) if not taken[j]]
        for i, j in zip(leftovers, rest):
            out[i] = j
    return out
