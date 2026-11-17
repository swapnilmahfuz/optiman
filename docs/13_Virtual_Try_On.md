# Virtual Try-On implementation and acceptance

## Stage A — approach and constraints
Owner authorizes optional frontend Virtual Try-On, superseding the disabled placeholder. Preserve approved storefront and all shopping/operations. Prefer calibrated, face-tracked 2D over unconvincing 3D. No production backend or main merge.

Four source product photos were visually inspected. Atlas/Muse/Forma are angled single views; Noir is frontal. No CAD or side views exist. Procedural 3D would require guessed rim depth, bridge, temples and occlusion; it cannot be declared more accurate from these references. The chosen path is four unique high-resolution AI-assisted frontal alpha assets with recognizable materials/shapes, MediaPipe Face Landmarker and Canvas2D. Optical lens interiors are transparent, sunglasses have translucent tint. Assets are approximate synthetic front elevations, not physical fit measurements. Do not imply exact product geometry. A rendered 3D quality comparison is not yet available; do not claim one was performed.

A–G commit plan: A technical/quality plan; B lazy local MediaPipe/camera lifecycle; C geometry/smoothing/calibration; D distinct assets; E integrated UI/switching/shopping; F photo fallback; G regressions/evidence and acceptance checklist. Revert these commits to roll back; no state migration or stock changes.

All camera/photo pixels and ephemeral landmarks stay in this browser. No microphone, persistence, upload, recording or analytics. HTTPS or localhost required for camera. Close, navigation, page hiding and failures must stop tracks. Photo input is optional and consent-based; synthetic sample is explicitly labeled. Camera mode and Photo Preview must never be confused.

No `/dev/video*` camera hardware is exposed in this environment. Synthetic photo inference and virtual-camera fixtures can verify detection, transform math and lifecycle, but cannot establish physical-camera visual acceptance, hardware FPS or mobile Safari/Android compatibility. Final result must remain awaiting live-device verification.
