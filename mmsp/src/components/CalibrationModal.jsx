import React, { useState, useRef, useEffect } from 'react';

/**
 * CalibrationModal - Mandatory step to define real-world scale.
 * options: Ruler (2 points), Dental Width, Pupillary Distance.
 */
export function CalibrationModal({ imageObj, onConfirm, onCancel, detectedLandmarks }) {
    const [method, setMethod] = useState('ruler'); // ruler, dental, pupils, auto
    const [stage, setStage] = useState('select_points'); // select_points, enter_value, complete
    const [points, setPoints] = useState([]);
    const [activePointIdx, setActivePointIdx] = useState(null);
    const [realDistance, setRealDistance] = useState('');
    const canvasRef = useRef(null);

    // Default suggestions
    const DEFAULTS = {
        dental: 8.5, // Avg central incisor width (mm)
        pupils: 63.0 // Avg interpupillary distance (mm)
    };

    const handleMethodChange = (newMethod) => {
        setMethod(newMethod);
        if (newMethod === 'dental') setRealDistance(DEFAULTS.dental);
        else if (newMethod === 'pupils') setRealDistance(DEFAULTS.pupils);
        else if (newMethod === 'ruler') setRealDistance('');
        setPoints([]);
        setActivePointIdx(null);
        setStage('select_points');
    };

    // Draw image & calibration points
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageObj) return;
        const ctx = canvas.getContext('2d');

        // Reset canvas size to match display (or image?)
        // For simplicity, let's match the image resolution but scale via CSS
        canvas.width = imageObj.width;
        canvas.height = imageObj.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageObj, 0, 0);

        // Draw points & line
        if (points.length > 0) {
            points.forEach((p, i) => {
                const isActive = i === activePointIdx;

                // Outer Glow
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 15);
                gradient.addColorStop(0, isActive ? 'rgba(34, 211, 238, 0.4)' : 'rgba(245, 158, 11, 0.4)');
                gradient.addColorStop(1, isActive ? 'rgba(34, 211, 238, 0)' : 'rgba(245, 158, 11, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
                ctx.fill();

                // Point Core
                ctx.fillStyle = isActive ? '#22d3ee' : '#f59e0b';
                ctx.shadowBlur = 10;
                ctx.shadowColor = isActive ? '#22d3ee' : '#f59e0b';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Crosshair
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(p.x - 12, p.y);
                ctx.lineTo(p.x + 12, p.y);
                ctx.moveTo(p.x, p.y - 12);
                ctx.lineTo(p.x, p.y + 12);
                ctx.stroke();

                // Point Label
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`P${i + 1}${isActive ? ' (Active)' : ''}`, p.x, p.y - 18);
            });

            if (points.length === 2) {
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                ctx.lineTo(points[1].x, points[1].y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw distance bridge
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                ctx.lineTo(points[1].x, points[1].y);
                ctx.stroke();
            }
        }
    }, [imageObj, points, activePointIdx]);

    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // FIXED: Account for object-fit: contain offset
        // Canvas maintains aspect ratio, so we need to find actual image position
        const canvasAspect = canvas.width / canvas.height;
        const displayAspect = rect.width / rect.height;

        let offsetX = 0;
        let offsetY = 0;
        let displayWidth = rect.width;
        let displayHeight = rect.height;

        if (displayAspect > canvasAspect) {
            // Canvas is narrower than container (letterboxed horizontally)
            displayWidth = rect.height * canvasAspect;
            offsetX = (rect.width - displayWidth) / 2;
        } else {
            // Canvas is shorter than container (letterboxed vertically)
            displayHeight = rect.width / canvasAspect;
            offsetY = (rect.height - displayHeight) / 2;
        }

        const scaleX = canvas.width / displayWidth;
        const scaleY = canvas.height / displayHeight;
        const x = (e.clientX - rect.left - offsetX) * scaleX;
        const y = (e.clientY - rect.top - offsetY) * scaleY;

        // Check if clicking near an existing point to select it
        const hitRadius = 20;
        let clickedIdx = -1;
        points.forEach((p, i) => {
            const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
            if (dist < hitRadius) {
                clickedIdx = i;
            }
        });

        if (clickedIdx !== -1) {
            setActivePointIdx(clickedIdx);
            return;
        }

        if (points.length >= 2) return; // Max 2 points

        setPoints(prev => {
            const next = [...prev, { x, y }];
            setActivePointIdx(next.length - 1);
            return next;
        });
    };

    // Keyboard listener for calibration points movement
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (activePointIdx === null || points.length === 0) return;

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
                next[activePointIdx] = { ...p, x: p.x + dx, y: p.y + dy };
                return next;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activePointIdx, points]);

    const handleResetPoints = () => {
        setPoints([]);
        setActivePointIdx(null);
    };

    const handleConfirm = () => {
        if (points.length !== 2) return;
        const distPx = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) +
            Math.pow(points[1].y - points[0].y, 2)
        );

        if (distPx === 0) return;

        const distMm = parseFloat(realDistance);
        if (isNaN(distMm) || distMm <= 0) {
            alert("Please enter a valid distance in mm.");
            return;
        }

        const ratio = distMm / distPx; // mm per pixel
        console.log(`Calibration applied: ${distPx.toFixed(2)}px = ${distMm}mm -> Ratio: ${ratio}`);

        onConfirm({
            ratio,
            method,
            confidence: method === 'ruler' ? 'High' : (method === 'dental' ? 'Medium' : 'Low')
        });
    };

    // ENHANCED: Auto-detection that populates the manual workflow for verification
    const handleAutoDetectPupils = () => {
        if (!detectedLandmarks || detectedLandmarks.length === 0) {
            alert('No facial landmarks detected. Please ensure a face is visible.');
            return;
        }

        // Find pupil landmarks
        const pupilL = detectedLandmarks.find(l => l.id === 'pupil_l');
        const pupilR = detectedLandmarks.find(l => l.id === 'pupil_r');

        if (!pupilL || !pupilR) {
            alert('Could not auto-detect pupils. Please select them manually.');
            return;
        }

        // Set the method to pupils and populate the data
        setMethod('pupils');
        setPoints([
            { x: pupilL.x, y: pupilL.y },
            { x: pupilR.x, y: pupilR.y }
        ]);
        setActivePointIdx(0);
        setRealDistance(DEFAULTS.pupils);
    };

    return (
        <div className="glass-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="glass-panel" style={{
                padding: '30px',
                width: '95%', maxWidth: '1400px', maxHeight: '95vh',
                display: 'flex', flexDirection: 'column', gap: '20px',
                color: 'var(--text-main)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px var(--border-medium)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--primary)' }}>⚠ Image Calibration Required</h2>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', transition: 'color var(--transition-fast)' }} onMouseEnter={(e) => e.target.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>✕</button>
                </div>

                <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                    {/* Left: Controls */}
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Calibration Method</label>
                            <select
                                value={method}
                                onChange={(e) => handleMethodChange(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border-medium)', transition: 'border-color var(--transition-fast)', outline: 'none' }}
                            >
                                <option value="ruler">Ruler (High Accuracy)</option>
                                <option value="dental">Known Dental Width (Medium)</option>
                                <option value="pupils">Pupillary Distance (Low)</option>
                            </select>
                        </div>

                        <div style={{ background: 'var(--bg-surface)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                <strong style={{ color: 'var(--text-main)' }}>Step 1:</strong> Click two points on the image to measure.
                                <br /><br />
                                {method === 'ruler' && "Select 1cm or 10mm on a visible ruler."}
                                {method === 'dental' && "Select the width of the Central Incisor."}
                                {method === 'pupils' && "Select the center of both pupils."}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: points.length === 2 ? 'var(--success)' : 'var(--warning)', fontWeight: 600, fontSize: '0.875rem' }}>
                                        Points: {points.length} / 2
                                    </span>
                                    <button onClick={handleResetPoints} style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer' }}>
                                        Reset
                                    </button>
                                </div>

                                {/* Simplified Auto-detection Trigger */}
                                {detectedLandmarks && detectedLandmarks.length > 0 && points.length === 0 && (
                                    <button
                                        onClick={handleAutoDetectPupils}
                                        style={{
                                            padding: '8px',
                                            fontSize: '0.75rem',
                                            background: 'rgba(14, 165, 233, 0.1)',
                                            color: 'var(--primary)',
                                            border: '1px solid var(--primary)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            width: '100%'
                                        }}
                                    >
                                        Auto-Detect Pupils (63mm)
                                    </button>
                                )}
                            </div>

                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Real World Distance (mm)</label>
                            <input
                                type="number"
                                value={realDistance}
                                onChange={(e) => setRealDistance(e.target.value)}
                                placeholder="e.g. 10.0"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border-medium)', outline: 'none', transition: 'border-color var(--transition-fast)' }}
                            />
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <button
                                className={(points.length === 2 && realDistance) ? 'btn-primary-gradient' : ''}
                                onClick={handleConfirm}
                                disabled={points.length !== 2 || !realDistance}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: '8px', border: 'none',
                                    background: (points.length === 2 && realDistance) ? undefined : 'var(--bg-surface)',
                                    color: 'var(--text-main)', fontWeight: 'bold', cursor: (points.length === 2 && realDistance) ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Apply Calibration
                            </button>
                        </div>


                    </div>

                    {/* Right: Canvas Column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Guidance Header - Static, non-overlapping */}
                        <div style={{
                            background: 'rgba(21, 25, 34, 0.4)',
                            color: points.length < 2 ? 'var(--primary)' : 'var(--success)',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backdropFilter: 'blur(8px)',
                            minHeight: '45px'
                        }}>
                            {points.length === 0 && "Select first point for calibration"}
                            {points.length === 1 && "Select second point"}
                            {points.length === 2 && "Calibration points set"}
                        </div>

                        <div style={{
                            flex: 1,
                            background: '#000',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'relative',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                        }}>
                            <canvas
                                ref={canvasRef}
                                onClick={handleCanvasClick}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'crosshair' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
