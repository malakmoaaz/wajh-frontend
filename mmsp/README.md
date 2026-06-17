# WAJH (وجه)

**WAJH** (Arabic for "Face") is a React-based clinical planning tool for maxillofacial surgery visualization. It combines MediaPipe facial landmark detection, landmark-guided deformation, clinical calibration, and confidence scoring to help clinicians preview surgical changes and compare outcomes.

## Key Features

- **Patient photo upload**: Drag-and-drop image ingestion with support for common image formats.
- **Face landmark detection**: Uses MediaPipe Face Landmarker from `@mediapipe/tasks-vision` to extract a high-resolution facial mesh.
- **Calibration**: Converts pixels to millimeters using ruler, dental, or pupillary distance measurements.
- **Landmark editing**: Move important facial landmarks to simulate surgical repositioning.
- **Procedure presets**: Built-in orthognathic procedure templates for common jaw and chin corrections.
- **Deformation simulation**: Mesh-based image warping with tissue-aware deformation to preview soft tissue response.
- **Comparison slider**: Compare original and simulated outcomes with before/after overlay controls.
- **Confidence analysis**: Computes prediction reliability from image quality, pose, detection, and movement risk.
- **Export/reporting**: Generates PDF reports and includes a 3D landmark viewer for additional visualization.

## Architecture

- **Frontend**: React 19 + Vite
- **Landmark detection**: `FaceLandmarkService` using `@mediapipe/tasks-vision` and a pre-trained `face_landmarker.task` model
- **Deformation**: `DeformationModel` plus `AIService` with Delaunay triangulation and warp rendering
- **3D rendering**: `ThreeDEngine` powered by `three`
- **Analysis**: `AnalysisService` with optional ML server fallback to a clinical rule engine
- **Reporting**: `PDFReportService`

## Project structure highlights

- `src/App.jsx` — application entry point and UI flow
- `src/components/ImageUploader.jsx` — drag-and-drop image upload
- `src/components/WajhCanvas.jsx` — interactive planning canvas and simulation controls
- `src/components/CalibrationModal.jsx` — mandatory scale calibration workflow
- `src/components/SurgicalReadout.jsx` — displacement and metric display
- `src/services/FaceLandmarks.js` — MediaPipe landmark detection and key point mapping
- `src/services/AIService.js` — outcome generation, confidence scoring, and warp rendering
- `src/services/DeformationModel.js` — tissue deformation propagation logic
- `src/services/ThreeDEngine.js` — WebGL/Three.js mesh rendering and 3D landmark visualization
- `src/services/AnalysisService.js` — ML/rule-based clinical analysis service
- `src/services/OrthognathicProcedures.js` — surgical procedure presets

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

Run the development server:
```bash
npm run dev
```

## Optional backend configuration

The frontend can call an ML analysis backend when configured with environment variables:

- `VITE_API_URL` — rule engine endpoint
- `VITE_ML_URL` — optional ML server endpoint

If the ML endpoint is unavailable, `AnalysisService` falls back to the local clinical rule engine.

## Usage

1. Upload a frontal facial image.
2. Calibrate the image using a known distance.
3. Adjust landmarks or select a procedure preset.
4. Run the simulation and review the generated outcome.
5. Compare the original and predicted images with the comparison controls.

## Clinical disclaimer

> WAJH is a research and visualization tool. It is not intended as a standalone surgical navigation system. Clinical decisions should be confirmed by a qualified surgeon.

---

