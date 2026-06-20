import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { APIService } from '../services/APIService';
import { mapRecommendationToPresetId, getPatientFriendlyInfo } from '../services/OrthognathicProcedures';

const card = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 14,
    padding: 24,
    transition: 'border-color 0.2s',
};

export default function PatientView() {
    const { user, logout } = useAuth();
    const [patient, setPatient] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        APIService.patientMe()
            .then(setPatient)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const latestCase = patient?.cases?.[0];
    const latestSim = latestCase?.simulations?.[0];
    const procedureLabel = latestSim?.surgeryName || latestSim?.mlProcedure;
    const presetId = procedureLabel ? mapRecommendationToPresetId(procedureLabel) : null;
    const patientInfo = presetId ? getPatientFriendlyInfo(presetId) : null;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-main)', padding: '32px 24px' }}>
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>Your Treatment Plan</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>{user?.email}</p>
                    </div>
                    <button
                        onClick={logout}
                        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Log out
                    </button>
                </div>

                {loading && (
                    <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)' }}>Loading your record...</div>
                )}

                {!loading && error && (
                    <div style={{ ...card, color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }}>
                        {error}
                    </div>
                )}

                {!loading && !error && !latestCase && (
                    <div style={{ ...card, color: 'var(--text-muted)' }}>
                        Your doctor hasn't added a case to your record yet. Check back after your next visit.
                    </div>
                )}

                {!loading && latestCase && (<>
                    {/* Result image */}
                    {latestSim?.resultImageData && (
                        <div style={card}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
                                Predicted Result
                            </div>
                            <img
                                src={latestSim.resultImageData}
                                alt="Predicted surgical outcome"
                                style={{ width: '100%', borderRadius: 10, display: 'block' }}
                            />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 10, textAlign: 'center' }}>
                                ⚠ This is a planning simulation, not a guarantee of your exact surgical outcome.
                            </p>
                        </div>
                    )}

                    {/* Procedure + confidence */}
                    {procedureLabel && (
                        <div style={card}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>
                                Recommended Procedure
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg, #82B4DA, #4178AA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{procedureLabel}</div>
                            {latestSim?.confidence != null && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                    Simulation confidence: {latestSim.confidence}%
                                </div>
                            )}

                            {patientInfo && (
                                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 3 }}>What this involves</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{patientInfo.whatItIs}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 3 }}>What to expect</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{patientInfo.whatToExpect}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 3 }}>Typical recovery</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{patientInfo.recovery}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Golden ratio summary */}
                    {latestSim?.goldenRatioData?.harmonyScore != null && (
                        <div style={card}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>
                                Facial Harmony (φ Golden Ratio)
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: '#fbbf24' }}>
                                {latestSim.goldenRatioData.harmonyScore}<span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/100</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {latestSim.goldenRatioData.overallAssessment}
                            </div>
                        </div>
                    )}

                    {/* Doctor's notes */}
                    {(patient?.notes || latestCase?.notes) && (
                        <div style={card}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>
                                Notes From Your Doctor
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {latestCase?.notes || patient?.notes}
                            </div>
                        </div>
                    )}
                </>)}
            </div>
        </div>
    );
}
