# Front-only Virtual Try-On — 2026-11-17

Owner approves the existing front overlays and removes the temple feature. This supersedes documents 14/15; their screenshots and reports remain historical evidence only.

## Scope and behavior

Removed `temples.mjs`, its state/asset loading/update/draw/reset hooks, four temple textures, obsolete temple-only tests and public package entries. No arm controls existed. Atlas, Noir, Muse and Forma now draw only their original front overlays at every pose; no optional arm path remains. Original front assets, `frames.mjs`, `geometry.mjs`, `tracker.mjs` and `camera.mjs` are byte-identical to `c6edefc`. VTO markup/controls and shopping callbacks are unchanged. No dependencies or new tracking logic.

Mobile portrait live mode alone adds a `3/4` viewport class. Existing photo styles remain intact; the class is removed when switching to photo/off mode. Canvas continues using `object-fit: contain`, not cover: the entire incoming sensor image is displayed, with letterboxing if the sensor ratio differs from the viewport. Source video and overlay remain in the same intrinsic canvas coordinate system, with the existing shared mirror. The existing intrinsic-size downsampling and runtime video aspect-change handling are unchanged. CSS scales the composite canvas uniformly, so no separate landmark correction is needed. No camera zoom, crop, sensor constraints or front calibration changed.

Showing the full sensor image avoids display-induced face cropping; it cannot reveal forehead/chin/sides that are already outside the physical camera field of view. The person still needs to sit within the captured view. A landscape sensor may produce larger letterbox areas in a portrait viewport rather than stretching/cropping.

## Validation and evidence

`checks/vto-front-only.cjs` checks immutable front/tracking/camera assets, unchanged VTO markup and existing photo styles, removal of arm code/assets and absence of arm network requests. At 360px and 390px it exercises synthetic 640×480, 480×640 and 1280×720 captureStream feeds with genuine MediaPipe inference. It checks portrait viewport, contain fitting, full-source draw rectangle, aspect ratio preservation, high-resolution canvas downsampling, shared mirroring, four-model switching without camera restart, recalibration and track cleanup/photo-mode reset. Evidence: `front-only-mobile-results.json` and `front-only-live-{width}-{resolution}.png`.

Existing VTO photo/privacy/local-file/denial/switching/Cart suite runs at 360/390/768/1024/1440px. Existing synthetic-camera movement/roll/scale/loss/reacquisition/recalibration/cleanup, front geometry, camera lifecycle, storefront payment preservation and 45-layout UI tests are run. Results are preserved under `front-only-*` evidence names; earlier snapshots remain historical.

Public staging remains `/optiman/` compatible, with only 40 allowlisted frontend files. Temple resources, documentation, README, test evidence and repository files are excluded.

## Hardware limitation and manual review

No physical webcam or mobile camera was available. Headless Chromium synthetic streams verify browser rendering and genuine inference, not actual mobile camera sensor behavior, live fit quality or device performance. Manually check 360/390 portrait phones: keep forehead, chin and both sides within the sensor view; move/roll/recalibrate, switch all four frames, use photo preview and Add to Cart. Confirm no side arms and no display cropping. No client-ready live-hardware claim is made.

Rollback by reverting this isolated change; no migration or data reset. Feature branch only, no main merge.
