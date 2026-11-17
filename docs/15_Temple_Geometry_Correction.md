# Temple geometry correction — 2026-11-17

This targeted correction supersedes the fit description in document 14. Front-frame tracking, assets, calibration, camera, UI and business behavior remain unchanged. No dependency or 3D engine added.

## Root cause

The previous renderer compressed the entire curved earpiece into a short projected span. Texture height was scaled separately in pupil-distance units, so the compressed hook looked thick and steep. Side-face landmarks were treated too directly as endpoints even though MediaPipe supplies no measured ear position. Visibility thresholds could pop. Hinge math and camera mirroring were already broadly consistent; this change makes the exact final front transform an explicit, independently tested contract rather than changing the working front fit.

## Correction

- Both hinges derive from per-product front-image UV anchors through the exact final front affine transform, including frame-specific eye separation, asset aspect, roll, manual scale and vertical calibration. The same parent camera mirror applies to fronts and arms once.
- Length, thickness and hidden hinge overlap use rendered-frame-width fractions. Atlas/Noir retain thicker acetate bars; Muse/Forma retain slimmer bars. Only the straight proximal portion of each existing material texture is rendered; the unknown distal ear hook fades out instead of being squashed.
- Existing signed head turn drives bounded sine foreshortening. Front-facing arms are almost concealed, the near side appears progressively, and the far side fades. Side-face landmarks bound safe reach rather than pretending to locate the ear. Length never exceeds 18% of frame width; shallow slope and yaw/pitch reliability limits prevent stretching or steep bars.
- Manual calibration is applied consistently when converting face bounds to final front-relative coordinates. Hinges follow the current front immediately; only face bounds and arm length/slope/opacity are smoothed (65/75ms), preventing attachment lag. Unsafe geometry is hidden immediately.
- Arms remain behind fronts. The existing landmark mask protects inner face/eyes/cheeks; sampled path checks and boundary fading conservatively hide uncertain arms. The endpoint uses a soft fade. No hair/depth segmentation is claimed.

## Actual validation

- `node checks/temples.mjs`: 648 exact-front affine cases across four models, distance, roll, scale, full manual vertical range and mirroring; normalized drawn hinge agreement, bounded perspective, smoothing/reset and immutable scope assertions passed.
- `checks/temple-before-after.cjs`: 52 matched synthetic-pose comparisons against commit `017cc52` using actual MediaPipe inference and identical before/after front poses. All four models cover frontal, slight and moderate turns in both directions, roll, distance, manual scale, vertical adjustments and recalibrated input. Zero sampled protected-face pixels. 28 paired PNGs saved as `evidence/arm-fix-{model}-{case}.png`; numeric report `temple-before-after-results.json`.
- Synthetic portraits are AI-generated test fixtures. Opposite turns use mirrored input. Requested portrait angles are not measured head angles; numeric yaw is the existing tracker estimate. The moderate-turn fixture is test-only, excluded from publication.
- Existing temple browser render checks, VTO photo/file/privacy/denial/Cart checks at 360/390/768/1024/1440px, synthetic captureStream camera movement/loss/reacquisition/recalibration/switching/cleanup checks passed. These use genuine MediaPipe inference, not physical webcam hardware.
- Existing UI suite: 45 layout checks and pricing, consultation/unavailable blocking, cart, checkout simulation, navigation, sorting, product images and offline POS passed. Existing camera lifecycle, front geometry, shared demo engine and storefront payment checks passed. Operational browser suite result is recorded in the accompanying validation report.
- Staged `/optiman/` package: 45 allowlisted files, source-identical, with README/docs/evidence/repository files excluded. Existing package tooling/workflow unchanged.

## Limitations and manual gate

No physical webcam is available in this environment. Actual live head-motion appearance remains **unverified**; this is not claimed client-ready. Synthetic matched screenshots were visually inspected: the prior thick/downward hook is replaced by a subtle shallow bar; uncertain stronger-turn arms disappear. Conservative hiding can leave no visible side arm, especially with hair, large scale/vertical adjustments or ambiguous contours. Ear anatomy and hair occlusion remain approximations from frontal 2D assets; do not weaken front fit or mask to force visibility.

Before visual acceptance, check Atlas, Noir, Muse and Forma on a real webcam: straight, slight/moderate left/right turn, roll, nearer/farther, recalibrate and manual fit adjustments. Confirm connected hinges, no crossing eye/cheek and no flicker. Rollback: revert this isolated correction commit; no migration or persisted data change. Feature branch only, no merge.
