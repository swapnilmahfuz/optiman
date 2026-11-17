# Targeted 2D temple-arm layer

Scope: add matching side arms to Atlas, Noir, Muse and Forma only. No replacement/rebuild of Virtual Try-On, no 3D engine, new tracking model, UI change or shopping/operations change.

## Assets and rendering

Four distinct 2172×724 transparent side-profile WebP textures were generated using each existing front as a material reference. Atlas has thick brown tortoiseshell acetate, Noir glossy black, Muse slim translucent amber with inner core, Forma slim warm brown. Each texture is drawn separately for both sides, with mirrored orientation for the left earpiece. Original front assets remain byte-for-byte unchanged. Four textures total approximately 244 KiB; no dependencies added.

`preview/vto/temples.mjs` owns rear-layer asset loading, hinge metadata, arm-only smoothing and conservative occlusion. `controller.mjs` consumes the already-returned landmarks/pose after existing calibration, paints arms before the unchanged front renderer, and clears temporary arm state on stop/loss. Camera initialization, tracker, confidence settings, facePose/calibration, frameSpecs/drawFrame, UI markup/CSS and product/Cart/checkout logic are unchanged. App/index and test import query updates are cache-version changes only.

Hinge coordinates are per-asset pixel anchors inside the existing front tabs (sample alpha 252–253/255 on both hinges). They use the exact existing front scale, aspect ratio, position, roll and fine-adjustment offset, with a small concealed overlap below the original front. Left/right apparent direction and length follow upper-temple contour landmarks 162/127 and 389/356; signed temple depth and the existing yaw select the near side. The far side fades and is hidden beyond approximately 7° yaw. Larger yaw/pitch, implausible length/slope, protected-face intersection or uncertain geometry hides arms. Front visibility/calibration thresholds are unchanged.

A separate 65ms smoother filters normalized temple/contour geometry. The attachment itself always uses the current existing front pose, preventing independent hinge drift. Arm state is ephemeral, with no new persistence, uploads or camera frames stored. Asset failure falls back to the existing fronts.

## Occlusion and visual limitations

This is conservative 2D occlusion, not a depth mesh or hair segmentation. A landmark-derived mask protects the inner face, eyes and cheeks, with a narrow upper-temple corridor where the hinge/arm physically sits in front of the temple. Lower earpiece portions are clipped behind the protected contour. Boundary fade reduces popping; paths that would emerge as detached fragments are hidden.

MediaPipe Face Landmarker does not locate ears. Ear direction and depth are approximations from upper side-face contours, not measured ear anatomy. Hair, hats and ears cannot have perfect occlusion with these inputs. Side textures and hinge anchors are approximate synthetic product geometry. Extreme turns, unusual proportions, large manual scale offsets or ambiguous contours may show only fronts or a short arm rather than an implausible bar. Physical-camera left/right turns, tilt and distance must still be visually reviewed; no physical camera is available here.

## Actual checks and review

- `checks/temples.mjs`: per-model hinge binding, signed near/far visibility, conservative hiding, smoothing/loss reset, and byte-identical fronts/frames/calibration/camera/tracker/UI CSS/prescription/engine/staff. The complete existing VTO HTML template is also compared with the approved baseline.
- `checks/temples-browser.cjs`: actual MediaPipe inference on the existing synthetic frontal portrait and an AI slight-turn portrait; mirroring the latter exercises the opposite turn. All four frames render two arms frontally and only the near arm in the two turned views. Arm-only pixel tests detect zero overlay in sampled protected inner-face/eye/cheek pixels. These are synthetic-photo tests, not physical head-turn validation.
- Existing VTO five-width photo/local-file/denial/Cart suite and synthetic-camera translation/roll/distance/loss/recalibration/switching/cleanup passed. Camera movement remains a synthetic captureStream fixture, not physical hardware evidence.
- Existing UI (45 layouts), five-width POS/receiving/barcode/inventory/transfers/analytics operational suite, shared-engine, payment-preservation, original geometry and camera-lifecycle tests passed. Syntax/whitespace passed.
- Staged `/optiman/` package contains 45 allowlisted public files, including the one arm module and four textures. Test portraits, docs, README and repository files are excluded.

Evidence: `evidence/temple-{atlas,noir,muse,forma}-{frontal,turn,mirrored-turn}.png`, `temple-render-results.json` and `temple-fixtures/slight-turn.webp`. Portraits are fictional AI test inputs. The two turn directions use one portrait and its browser-rendered mirror; do not describe them as independent real camera recordings.

Manual review: keep each of the four frames selected, look straight ahead, turn slightly both ways, roll and move nearer/farther. Inspect hinge connection and temple/ear position; check near visibility/far hiding and no cheek/eye crossing. Try existing fine adjustments/recalibration and verify front alignment is unchanged. If a particular angle is not convincing, retain conservative hiding; do not weaken the mask to expose an artifact.

Rollback this targeted commit to remove the arm layer/assets and restore the prior renderer. No data migration. Feature branch only; no main merge. Stop for manual visual acceptance.
