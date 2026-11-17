# Vendored MediaPipe runtime and model

Runtime: @mediapipe/tasks-vision 0.10.22-rc.20250304, unmodified vision_bundle.mjs and SIMD/non-SIMD WASM loader/binaries from the npm registry tarball. Apache-2.0 LICENSE included. No package manager install or wrapper library is required at runtime.

Model: MediaPipe Face Landmarker task archive containing face_detector.tflite, face_landmarks_detector.tflite, geometry_pipeline_metadata_landmarks.binarypb and face_blendshapes.tflite. The Google-hosted model URL returned proxy HTTP 403 here. A copy was obtained from the Apache-2.0 npm package @nuralogix.ai/tf-face-tracker-worker-ts 1.0.2, path package/lib/taskVision/model/face_landmarker.task. Only the task archive is used, none of that package's tracking/analytics/wrapper code. This mirror's byte-for-byte equivalence to the currently Google-hosted task could not be independently checked; source and SHA256 are recorded in sources.json. Actual MediaPipe inference must pass before release. Review model provenance before production.

All files are served locally. Opening try-on downloads static runtime/model assets from the same site; images/video/landmarks are not sent to any server.
