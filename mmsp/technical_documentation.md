# WAJH Technical Documentation

**WAJH** (وجه) is a clinical visualization system for maxillofacial surgical planning. It is built as a modular React application that combines MediaPipe landmark detection, mesh-based deformation, clinical calibration, and outcome analysis.

## 1. System Architecture

WAJH is structured as a frontend-first application with reusable UI components and domain services. The main interactive canvas lives in `src/components/WajhCanvas.jsx`, while specialized services handle landmark detection, simulation generation, analysis, and export.

### 1.1 Project structure
```
mmsp/
├─ .git/
├─ .gitignore
├─ .idea/
├─ deform3d/
├─ dist/
├─ eslint.config.js
├─ index.html
├─ node_modules/
├─ package-lock.json
├─ package.json
├─ public/
│  ├─ mediapipe/
│  │  ├─ face_mesh/
│  │  │  ├─ face_mesh.binarypb
│  │  │  ├─ face_mesh.js
│  │  │  ├─ face_mesh_solution_packed_assets.data
│  │  │  ├─ face_mesh_solution_packed_assets_loader.js
│  │  │  ├─ face_mesh_solution_simd_wasm_bin.data
│  │  │  ├─ face_mesh_solution_simd_wasm_bin.js
│  │  │  ├─ face_mesh_solution_simd_wasm_bin.wasm
│  │  │  ├─ face_mesh_solution_wasm_bin.js
│  │  │  ├─ face_mesh_solution_wasm_bin.wasm
│  │  │  ├─ index.d.ts
│  │  │  ├─ package.json
│  │  │  └─ README.md
│  └─ models/
│     └─ face_landmarker.task
├─ python/
│  ├─ __pycache__/
│  ├─ label_map.json
│  ├─ landmark_ids.json
│  ├─ ml_server.py
│  ├─ model_stats.json
│  └─ wajh_model.joblib
├─ README.md
├─ src/
│  ├─ App.css
│  ├─ App.jsx
│  ├─ assets/
│  ├─ components/
│  │  ├─ AdminDashboard.jsx
│  │  ├─ CalibrationModal.jsx
│  │  ├─ ErrorBoundary.jsx
│  │  ├─ FaceMesh3DViewer.jsx
│  │  ├─ ImageUploader.jsx
│  │  ├─ SurgicalReadout.jsx
│  │  └─ WajhCanvas.jsx
│  ├─ index.css
│  ├─ main.jsx
│  ├─ services/
│  │  ├─ AIService.js
│  │  ├─ AnalysisService.js
│  │  ├─ DeformationModel.js
│  │  ├─ FaceLandmarks.js
│  │  ├─ OrthognathicProcedures.js
│  │  ├─ PDFReportService.js
│  │  └─ ThreeDEngine.js
│  └─ utils/
│     └─ geometry.js
├─ technical_documentation.md
├─ test_image.txt
├─ tests/
├─ vite.config.js
└─ walkthrough.md
```

## 2. Core services

### 2.1 FaceLandmark detection (`src/services/FaceLandmarks.js`)
- Loads `face_landmarker.task` from `public/models/` using `@mediapipe/tasks-vision`.
- Uses `FaceLandmarker.createFromOptions()` with `delegate: 'GPU'` and `refineLandmarks: true`.
- Maps 478 face mesh points to 45 key anatomical landmarks used by the planner.
- Assigns each key point tissue metadata: `type`, `stiffness`, and `importance`.
- Validates point positions to ensure they lie inside the loaded image bounds.

### 2.2 Deformation propagation (`src/services/DeformationModel.js`)
- Computes landmark influence using a distance-weighted falloff.
- Uses a falloff exponent of `1.5 + stiffness` so harder tissue moves less.
- Applies deformation only inside a configurable influence radius.
- Returns an updated point cloud for each pixel, mesh anchor, or landmark.

### 2.3 Outcome generation (`src/services/AIService.js`)
- Builds procedure-specific target landmarks using `OrthognathicProcedures.js`.
- Stabilizes landmark movement to preserve realistic visual response.
- Generates a warp mesh with `Delaunator` and renders the deformed image onto a canvas.
- Measures result quality and, if needed, boosts deformation to avoid a near-identical output.
- Applies procedure emphasis based on the surgical category (e.g., lower face or maxillary repositioning).
- Provides fallback output if image warping fails.

### 2.4 3D visualization (`src/services/ThreeDEngine.js`)
- Constructs a WebGL triangulation mesh using `three`.
- Maps image UVs to a deformable mesh and renders the result into the canvas.
- Includes a landmark viewer mode for 3D landmark visualization.
- Supports cleanup and disposal of WebGL resources.

### 2.5 Clinical analysis (`src/services/AnalysisService.js`)
- Primary entry point is `analyze()`.
- Attempts an ML backend call first via `VITE_ML_URL`.
- Falls back to a rule-based API at `VITE_API_URL` if the ML server is unavailable.
- Combines model output with clinical measurements, landmark targets, and reasoning text.

### 2.6 Reporting
- `src/services/PDFReportService.js` generates PDF exports from the current patient image and simulation state.

### 2.7 Procedure presets
- `src/services/OrthognathicProcedures.js` defines surgical presets such as mandibular advancement, maxillary impaction, chin setback, and bimaxillary correction.
- Each preset includes recommended landmark movement patterns and intensity.

## 3. Landmark workflow

1. The user uploads an image through `ImageUploader.jsx`.
2. `FaceLandmarks.js` extracts 45 clinically relevant landmarks.
3. `WajhCanvas.jsx` initializes the editing canvas and prompts calibration.
4. The user adjusts landmarks or chooses a preset.
5. `AIService.generateOutcome()` produces the prediction.

## 4. Calibration

- `CalibrationModal.jsx` requires two image points and a known real-world measurement.
- Supported methods: `ruler`, `dental`, and `pupils`.
- Auto-pupil detection is offered when landmarks are available.
- Calibration ratio is stored as millimeters-per-pixel and enables `SurgicalReadout` metrics.

## 5. Confidence and analytics

- `AIService.computeConfidenceDetails()` uses image quality, face pose, landmark visibility, and movement risk.
- Confidence values are bounded and displayed as a reliability score.
- `AnalysisService` enriches the predicted outcome with clinical reasoning and measurement data.

## 6. Build and run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development mode:
   ```bash
   npm run dev
   ```
3. Optionally configure backend endpoints:
   - `VITE_API_URL`
   - `VITE_ML_URL`

## 7. Python support

- The `python/` folder contains optional ML server artifacts and model files.
- `ml_server.py` is designed for inference support but is not required for the frontend to render simulation results.

---
WAJH Technical Documentation 2026

