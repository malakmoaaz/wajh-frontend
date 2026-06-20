import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth(); // Destructured register function here
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // Core visual state management
  const [phase, setPhase] = useState('intro'); // 'intro' | 'form'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('DOCTOR');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Enter') {
        setPhase((prev) => (prev === 'intro' ? 'form' : prev));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'login') {
        await login(email, password);
        navigate(from, { replace: true });
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await register(email, password, role);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to clear errors when switching tabs
  const toggleAuthMode = (mode) => {
    setError('');
    setAuthMode(mode);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      backgroundColor: '#000', overflow: 'hidden', display: 'flex',
      alignItems: 'center', justifyContent: 'center', margin: 0, padding: 0
    }}>

      {/* Video Background Layer */}
      <video
        autoPlay loop muted playsInline
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: 0.4, zIndex: 0, pointerEvents: 'none'
        }}
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* Dark Cover Overlay */}
      <div style={{
        position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: 1, pointerEvents: 'none'
      }} />

      {/* Global Click Layer to Continue */}
      {phase === 'intro' && (
        <div 
          onClick={() => setPhase('form')}
          style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'pointer' }}
        />
      )}

      {/* Main Content Floating System */}
      <div style={{
        position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', width: '100%',
        maxWidth: '420px', padding: '0 24px', textAlign: 'center', boxSizing: 'border-box'
      }}>

        {/* Title Block Layout */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          transition: 'transform 1s cubic-bezier(0.25, 1, 0.5, 1)',
          transform: phase === 'form' ? 'translateY(-140px)' : 'translateY(0)',
          width: '100%'
        }}>
          <h1 style={{
            fontFamily: 'Georgia, serif', color: '#fff', textTransform: 'uppercase',
            fontSize: '4.5rem', fontWeight: 200, letterSpacing: '0.35em',
            margin: 0, paddingLeft: '0.35em', textShadow: '0 0 30px rgba(255,255,255,0.15)'
          }}>
            WAJH
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
            fontSize: '11px', fontWeight: 300, letterSpacing: '0.25em',
            marginTop: '16px', marginBottom: 0
          }}>
            Maxillofacial Surgical Planning
          </p>

          {/* Hint layout container */}
          <div style={{
            marginTop: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            transition: 'all 0.5s ease', opacity: phase === 'intro' ? 1 : 0,
            transform: phase === 'intro' ? 'translateY(0)' : 'translateY(15px)'
          }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
              Press Enter or Click Anywhere
            </span>
            <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)', marginTop: '12px' }} />
          </div>
        </div>

        {/* Dynamic Interactive Input Module Block */}
        <div style={{
          width: '100%', position: 'absolute', top: '38%',
          transition: 'all 1s cubic-bezier(0.25, 1, 0.5, 1)',
          opacity: phase === 'form' ? 1 : 0,
          transform: phase === 'form' ? 'translateY(0)' : 'translateY(40px)',
          pointerEvents: phase === 'form' ? 'auto' : 'none'
        }}>
          
          {error && (
            <div style={{
              backgroundColor: 'rgba(127, 29, 29, 0.4)', border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px', padding: '12px', color: '#fca5a5', fontSize: '12px', marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="Email address"
              style={{
                width: '100%', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff',
                fontSize: '14px', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box'
              }}
            />

            {/* REGISTER CONDITIONAL FIELD: Medical System Roles */}
            {authMode === 'register' && (
              <select
                value={role} onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px', backgroundColor: 'var(--bg-surface)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#1b3461',
                  fontSize: '14px', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="DOCTOR" style={{ background: 'var(--bg-surface)', color: '#1b3461' }}>Doctor</option>
                <option value="PATIENT" style={{ background: 'var(--bg-surface)', color: '#1b3461' }}>Patient</option>
              </select>
            )}

            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="Password"
              style={{
                width: '100%', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff',
                fontSize: '14px', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box'
              }}
            />

            {/* REGISTER CONDITIONAL FIELD: Double verification input */}
            {authMode === 'register' && (
              <input
                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                placeholder="Confirm Password"
                style={{
                  width: '100%', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff',
                  fontSize: '14px', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box'
                }}
              />
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px 0', marginTop: '6px',
                background: 'linear-gradient(135deg, var(--navy-500) 0%, var(--navy-400) 100%)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.25s', boxShadow: '0 2px 10px rgba(45,90,142,0.35)'
              }}
            >
              {loading ? 'Processing…' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Clean Switch Tab Toggle Link */}
          {authMode === 'login' ? (
            <p style={{ marginTop: '24px', color: 'rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              No account?{' '}
              <span 
                onClick={() => toggleAuthMode('register')} 
                style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Register
              </span>
            </p>
          ) : (
            <p style={{ marginTop: '24px', color: 'rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Have an account?{' '}
              <span 
                onClick={() => toggleAuthMode('login')} 
                style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Sign In
              </span>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}