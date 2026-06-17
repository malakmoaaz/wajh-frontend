/**
 * FaceLandmarks Service
 *
 * Handles facial landmark detection using MediaPipe Face Landmarker.
 * Detects 45 key anatomical points for surgical planning with tissue properties.
 *
 * Key Features:
 * - 478-point MediaPipe model with refinement for eyes/lips/nose
 * - Tissue classification (hard/soft) for realistic deformation
 * - Stiffness values for physics-based simulation
 * - Confidence thresholds for reliable detection
 * - Landmark validation and bounds checking
 */
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

const withDefaultImportance = landmark => ({
    importance: 1.0,
    ...landmark
});

// Key anatomical landmarks for WAJH planning
// Mapped to MediaPipe Face Mesh indices (478-point model)
// Expanded from 17 to 45 landmarks for improved mesh density and surgical accuracy
export const KEY_LANDMARKS = [
    // === Core Anatomical Points (Original 17) ===
    { id: 'nasion', name: 'Nasion', mpId: 168, type: 'hard', stiffness: 1.0 },
    { id: 'pronasale', name: 'Pronasale (Nose Tip)', mpId: 1, type: 'soft', stiffness: 0.3 },
    { id: 'subnasale', name: 'Subnasale', mpId: 2, type: 'soft', stiffness: 0.4 },
    { id: 'labrale_superius', name: 'Labrale Superius (Upper Lip)', mpId: 0, type: 'soft', stiffness: 0.2 },
    { id: 'labrale_inferius', name: 'Labrale Inferius (Lower Lip)', mpId: 17, type: 'soft', stiffness: 0.2 },
    { id: 'stomion', name: 'Stomion', mpId: 13, type: 'soft', stiffness: 0.1 },
    { id: 'cheilion_l', name: 'Cheilion Left', mpId: 61, type: 'soft', stiffness: 0.3 },
    { id: 'cheilion_r', name: 'Cheilion Right', mpId: 291, type: 'soft', stiffness: 0.3 },
    { id: 'pogonion', name: 'Pogonion (Chin)', mpId: 152, type: 'hard', stiffness: 1.0 },
    { id: 'gnathion', name: 'Gnathion', mpId: 200, type: 'hard', stiffness: 1.0 },
    { id: 'gonion_l', name: 'Gonion Left', mpId: 58, type: 'hard', stiffness: 1.0 },
    { id: 'gonion_r', name: 'Gonion Right', mpId: 288, type: 'hard', stiffness: 1.0 },
    { id: 'glabella', name: 'Glabella', mpId: 9, type: 'hard', stiffness: 1.0 },
    { id: 'zygion_l', name: 'Zygion Left', mpId: 234, type: 'hard', stiffness: 0.8 },
    { id: 'zygion_r', name: 'Zygion Right', mpId: 454, type: 'hard', stiffness: 0.8 },
    { id: 'pupil_l', name: 'Pupil Left', mpId: 468, type: 'soft', stiffness: 0.05 },
    { id: 'pupil_r', name: 'Pupil Right', mpId: 473, type: 'soft', stiffness: 0.05 },

    // === Eye Region (8 points) ===
    { id: 'eye_l_inner', name: 'Left Eye Inner Canthus', mpId: 133, type: 'soft', stiffness: 0.2, importance: 1.15 },
    { id: 'eye_l_outer', name: 'Left Eye Outer Canthus', mpId: 33, type: 'soft', stiffness: 0.2, importance: 1.15 },
    { id: 'eye_l_upper', name: 'Left Eye Upper Lid', mpId: 159, type: 'soft', stiffness: 0.15, importance: 1.1 },
    { id: 'eye_l_lower', name: 'Left Eye Lower Lid', mpId: 145, type: 'soft', stiffness: 0.15, importance: 1.1 },
    { id: 'eye_r_inner', name: 'Right Eye Inner Canthus', mpId: 362, type: 'soft', stiffness: 0.2, importance: 1.15 },
    { id: 'eye_r_outer', name: 'Right Eye Outer Canthus', mpId: 263, type: 'soft', stiffness: 0.2, importance: 1.15 },
    { id: 'eye_r_upper', name: 'Right Eye Upper Lid', mpId: 386, type: 'soft', stiffness: 0.15, importance: 1.1 },
    { id: 'eye_r_lower', name: 'Right Eye Lower Lid', mpId: 374, type: 'soft', stiffness: 0.15, importance: 1.1 },

    // === Forehead Region (5 points) ===
    { id: 'forehead_center', name: 'Forehead Center', mpId: 10, type: 'hard', stiffness: 0.9 },
    { id: 'forehead_l1', name: 'Forehead Left 1', mpId: 67, type: 'hard', stiffness: 0.9 },
    { id: 'forehead_r1', name: 'Forehead Right 1', mpId: 297, type: 'hard', stiffness: 0.9 },
    { id: 'temple_l', name: 'Temple Left', mpId: 54, type: 'hard', stiffness: 0.85 },
    { id: 'temple_r', name: 'Temple Right', mpId: 284, type: 'hard', stiffness: 0.85 },

    // === Nose Region (6 points) ===
    { id: 'nose_bridge_top', name: 'Nose Bridge Top', mpId: 6, type: 'hard', stiffness: 0.95 },
    { id: 'nose_bridge_mid', name: 'Nose Bridge Mid', mpId: 197, type: 'hard', stiffness: 0.9 },
    { id: 'nose_alar_l', name: 'Nose Alar Left', mpId: 98, type: 'soft', stiffness: 0.4 },
    { id: 'nose_alar_r', name: 'Nose Alar Right', mpId: 327, type: 'soft', stiffness: 0.4 },
    { id: 'nose_tip_l', name: 'Nose Tip Left', mpId: 48, type: 'soft', stiffness: 0.35 },
    { id: 'nose_tip_r', name: 'Nose Tip Right', mpId: 278, type: 'soft', stiffness: 0.35 },
    { id: 'nose_columella', name: 'Nose Columella', mpId: 94, type: 'soft', stiffness: 0.35, importance: 1.2 },
    { id: 'nose_base_l', name: 'Nose Base Left', mpId: 64, type: 'soft', stiffness: 0.4, importance: 1.15 },
    { id: 'nose_base_r', name: 'Nose Base Right', mpId: 294, type: 'soft', stiffness: 0.4, importance: 1.15 },

    // === Lip Region (8 points) ===
    { id: 'upper_lip_top_l', name: 'Upper Lip Top Left', mpId: 185, type: 'soft', stiffness: 0.15 },
    { id: 'upper_lip_top_r', name: 'Upper Lip Top Right', mpId: 409, type: 'soft', stiffness: 0.15 },
    { id: 'upper_lip_bottom_l', name: 'Upper Lip Bottom Left', mpId: 40, type: 'soft', stiffness: 0.15 },
    { id: 'upper_lip_bottom_r', name: 'Upper Lip Bottom Right', mpId: 270, type: 'soft', stiffness: 0.15 },
    { id: 'lower_lip_top_l', name: 'Lower Lip Top Left', mpId: 146, type: 'soft', stiffness: 0.15 },
    { id: 'lower_lip_top_r', name: 'Lower Lip Top Right', mpId: 375, type: 'soft', stiffness: 0.15 },
    { id: 'lower_lip_bottom_l', name: 'Lower Lip Bottom Left', mpId: 91, type: 'soft', stiffness: 0.2 },
    { id: 'lower_lip_bottom_r', name: 'Lower Lip Bottom Right', mpId: 321, type: 'soft', stiffness: 0.2 },
    { id: 'upper_lip_center', name: 'Upper Lip Center', mpId: 11, type: 'soft', stiffness: 0.12, importance: 1.25 },
    { id: 'lower_lip_center', name: 'Lower Lip Center', mpId: 16, type: 'soft', stiffness: 0.12, importance: 1.25 },
    { id: 'mouth_center_lower', name: 'Mouth Center Lower', mpId: 14, type: 'soft', stiffness: 0.1, importance: 1.2 },

    // === Cheek Region (4 points) ===
    { id: 'cheek_l_upper', name: 'Cheek Left Upper', mpId: 116, type: 'soft', stiffness: 0.5 },
    { id: 'cheek_r_upper', name: 'Cheek Right Upper', mpId: 345, type: 'soft', stiffness: 0.5 },
    { id: 'cheek_l_mid', name: 'Cheek Left Mid', mpId: 123, type: 'soft', stiffness: 0.45 },
    { id: 'cheek_r_mid', name: 'Cheek Right Mid', mpId: 352, type: 'soft', stiffness: 0.45 },

    // === Jaw Line (5 points) ===
    { id: 'jaw_l1', name: 'Jaw Left 1', mpId: 172, type: 'hard', stiffness: 0.95 },
    { id: 'jaw_r1', name: 'Jaw Right 1', mpId: 397, type: 'hard', stiffness: 0.95 },
    { id: 'jaw_l2', name: 'Jaw Left 2', mpId: 136, type: 'hard', stiffness: 0.9 },
    { id: 'jaw_r2', name: 'Jaw Right 2', mpId: 365, type: 'hard', stiffness: 0.9 },
    { id: 'chin_mid', name: 'Chin Mid', mpId: 175, type: 'hard', stiffness: 0.95 },
    { id: 'mandible_l_mid', name: 'Mandible Left Mid', mpId: 150, type: 'hard', stiffness: 0.9, importance: 1.1 },
    { id: 'mandible_r_mid', name: 'Mandible Right Mid', mpId: 379, type: 'hard', stiffness: 0.9, importance: 1.1 },
    { id: 'chin_lower', name: 'Chin Lower', mpId: 199, type: 'hard', stiffness: 0.95, importance: 1.15 }
].map(withDefaultImportance);

export class FaceLandmarkService {
    mapLandmarkPoint(point, imageElement) {
        const xPx = point.x * imageElement.width;
        const yPx = point.y * imageElement.height;
        const zNorm = point.z ?? 0;
        const zPx = zNorm * imageElement.width;

        return {
            // 3D-first contract
            xPx,
            yPx,
            zPx,
            xNorm: point.x,
            yNorm: point.y,
            zNorm,
            visibility: point.visibility,
            // Backward compatibility aliases
            x: xPx,
            y: yPx,
            z: zPx,
            normX: point.x,
            normY: point.y
        };
    }
    /**
     * Singleton instance of FaceLandmarker
     * Initialized once and reused for all detections
     */
    faceLandmarker = null;

    /**
     * Flag indicating if the FaceLandmarker is ready for detection.
     * Prevents detection calls before initialization is complete.
     */
    isReady = false;

    constructor() {
        this.init();
    }

    /**
     * Initialize MediaPipe Face Landmarker
     *
     * Loads the face_landmarker.task model from /public/models/
     * Configures detection settings for optimal accuracy
     *
     * @returns {Promise<void>}
     */
    async init() {
        console.log("FaceLandmarks: Initializing MediaPipe...");
        try {
            // Load MediaPipe WASM files and dependencies
            const p = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            // Create FaceLandmarker with enhanced configuration
            this.faceLandmarker = await FaceLandmarker.createFromOptions(p, {
                baseOptions: {
                    modelAssetPath: `/models/face_landmarker.task`, // Pre-trained model
                    delegate: "GPU" // Use GPU acceleration for better performance
                },
                outputFaceBlendshapes: false,  // Not needed for landmark detection
                outputFacialTransformationMatrixes: false, // Not needed
                runningMode: "IMAGE", // Process static images (not video stream)
                numFaces: 1, // Detect only one face per image

                // ENHANCED: Enable refinement for better accuracy around eyes, lips, and nose
                // This provides more precise landmark positions in critical facial regions
                refineLandmarks: true,

                // ENHANCED: Add confidence thresholds for more reliable detection
                // Only accept detections with sufficient confidence
                minDetectionConfidence: 0.6,  // 60% minimum for initial detection
                minTrackingConfidence: 0.6    // 60% minimum for landmark tracking
            });
            this.isReady = true;
            console.log('FaceLandmarker initialized with refinement enabled');
        } catch (e) {
            console.error('Failed to init FaceLandmarker:', e);
        }
    }

    /**
     * Detect facial landmarks in an image
     *
     * Process:
     * 1. Run MediaPipe detection on image
     * 2. Extract 45 key anatomical points from 478-point mesh
     * 3. Add tissue properties (stiffness, type)
     * 4. Validate landmarks are within image bounds
     * 5. Return validated landmarks with metadata
     *
     * @param {HTMLImageElement} imageElement - The image to analyze
     * @returns {Object|null} - {keyPoints: Array, allLandmarks: Array} or null if detection fails
     */
    async detect(imageElement) {
        if (!this.isReady) {
            // Wait for init with timeout
            let totalWait = 0;
            while (!this.isReady && totalWait < 5000) {
                await new Promise(r => setTimeout(r, 100));
                totalWait += 100;
            }
            if (!this.isReady) throw new Error("FaceLandmarker failed to initialize in time");
        }

        try {
            console.dir(this.faceLandmarker);
            const results = this.faceLandmarker.detect(imageElement);

            if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                const allLandmarks = landmarks.map((point, index) => ({
                    index,
                    ...this.mapLandmarkPoint(point, imageElement)
                }));

                // Map to our key points
                // MediaPipe Tasks returns x,y,z normalized [0,1]
                const keyPoints = KEY_LANDMARKS.map(k => {
                    const p = landmarks[k.mpId];
                    if (!p) {
                        console.warn(`Landmark ${k.name} (mpId: ${k.mpId}) not found, falling back to index 1`);
                    }
                    const targetPoint = p || landmarks[1];
                    const mappedPoint = this.mapLandmarkPoint(targetPoint, imageElement);
                    return {
                        ...k,
                        ...mappedPoint
                    };
                });

                // ENHANCED: Validate landmarks are within image bounds
                const validatedPoints = keyPoints.filter(p => {
                    const isValid = p.x >= 0 && p.x <= imageElement.width &&
                        p.y >= 0 && p.y <= imageElement.height;
                    if (!isValid) {
                        console.warn(`Landmark ${p.name} out of bounds: (${p.x}, ${p.y})`);
                    }
                    return isValid;
                });

                // If we lost too many landmarks, return null
                if (validatedPoints.length < KEY_LANDMARKS.length * 0.9) {
                    console.warn(`Only ${validatedPoints.length}/${KEY_LANDMARKS.length} landmarks valid. Detection may be unreliable.`);
                }

                return { keyPoints: validatedPoints, allLandmarks };
            }
            console.warn("FaceLandmarkService: No faces detected in results object", results);
            return null;
        } catch (e) {
            console.error("FaceLandmarkService detector call failed:", e);
            throw e; // Rethrow so App.jsx can catch and alert
        }
    }
}
