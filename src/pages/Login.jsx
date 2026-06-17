import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('intro'); // 'intro' | 'form'

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Enter' && phase === 'intro') setPhase('form');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex flex-col items-center justify-center">

      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-4">

        {/* Title block — slides up when Enter is pressed */}
        <div
          className="flex flex-col items-center text-center transition-all duration-700 ease-in-out"
          style={{
            transform: phase === 'form' ? 'translateY(-60px)' : 'translateY(0)',
          }}
        >
          <h1
            className="text-6xl font-extralight tracking-[0.25em] text-white uppercase"
            style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.3em' }}
          >
            WAJH
          </h1>
          <p className="mt-3 text-xs font-light tracking-[0.2em] text-white/50 uppercase">
            Maxillofacial Surgical Planning
          </p>

          {/* Press Enter hint */}
          <div
            className="mt-12 flex flex-col items-center gap-2 transition-all duration-500"
            style={{
              opacity: phase === 'intro' ? 1 : 0,
              pointerEvents: phase === 'intro' ? 'auto' : 'none',
            }}
          >
            <span className="text-white/30 text-xs tracking-widest uppercase">Press Enter</span>
            <div className="w-px h-8 bg-white/20 animate-pulse" />
            {/* Tap to continue on mobile */}
            <button
              onClick={() => setPhase('form')}
              className="mt-2 text-white/20 text-xs tracking-widest uppercase md:hidden"
            >
              Tap to continue
            </button>
          </div>
        </div>

        {/* Login / Register form — fades in */}
        <div
          className="w-full max-w-sm mt-6 transition-all duration-700"
          style={{
            opacity: phase === 'form' ? 1 : 0,
            transform: phase === 'form' ? 'translateY(0)' : 'translateY(20px)',
            pointerEvents: phase === 'form' ? 'auto' : 'none',
          }}
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-500/30 text-red-300 text-xs text-center tracking-wide">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/10 text-white text-sm font-light tracking-widest uppercase rounded-lg transition-all"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-white/25 text-xs tracking-widest uppercase">
            No account?{' '}
            <Link to="/register" className="text-white/50 hover:text-white transition-colors">
              Register
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}