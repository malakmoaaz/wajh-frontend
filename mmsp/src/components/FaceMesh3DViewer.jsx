import React, { useEffect, useMemo, useRef } from 'react';
import { LandmarkViewer3D } from '../services/ThreeDEngine';

export function FaceMesh3DViewer({ landmarks, activeMeshIndex }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);

    const hasLandmarks = useMemo(
        () => Array.isArray(landmarks) && landmarks.length > 0,
        [landmarks]
    );

    useEffect(() => {
        if (!containerRef.current) return;
        viewerRef.current = new LandmarkViewer3D(containerRef.current);
        viewerRef.current.init();

        return () => {
            if (viewerRef.current) {
                viewerRef.current.dispose();
                viewerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!viewerRef.current || !hasLandmarks) return;
        viewerRef.current.updateLandmarks(landmarks, activeMeshIndex);
    }, [landmarks, activeMeshIndex, hasLandmarks]);

    return (
        <div
            style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>3D Face Landmarks</strong>
                <button
                    type="button"
                    onClick={() => viewerRef.current?.resetCamera()}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-muted)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '4px 8px'
                    }}
                >
                    Reset View
                </button>
            </div>
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '260px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'radial-gradient(circle at top, rgba(34,211,238,0.07), rgba(0,0,0,0.15))'
                }}
            />
            <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', margin: 0 }}>
                Drag to rotate. Scroll to zoom. Active landmark is highlighted.
            </p>
        </div>
    );
}
