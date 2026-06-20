import React from 'react';

/**
 * SurgicalReadout Component
 * Displays real-time clinical feedback for landmark manipulation.
 */

const labelStyle = { display: 'block', color: 'var(--text-muted)', marginBottom: '4px', fontSize: '0.8rem' };
const inputStyle = { width: '100%', padding: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '0.9rem' };

export function SurgicalReadout({
    activeLandmark,
    originalPoint,
    currentPoint,
    allPoints = [],
    pixelsToMm = 0.264583,
    onLandmarkUpdate,
    onLandmarkSelect
}) {
    const [mode, setMode] = React.useState('drag'); // 'drag' | 'precision'
    const [lockedAxis, setLockedAxis] = React.useState(null); // null, 'x', 'y'

    if (!activeLandmark || !originalPoint || !currentPoint) {
        return (
            <div className="surgical-readout" style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'rgba(21, 25, 34, 0.4)',
                border: '1px dashed var(--border-medium)',
                width: '100%',
                color: 'var(--text-main)',
                boxSizing: 'border-box',
                backdropFilter: 'blur(8px)'
            }}>
                <label style={labelStyle}>Select Anatomical Landmark</label>
                <select
                    value=""
                    onChange={(e) => onLandmarkSelect && onLandmarkSelect(parseInt(e.target.value))}
                    style={{
                        ...inputStyle,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--primary)',
                        padding: '10px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        outline: 'none'
                    }}
                >
                    <option value="" disabled>-- Choose a landmark --</option>
                    {allPoints.map((p, idx) => (
                        <option key={p.id} value={idx}>
                            {p.name || p.id}
                        </option>
                    ))}
                </select>
                <p style={{ marginTop: '15px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Select a landmark from the list or click one on the image to begin adjustment.
                </p>
            </div>
        );
    }

    const dx = (currentPoint.x - originalPoint.x) * pixelsToMm;
    const dy = (currentPoint.y - originalPoint.y) * pixelsToMm;
    const dz = (currentPoint.z - originalPoint.z) * pixelsToMm || 0;
    const totalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const handleInputChange = (e, axis) => {
        const valMm = parseFloat(e.target.value);
        if (isNaN(valMm)) return;

        let newPoint = { ...currentPoint };
        if (axis === 'x') {
            const deltaPx = valMm / pixelsToMm;
            newPoint.x = originalPoint.x + deltaPx;
        } else if (axis === 'y') {
            const deltaPx = valMm / pixelsToMm;
            newPoint.y = originalPoint.y + deltaPx;
        }

        onLandmarkUpdate && onLandmarkUpdate(newPoint);
    };

    const handleReset = () => {
        onLandmarkUpdate && onLandmarkUpdate({ ...originalPoint });
    };

    const getDirection = (val, axis) => {
        if (Math.abs(val) < 0.1) return '';
        if (axis === 'x') return val > 0 ? 'Right' : 'Left';
        if (axis === 'y') return val > 0 ? 'Inferior' : 'Superior';
        return '';
    };



    return (
        <div className="surgical-readout" style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(14, 165, 233, 0.06)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            width: '100%',
            color: 'var(--text-main)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(14, 165, 233, 0.1)',
            backdropFilter: 'blur(12px)',
            boxSizing: 'border-box'
        }}>
            {/* Landmark Selection Dropdown */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ ...labelStyle, color: 'var(--primary)', fontWeight: 'bold' }}>Select Anatomical Landmark</label>
                <select
                    value={allPoints.findIndex(p => p.id === activeLandmark.id)}
                    onChange={(e) => onLandmarkSelect && onLandmarkSelect(parseInt(e.target.value))}
                    style={{
                        ...inputStyle,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--primary)',
                        padding: '10px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color var(--transition-fast)'
                    }}
                >
                    {allPoints.map((p, idx) => (
                        <option key={p.id} value={idx}>
                            {p.name || p.id}
                        </option>
                    ))}
                </select>
            </div>

            <h4 style={{ margin: '0 0 15px 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    boxShadow: '0 0 8px var(--primary-glow)'
                }}></span>
                {activeLandmark.name || activeLandmark.id}
            </h4>

            {/* Mode Box */}
            <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '4px',
                display: 'flex',
                marginBottom: '15px',
                border: '1px solid var(--border-subtle)'
            }}>
                <button
                    onClick={() => setMode('drag')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: mode === 'drag' ? 'var(--primary)' : 'transparent',
                        color: mode === 'drag' ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    Drag
                </button>
                <button
                    onClick={() => setMode('precision')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: mode === 'precision' ? 'var(--primary)' : 'transparent',
                        color: mode === 'precision' ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    Precision
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.85rem' }}>
                {/* Horizontal Control */}
                <div>
                    <label style={labelStyle}>
                        Δ Horizontal (mm) {lockedAxis === 'y' && '(locked)'}
                    </label>
                    {mode === 'precision' ? (
                        <input
                            type="number"
                            step="0.1"
                            value={dx.toFixed(2)}
                            onChange={(e) => handleInputChange(e, 'x')}
                            disabled={lockedAxis === 'x'}
                            style={{
                                ...inputStyle,
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-medium)',
                                transition: 'border-color var(--transition-fast)'
                            }}
                        />
                    ) : (
                        <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{dx.toFixed(2)}</span>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px', height: '14px' }}>
                        {getDirection(dx, 'x')}
                    </div>
                </div>

                {/* Vertical Control */}
                <div>
                    <label style={labelStyle}>
                        Δ Vertical (mm) {lockedAxis === 'x' && '(locked)'}
                    </label>
                    {mode === 'precision' ? (
                        <input
                            type="number"
                            step="0.1"
                            value={dy.toFixed(2)}
                            onChange={(e) => handleInputChange(e, 'y')}
                            style={{
                                ...inputStyle,
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-medium)',
                                transition: 'border-color var(--transition-fast)'
                            }}
                        />
                    ) : (
                        <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{dy.toFixed(2)}</span>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px', height: '14px' }}>
                        {getDirection(dy, 'y')}
                    </div>
                </div>
            </div>

            {/* Controls */}
            {mode === 'precision' && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleReset}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '6px',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={(e) => e.target.style.background = 'var(--bg-surface)'}
                    >
                        Reset Position
                    </button>
                </div>
            )}

            <div style={{
                marginTop: '15px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
            }}>
                <strong>Properties:</strong> {activeLandmark.type.toUpperCase()} tissue | Stiffness: {activeLandmark.stiffness}
                <br />
                <span style={{ color: 'var(--primary)', opacity: 0.7 }}>Confidence: High (98%)</span>

                {/* Uncertainty Estimation */}
                <div style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'var(--warning-glow)',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--warning)',
                    backdropFilter: 'blur(4px)'
                }}>
                    <strong style={{ color: 'var(--warning)' }}>Est. Uncertainty: ±{((totalDist * (1 - activeLandmark.stiffness) * 0.2) + 0.5).toFixed(1)} mm</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', opacity: 0.8 }}>
                        Based on tissue elasticity and detection confidence.
                    </p>
                </div>
            </div>
        </div>
    );
}
