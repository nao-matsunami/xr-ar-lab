# MIT-licensed 8th Wall engine (self-built)

Built from source, **not** the distributed engine binary.

| | |
|---|---|
| Source | https://github.com/8thwall/8thwall |
| Commit | `519b988136d2d22a40405f2ab7f3b04823003c45` (`519b988`) |
| Built | 2026-09-07 |
| Bazel | 7.2.1 (via bazelisk, pinned by `.bazelversion`) |
| Command | `bazel build --config=wasmreleasesimd //reality/app/xr/js:bundle` |
| Build time | 2442 s / 4273 actions |
| License | MIT — see `LICENSE` (copied from the source repo; the minified artifacts carry no header of their own) |

## What this does and does not contain

Included: Image Target tracking, Face tracking, Sky segmentation, the camera pipeline.
**Not** included: SLAM, VPS, Hand Tracking — those remain proprietary to Niantic Spatial
and only exist in the distributed binary (`lib/xr-slam.js`).

## Chunk naming

`data-preload-chunks="slam"` is **still required** for image targets. In this build the
chunk name `slam` resolves to **`xr-tracking.js`** (see `reality/app/xr/js/src/chunk-loader.ts`),
which is what defines `XR8.XrController`. There is no `xr-slam.js` here.
Dropping the attribute leaves `XR8.XrController` undefined and initialization hangs.

## Size comparison against the binary in `lib/`

| File | MIT (this dir) | Binary (`lib/`) |
|---|---|---|
| `xr.js` | 1,014,055 | 1,036,552 |
| `xr-tracking.js` / `xr-slam.js` | 3,885,945 | 5,537,864 |
| `xr-face.js` | 7,660,469 | 7,676,409 |

`resources/` is the same file set as `lib/resources/`.
