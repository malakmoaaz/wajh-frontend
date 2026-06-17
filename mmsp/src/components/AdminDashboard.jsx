import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// All requests need credentials:'include' so the httpOnly auth cookie is sent
// cross-origin (Vercel frontend ↔ Railway backend) — none of the calls below
// were doing this before, so every one of them was silently failing auth.
async function authedFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0e17; --bg2: #111827; --bg3: #1a2235;
    --border: rgba(255,255,255,0.07);
    --primary: #38bdf8; --gold: #fbbf24; --green: #34d399; --red: #f87171;
    --text: #e2e8f0; --muted: #64748b;
    --font-head: 'DM Serif Display', serif;
    --font-body: 'DM Sans', sans-serif;
    --font-mono: 'DM Mono', monospace;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); min-height: 100vh; }
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: 240px; min-height: 100vh; background: var(--bg2); border-right: 1px solid var(--border); padding: 28px 0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; }
  .logo { padding: 0 24px 28px; border-bottom: 1px solid var(--border); }
  .logo h1 { font-family: var(--font-head); font-size: 1.8rem; color: var(--primary); }
  .logo p { font-size: 0.7rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px; }
  .nav { padding: 16px 12px; flex: 1; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; color: var(--muted); font-size: 0.875rem; font-weight: 500; transition: all 0.15s; margin-bottom: 2px; }
  .nav-item:hover { background: var(--bg3); color: var(--text); }
  .nav-item.active { background: rgba(56,189,248,0.12); color: var(--primary); }
  .main { margin-left: 240px; flex: 1; padding: 32px 40px; }
  .page-header { margin-bottom: 28px; display: flex; align-items: flex-start; justify-content: space-between; }
  .page-header h2 { font-family: var(--font-head); font-size: 2rem; }
  .page-header p { color: var(--muted); font-size: 0.875rem; margin-top: 4px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; position: relative; overflow: hidden; }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--accent, var(--primary)); }
  .stat-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .stat-value { font-family: var(--font-mono); font-size: 2rem; font-weight: 500; color: var(--text); margin-top: 6px; }
  .stat-sub { font-size: 0.72rem; color: var(--muted); margin-top: 4px; }
  .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
  .card-header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .card-title { font-size: 0.95rem; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 12px 20px; text-align: left; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--border); font-weight: 500; }
  td { padding: 14px 20px; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.02); cursor: pointer; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; }
  .badge-green  { background: rgba(52,211,153,0.12);  color: var(--green); }
  .badge-gold   { background: rgba(251,191,36,0.12);  color: var(--gold); }
  .badge-red    { background: rgba(248,113,113,0.12); color: var(--red); }
  .badge-blue   { background: rgba(56,189,248,0.12);  color: var(--primary); }
  .toolbar { display: flex; gap: 12px; align-items: center; }
  .search-input { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px; color: var(--text); font-size: 0.85rem; outline: none; width: 220px; font-family: var(--font-body); }
  .search-input:focus { border-color: rgba(56,189,248,0.4); }
  .search-input::placeholder { color: var(--muted); }
  .btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg3); color: var(--text); font-size: 0.82rem; cursor: pointer; font-family: var(--font-body); font-weight: 500; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
  .btn:hover { background: rgba(255,255,255,0.06); }
  .btn-primary { background: rgba(56,189,248,0.15); border-color: rgba(56,189,248,0.4); color: var(--primary); }
  .btn-primary:hover { background: rgba(56,189,248,0.25); }
  .btn-danger { background: rgba(248,113,113,0.12); border-color: rgba(248,113,113,0.4); color: var(--red); }
  .btn-danger:hover { background: rgba(248,113,113,0.22); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 32px; width: 500px; max-height: 90vh; overflow-y: auto; position: relative; }
  .modal h3 { font-family: var(--font-head); font-size: 1.5rem; margin-bottom: 24px; }
  .form-group { margin-bottom: 16px; }
  .form-label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; display: block; font-weight: 500; }
  .form-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 0.875rem; outline: none; font-family: var(--font-body); }
  .form-input:focus { border-color: rgba(56,189,248,0.5); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
  .detail-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 500px; background: var(--bg2); border-left: 1px solid var(--border); padding: 32px; overflow-y: auto; z-index: 50; animation: slideIn 0.2s ease; }
  @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .detail-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 49; }
  .detail-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; font-weight: 500; }
  .detail-value { font-size: 0.9rem; color: var(--text); line-height: 1.5; margin-bottom: 20px; }
  .sim-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; transition: all 0.15s; }
  .sim-card:hover { border-color: rgba(56,189,248,0.3); }
  .sim-image { width: 100%; border-radius: 8px; border: 1px solid var(--border); margin: 12px 0; }
  .loading { display: flex; align-items: center; justify-content: center; padding: 60px; color: var(--muted); gap: 10px; font-size: 0.875rem; }
  .spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4; }
  .proc-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .proc-bar-label { font-size: 0.75rem; color: var(--muted); width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .proc-bar-track { flex: 1; height: 6px; background: var(--bg3); border-radius: 3px; overflow: hidden; }
  .proc-bar-fill { height: 100%; background: var(--primary); border-radius: 3px; }
  .proc-bar-count { font-family: var(--font-mono); font-size: 0.72rem; color: var(--muted); width: 24px; text-align: right; }
`;

function fmt(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function ConfBadge({ v }) {
    const n = typeof v === 'number' ? v : 0;
    const level = n >= 80 ? 'high' : n >= 60 ? 'medium' : 'low';
    return <span className={`badge badge-${level==='high'?'green':level==='medium'?'gold':'red'}`}>{level}</span>;
}

// ── New Patient Modal ─────────────────────────────────────────────
function NewPatientModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ firstName:'', lastName:'', dateOfBirth:'', gender:'', phone:'', email:'', notes:'' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (!form.firstName || !form.lastName) { setError('First and last name are required.'); return; }
        setSaving(true);
        try {
            const data = await authedFetch('/patients', {
                method: 'POST',
                body: JSON.stringify(form)
            });
            onSaved(data);
            onClose();
        } catch (e) { setError(e.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>New Patient</h3>
                {error && <p style={{ color:'var(--red)', fontSize:'0.8rem', marginBottom:16 }}>{error}</p>}
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">First Name *</label>
                        <input className="form-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Ahmed" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Last Name *</label>
                        <input className="form-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Mohamed" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input className="form-input" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select className="form-input" value={form.gender} onChange={e => set('gender', e.target.value)} style={{ cursor:'pointer' }}>
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+20..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="patient@email.com" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Clinical Notes</label>
                    <textarea className="form-input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Initial assessment, referral reason..." style={{ resize:'vertical' }} />
                </div>
                <div className="form-actions">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Patient'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────
export default function AdminDashboard() {
    const [tab, setTab]                 = useState('patients');
    const [patients, setPatients]       = useState([]);
    const [sims, setSims]               = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [showNewPatient, setShowNewPatient] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientDetail, setPatientDetail]     = useState(null);
    const [selectedSim, setSelectedSim]         = useState(null);
    const [simDetail, setSimDetail]             = useState(null);
    const [loadingDetail, setLoadingDetail]     = useState(false);
    const [linkEmail, setLinkEmail]             = useState('');
    const [linkStatus, setLinkStatus]           = useState('');
    const [notesDraft, setNotesDraft]           = useState('');
    const [savingNotes, setSavingNotes]         = useState(false);

    async function fetchAll() {
        setLoading(true);
        try {
            const [p, s] = await Promise.all([
                authedFetch('/patients').catch(() => []),
                authedFetch('/simulations').catch(() => []),
            ]);
            setPatients(Array.isArray(p) ? p : []);
            setSims(Array.isArray(s) ? s : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    useEffect(() => { fetchAll(); }, []);

    async function openPatient(p) {
        setSelectedPatient(p);
        setPatientDetail(null);
        setLoadingDetail(true);
        setLinkEmail('');
        setLinkStatus('');
        setNotesDraft(p.notes || '');
        try {
            const d = await authedFetch(`/patients/${p.id}`);
            setPatientDetail(d);
        } catch(e) { console.error(e); }
        setLoadingDetail(false);
    }

    async function handleLinkAccount() {
        if (!linkEmail || !selectedPatient) return;
        setLinkStatus('Linking...');
        try {
            const updated = await authedFetch(`/patients/${selectedPatient.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ patientAccountEmail: linkEmail }),
            });
            setSelectedPatient(updated);
            setPatientDetail(prev => ({ ...prev, ...updated }));
            setLinkStatus('Linked successfully.');
            setLinkEmail('');
        } catch (e) {
            setLinkStatus(e.message);
        }
    }

    async function handleSaveNotes() {
        if (!selectedPatient) return;
        setSavingNotes(true);
        try {
            const updated = await authedFetch(`/patients/${selectedPatient.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ notes: notesDraft }),
            });
            setSelectedPatient(updated);
            setPatientDetail(prev => ({ ...prev, ...updated }));
            setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
        } catch (e) { console.error(e); }
        setSavingNotes(false);
    }

    async function openSim(sim) {
        setSelectedSim(sim);
        setSimDetail(null);
        setLoadingDetail(true);
        try {
            const d = await authedFetch(`/simulations/${sim.id}`);
            setSimDetail(d);
        } catch(e) { console.error(e); }
        setLoadingDetail(false);
    }

    async function deletePatient(id) {
        if (!confirm('Delete this patient and all their data?')) return;
        await authedFetch(`/patients/${id}`, { method: 'DELETE' });
        setSelectedPatient(null); setPatientDetail(null);
        fetchAll();
    }

    const filteredPatients = patients.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        (p.email||'').toLowerCase().includes(search.toLowerCase())
    );

    const procCounts = sims.reduce((acc, s) => {
        const n = s.mlProcedure || s.surgeryName || 'Unknown';
        acc[n] = (acc[n]||0) + 1; return acc;
    }, {});
    const maxProc = Math.max(...Object.values(procCounts), 1);

    const navItems = [
        { id: 'patients',  label: 'Patients',    icon: '👤' },
        { id: 'sims',      label: 'Simulations', icon: '◈' },
        { id: 'analytics', label: 'Analytics',   icon: '◱' },
    ];

    return (
        <>
            <style>{css}</style>
            <div className="app">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="logo">
                        <h1>WAJH</h1>
                        <p>Doctor Dashboard</p>
                    </div>
                    <nav className="nav">
                        {navItems.map(n => (
                            <div key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={() => setTab(n.id)}>
                                <span>{n.icon}</span>{n.label}
                            </div>
                        ))}
                    </nav>
                    <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border)' }}>
                        <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>Total Patients</div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.2rem', color:'var(--primary)', marginTop:2 }}>{patients.length}</div>
                    </div>
                </aside>

                {/* Main */}
                <main className="main">

                    {/* ── PATIENTS TAB ── */}
                    {tab === 'patients' && (<>
                        <div className="page-header">
                            <div>
                                <h2>Patients</h2>
                                <p>{patients.length} registered patients</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => setShowNewPatient(true)}>
                                + New Patient
                            </button>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">All Patients</span>
                                <div className="toolbar">
                                    <input className="search-input" placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} />
                                    <button className="btn" onClick={fetchAll}>↻</button>
                                </div>
                            </div>
                            {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
                                <table>
                                    <thead>
                                        <tr><th>Name</th><th>Gender</th><th>DOB</th><th>Phone</th><th>Cases</th><th>Registered</th></tr>
                                    </thead>
                                    <tbody>
                                        {filteredPatients.map(p => (
                                            <tr key={p.id} onClick={() => openPatient(p)}>
                                                <td>
                                                    <div style={{ fontWeight:600 }}>{p.firstName} {p.lastName}</div>
                                                    {p.email && <div style={{ fontSize:'0.72rem', color:'var(--muted)' }}>{p.email}</div>}
                                                </td>
                                                <td style={{ color:'var(--muted)' }}>{p.gender||'—'}</td>
                                                <td style={{ color:'var(--muted)' }}>{fmt(p.dateOfBirth)}</td>
                                                <td style={{ color:'var(--muted)' }}>{p.phone||'—'}</td>
                                                <td><span className="badge badge-blue">{p._count?.cases||0} cases</span></td>
                                                <td style={{ color:'var(--muted)' }}>{fmt(p.createdAt)}</td>
                                            </tr>
                                        ))}
                                        {filteredPatients.length===0 && (
                                            <tr><td colSpan={6}><div className="empty"><div className="empty-icon">👤</div><div>No patients yet — add your first patient</div></div></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>)}

                    {/* ── SIMULATIONS TAB ── */}
                    {tab === 'sims' && (<>
                        <div className="page-header">
                            <div><h2>Simulations</h2><p>{sims.length} total runs</p></div>
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">All Simulations</span>
                                <button className="btn" onClick={fetchAll}>↻ Refresh</button>
                            </div>
                            {loading ? <div className="loading"><div className="spinner"/>Loading...</div> : (
                                <table>
                                    <thead>
                                        <tr><th>ML Procedure</th><th>Confidence</th><th>Date</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {sims.map(s => (
                                            <tr key={s.id} onClick={() => openSim(s)}>
                                                <td style={{ fontWeight:500 }}>{s.mlProcedure || s.surgeryName || '—'}</td>
                                                <td>
                                                    {s.confidence!=null && <><ConfBadge v={s.confidence}/> <span style={{ color:'var(--muted)', fontSize:'0.75rem', marginLeft:6 }}>{s.confidence}%</span></>}
                                                </td>
                                                <td style={{ color:'var(--muted)' }}>{fmt(s.createdAt)}</td>
                                                <td><button className="btn btn-primary" onClick={e=>{e.stopPropagation();openSim(s);}}>View</button></td>
                                            </tr>
                                        ))}
                                        {sims.length===0 && (
                                            <tr><td colSpan={4}><div className="empty"><div className="empty-icon">◈</div><div>No simulations saved yet</div></div></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>)}

                    {/* ── ANALYTICS TAB ── */}
                    {tab === 'analytics' && (<>
                        <div className="page-header"><div><h2>Analytics</h2><p>Procedure distribution</p></div></div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                            <div className="card">
                                <div className="card-header"><span className="card-title">Procedure Distribution</span></div>
                                <div style={{ padding:'20px 24px' }}>
                                    {Object.keys(procCounts).length===0
                                        ? <div className="empty"><div className="empty-icon">◱</div><div>No data yet</div></div>
                                        : Object.entries(procCounts).sort((a,b)=>b[1]-a[1]).map(([name,count]) => (
                                            <div className="proc-bar" key={name}>
                                                <span className="proc-bar-label" title={name}>{name}</span>
                                                <div className="proc-bar-track"><div className="proc-bar-fill" style={{ width:`${(count/maxProc)*100}%` }}/></div>
                                                <span className="proc-bar-count">{count}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                            <div className="card">
                                <div className="card-header"><span className="card-title">Summary</span></div>
                                <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
                                    {[
                                        { label:'Total Patients',    value: patients.length,                                    accent:'var(--primary)' },
                                        { label:'Total Simulations', value: sims.length,                                        accent:'var(--gold)' },
                                        { label:'High Confidence',   value: sims.filter(s=>s.confidence>=80).length,           accent:'var(--green)' },
                                        { label:'This Month',        value: sims.filter(s=>new Date(s.createdAt).getMonth()===new Date().getMonth()).length, accent:'var(--red)' },
                                    ].map(s => (
                                        <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                                            <span style={{ color:'var(--muted)', fontSize:'0.85rem' }}>{s.label}</span>
                                            <span style={{ fontFamily:'var(--font-mono)', fontSize:'1.3rem', color: s.accent }}>{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>)}
                </main>

                {/* ── New Patient Modal ── */}
                {showNewPatient && (
                    <NewPatientModal
                        onClose={() => setShowNewPatient(false)}
                        onSaved={p => { setPatients(prev => [p, ...prev]); }}
                    />
                )}

                {/* ── Patient Detail Panel ── */}
                {selectedPatient && (<>
                    <div className="detail-overlay" onClick={() => { setSelectedPatient(null); setPatientDetail(null); }}/>
                    <div className="detail-panel">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                            <div>
                                <h3 style={{ fontFamily:'var(--font-head)', fontSize:'1.4rem' }}>
                                    {selectedPatient.firstName} {selectedPatient.lastName}
                                </h3>
                                <p style={{ color:'var(--muted)', fontSize:'0.8rem', marginTop:4 }}>
                                    Registered {fmt(selectedPatient.createdAt)}
                                </p>
                            </div>
                            <div style={{ display:'flex', gap:8 }}>
                                <button className="btn btn-danger" onClick={() => deletePatient(selectedPatient.id)}>Delete</button>
                                <button className="btn" onClick={() => { setSelectedPatient(null); setPatientDetail(null); }}>✕</button>
                            </div>
                        </div>

                        <div className="detail-label">Patient Info</div>
                        <div style={{ background:'var(--bg3)', borderRadius:8, padding:'14px 16px', marginBottom:20 }}>
                            {[
                                ['Gender',   selectedPatient.gender],
                                ['DOB',      fmt(selectedPatient.dateOfBirth)],
                                ['Phone',    selectedPatient.phone],
                                ['Email',    selectedPatient.email],
                            ].map(([k,v]) => v ? (
                                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:'0.82rem' }}>
                                    <span style={{ color:'var(--muted)' }}>{k}</span>
                                    <span>{v}</span>
                                </div>
                            ) : null)}
                            {selectedPatient.notes && (
                                <div style={{ marginTop:10, fontSize:'0.78rem', color:'var(--muted)', lineHeight:1.5 }}>{selectedPatient.notes}</div>
                            )}
                        </div>

                        <div className="detail-label">Patient Account Link</div>
                        <div style={{ background:'var(--bg3)', borderRadius:8, padding:'14px 16px', marginBottom:20 }}>
                            <p style={{ fontSize:'0.75rem', color:'var(--muted)', marginBottom:8 }}>
                                {selectedPatient.userId
                                    ? '✓ Linked — this patient can see their case in the Patient View.'
                                    : 'Link this record to the patient\'s login (email) so they can see their result and notes.'}
                            </p>
                            {!selectedPatient.userId && (
                                <div style={{ display:'flex', gap:8 }}>
                                    <input
                                        className="form-input"
                                        type="email"
                                        placeholder="patient@email.com"
                                        value={linkEmail}
                                        onChange={e => setLinkEmail(e.target.value)}
                                        style={{ flex:1 }}
                                    />
                                    <button className="btn btn-primary" onClick={handleLinkAccount}>Link</button>
                                </div>
                            )}
                            {linkStatus && <p style={{ fontSize:'0.72rem', color:'var(--gold)', marginTop:6 }}>{linkStatus}</p>}
                        </div>

                        <div className="detail-label">Notes for Patient</div>
                        <div style={{ background:'var(--bg3)', borderRadius:8, padding:'14px 16px', marginBottom:20 }}>
                            <textarea
                                className="form-input"
                                rows={3}
                                value={notesDraft}
                                onChange={e => setNotesDraft(e.target.value)}
                                placeholder="Notes the patient will see in their Patient View..."
                                style={{ resize:'vertical', width:'100%' }}
                            />
                            <button className="btn btn-primary" onClick={handleSaveNotes} disabled={savingNotes} style={{ marginTop:8 }}>
                                {savingNotes ? 'Saving...' : 'Save Notes'}
                            </button>
                        </div>

                        <div className="detail-label">Cases & Simulations</div>
                        {loadingDetail
                            ? <div className="loading"><div className="spinner"/>Loading...</div>
                            : patientDetail?.cases?.length
                                ? patientDetail.cases.map(c => (
                                    <div key={c.id} className="sim-card">
                                        <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{c.title}</div>
                                        <div style={{ color:'var(--muted)', fontSize:'0.72rem', marginTop:4 }}>
                                            {fmt(c.createdAt)} · {c._count?.simulations||0} simulation(s)
                                        </div>
                                        <span className={`badge badge-${c.status==='active'?'green':'gold'}`} style={{ marginTop:8 }}>{c.status}</span>
                                    </div>
                                ))
                                : <div style={{ color:'var(--muted)', fontSize:'0.82rem' }}>No cases yet for this patient.</div>
                        }
                    </div>
                </>)}

                {/* ── Simulation Detail Panel ── */}
                {selectedSim && !selectedPatient && (<>
                    <div className="detail-overlay" onClick={() => { setSelectedSim(null); setSimDetail(null); }}/>
                    <div className="detail-panel">
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
                            <h3 style={{ fontFamily:'var(--font-head)', fontSize:'1.3rem' }}>Simulation Details</h3>
                            <button className="btn" onClick={() => { setSelectedSim(null); setSimDetail(null); }}>✕</button>
                        </div>
                        {loadingDetail
                            ? <div className="loading"><div className="spinner"/>Loading...</div>
                            : simDetail && (<>
                                <div className="detail-label">ML Procedure</div>
                                <div className="detail-value" style={{ color:'var(--primary)', fontWeight:700 }}>
                                    {simDetail.mlProcedure || simDetail.surgeryName || '—'}
                                </div>
                                {simDetail.confidence!=null && (<>
                                    <div className="detail-label">Confidence</div>
                                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                                        <ConfBadge v={simDetail.confidence}/>
                                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'1.2rem' }}>{simDetail.confidence}%</span>
                                    </div>
                                </>)}
                                {simDetail.resultImageData && (<>
                                    <div className="detail-label">Simulated Outcome</div>
                                    <img className="sim-image" src={simDetail.resultImageData} alt="result"/>
                                </>)}
                                {simDetail.aiRecommendation?.measurements?.length > 0 && (<>
                                    <div className="detail-label">Required Movements</div>
                                    {simDetail.aiRecommendation.measurements.map((m,i) => (
                                        <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:'0.82rem' }}>
                                            <span style={{ color:'var(--muted)' }}>{m.landmark}</span>
                                            <span style={{ color:'var(--gold)', fontFamily:'var(--font-mono)', fontWeight:600 }}>
                                                {m.direction} {Math.abs(m.deltaMm).toFixed(1)}mm
                                            </span>
                                        </div>
                                    ))}
                                </>)}
                                {simDetail.goldenRatioData && (<>
                                    <div className="detail-label" style={{ marginTop:20 }}>Golden Ratio Score</div>
                                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.5rem', color: simDetail.goldenRatioData.harmonyScore>=70?'var(--green)':'var(--red)' }}>
                                        {simDetail.goldenRatioData.harmonyScore}/100
                                    </div>
                                </>)}
                                <div className="detail-label" style={{ marginTop:20 }}>Date</div>
                                <div className="detail-value">{fmt(simDetail.createdAt)}</div>
                            </>)
                        }
                    </div>
                </>)}
            </div>
        </>
    );
}
