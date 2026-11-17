# Virtual Try-On implementation and acceptance

## Stage A — approach and constraints
Owner authorizes optional frontend Virtual Try-On, superseding the disabled placeholder. Preserve approved storefront and all shopping/operations. Prefer calibrated, face-tracked 2D over unconvincing 3D. No production backend or main merge.

Four source product photos were visually inspected. Atlas/Muse/Forma are angled single views; Noir is frontal. No CAD or side views exist. Procedural 3D would require guessed rim depth, bridge, temples and occlusion; it cannot be declared more accurate from these references. The chosen path is four unique high-resolution AI-assisted frontal alpha assets with recognizable materials/shapes, MediaPipe Face Landmarker and Canvas2D. Optical lens interiors are transparent, sunglasses have translucent tint. Assets are approximate synthetic front elevations, not physical fit measurements. Do not imply exact product geometry. A rendered 3D quality comparison is not yet available; do not claim one was performed.

A–G commit plan: A technical/quality plan; B lazy local MediaPipe/camera lifecycle; C geometry/smoothing/calibration; D distinct assets; E integrated UI/switching/shopping; F photo fallback; G regressions/evidence and acceptance checklist. Revert these commits to roll back; no state migration or stock changes.

All camera/photo pixels and ephemeral landmarks stay in this browser. No microphone, persistence, upload, recording or analytics. HTTPS or localhost required for camera. Close, navigation, page hiding and failures must stop tracks. Photo input is optional and consent-based; synthetic sample is explicitly labeled. Camera mode and Photo Preview must never be confused.

No `/dev/video*` camera hardware is exposed in this environment. Synthetic photo inference and virtual-camera fixtures can verify detection, transform math and lifecycle, but cannot establish physical-camera visual acceptance, hardware FPS or mobile Safari/Android compatibility. Final result must remain awaiting live-device verification.

## Implementation and rendering decision

| Gate | Tracked 2D | 3D feasibility |
| --- | --- | --- |
| Shape/material appearance | Four separately generated 1774×887 alpha fronts, inspected against supplied photographs | No verified CAD, thickness, back/side views or temple measurements; an accurate reconstruction cannot be demonstrated |
| Placement | Real MediaPipe iris/eye and bridge coordinates; no fixed screen placement | Would additionally require validated projection, depth and face occlusion |
| Motion | Dynamic translation, eye-distance scale, roll, 65ms exponential smoothing, conservative orientation fade | A 3D model could support larger turns if geometry/occlusion were validated; currently unverified |
| Mobile/download cost | Canvas2D plus lazy local MediaPipe; no Three.js download | Adds renderer/model work without established appearance benefit |

Decision: deliver 2D per owner's rendering priority. This is a feasibility/quality-risk comparison, not a rendered 3D-versus-2D benchmark. No 3D engine or pretend occlusion was implemented. Larger yaw/pitch fades the front asset; very large roll/lost face hides it. Engineering thresholds are roughly 18–28° yaw/pitch fade and 37° roll ceiling, not clinical limits. Moderate roll/scale/translation follow landmarks. Frontal-only assets cannot depict hidden temples, true side views, refraction, nose contact, real-world dimensions or physical fit.

The four base-color frame assets remain approximate AI front elevations. Muse/Forma clear openings show real source pixels, Atlas/Noir use translucent dark lens pixels. No global rectangular cutout or mannequin texture. The original storefront product photos and IDs/SKUs/prices are unchanged. A synthetic sample portrait is included solely for Photo Preview; it does not represent a real customer or live camera.

## Modules and resource boundaries

- `vto/camera.mjs`: opt-in getUserMedia, video only, late-permission cancellation and stop ownership.
- `vto/tracker.mjs`: lazy local Face Landmarker, GPU with CPU fallback; software-WebGL renderers prefer CPU. SIMD/non-SIMD files are both packaged for compatibility; only the supported variant loads.
- `vto/geometry.mjs`: face-relative placement, smoothing, calibration and orientation limits.
- `vto/frames.mjs`: four assets/anchors and proportional alpha rendering.
- `vto/controller.mjs` + `vto.css`: isolated native dialog, mirrored live canvas, camera/photo states, four-frame selection, tuning/reset, shopping handoff and cleanup.

Try-On is available only on Atlas/Noir/Muse/Forma product pages, outside POS configuration. Starting camera or Photo Preview loads the local model; ordinary storefront browsing never loads the tracking runtime. Camera switching does not restart the stream or clear calibration. Resizing preserves full-source aspect ratio with containment; stream dimension changes recalibrate. Closing, Escape, navigation, page hiding, track ending and errors stop/release camera tracks and clear preview pixels/pose. Camera permission may resolve after Close; the late stream is stopped rather than attached.

Local photos require explicit consent, JPG/PNG/WebP ≤8 MiB and ≤16 megapixels. Blob URLs are revoked after decoding. Pixels and temporary landmark/pose objects exist only in memory while previewing; nothing is persisted, uploaded, recorded or placed in WhatsApp. No third-party analytics. The sample is clearly labeled AI-generated. Tracking failure displays a helpful message and no floating overlay.

Add to Cart calls the existing `configuredAdd()` path. Same-model configuration stays intact; changing models opens the existing product route and starts its normal Frame Only default. Configure lenses returns to the product. No duplicate cart, stock, prescription or payment logic. Unsupported/ineligible selections still use existing validation.

## Dependency provenance and package

Runtime is pinned `@mediapipe/tasks-vision@0.10.22-rc.20250304`, served locally. No npm install was required. Google model download returned HTTP 403. A compatible Face Landmarker task was obtained from the Apache-2.0 npm distribution `@nuralogix.ai/tf-face-tracker-worker-ts@1.0.2`; no wrapper/analytics code from that package is included. See `preview/vto/vendor/PROVENANCE.md` and `sources.json` for source, archive member and SHA256. Model archive structure and actual MediaPipe photo/video inference were verified. Byte-equivalence to Google's currently hosted file remains unverified and provenance should be rechecked before production.

Pages packages an explicit allowlist: 40 public files, including 18 VTO runtime/asset/license files. README, source docs, provenance JSON/Markdown, repository files and test evidence are excluded. The existing static `/optiman/` structure is retained. No main merge, production domain deployment, backend or database.

## Manual client acceptance checklist — required before client-ready claim

1. On a physical desktop Chrome/Edge camera, open Atlas → Virtual Try-On → Start Camera. Verify consent, no microphone request, mirrored selfie, loading/status, guide and automatic stable fit.
2. Check the bridge/eye/rim fit visually for all four frames on several faces in good and ordinary light. Tune scale/height, reset and verify recognizable colors/shape, transparent optical lenses and natural sunglass tint. These assets are not exact product CAD.
3. Move left/right and closer/farther, roll moderately, turn/pitch moderately and then beyond the frontal limit. Check stable tracking, smoothness, no floating/unnatural warp, sensible fade, loss and reacquisition. Real yaw/pitch quality is not established by simulated portrait movement.
4. Switch all four frames repeatedly without camera restart. Check calibration retention, controls/touch sizes and safe areas at 360/390/768/1024/1440px, browser resize and physical device orientation changes.
5. Test Android Chrome and iPhone Safari on actual devices. Record startup, steady processed/render FPS, heat/lag and model download time; no guaranteed FPS is claimed. First-load tracking assets are roughly 14 MiB (model + supported WASM/runtime + frames), not a tiny download.
6. Deny/busy/unplug camera, lose face and switch tabs. Close/reopen, Escape/navigate, and confirm the camera indicator/stream stops. Late permission resolution must not leave a camera active.
7. Photo Preview: consent, synthetic sample, local photo replacement, no-face/large/bad file handling, clear Photo/Live distinction. Local pixels must not be uploaded or stored. Delete/close the preview to release the image.
8. Add to Cart for the current configured model and a newly chosen model; continue lens selection and normal checkout. Verify quantities, consultation blocks, stock, fees/advance and existing POS/receiving/transfers/analytics remain correct.

## Automated evidence boundaries

`checks/vto-geometry.mjs` checks face-relative transforms, scaling/roll, smoothing, calibration/loss and conservative yaw/pitch matrix branches. Browser tests run actual vendored MediaPipe inference on the synthetic portrait and a canvas-captureStream fixture with translation, roll, scale, blank/loss and reacquisition. Camera tests verify rendered transform changes, no microphone, switching without restart, close/reopen/navigation track cleanup. These are **simulated camera inputs, not physical camera tests**. Screenshots explicitly label synthetic-camera evidence. Photo evidence is labeled Photo Preview / AI-generated sample.

Performance JSON reports observed headless Chromium/SwiftShader or CPU inference only. CPU/GPU delegate comparison is an inference benchmark on the synthetic photo, not a 3D-rendering comparison or hardware camera benchmark. Physical visual quality, true face yaw/pitch, Safari/Android performance and 24–30 FPS target remain unverified. Do not call this client-ready until the checklist is visually accepted on real camera devices.

## Actual verification results
Five Node suites and ten browser suites passed, including existing storefront/checkout, all prescription types, POS, receiving, barcode, inventory, transfers and analytics. VTO photo tests ran genuine MediaPipe inference at 360/390/768/1024/1440px, switched all four frames, tested local-file consent, fine adjustments/reset, denial messaging, no non-GET/external requests or storage changes, and existing Add to Cart handoff. Synthetic-camera video tests checked actual rendered position/roll/width changes, loss/reacquisition, switching without restart and track cleanup. Final `/optiman/` artifact has 40 source-identical allowlisted files; README/docs/repository/provenance files returned 404. Syntax/whitespace passed.

Observed headless software-renderer photo benchmark: CPU mean 56.3 ms versus GPU/SwiftShader 183.7 ms across eight warm detections each; initialization is recorded separately. Final synthetic-camera CPU run: 191 processed frames, 48.2 ms average inference, approximately 19.2 processed FPS. Earlier software-WebGL run was approximately 4.5 FPS under concurrent test load. These are not comparable hardware/device benchmarks and the 24–30 FPS target is not established. No physical camera exists here. No claim of client readiness, real mobile/Safari testing or physical head-turn visual validation. GitHub API returns proxy HTTP 403, so live Pages status is unverified.

Evidence: `vto-photo-{atlas,noir,muse,forma}-{390,1440}.png`, explicitly labeled `vto-simulated-camera-{centered,movement}.png`, `vto-browser-results.json`, `vto-camera-results.json`, `vto-delegate-benchmark.json`, and `pages-validation.json`. The baseline UI regression now waits for the asynchronous checkout modal before checking its text; no checkout assertion or business logic was removed.

## Targeted temple-arm addition
The subsequent optional rear 2D arm layer is documented in [14_Temple_Arms.md](14_Temple_Arms.md). It preserves this implementation's original front assets/transform, calibration, camera/tracker and UI. The Pages allowlist now contains 45 public files. The original performance figures above describe the earlier front-only run; new arm-specific evidence uses `temple-*` files. Physical-camera arm occlusion still requires manual visual review.
