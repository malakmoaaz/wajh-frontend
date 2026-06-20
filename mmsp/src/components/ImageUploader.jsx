import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

export function ImageUploader({ onImageUpload }) {
    const onDrop = useCallback(acceptedFiles => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => onImageUpload(e.target.result);
            reader.readAsDataURL(file);
        }
    }, [onImageUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    return (
        <div
            {...getRootProps()}
            className={`uploader-container ${isDragActive ? 'active' : ''}`}
        >
            <input {...getInputProps()} />

            <div className="uploader-icon-wrapper">
                <Upload size={28} />
            </div>

            <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                    Upload Patient Photo
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.55 }}>
                    Drag & drop or click to browse — front-facing photo works best
                </p>
                <div style={{
                    marginTop: '12px',
                    fontSize: '0.75rem',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center'
                }}>
                    <span>PNG, JPG, HEIC</span>
                    <span>Max 10MB</span>
                </div>
            </div>
        </div>
    );
}
