# WAJH Clinical Workflow Walkthrough

This document describes the current WAJH workflow for maxillofacial surgical simulation and outcome comparison.

## 1. Upload a Patient Photo
- Use the upload panel to drag and drop a high-quality frontal face image.
- Accepted formats include JPG, PNG, and other common image types.
- The app immediately begins landmark detection once the image is loaded.

## 2. Calibrate the Image
- After loading an image, the system opens `CalibrationModal` automatically.
- Choose a calibration method:
  - **Ruler**: Select two points on a visible ruler or known object.
  - **Dental**: Measure a known dental width such as a central incisor.
  - **Pupils**: Select both pupil centers and enter the real-world distance.
- Enter the real-world distance in millimeters to establish the pixel-to-mm ratio.
- Auto-pupil detection is available if the face landmarks are already recognized.

## 3. Adjust Facial Landmarks
- Once calibrated, the planning canvas displays the detected landmarks.
- Drag landmarks to simulate surgical movement, or choose a procedure preset from the surgical toolbar.
- The app supports both direct point adjustment and preset-based orthognathic procedures.
- `SurgicalReadout` shows measurement metrics and displacements in millimeters.

## 4. Run the Simulation
- Click **Simulate Outcome** to generate the predicted post-surgical image.
- The simulation uses `AIService` plus `DeformationModel` to warp the image according to landmark movement.
- The result is produced with mesh-based deformation and optional procedure emphasis.
- A confidence score is computed from image quality, pose, detection quality, and movement risk.

## 5. Compare Original and Predicted Results
- After simulation, use the comparison controls to review the outcome.
- The comparison slider shows before/after overlays and alternative comparison modes.
- If the result is not satisfactory, reset landmarks or return to edit mode.

## 6. Additional Evaluation Tools
- The 3D viewer panel displays landmark structure in a 3D perspective.
- The AI analysis overlay can provide procedure reasoning and clinical measurements.
- A PDF report can be generated from the current case state.

## 7. Reset and Restart
- Use **Reset Landmarks** to restore the original detected positions.
- Upload a new image to start a fresh clinical planning session.

---
> [!NOTE]
> WAJH is a visual planning aid. It is not intended to replace clinical judgment or surgical planning by a licensed surgeon.
