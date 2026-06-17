/**
 * WajhCanvas - Main Surgical Planning Canvas Component
 * 
 * Interactive canvas for maxillofacial surgical outcome visualization.
 * Allows surgeons to manipulate facial landmarks and preview surgical results.
 * 
 * Workflow:
 * 1. Upload patient image → Auto-detect 45 facial landmarks
 * 2. Calibrate scale using known measurement (ruler/dental/pupils)
 * 3. Modify landmarks to simulate surgical changes
 * 4. Generate AI-powered outcome prediction
 * 5. Compare before/after results
 * 
 * Key Features:
 * - Real-time landmark manipulation with tissue-aware deformation
 * - Mesh-based image warping for realistic visualization
 * - Calibration system for accurate measurements
 * - Confidence scoring for prediction reliability
 * - Side-by-side before/after review mode
 * 
 * Technical Stack:
 * - MediaPipe for landmark detection
 * - Delaunay triangulation for mesh generation
 * - Affine transforms for image warping
 * - Physics-based deformation model
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AIService }       from '../services/AIService';
import { AnalysisService } from '../services/AnalysisService';
import { SurgicalReadout } from './SurgicalReadout';
import { CalibrationModal } from './CalibrationModal';
import { generateReport } from '../services/PDFReportService';
import { FaceMesh3DViewer } from './FaceMesh3DViewer';
import {
    PROCEDURE_PRESETS,
    DEFAULT_PROCEDURE_ID,
    buildProcedureSimulationLandmarks,
    getProcedurePreset
} from '../services/OrthognathicProcedures';

/**
 * WajhCanvas Component
 * 
 * @param {Object} props
 * @param {string} props.imageSrc - URL or data URI of patient image
 * @param {Array} props.initialLandmarks - Detected facial landmarks with tissue properties
 */
export function WajhCanvas({ imageSrc, initialLandmarks, initialMeshLandmarks }) {
    // ========================================
    // REFS
    // ========================================

    /** Canvas element reference for rendering */
    const canvasRef = useRef(null);

    /** AI service instance for outcome generation */
    const aiServiceRef = useRef(null);
    if (!aiServiceRef.current) {
        aiServiceRef.current = new AIService();
    }

    // ========================================
    // STATE: Landmark Management
    // ========================================

    /** Current positions of facial landmarks (modified by user) */
    const [points, setPoints] = useState([]);
    const [meshPoints, setMeshPoints] = useState([]);

    /** Index of landmark currently being dragged (-1 if none) */
    const [draggingIdx, setDraggingIdx] = useState(null);

    /** Loaded image object for rendering */
    const [imgObj, setImgObj] = useState(null);

    // ========================================
    // STATE: AI Simulation
    // ========================================

    /** Whether simulation is currently processing */
    const [isSimulating, setIsSimulating] = useState(false);

    /** Generated outcome image (ImageBitmap) */
    const [simulationResult, setSimulationResult] = useState(null);

    /** Currently active/hovered landmark index */
    const [activePointIdx, setActivePointIdx] = useState(null);

    // ========================================
    // STATE: Calibration
    // ========================================

    /** Whether image has been calibrated */
    const [isCalibrated, setIsCalibrated] = useState(false);

    /** Calibration data: {ratio: px/mm, method: string, confidence: string} */
    const [calibrationData, setCalibrationData] = useState(null);

    /** Whether calibration modal is visible */
    const [showCalibration, setShowCalibration] = useState(false);

    /** Simulation confidence score (50-95%) */
    const [simulationConfidence, setSimulationConfidence] = useState(null);
    const [simulationConfidenceDetails, setSimulationConfidenceDetails] = useState(null);
    const [is3DPanelOpen, setIs3DPanelOpen] = useState(true);
    const [showComparisonSlider, setShowComparisonSlider] = useState(false);
    const [comparisonSplit, setComparisonSplit] = useState(50);
    const [comparisonMode, setComparisonMode] = useState('split');
    const [selectedProcedureId, setSelectedProcedureId] = useState(DEFAULT_PROCEDURE_ID);
    const [procedureIntensity, setProcedureIntensity] = useState(
        getProcedurePreset(DEFAULT_PROCEDURE_ID)?.intensity ?? 1
    );
    const [simulationStatus, setSimulationStatus] = useState('');
    const [simulationError, setSimulationError] = useState('');

    // ── Procedure Recommendation state ────────────────────────────────
    const [analysis,          setAnalysis]         = useState(null);
    const [isAnalyzing,       setIsAnalyzing]       = useState(false);
    const [analysisError,     setAnalysisError]     = useState(null);
    const [showAiOverlay,     setShowAiOverlay]     = useState(true);


    // ── Procedure clinical explanations ───────────────────────────
    const PROCEDURE_INFO = {
        chin_advancement: {
            whenToUse: "Used when the patient has a recessed or small chin (microgenia) but normal jaw occlusion. Indicated when the chin tip (Pogonion) is positioned behind the ideal facial plane.",
            whatIsIt: "Sliding Genioplasty — the chin bone is cut and moved forward and/or downward. A bone plate holds it in the new position. Only the chin bone moves; the jaw bite is not changed.",
            landmarks: ["Pogonion — advance forward", "Gnathion — advance forward + slightly down", "Chin Mid — follows Pogonion"],
            indication: "Angle Class I with microgenia",
            recovery: "4–6 weeks",
        },
        chin_setback: {
            whenToUse: "Used when the chin projects too far forward (macrogenia) relative to the lips and nose, but the jaw bite is normal.",
            whatIsIt: "Sliding Genioplasty setback — the chin bone is cut and moved posteriorly. The jaw occlusion is not affected.",
            landmarks: ["Pogonion — retract backward", "Gnathion — retract backward", "Chin Mid — follows Pogonion"],
            indication: "Chin prominence with normal occlusion",
            recovery: "4–6 weeks",
        },
        mandibular_advancement: {
            whenToUse: "Used for Angle Class II malocclusion — the lower jaw is underdeveloped or too far back, causing an overbite and a convex facial profile. Patient typically cannot close lips without strain.",
            whatIsIt: "Bilateral Sagittal Split Osteotomy (BSSO) — the lower jaw is cut on both sides and the front segment is moved forward. Held with titanium plates and screws.",
            landmarks: ["Pogonion — advance 6–12mm forward", "Gnathion — advance forward", "Gonion Left & Right — advance forward", "Labrale Inferius — advance slightly"],
            indication: "Angle Class II — Retrognathic Mandible",
            recovery: "6–8 weeks",
        },
        mandibular_setback: {
            whenToUse: "Used for Angle Class III malocclusion — the lower jaw grows too far forward, causing an underbite (lower teeth in front of upper teeth) and a concave facial profile.",
            whatIsIt: "BSSO Setback — same bilateral sagittal split technique but the lower jaw is moved backward. Corrects mandibular prognathism.",
            landmarks: ["Pogonion — retract 5–10mm backward", "Gnathion — retract backward", "Gonion Left & Right — retract backward", "Labrale Inferius — retract slightly"],
            indication: "Angle Class III — Prognathic Mandible",
            recovery: "6–8 weeks",
        },
        maxillary_advancement: {
            whenToUse: "Used when the upper jaw is set too far back causing midface deficiency and a flat or concave profile. Often used in Class III cases where the problem is in the upper jaw rather than the lower jaw.",
            whatIsIt: "Le Fort I Osteotomy — the upper jaw is cut free from the skull and moved forward. The nose and upper lip move with the jaw. Held with plates and screws.",
            landmarks: ["Subnasale — advance forward", "Labrale Superius — advance forward", "Nasion — slight forward movement"],
            indication: "Midface deficiency — Class III maxillary",
            recovery: "8–10 weeks",
        },
        maxillary_impaction: {
            whenToUse: "Used for Vertical Maxillary Excess (VME) — the upper jaw is too long vertically causing a gummy smile, open mouth posture, and a long lower face.",
            whatIsIt: "Le Fort I Superior Impaction — the upper jaw is moved upward. This automatically rotates the lower jaw upward and forward, reducing lower face height and gummy smile.",
            landmarks: ["Labrale Superius — move superiorly 4–6mm", "Subnasale — move superiorly", "Stomion — move superiorly"],
            indication: "Vertical Maxillary Excess — gummy smile",
            recovery: "6–8 weeks",
        },
        maxillary_down_graft: {
            whenToUse: "Used for Vertical Maxillary Deficiency — the upper jaw is too short vertically causing a short upper lip, reverse smile arc, and inadequate tooth show.",
            whatIsIt: "Le Fort I Inferior Repositioning — the upper jaw is moved downward with a bone graft placed in the gap. Increases vertical facial height.",
            landmarks: ["Labrale Superius — move inferiorly 3–5mm", "Subnasale — move inferiorly", "Stomion — move inferiorly"],
            indication: "Vertical Maxillary Deficiency",
            recovery: "8–10 weeks",
        },
        transverse_expansion: {
            whenToUse: "Used for transverse maxillary deficiency — the upper jaw is too narrow causing a posterior crossbite, crowded teeth, and a narrow smile. Used in adults whose jaw sutures are already fused.",
            whatIsIt: "Surgically Assisted Rapid Palatal Expansion (SARPE) — a palatal expander device is placed and the palate is surgically separated to allow expansion. Cannot be done with orthodontics alone in adults.",
            landmarks: ["Jaw L1 & Jaw R1 — widen laterally", "Zygion Left & Right — slight widening", "Alare Left & Right — slight widening"],
            indication: "Transverse Maxillary Deficiency — crossbite",
            recovery: "4–6 months (expansion period)",
        },
        double_jaw_correction: {
            whenToUse: "Used when both upper and lower jaws need repositioning simultaneously. For severe Class II or III cases, open bites, or cases where moving one jaw alone would create an imbalanced result.",
            whatIsIt: "Bimaxillary Surgery — Le Fort I osteotomy (upper jaw) combined with BSSO (lower jaw) in the same operation. Allows correction in all three dimensions simultaneously.",
            landmarks: ["Subnasale & Labrale Superius — upper jaw repositioning", "Pogonion & Gnathion — lower jaw repositioning", "Gonion Left & Right — lower jaw repositioning", "Stomion — vertical adjustment"],
            indication: "Severe Class II or III — both jaws",
            recovery: "8–12 weeks",
        },
    };

    // ── Golden Ratio state ─────────────────────────────────────
    const [goldenRatioOn,     setGoldenRatioOn]     = useState(false);
    const [goldenRatioData,   setGoldenRatioData]   = useState(null);
    const [isGoldenLoading,   setIsGoldenLoading]   = useState(false);
    const [showGoldenLines,   setShowGoldenLines]   = useState(true);

    const selectedProcedure = getProcedurePreset(selectedProcedureId);

    // ── Procedure Info Modal ───────────────────────────────────────
    const [infoProcedure, setInfoProcedure] = useState(null); // procedure object to show in modal

    // Cleanup Simulation Results to prevent memory leaks
    useEffect(() => {
        return () => {
            if (simulationResult && typeof simulationResult.close === 'function') {
                simulationResult.close();
            }
        };
    }, [simulationResult]);

    // Load image
    useEffect(() => {
        if (!imageSrc) return;
        console.log("WajhCanvas: Loading image source...");
        const img = new Image();
        img.onload = () => {
            console.log("WajhCanvas: Image loaded successfully");
            setImgObj(img);
            setShowCalibration(true); // Prompt calibration on load
        };
        img.onerror = () => {
            console.error("WajhCanvas: Failed to load image source");
            alert("Error loading image onto canvas. Please try again.");
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // Init landmarks state
    useEffect(() => {
        if (initialLandmarks) {
            setPoints(initialLandmarks.map(p => ({ ...p })));
        }
    }, [initialLandmarks]);

    useEffect(() => {
        if (initialMeshLandmarks) {
            setMeshPoints(initialMeshLandmarks.map(p => ({ ...p })));
        } else if (initialLandmarks) {
            setMeshPoints(initialLandmarks.map((p, index) => ({ index, ...p })));
        }
    }, [initialMeshLandmarks, initialLandmarks]);

    useEffect(() => {
        const preset = getProcedurePreset(selectedProcedureId);
        setProcedureIntensity(preset?.intensity ?? 1);
    }, [selectedProcedureId]);

    const patchPoint3DFields = useCallback((point, x, y) => {
        if (!imgObj) return { ...point, x, y, xPx: x, yPx: y };
        const xNorm = x / imgObj.width;
        const yNorm = y / imgObj.height;
        const zNorm = point.zNorm ?? ((point.zPx ?? point.z ?? 0) / imgObj.width);
        const zPx = zNorm * imgObj.width;

        return {
            ...point,
            x,
            y,
            z: zPx,
            xPx: x,
            yPx: y,
            zPx,
            xNorm,
            yNorm,
            zNorm,
            normX: xNorm,
            normY: yNorm
        };
    }, [imgObj]);

    // ========================================
    // RENDERING: Canvas Draw Loop
    // ========================================

    /**
     * Main canvas rendering function
     * 
     * Handles three view modes:
     * 1. Editing mode: Show original image with interactive landmarks
     * 2. Result mode: Show simulated outcome (no landmarks)
     * 3. Review mode: Show simulated outcome in the main canvas
     * 
     * Rendering logic:
     * - If simulation exists → Show result
     * - Otherwise → Show original with landmarks
     */
    const draw = useCallback(() => {
        try {
            const canvas = canvasRef.current;
            if (!canvas || !imgObj) return;
            const ctx = canvas.getContext('2d');

            // Match canvas resolution to image
            if (canvas.width !== imgObj.width) canvas.width = imgObj.width;
            if (canvas.height !== imgObj.height) canvas.height = imgObj.height;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // LOGIC:
            // 1. If we have a simulation result, show RESULT
            // 2. If NO simulation result (Editing phase):
            //    - Show ORIGINAL always

            let toDraw = imgObj;
            let isResultView = false;

            if (simulationResult) {
                toDraw = simulationResult;
                isResultView = true;
            }

            // Draw Base Image
            ctx.drawImage(toDraw, 0, 0);

            // Draw Landmarks / Controls
            if (!isResultView) {
                points.forEach((p, i) => {
                    const isDragging = i === draggingIdx;
                    const isActive = i === activePointIdx;

                    const size = isActive || isDragging ? 5 : 3;
                    const original = initialLandmarks[i];
                    const hasMoved = original && Math.hypot(p.x - original.x, p.y - original.y) > 1;
                    const color = isActive || isDragging
                        ? '#22d3ee'
                        : hasMoved
                            ? '#f97316'
                            : 'rgba(34, 211, 238, 0.8)';

                    // 1. Subtle Outer Glow for active/dragging points
                    if (isActive || isDragging) {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
                    }

                    // 2. Draw Cross Marker (White Backdrop for contrast)
                    ctx.beginPath();
                    ctx.lineWidth = size + 1;
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.lineCap = 'round';
                    ctx.moveTo(p.x - size, p.y - size); ctx.lineTo(p.x + size, p.y + size);
                    ctx.moveTo(p.x + size, p.y - size); ctx.lineTo(p.x - size, p.y + size);
                    ctx.stroke();

                    // 3. Draw Main Cross
                    ctx.beginPath();
                    ctx.lineWidth = size - 1;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineCap = 'round';
                    ctx.moveTo(p.x - size, p.y - size); ctx.lineTo(p.x + size, p.y + size);
                    ctx.moveTo(p.x + size, p.y - size); ctx.lineTo(p.x - size, p.y + size);
                    ctx.stroke();

                    // 4. Draw Core Color Line
                    ctx.beginPath();
                    ctx.lineWidth = size / 2;
                    ctx.strokeStyle = color;
                    ctx.lineCap = 'round';
                    ctx.moveTo(p.x - size, p.y - size); ctx.lineTo(p.x + size, p.y + size);
                    ctx.moveTo(p.x + size, p.y - size); ctx.lineTo(p.x - size, p.y + size);
                    ctx.stroke();

                    // 5. Center Dot
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 1.5, 0, 2 * Math.PI);
                    ctx.fillStyle = isActive || isDragging ? '#ffffff' : color;
                    ctx.fill();

                    // Reset shadow
                    ctx.shadowBlur = 0;
                });

                // ── AI Target Overlay (amber diamonds) ────────────────
                if (showAiOverlay && analysis?.targetLandmarks?.length) {
                    analysis.targetLandmarks.forEach(t => {
                        if (!t.x || !t.y) return;
                        const r = 5;
                        ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(251,191,36,0.7)';
                        ctx.beginPath();
                        ctx.moveTo(t.x,t.y-r); ctx.lineTo(t.x+r,t.y);
                        ctx.lineTo(t.x,t.y+r); ctx.lineTo(t.x-r,t.y);
                        ctx.closePath();
                        ctx.strokeStyle='#fbbf24'; ctx.lineWidth=1.5; ctx.stroke();
                        ctx.fillStyle='rgba(251,191,36,0.18)'; ctx.fill();
                        const orig = points.find(p => p.id===t.id);
                        if (orig && Math.hypot(t.x-orig.x,t.y-orig.y)>4) {
                            ctx.beginPath(); ctx.moveTo(orig.x,orig.y); ctx.lineTo(t.x,t.y);
                            ctx.strokeStyle='rgba(251,191,36,0.4)'; ctx.lineWidth=1;
                            ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
                        }
                        ctx.shadowBlur=0;
                    });
                }

                // ── Golden Ratio Lines Overlay ─────────────────────────
                if (showGoldenLines && goldenRatioData && !goldenRatioData.error) {
                    const getP = id => points.find(p=>p.id===id);
                    const nasion=getP('nasion'), subnasale=getP('subnasale'),
                          gnathion=getP('gnathion'), gonL=getP('gonion_l'),
                          gonR=getP('gonion_r'), zygL=getP('zygion_l'), zygR=getP('zygion_r');
                    ctx.save();
                    ctx.setLineDash([5,3]);
                    ctx.lineWidth=1.2;

                    // Upper face line (nasion)
                    if (nasion) {
                        ctx.strokeStyle='rgba(251,191,36,0.6)';
                        ctx.beginPath(); ctx.moveTo(nasion.x-35,nasion.y); ctx.lineTo(nasion.x+35,nasion.y); ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.fillStyle='rgba(251,191,36,0.8)'; ctx.font='bold 9px sans-serif';
                        ctx.fillText('Nasion',nasion.x+38,nasion.y+3);
                        ctx.setLineDash([5,3]);
                    }
                    // Mid face line (subnasale)
                    if (subnasale) {
                        ctx.strokeStyle='rgba(251,191,36,0.6)';
                        ctx.beginPath(); ctx.moveTo(subnasale.x-35,subnasale.y); ctx.lineTo(subnasale.x+35,subnasale.y); ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.fillStyle='rgba(251,191,36,0.8)';
                        ctx.fillText('Subnasale',subnasale.x+38,subnasale.y+3);
                        ctx.setLineDash([5,3]);
                    }
                    // Lower face line (gnathion)
                    if (gnathion) {
                        ctx.strokeStyle='rgba(52,211,153,0.6)';
                        ctx.beginPath(); ctx.moveTo(gnathion.x-35,gnathion.y); ctx.lineTo(gnathion.x+35,gnathion.y); ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.fillStyle='rgba(52,211,153,0.8)';
                        ctx.fillText('Gnathion',gnathion.x+38,gnathion.y+3);
                        ctx.setLineDash([5,3]);
                    }
                    // Face width lines
                    if (zygL && zygR) {
                        ctx.strokeStyle='rgba(251,191,36,0.5)';
                        ctx.beginPath(); ctx.moveTo(zygL.x,zygL.y); ctx.lineTo(zygR.x,zygR.y); ctx.stroke();
                    }
                    if (gonL && gonR) {
                        ctx.strokeStyle='rgba(52,211,153,0.5)';
                        ctx.beginPath(); ctx.moveTo(gonL.x,gonL.y); ctx.lineTo(gonR.x,gonR.y); ctx.stroke();
                    }
                    // φ symbol in corner
                    ctx.setLineDash([]);
                    ctx.fillStyle='rgba(251,191,36,0.5)'; ctx.font='bold 12px serif';
                    ctx.fillText('φ = 1.618',8,16);
                    ctx.restore();
                }
            }
        } catch (e) {
            console.error("WajhCanvas: Draw loop error", e);
            // We don't want to crash the loop forever, but maybe pause it?
            // For now, just logging to see if this is the cause.
        }
    }, [imgObj, points, simulationResult, draggingIdx, activePointIdx, showAiOverlay, analysis, showGoldenLines, goldenRatioData]);

    useEffect(() => {
        requestAnimationFrame(draw);
    }, [draw]);

    // ========================================
    // INTERACTION: Mouse Event Handlers
    // ========================================

    /**
     * Convert mouse event to canvas coordinates
     * Accounts for canvas scaling and positioning
     */
    const getMousePos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    /**
     * Handle mouse down - Start dragging landmark
     * 
     * Finds the nearest landmark within hit radius and begins drag operation.
     * Disabled during result view to prevent accidental modifications.
     */
    const handleMouseDown = (e) => {
        if (isSimulating || simulationResult) return; // Disable interaction on result view
        if (!canvasRef.current || canvasRef.current.clientWidth === 0) return;

        const { x, y } = getMousePos(e);
        let minDist = 12 * (canvasRef.current.width / canvasRef.current.clientWidth); // Scale hit area
        let idx = -1;

        points.forEach((p, i) => {
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                idx = i;
            }
        });

        if (idx !== -1) {
            setDraggingIdx(idx);
            setActivePointIdx(idx);
        }
    };

    /**
     * Handle mouse move - Update dragged landmark position
     */
    const handleMouseMove = (e) => {
        if (isSimulating) return;
        if (draggingIdx === null) return;
        const { x, y } = getMousePos(e);
        const activePoint = points[draggingIdx];

        setPoints(prev => {
            const next = [...prev];
            next[draggingIdx] = patchPoint3DFields(next[draggingIdx], x, y);
            return next;
        });

        setMeshPoints(prev => {
            if (!prev?.length) return prev;
            const next = [...prev];
            if (!activePoint) return prev;
            const meshIndex = activePoint.mpId ?? activePoint.index;
            if (meshIndex === undefined || !next[meshIndex]) return prev;
            next[meshIndex] = patchPoint3DFields(next[meshIndex], x, y);
            return next;
        });
    };

    /**
     * Handle mouse up - End drag operation
     */
    const handleMouseUp = () => {
        setDraggingIdx(null);
    };

    // Keyboard listener for landmark movement
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (activePointIdx === null || isSimulating || simulationResult) return;

            const step = e.shiftKey ? 5 : 1;
            let dx = 0;
            let dy = 0;

            switch (e.key) {
                case 'ArrowLeft': dx = -step; break;
                case 'ArrowRight': dx = step; break;
                case 'ArrowUp': dy = -step; break;
                case 'ArrowDown': dy = step; break;
                default: return;
            }

            e.preventDefault(); // Prevent scrolling

            setPoints(prev => {
                const next = [...prev];
                const p = next[activePointIdx];
                const movedPoint = patchPoint3DFields(p, p.x + dx, p.y + dy);
                next[activePointIdx] = movedPoint;
                return next;
            });

            setMeshPoints(prev => {
                if (!prev?.length) return prev;
                const next = [...prev];
                const sourcePoint = points[activePointIdx];
                if (!sourcePoint) return prev;
                const meshIndex = sourcePoint.mpId ?? sourcePoint.index;
                if (meshIndex === undefined || !next[meshIndex]) return prev;
                next[meshIndex] = patchPoint3DFields(next[meshIndex], next[meshIndex].x + dx, next[meshIndex].y + dy);
                return next;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activePointIdx, isSimulating, simulationResult, patchPoint3DFields, points]);

    // ========================================
    // HANDLERS: Simulation & Calibration
    // ========================================

    /**
     * Handle simulation execution
     * 
     * Process:
     * 1. Validate image is loaded
     * 2. Call AI service to generate outcome
     * 3. Calculate confidence score
     * 4. Update UI with result
     */
    const handleSimulate = async (landmarkSet = points) => {
        if (!imgObj) return;
        if (landmarkSet && typeof landmarkSet.preventDefault === 'function') {
            landmarkSet = points;
        }
        setIsSimulating(true);
        setSimulationStatus(`Rendering ${selectedProcedure.label}...`);
        setSimulationError('');
        setShowComparisonSlider(false);
        setAnalysis(null);
        setAnalysisError(null);
        setGoldenRatioData(null);
        try {
            const originalPoints = initialLandmarks.map(p => ({ ...p }));
            const procedureTargets = buildProcedureSimulationLandmarks(
                originalPoints,
                landmarkSet,
                selectedProcedureId,
                {
                    intensity: procedureIntensity,
                    width: imgObj.width,
                    height: imgObj.height
                }
            );
            const result = await aiServiceRef.current.generateOutcome(
                imgObj,
                originalPoints,
                procedureTargets,
                {
                    procedureId: selectedProcedureId,
                    intensity: procedureIntensity
                }
            );
            setSimulationResult(result);
            setShowComparisonSlider(true);

            // Calculate and store confidence from the same service that generated the result.
            const confidence = Math.round(
                aiServiceRef.current.computeConfidence(originalPoints, procedureTargets, { originalImage: imgObj }) * 100
            );
            const confidenceDetails = aiServiceRef.current.computeConfidenceDetails(
                originalPoints,
                procedureTargets,
                { originalImage: imgObj }
            );
            setSimulationConfidence(confidence);
            setSimulationConfidenceDetails(confidenceDetails);
            console.log("Simulation confidence:", confidence + "%");
            setSimulationStatus(`Completed ${selectedProcedure.label}.`);

            // Fire AI analysis after warp completes (non-blocking)
            setIsAnalyzing(true);
            AnalysisService.analyze(
                originalPoints,
                procedureTargets,
                calibrationData,
                { width: imgObj.width, height: imgObj.height },
                { goldenRatio: goldenRatioOn }
            ).then(result => {
                setAnalysis(result);
                if (result?.goldenRatio) setGoldenRatioData(result.goldenRatio);
            }).catch(err => {
                setAnalysisError('AI analysis unavailable: ' + err.message);
            }).finally(() => setIsAnalyzing(false));

        } catch (error) {
            console.error("Simulation failed:", error);
            setSimulationError(error?.message || 'Simulation failed');
            setSimulationStatus('');
        } finally {
            setIsSimulating(false);
        }
    };

    const handleGoldenRatioOnly = async () => {
        if (!points?.length) return;
        setIsGoldenLoading(true);
        setGoldenRatioData(null);
        try {
            const result = await AnalysisService.analyze(
                points, points, calibrationData,
                { width: imgObj?.width || 600, height: imgObj?.height || 800 },
                { goldenRatio: true }
            );
            if (result?.goldenRatio) setGoldenRatioData(result.goldenRatio);
            else setGoldenRatioData({ error: 'Could not calculate golden ratio' });
        } catch (e) {
            setGoldenRatioData({ error: e.message });
        } finally { setIsGoldenLoading(false); }
    };

    const handleResetLandmarks = () => {
        setPoints(initialLandmarks.map(p => ({ ...p })));
        setMeshPoints(
            initialMeshLandmarks
                ? initialMeshLandmarks.map(p => ({ ...p }))
                : initialLandmarks.map((p, index) => ({ index, ...p }))
        );
        setActivePointIdx(null);
    };

    const handleBeginAdjustment = () => {
        setSimulationResult(null);
        setShowComparisonSlider(false);
        setSimulationConfidence(null);
        setSimulationConfidenceDetails(null);
        setSimulationStatus('');
        setSimulationError('');
        setIsSimulating(false);
    };

    const handleLandmarkUpdate = (newPoint) => {
        if (activePointIdx === null || isSimulating) return;
        const updatedPoints = points.map((point, index) =>
            index === activePointIdx
                ? patchPoint3DFields(newPoint, newPoint.x, newPoint.y)
                : point
        );

        setPoints(updatedPoints);

        setMeshPoints(prev => {
            if (!prev?.length) return prev;
            const next = [...prev];
            const sourcePoint = points[activePointIdx];
            if (!sourcePoint) return prev;
            const meshIndex = sourcePoint.mpId ?? sourcePoint.index;
            if (meshIndex === undefined || !next[meshIndex]) return prev;
            next[meshIndex] = patchPoint3DFields(next[meshIndex], newPoint.x, newPoint.y);
            return next;
        });
    };

    /**
     * Handle calibration confirmation
     * 
     * Stores calibration data and enables simulation features.
     * 
     * @param {Object} data - Calibration data {ratio, method, confidence}
     */
    const handleCalibrationConfirm = (data) => {
        setCalibrationData(data);
        setIsCalibrated(true);
        setShowCalibration(false);
    };

    /**
     * Handle PDF export
     * Collects all simulation data and triggers PDF download.
     */
    const [isExporting, setIsExporting] = useState(false);

    const handleExportPDF = async () => {
        if (!simulationResult || !imgObj) return;
        setIsExporting(true);
        try {
            const originalPoints = initialLandmarks.map(p => ({ ...p }));
            const procedureTargets = buildProcedureSimulationLandmarks(
                originalPoints,
                points,
                selectedProcedureId,
                {
                    intensity: procedureIntensity,
                    width: imgObj.width,
                    height: imgObj.height
                }
            );
            await generateReport({
                simulationResult,
                originalImage: imgObj,
                initialLandmarks: originalPoints,
                currentPoints: procedureTargets,
                calibrationData,
                simulationConfidence,
                procedureLabel: selectedProcedure.label
            });
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('Failed to generate PDF report. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const confidenceLevel = simulationConfidence === null
        ? null
        : simulationConfidence > 80
            ? 'HIGH'
            : simulationConfidence >= 60
                ? 'MEDIUM'
                : 'LOW';

    const confidenceColor = confidenceLevel === 'HIGH'
        ? 'var(--success)'
        : confidenceLevel === 'MEDIUM'
            ? '#facc15'
            : '#ef4444';

    const sectionStyle = {
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '14px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.18)'
    };

    const sectionTitleStyle = {
        margin: '0 0 8px 0',
        color: 'var(--text-main)',
        fontSize: '0.82rem',
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase'
    };

    const helperTextStyle = {
        margin: '0 0 12px 0',
        color: 'var(--text-muted)',
        fontSize: '0.72rem',
        lineHeight: 1.45
    };

    const hasLandmarkEdits = points.some((point, index) => {
        const original = initialLandmarks[index];
        if (!original) return false;
        return Math.hypot(point.x - original.x, point.y - original.y) > 0.5;
    });

    const procedurePreviewTargets = imgObj
        ? buildProcedureSimulationLandmarks(
            initialLandmarks,
            points,
            selectedProcedureId,
            {
                intensity: procedureIntensity,
                width: imgObj.width,
                height: imgObj.height
            }
        )
        : points;

    const changedProcedurePoints = procedurePreviewTargets.filter((point, index) => {
        const original = initialLandmarks[index];
        if (!original || !point) return false;
        return Math.hypot(point.x - original.x, point.y - original.y) > 1;
    });

    const regionHighlightBox = imgObj && changedProcedurePoints.length > 0
        ? (() => {
            const xs = changedProcedurePoints.map(point => point.x);
            const ys = changedProcedurePoints.map(point => point.y);
            const padX = imgObj.width * 0.045;
            const padY = imgObj.height * 0.045;
            const left = Math.max(0, Math.min(...xs) - padX);
            const top = Math.max(0, Math.min(...ys) - padY);
            const right = Math.min(imgObj.width, Math.max(...xs) + padX);
            const bottom = Math.min(imgObj.height, Math.max(...ys) + padY);

            return {
                left: `${(left / imgObj.width) * 100}%`,
                top: `${(top / imgObj.height) * 100}%`,
                width: `${((right - left) / imgObj.width) * 100}%`,
                height: `${((bottom - top) / imgObj.height) * 100}%`
            };
        })()
        : null;

    const confidenceFactorRows = simulationConfidenceDetails
        ? [
            ['Image quality', simulationConfidenceDetails.factors.imageQuality],
            ['Face pose', simulationConfidenceDetails.factors.facePose],
            ['Movement scope', simulationConfidenceDetails.factors.movementScope],
            ['Detection quality', simulationConfidenceDetails.factors.detectionQuality]
        ]
        : [];

    const procedureCatalog = PROCEDURE_PRESETS.reduce((catalog, procedure) => {
        const existing = catalog.find(item => item.category === procedure.category);
        if (existing) {
            existing.items.push(procedure.catalogLabel || procedure.label);
        } else {
            catalog.push({
                category: procedure.category,
                items: [procedure.catalogLabel || procedure.label]
            });
        }
        return catalog;
    }, []);

    return (
        <div className="wajh-canvas-container" style={{
            position: 'relative',
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch', // Full height
            justifyContent: 'center',
            gap: '2rem',
            padding: '2rem',
            overflow: 'hidden'
        }}>
            {/* LEFT COLUMN: Inputs & Readout */}
            <div className="glass-panel" style={{
                flex: '0 0 450px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                justifyContent: 'flex-start',
                padding: '24px',
                overflowY: 'auto',
                overflowX: 'hidden',
                boxSizing: 'border-box'
            }}>
                <h3 style={{ color: 'var(--text-main)', marginBottom: '1px', fontSize: '1.125rem', fontWeight: 600 }}>
                    Surgical Controls
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '5px', lineHeight: 1.5 }}>
                    Select landmarks to view precise metrics or calibrate the image.
                </p>

                <div style={sectionStyle}>
                    <h4 style={sectionTitleStyle}>Landmark Editing</h4>
                    <p style={helperTextStyle}>
                        {simulationResult
                            ? 'Review mode is locked. Use Adjust Landmarks before editing points.'
                            : 'Drag landmarks to simulate surgical changes.'}
                    </p>
                    <SurgicalReadout
                        activeLandmark={activePointIdx !== null ? points[activePointIdx] : null}
                        originalPoint={activePointIdx !== null ? initialLandmarks[activePointIdx] : null}
                        currentPoint={activePointIdx !== null ? points[activePointIdx] : null}
                        allPoints={points}
                        pixelsToMm={calibrationData?.ratio}
                        onLandmarkUpdate={handleLandmarkUpdate}
                        onLandmarkSelect={(idx) => setActivePointIdx(idx)}
                    />
                </div>

                <div style={sectionStyle}>
                    <h4 style={sectionTitleStyle}>Calibration</h4>
                    <p style={helperTextStyle}>Set image scale before surgical measurement and simulation.</p>
                {!isCalibrated && (
                    <div style={{
                        padding: '15px',
                        background: 'var(--warning-glow)',
                        color: 'var(--warning)',
                        borderRadius: '8px',
                        border: '1px solid var(--warning)',
                        fontSize: '0.875rem',
                        backdropFilter: 'blur(4px)'
                    }}>
                        ⚠ Calibration Required
                        <button
                            onClick={() => setShowCalibration(true)}
                            style={{
                                display: 'block',
                                marginTop: '10px',
                                padding: '12px 16px',
                                background: 'var(--warning)',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '700',
                                width: '100%',
                                color: '#fff',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                fontSize: '0.75rem',
                                transition: 'all var(--transition-fast)',
                                boxShadow: '0 4px 12px var(--warning-glow)'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                            onMouseLeave={(e) => e.target.style.opacity = '1'}
                        >
                            Calibrate Image
                        </button>
                    </div>
                )}

                {isCalibrated && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', fontWeight: 600 }}>
                        Calibrated ({calibrationData?.method})
                        <button onClick={() => setShowCalibration(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem', transition: 'color var(--transition-fast)' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                            Recalibrate
                        </button>
                    </div>
                )}
                </div>
            </div>

            {/* CENTER COLUMN: Patient Image / Before-After Review */}
            <div style={{
                flex: '2',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
                {simulationResult && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '12px 14px',
                        background: 'rgba(20, 24, 32, 0.72)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        color: 'var(--text-main)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                                Before / After Review
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Left panel is the original. Right panel is the simulation with the draggable overlay slider.
                            </div>
                        </div>
                        {simulationConfidence && (
                            <div style={{
                                flex: '0 0 auto',
                                color: confidenceColor,
                                fontSize: '0.85rem',
                                fontWeight: 800
                            }}>
                                {confidenceLevel} {simulationConfidence}% confidence
                            </div>
                        )}
                    </div>
                )}
                <div style={{
                    flex: '1',
                    display: 'flex',
                    gap: simulationResult ? '14px' : '0',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    background: '#000',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), 0 0 0 1px var(--border-subtle)',
                    border: '1px solid var(--border-subtle)',
                    padding: simulationResult ? '14px' : 0
                }}>
                    {simulationResult && (
                        <div style={{
                            flex: '1 1 0',
                            height: '100%',
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            background: '#000',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                left: '12px',
                                zIndex: 1,
                                padding: '6px 10px',
                                borderRadius: '999px',
                                background: 'rgba(10, 12, 16, 0.72)',
                                border: '1px solid var(--border-medium)',
                                color: 'var(--text-main)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                backdropFilter: 'blur(8px)'
                            }}>
                                Before
                            </div>
                            <img
                                src={imageSrc}
                                alt="Original patient before simulation"
                                style={{
                                    height: 'auto',
                                    width: 'auto',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
                                    filter: isSimulating ? 'blur(3px) grayscale(40%)' : 'none',
                                    transition: 'filter var(--transition-normal)'
                                }}
                            />
                        </div>
                    )}
                    <div style={{
                        flex: simulationResult ? '1 1 0' : '0 1 auto',
                        height: '100%',
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        background: '#000',
                        border: simulationResult ? '1px solid var(--border-subtle)' : 'none',
                        borderRadius: simulationResult ? '10px' : 0,
                        overflow: simulationResult ? 'hidden' : 'visible'
                    }}>
                        {simulationResult && (
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                left: '12px',
                                zIndex: 1,
                                padding: '6px 10px',
                                borderRadius: '999px',
                                background: 'rgba(10, 12, 16, 0.72)',
                                border: '1px solid var(--border-medium)',
                                color: 'var(--text-main)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                backdropFilter: 'blur(8px)'
                            }}>
                                After
                            </div>
                        )}
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            style={{
                                height: '100%',
                                width: 'auto',
                                maxWidth: '100%',
                                objectFit: 'contain',
                                boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
                                cursor: (isSimulating || simulationResult) ? 'default' : draggingIdx !== null ? 'grabbing' : 'grab',
                                transition: 'filter var(--transition-normal)',
                                filter: isSimulating ? 'blur(3px) grayscale(40%)' : 'none'
                            }}
                        />
                        {simulationResult && showComparisonSlider && (
                            <>
                                <div style={{
                                    position: 'absolute',
                                    top: '48px',
                                    left: '12px',
                                    zIndex: 2,
                                    padding: '5px 8px',
                                    borderRadius: '999px',
                                    background: 'rgba(10, 12, 16, 0.72)',
                                    border: '1px solid var(--border-medium)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    backdropFilter: 'blur(8px)',
                                    pointerEvents: 'none'
                                }}>
                                    {comparisonMode === 'difference' ? 'Difference overlay' : comparisonMode === 'region' ? 'Region focus' : 'Before overlay'}
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    top: '48px',
                                    right: '12px',
                                    zIndex: 2,
                                    padding: '5px 8px',
                                    borderRadius: '999px',
                                    background: 'rgba(10, 12, 16, 0.72)',
                                    border: '1px solid var(--border-medium)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    backdropFilter: 'blur(8px)',
                                    pointerEvents: 'none'
                                }}>
                                    After
                                </div>
                                {(comparisonMode === 'split' || comparisonMode === 'difference') && (
                                    <img
                                        src={imageSrc}
                                        alt="Original patient comparison overlay"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            height: '100%',
                                            width: '100%',
                                            objectFit: 'contain',
                                            clipPath: comparisonMode === 'split'
                                                ? `inset(0 ${100 - comparisonSplit}% 0 0)`
                                                : 'none',
                                            mixBlendMode: comparisonMode === 'difference' ? 'difference' : 'normal',
                                            opacity: comparisonMode === 'difference' ? 0.72 : 1,
                                            filter: comparisonMode === 'difference' ? 'saturate(1.25) contrast(1.15)' : 'none',
                                            pointerEvents: 'none',
                                            transition: 'clip-path var(--transition-fast), opacity var(--transition-fast)'
                                        }}
                                    />
                                )}
                                {comparisonMode === 'difference' && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(14, 165, 233, 0.12)',
                                        mixBlendMode: 'screen',
                                        pointerEvents: 'none'
                                    }} />
                                )}
                                {comparisonMode === 'region' && regionHighlightBox && (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(0, 0, 0, 0.42)',
                                            pointerEvents: 'none'
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            ...regionHighlightBox,
                                            border: '2px solid rgba(14, 165, 233, 0.95)',
                                            boxShadow: '0 0 0 999px rgba(0, 0, 0, 0.12), 0 0 22px rgba(14, 165, 233, 0.65)',
                                            borderRadius: '10px',
                                            pointerEvents: 'none'
                                        }} />
                                    </>
                                )}
                                {comparisonMode === 'split' && (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            bottom: 0,
                                            left: `${comparisonSplit}%`,
                                            width: '2px',
                                            transform: 'translateX(-1px)',
                                            background: 'rgba(255,255,255,0.85)',
                                            boxShadow: '0 0 16px rgba(14, 165, 233, 0.8)',
                                            pointerEvents: 'none'
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            left: `${comparisonSplit}%`,
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '34px',
                                            height: '34px',
                                            borderRadius: '999px',
                                            background: 'rgba(10, 12, 16, 0.78)',
                                            border: '1px solid rgba(255,255,255,0.55)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.8rem',
                                            fontWeight: 800,
                                            pointerEvents: 'none',
                                            backdropFilter: 'blur(8px)'
                                        }}>
                                            ||
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={comparisonSplit}
                                            aria-label="Before after comparison split"
                                            onChange={(e) => setComparisonSplit(Number(e.target.value))}
                                            style={{
                                                position: 'absolute',
                                                left: '24px',
                                                right: '24px',
                                                bottom: '18px',
                                                width: 'calc(100% - 48px)',
                                                accentColor: 'var(--primary)',
                                                cursor: 'ew-resize'
                                            }}
                                        />
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    {isSimulating && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            background: 'rgba(0, 0, 0, 0.48)',
                            color: 'var(--text-main)',
                            backdropFilter: 'blur(4px)',
                            pointerEvents: 'auto'
                        }}>
                            <div className="spinner"></div>
                            <strong>Analyzing face...</strong>
                        </div>
                    )}
                    {!imgObj && <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>Loading Canvas...</p>}
                </div>

                {/* Clinical Disclaimer Overlay - Now below canvas */}
                <div style={{
                    background: 'rgba(20, 20, 20, 0.4)',
                    color: 'rgba(255, 255, 255, 0.3)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.55rem',
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.03)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    width: '100%',
                    backdropFilter: 'blur(4px)'
                }}>
                    ⚠ Clinical Planning Aid Only. Not for direct surgical guidance
                </div>
            </div>

            {/* RIGHT COLUMN: Actions & Simulation Status */}
            <div style={{
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                justifyContent: 'flex-start',
                alignItems: 'stretch',
                maxWidth: '300px',
                paddingTop: '20px',
                maxHeight: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: '4px'
            }}>
                <div style={sectionStyle}>
                    <h3 style={{ ...sectionTitleStyle, fontSize: '0.9rem' }}>
                        Simulation
                    </h3>
                    <p style={helperTextStyle}>
                        Generate, compare, and export the predicted surgical outcome.
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '7px',
                        marginBottom: '12px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}>
                        <div style={{ ...sectionTitleStyle, margin: 0, fontSize: '0.72rem' }}>
                            Procedure Catalog
                        </div>
                        {procedureCatalog.map(group => (
                            <div
                                key={group.category}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '70px 1fr',
                                    gap: '8px',
                                    alignItems: 'start',
                                    fontSize: '0.68rem',
                                    lineHeight: 1.35
                                }}
                            >
                                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                                    {group.category}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>
                                    {group.items.join(', ')}
                                </span>
                            </div>
                        ))}
                    </div>

                {isCalibrated && !simulationResult ? (
                    // Editing Mode Actions
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                                gap: '8px'
                            }}>
                                <span style={{ ...sectionTitleStyle, margin: 0, fontSize: '0.74rem' }}>
                                    Procedure Preset
                                </span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>
                                    Orthognathic plan
                                </span>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                gap: '8px'
                            }}>
                                {PROCEDURE_PRESETS.map((procedure) => {
                                    const isSelected = procedure.id === selectedProcedureId;
                                    return (
                                        <div key={procedure.id} style={{ position: 'relative' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProcedureId(procedure.id)}
                                                style={{
                                                    textAlign: 'left',
                                                    padding: '10px 28px 9px 10px',
                                                    borderRadius: '8px',
                                                    border: isSelected
                                                        ? '1px solid var(--primary)'
                                                        : '1px solid var(--border-medium)',
                                                    background: isSelected
                                                        ? 'rgba(14, 165, 233, 0.16)'
                                                        : 'rgba(255, 255, 255, 0.03)',
                                                    color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    transition: 'all var(--transition-fast)',
                                                    minHeight: '64px',
                                                    width: '100%'
                                                }}
                                            >
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
                                                    {procedure.label}
                                                </div>
                                                <div style={{ fontSize: '0.64rem', marginTop: '4px', opacity: 0.8, lineHeight: 1.25 }}>
                                                    {procedure.category}
                                                </div>
                                            </button>
                                            {/* Info button */}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setInfoProcedure(procedure); }}
                                                title="Learn about this procedure"
                                                style={{
                                                    position: 'absolute', top: 6, right: 6,
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    background: 'rgba(255,255,255,0.06)',
                                                    color: 'rgba(255,255,255,0.5)',
                                                    cursor: 'pointer', fontSize: '0.65rem',
                                                    fontWeight: 700, display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    lineHeight: 1, padding: 0
                                                }}
                                            >
                                                i
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{
                                borderTop: '1px solid var(--border-subtle)',
                                paddingTop: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                <div style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 700 }}>
                                    {selectedProcedure.label}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.45 }}>
                                    {selectedProcedure.summary}
                                </div>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', lineHeight: 1.45 }}>
                                    {selectedProcedure.pattern}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                    {selectedProcedure.affectedRegions?.map(region => (
                                        <span
                                            key={region}
                                            style={{
                                                padding: '4px 7px',
                                                borderRadius: '999px',
                                                border: '1px solid var(--border-medium)',
                                                color: 'var(--text-muted)',
                                                fontSize: '0.62rem',
                                                fontWeight: 700
                                            }}
                                        >
                                            {region}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.72rem'
                                }}>
                                    <span>Simulation strength</span>
                                    <span>{procedureIntensity.toFixed(2)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.75"
                                    max="1.5"
                                    step="0.05"
                                    value={procedureIntensity}
                                onChange={(e) => setProcedureIntensity(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        accentColor: 'var(--primary)',
                                        cursor: 'ew-resize'
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            className="btn-primary-gradient"
                            type="button"
                            onClick={() => handleSimulate()}
                            disabled={isSimulating}
                            style={{
                                padding: '20px',
                                fontSize: '1.05rem',
                                borderRadius: '12px',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                opacity: isSimulating ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                width: '100%'
                            }}
                        >
                            {isSimulating
                                ? `Simulating ${selectedProcedure.label}...`
                                : `Simulate ${selectedProcedure.label}`}
                        </button>

                        {!hasLandmarkEdits && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(14, 165, 233, 0.35)',
                                background: 'rgba(14, 165, 233, 0.08)',
                                color: 'var(--text-main)',
                                fontSize: '0.76rem',
                                lineHeight: 1.4
                            }}>
                                The selected procedure will still produce an outcome even before manual edits.
                            </div>
                        )}

                        {(simulationStatus || simulationError) && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: simulationError
                                    ? '1px solid rgba(239, 68, 68, 0.45)'
                                    : '1px solid rgba(34, 197, 94, 0.35)',
                                background: simulationError
                                    ? 'rgba(239, 68, 68, 0.08)'
                                    : 'rgba(34, 197, 94, 0.08)',
                                color: simulationError ? '#fca5a5' : '#86efac',
                                fontSize: '0.76rem',
                                lineHeight: 1.45
                            }}>
                                {simulationError || simulationStatus}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleResetLandmarks}
                            disabled={isSimulating}
                            style={{
                                padding: '12px',
                                fontSize: '0.875rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-medium)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                opacity: isSimulating ? 0.5 : 1,
                                transition: 'all var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => !isSimulating && (e.target.style.background = 'var(--bg-elevated)')}
                            onMouseLeave={(e) => !isSimulating && (e.target.style.background = 'var(--bg-surface)')}
                            >
                                Reset Landmarks
                        </button>
                    </div>
                ) : simulationResult ? (
                    // Result Mode Actions
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                        <div style={{
                            padding: '15px',
                            background: 'var(--success-glow)',
                            border: '1px solid var(--success)',
                            borderRadius: '8px',
                            color: 'var(--success)',
                            textAlign: 'center',
                            backdropFilter: 'blur(4px)',
                            fontWeight: 600
                        }}>
                            <strong>Simulation Complete</strong>
                        </div>

                        {/* Confidence Meter */}
                        {simulationConfidence && (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                padding: '15px',
                                backdropFilter: 'blur(4px)'
                            }}>
                                <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prediction Confidence</span>
                                    <span style={{
                                        fontSize: '1.125rem',
                                        fontWeight: 'bold',
                                        color: confidenceColor
                                    }}>
                                        {simulationConfidence}%
                                    </span>
                                </div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '10px',
                                    padding: '4px 8px',
                                    borderRadius: '999px',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${confidenceColor}`,
                                    color: confidenceColor,
                                    fontSize: '0.72rem',
                                    fontWeight: 800
                                }}>
                                    {confidenceLevel}
                                </div>

                                {/* Progress Bar */}
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        width: simulationConfidence + '%',
                                        height: '100%',
                                        background: confidenceLevel === 'HIGH'
                                            ? 'linear-gradient(90deg, var(--success), #4ade80)'
                                            : confidenceLevel === 'MEDIUM'
                                                ? 'linear-gradient(90deg, #facc15, #fde047)'
                                                : 'linear-gradient(90deg, #ef4444, #f87171)',
                                        borderRadius: '4px',
                                        transition: 'width 1s ease-out',
                                        boxShadow: confidenceLevel === 'HIGH'
                                            ? '0 0 10px rgba(34, 197, 94, 0.5)'
                                            : confidenceLevel === 'MEDIUM'
                                                ? '0 0 10px rgba(250, 204, 21, 0.5)'
                                                : '0 0 10px rgba(239, 68, 68, 0.5)'
                                    }} />
                                </div>

                                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                                    Image quality, pose, movement scope, and {calibrationData?.confidence || 'Medium'} calibration accuracy
                                </div>

                                {confidenceFactorRows.length > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '7px',
                                        marginTop: '12px'
                                    }}>
                                        {confidenceFactorRows.map(([label, value]) => (
                                            <div key={label} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 34px', gap: '7px', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{label}</span>
                                                <div style={{
                                                    height: '5px',
                                                    borderRadius: '999px',
                                                    background: 'rgba(255,255,255,0.06)',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${Math.round(value * 100)}%`,
                                                        height: '100%',
                                                        background: value >= 0.78
                                                            ? 'var(--success)'
                                                            : value >= 0.58
                                                                ? '#facc15'
                                                                : '#ef4444'
                                                    }} />
                                                </div>
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem', textAlign: 'right' }}>
                                                    {Math.round(value * 100)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: '8px'
                        }}>
                            {[
                                ['split', 'Slider'],
                                ['difference', 'Diff'],
                                ['region', 'Region']
                            ].map(([mode, label]) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                        setComparisonMode(mode);
                                        setShowComparisonSlider(true);
                                    }}
                                    style={{
                                        padding: '10px 6px',
                                        borderRadius: '8px',
                                        border: comparisonMode === mode
                                            ? '1px solid var(--primary)'
                                            : '1px solid var(--border-medium)',
                                        background: comparisonMode === mode
                                            ? 'rgba(14, 165, 233, 0.18)'
                                            : 'rgba(255, 255, 255, 0.03)',
                                        color: comparisonMode === mode ? 'var(--text-main)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.74rem',
                                        fontWeight: 800
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowComparisonSlider(prev => !prev)}
                            style={{
                                padding: '12px',
                                fontSize: '0.875rem',
                                borderRadius: '8px',
                                border: '1px solid var(--primary)',
                                background: showComparisonSlider ? 'rgba(14, 165, 233, 0.22)' : 'rgba(14, 165, 233, 0.08)',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                transition: 'all var(--transition-fast)'
                            }}
                            title="Overlay original and simulated image with a draggable split."
                        >
                            {showComparisonSlider ? 'Overlay Slider: On' : 'Overlay Slider: Off'}
                        </button>

                        <button
                            type="button"
                            onClick={handleBeginAdjustment}
                            style={{
                                padding: '12px',
                                fontSize: '0.875rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-medium)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-elevated)'}
                            onMouseLeave={(e) => e.target.style.background = 'var(--bg-surface)'}
                        >
                            Adjust Landmarks
                        </button>

                        {/* ── Golden Ratio Toggle ───────────────────────── */}
                        <div style={{
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                            padding:'12px 16px', borderRadius:'8px',
                            background:'rgba(251,191,36,0.06)',
                            border:'1px solid rgba(251,191,36,0.25)'
                        }}>
                            <div>
                                <div style={{color:'#fbbf24',fontWeight:700,fontSize:'0.82rem'}}>
                                    φ Golden Ratio Mode
                                </div>
                                <div style={{color:'var(--text-muted)',fontSize:'0.7rem',marginTop:2}}>
                                    Measure face against φ = 1.618
                                </div>
                            </div>
                            <button
                                onClick={() => setGoldenRatioOn(v => !v)}
                                style={{
                                    width:44, height:24, borderRadius:12, border:'none',
                                    background: goldenRatioOn ? '#fbbf24' : 'var(--bg-elevated)',
                                    cursor:'pointer', position:'relative', transition:'all 0.2s',
                                    flexShrink:0
                                }}
                            >
                                <span style={{
                                    position:'absolute', top:3,
                                    left: goldenRatioOn ? 23 : 3,
                                    width:18, height:18, borderRadius:'50%',
                                    background:'white', transition:'left 0.2s',
                                    display:'block'
                                }}/>
                            </button>
                        </div>

                        {/* Standalone Golden Ratio button */}
                        <button
                            type="button"
                            onClick={handleGoldenRatioOnly}
                            disabled={isGoldenLoading}
                            style={{
                                padding:'11px 14px', fontSize:'0.82rem', borderRadius:'8px',
                                border:'1px solid rgba(251,191,36,0.4)',
                                background: isGoldenLoading ? 'rgba(251,191,36,0.05)' : 'rgba(251,191,36,0.1)',
                                color:'#fbbf24', cursor: isGoldenLoading ? 'wait' : 'pointer',
                                fontWeight:700, width:'100%',
                                display:'flex', alignItems:'center', justifyContent:'center', gap:8
                            }}
                        >
                            {isGoldenLoading ? 'Analysing...' : 'φ Analyse Golden Ratio Now'}
                        </button>

                        {/* ── Golden Ratio Results Panel ─────────────────────── */}
                        {goldenRatioData && !goldenRatioData.error && (
                            <div style={{
                                background:'rgba(251,191,36,0.04)',
                                border:'1px solid rgba(251,191,36,0.3)',
                                borderRadius:10, padding:16,
                                display:'flex', flexDirection:'column', gap:12
                            }}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                    <h4 style={{color:'#fbbf24',margin:0,fontSize:'0.88rem',fontWeight:700}}>
                                        φ Golden Ratio Analysis
                                    </h4>
                                    <button
                                        onClick={() => setShowGoldenLines(v=>!v)}
                                        style={{
                                            fontSize:'0.68rem', padding:'3px 8px', borderRadius:4,
                                            border:'1px solid rgba(251,191,36,0.4)',
                                            background: showGoldenLines ? 'rgba(251,191,36,0.15)' : 'transparent',
                                            color:'#fbbf24', cursor:'pointer', fontWeight:600
                                        }}
                                    >
                                        {showGoldenLines ? '— Lines On' : '— Lines Off'}
                                    </button>
                                </div>

                                {/* Harmony Score */}
                                <div style={{
                                    background:'rgba(251,191,36,0.08)', borderRadius:8,
                                    padding:'10px 14px', display:'flex',
                                    alignItems:'center', justifyContent:'space-between'
                                }}>
                                    <div>
                                        <div style={{color:'var(--text-muted)',fontSize:'0.7rem',textTransform:'uppercase',letterSpacing:'0.07em'}}>
                                            Harmony Score
                                        </div>
                                        <div style={{
                                            color: goldenRatioData.harmonyScore >= 80 ? '#34d399'
                                                : goldenRatioData.harmonyScore >= 60 ? '#fbbf24' : '#f87171',
                                            fontWeight:700, fontSize:'1.6rem', fontFamily:'monospace'
                                        }}>
                                            {goldenRatioData.harmonyScore}
                                            <span style={{fontSize:'0.8rem',fontWeight:400}}>/100</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        fontSize:'0.72rem', color:'var(--text-muted)',
                                        maxWidth:160, textAlign:'right', lineHeight:1.5
                                    }}>
                                        {goldenRatioData.overallAssessment}
                                    </div>
                                </div>

                                {/* Ratio breakdown */}
                                {Object.values(goldenRatioData.ratios || {}).map((r, i) => (
                                    <div key={i} style={{
                                        padding:'8px 12px', borderRadius:6,
                                        background:'rgba(255,255,255,0.03)',
                                        border:'1px solid rgba(255,255,255,0.06)'
                                    }}>
                                        <div style={{
                                            display:'flex', justifyContent:'space-between',
                                            alignItems:'center', marginBottom:6
                                        }}>
                                            <span style={{color:'var(--text-main)',fontSize:'0.78rem',fontWeight:500}}>
                                                {r.label}
                                            </span>
                                            <span style={{
                                                fontSize:'0.68rem', padding:'2px 7px', borderRadius:12,
                                                background: r.within_norm ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                                                color: r.within_norm ? '#34d399' : '#f87171', fontWeight:600
                                            }}>
                                                {r.within_norm ? '✓ Within norm' : '⚠ Deviation'}
                                            </span>
                                        </div>
                                        <div style={{display:'flex',gap:16,fontSize:'0.75rem'}}>
                                            <span style={{color:'var(--text-muted)'}}>
                                                Current: <b style={{color:'var(--text-main)'}}>{r.current}</b>
                                            </span>
                                            <span style={{color:'var(--text-muted)'}}>
                                                Ideal φ: <b style={{color:'#fbbf24'}}>{r.ideal}</b>
                                            </span>
                                            <span style={{color:'var(--text-muted)'}}>
                                                Δ: <b style={{color: r.within_norm ? '#34d399' : '#f87171'}}>
                                                    {r.deviation_mm} mm
                                                </b>
                                            </span>
                                        </div>
                                        {!r.within_norm && (
                                            <div style={{ marginTop:8 }}>
                                                <div style={{
                                                    fontSize:'0.72rem',
                                                    color:'rgba(251,191,36,0.9)',
                                                    fontWeight:600, marginBottom:4
                                                }}>
                                                    Required correction: {r.deviation_mm} mm
                                                </div>
                                                <div style={{
                                                    fontSize:'0.7rem',
                                                    color:'rgba(251,191,36,0.65)',
                                                    lineHeight:1.5
                                                }}>
                                                    {r.label === 'Lower / Upper Face Height'
                                                        ? `→ Move Gnathion and Menton ${r.deviation_mm}mm ${r.current > r.ideal ? 'superiorly (up)' : 'inferiorly (down)'} to reach φ ratio`
                                                        : r.label === 'Jaw Width / Face Width'
                                                        ? `→ Move Gonion Left and Gonion Right ${r.deviation_mm}mm ${r.current > r.ideal ? 'inward (medially)' : 'outward (laterally)'} to reach φ ratio`
                                                        : `→ Adjust ${r.label} landmarks by ${r.deviation_mm}mm to reach φ ratio`
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── AI Procedure Recommendation Panel ──────────────── */}
                        {(isAnalyzing || analysis || analysisError) && (
                            <div style={{
                                background:'rgba(56,189,248,0.04)',
                                border:'1px solid rgba(56,189,248,0.25)',
                                borderRadius:10, padding:16,
                                display:'flex', flexDirection:'column', gap:12
                            }}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                    <h4 style={{color:'#38bdf8',margin:0,fontSize:'0.88rem',fontWeight:700}}>
                                        ⚕ Procedure Recommendation
                                    </h4>
                                    {analysis && (
                                        <button
                                            onClick={() => setShowAiOverlay(v=>!v)}
                                            style={{
                                                fontSize:'0.68rem', padding:'3px 8px', borderRadius:4,
                                                border:'1px solid rgba(56,189,248,0.4)',
                                                background: showAiOverlay ? 'rgba(56,189,248,0.15)' : 'transparent',
                                                color:'#38bdf8', cursor:'pointer', fontWeight:600
                                            }}
                                        >
                                            {showAiOverlay ? '◆ Overlay On' : '◇ Overlay Off'}
                                        </button>
                                    )}
                                </div>

                                {isAnalyzing && (
                                    <div style={{color:'var(--text-muted)',fontSize:'0.8rem',display:'flex',gap:8,alignItems:'center'}}>
                                        <span style={{
                                            width:10,height:10,borderRadius:'50%',
                                            border:'2px solid #38bdf8',borderTopColor:'transparent',
                                            display:'inline-block',
                                            animation:'spin 0.8s linear infinite'
                                        }}/>
                                        Analysing landmark movements...
                                    </div>
                                )}

                                {analysisError && (
                                    <p style={{color:'#f87171',fontSize:'0.8rem',margin:0}}>{analysisError}</p>
                                )}

                                {analysis && !analysis.insufficient && (<>
                                    {/* Procedure name */}
                                    <div style={{
                                        background:'rgba(56,189,248,0.08)',
                                        borderRadius:6, padding:'10px 12px'
                                    }}>
                                        <div style={{color:'#38bdf8',fontWeight:700,fontSize:'0.92rem'}}>
                                            {analysis.procedure}
                                        </div>
                                        {analysis.classification && (
                                            <div style={{color:'var(--text-muted)',fontSize:'0.75rem',marginTop:3}}>
                                                {analysis.classification}
                                            </div>
                                        )}
                                        <div style={{
                                            display:'inline-block', marginTop:6,
                                            padding:'2px 8px', borderRadius:20,
                                            fontSize:'0.68rem', fontWeight:600,
                                            background: analysis.confidence==='high' ? 'rgba(52,211,153,0.15)'
                                                : analysis.confidence==='medium' ? 'rgba(251,191,36,0.15)'
                                                : 'rgba(248,113,113,0.15)',
                                            color: analysis.confidence==='high' ? '#34d399'
                                                : analysis.confidence==='medium' ? '#fbbf24' : '#f87171'
                                        }}>
                                            {(analysis.confidence||'medium').toUpperCase()} CONFIDENCE
                                            {analysis.confidencePct ? ` — ${analysis.confidencePct}%` : ''}
                                        </div>
                                        {analysis.bothAgree && (
                                            <div style={{
                                                display:'inline-block', marginTop:6, marginLeft:6,
                                                padding:'2px 8px', borderRadius:20,
                                                fontSize:'0.68rem', fontWeight:600,
                                                background:'rgba(52,211,153,0.1)', color:'#34d399'
                                            }}>
                                                ✓ ML + Rules Agree
                                            </div>
                                        )}
                                    </div>

                                    {/* Clinical reasoning */}
                                    {analysis.reasoning && (
                                        <p style={{
                                            color:'var(--text-main)',fontSize:'0.78rem',
                                            lineHeight:1.6, margin:0
                                        }}>
                                            {analysis.reasoning}
                                        </p>
                                    )}

                                    {/* Required landmark movements */}
                                    {analysis.measurements?.length > 0 && (
                                        <div>
                                            <div style={{
                                                fontSize:'0.68rem', color:'var(--text-muted)',
                                                textTransform:'uppercase', letterSpacing:'0.07em',
                                                marginBottom:6, fontWeight:600
                                            }}>
                                                Landmarks to Move ({analysis.measurements.length} key points)
                                            </div>
                                            <div style={{
                                                fontSize:'0.7rem', color:'var(--text-muted)',
                                                marginBottom:10, lineHeight:1.5
                                            }}>
                                                Move these landmarks by the specified amount to achieve the recommended procedure:
                                            </div>
                                            {analysis.measurements.map((m,i) => (
                                                <div key={i} style={{
                                                    padding:'9px 12px', marginBottom:6,
                                                    background:'rgba(56,189,248,0.04)',
                                                    borderRadius:8,
                                                    border:'1px solid rgba(56,189,248,0.15)'
                                                }}>
                                                    <div style={{
                                                        display:'flex', justifyContent:'space-between',
                                                        alignItems:'center', marginBottom:4
                                                    }}>
                                                        <span style={{
                                                            fontSize:'0.82rem',
                                                            color:'var(--text-main)',
                                                            fontWeight:700
                                                        }}>
                                                            {m.landmark}
                                                        </span>
                                                        <span style={{
                                                            fontSize:'0.82rem', color:'#38bdf8',
                                                            fontWeight:700, fontFamily:'monospace',
                                                            background:'rgba(56,189,248,0.1)',
                                                            padding:'2px 8px', borderRadius:4
                                                        }}>
                                                            {m.direction} {Math.abs(m.deltaMm).toFixed(1)} mm
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        fontSize:'0.7rem', color:'var(--text-muted)',
                                                        lineHeight:1.4
                                                    }}>
                                                        → Drag this landmark{' '}
                                                        {m.direction === 'advance' ? 'forward (anteriorly)' :
                                                         m.direction === 'retract' ? 'backward (posteriorly)' :
                                                         m.direction === 'superior' ? 'upward' :
                                                         m.direction === 'inferior' ? 'downward' :
                                                         m.direction === 'left' ? 'to the left' :
                                                         m.direction === 'right' ? 'to the right' : m.direction}
                                                        {' '}by {Math.abs(m.deltaMm).toFixed(1)} mm
                                                    </div>
                                                </div>
                                            ))}
                                            <div style={{
                                                marginTop:8, padding:'8px 12px',
                                                background:'rgba(52,211,153,0.06)',
                                                border:'1px solid rgba(52,211,153,0.2)',
                                                borderRadius:6, fontSize:'0.7rem',
                                                color:'rgba(52,211,153,0.8)', lineHeight:1.5
                                            }}>
                                                💡 Select each landmark from the dropdown on the left, then use Precision mode to enter the exact mm value.
                                            </div>
                                        </div>
                                    )}

                                    {/* Top 3 alternatives */}
                                    {analysis.top3?.length > 1 && (
                                        <details style={{marginTop:4}}>
                                            <summary style={{
                                                fontSize:'0.72rem', color:'var(--text-muted)',
                                                cursor:'pointer'
                                            }}>
                                                Other possibilities
                                            </summary>
                                            <div style={{marginTop:8, display:'flex', flexDirection:'column', gap:4}}>
                                                {analysis.top3.slice(1).map((t,i) => (
                                                    <div key={i} style={{
                                                        display:'flex', justifyContent:'space-between',
                                                        fontSize:'0.73rem', color:'var(--text-muted)',
                                                        padding:'4px 8px',
                                                        background:'rgba(255,255,255,0.02)',
                                                        borderRadius:4
                                                    }}>
                                                        <span>{t.procedure}</span>
                                                        <span style={{fontFamily:'monospace'}}>{t.probability}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </>)}

                                {analysis?.insufficient && (
                                    <div style={{
                                        color:'#fbbf24', fontSize:'0.8rem',
                                        background:'rgba(251,191,36,0.08)',
                                        padding:'10px 12px', borderRadius:6
                                    }}>
                                        ⚠ {analysis.message}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Export PDF */}
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            disabled={isExporting}
                            style={{
                                padding: '14px',
                                fontSize: '0.9rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                background: isExporting ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                cursor: isExporting ? 'wait' : 'pointer',
                                fontWeight: '700',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                opacity: isExporting ? 0.7 : 1,
                                transition: 'all var(--transition-fast)',
                                boxShadow: isExporting ? 'none' : '0 0 12px rgba(239, 68, 68, 0.15)',
                                letterSpacing: '0.03em'
                            }}
                            onMouseEnter={(e) => { if (!isExporting) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                            onMouseLeave={(e) => { if (!isExporting) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        >
                            {isExporting ? (
                                <>Generating PDF...</>
                            ) : (
                                <>Export PDF Report</>
                            )}
                        </button>
                    </div>
                ) : (
                    // Not Calibrated State
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                        Calibrate the image to enable simulation actions.
                    </div>
                )}
                </div>

                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '10px'
                }}>
                    <button
                        type="button"
                        onClick={() => setIs3DPanelOpen(prev => !prev)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'transparent',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-main)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        <span>3D Face Landmarks</span>
                        <span>{is3DPanelOpen ? 'Hide' : 'Show'}</span>
                    </button>

                    {is3DPanelOpen && (
                        <div style={{ marginTop: '10px' }}>
                            <FaceMesh3DViewer
                                landmarks={meshPoints.length ? meshPoints : points}
                                activeMeshIndex={activePointIdx !== null ? (points[activePointIdx]?.mpId ?? activePointIdx) : null}
                            />
                        </div>
                    )}
                </div>
            </div>

            {showCalibration && imgObj && (
                <CalibrationModal
                    imageObj={imgObj}
                    detectedLandmarks={initialLandmarks}
                    onConfirm={handleCalibrationConfirm}
                    onCancel={() => setShowCalibration(false)}
                />
            )}



                {/* ── Procedure Info Modal ─────────────────────────────── */}
                {infoProcedure && (
                    <>
                        <div
                            onClick={() => setInfoProcedure(null)}
                            style={{
                                position: 'fixed', inset: 0,
                                background: 'rgba(0,0,0,0.6)',
                                zIndex: 200, backdropFilter: 'blur(4px)'
                            }}
                        />
                        <div style={{
                            position: 'fixed',
                            top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 201,
                            background: 'var(--bg-elevated, #1a2235)',
                            border: '1px solid rgba(56,189,248,0.3)',
                            borderRadius: 14,
                            padding: '28px 28px 24px',
                            width: '520px', maxWidth: '90vw',
                            maxHeight: '80vh', overflowY: 'auto',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
                        }}>
                            {/* Header */}
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#38bdf8', marginBottom:4 }}>
                                        {infoProcedure.label}
                                    </div>
                                    <div style={{
                                        display:'inline-block', padding:'3px 10px',
                                        background:'rgba(56,189,248,0.1)',
                                        border:'1px solid rgba(56,189,248,0.3)',
                                        borderRadius:20, fontSize:'0.72rem',
                                        color:'#38bdf8', fontWeight:600
                                    }}>
                                        {infoProcedure.category}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setInfoProcedure(null)}
                                    style={{
                                        background:'rgba(255,255,255,0.07)',
                                        border:'1px solid rgba(255,255,255,0.15)',
                                        color:'#e2e8f0', borderRadius:8,
                                        width:32, height:32, cursor:'pointer',
                                        fontSize:'1rem', display:'flex',
                                        alignItems:'center', justifyContent:'center'
                                    }}
                                >✕</button>
                            </div>

                            {(() => {
                                const info = PROCEDURE_INFO[infoProcedure.id];
                                if (!info) return (
                                    <p style={{ color:'#64748b', fontSize:'0.85rem' }}>
                                        {infoProcedure.summary}
                                    </p>
                                );
                                return (
                                    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                                        {/* What is it */}
                                        <div>
                                            <div style={{ fontSize:'0.68rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:8 }}>
                                                What is this procedure?
                                            </div>
                                            <p style={{ fontSize:'0.84rem', color:'#e2e8f0', lineHeight:1.6, margin:0 }}>
                                                {info.whatIsIt}
                                            </p>
                                        </div>

                                        {/* When to use */}
                                        <div style={{ background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:8, padding:'14px 16px' }}>
                                            <div style={{ fontSize:'0.68rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:8 }}>
                                                When to use this procedure?
                                            </div>
                                            <p style={{ fontSize:'0.84rem', color:'#e2e8f0', lineHeight:1.6, margin:0 }}>
                                                {info.whenToUse}
                                            </p>
                                        </div>

                                        {/* Indication */}
                                        <div style={{ display:'flex', gap:16 }}>
                                            <div style={{ flex:1, background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:8, padding:'10px 14px' }}>
                                                <div style={{ fontSize:'0.65rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:4 }}>Indication</div>
                                                <div style={{ fontSize:'0.82rem', color:'#34d399', fontWeight:600 }}>{info.indication}</div>
                                            </div>
                                            <div style={{ flex:1, background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:8, padding:'10px 14px' }}>
                                                <div style={{ fontSize:'0.65rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:4 }}>Recovery</div>
                                                <div style={{ fontSize:'0.82rem', color:'#fbbf24', fontWeight:600 }}>{info.recovery}</div>
                                            </div>
                                        </div>

                                        {/* Landmarks to move */}
                                        <div>
                                            <div style={{ fontSize:'0.68rem', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:10 }}>
                                                Key landmarks to move
                                            </div>
                                            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                                {info.landmarks.map((lm, i) => (
                                                    <div key={i} style={{
                                                        display:'flex', alignItems:'center', gap:10,
                                                        padding:'8px 12px',
                                                        background:'rgba(255,255,255,0.03)',
                                                        border:'1px solid rgba(255,255,255,0.07)',
                                                        borderRadius:6
                                                    }}>
                                                        <div style={{
                                                            width:22, height:22, borderRadius:'50%',
                                                            background:'rgba(56,189,248,0.15)',
                                                            border:'1px solid rgba(56,189,248,0.4)',
                                                            color:'#38bdf8', fontSize:'0.7rem',
                                                            fontWeight:700, display:'flex',
                                                            alignItems:'center', justifyContent:'center',
                                                            flexShrink:0
                                                        }}>{i+1}</div>
                                                        <span style={{ fontSize:'0.82rem', color:'#e2e8f0' }}>{lm}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Select button */}
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedProcedureId(infoProcedure.id); setInfoProcedure(null); }}
                                            style={{
                                                padding:'12px', borderRadius:8,
                                                border:'1px solid rgba(56,189,248,0.4)',
                                                background:'rgba(56,189,248,0.15)',
                                                color:'#38bdf8', cursor:'pointer',
                                                fontWeight:700, fontSize:'0.88rem',
                                                width:'100%', marginTop:4
                                            }}
                                        >
                                            Select {infoProcedure.label}
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </>
                )}
        </div>
    );
}
