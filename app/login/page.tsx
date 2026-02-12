'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password, rememberMe);

      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0c0a' }}>
        <div style={{ color: '#fdffff' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0d0c0a' }}>
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#fdffff' }}>SHC Attend</h1>
          <p className="text-sm opacity-60" style={{ color: '#fdffff' }}>Sacred Heart College Thevara</p>
          <p className="text-xs mt-1 opacity-40" style={{ color: '#fdffff' }}>Attendance Tracker</p>
        </div>

        {/* Login Form */}
        <div className="rounded-3xl p-8" style={{ backgroundColor: '#1a1917' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: '#b6af95' }}>
                Registration Number
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Registration Number"
                className="w-full px-4 py-3 rounded-2xl focus:outline-none transition-all"
                style={{
                  backgroundColor: '#0d0c0a',
                  color: '#fdffff',
                  border: '2px solid transparent',
                }}
                onFocus={(e) => e.target.style.borderColor = '#b6af95'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#b6af95' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl focus:outline-none transition-all"
                style={{
                  backgroundColor: '#0d0c0a',
                  color: '#fdffff',
                  border: '2px solid transparent',
                }}
                onFocus={(e) => e.target.style.borderColor = '#b6af95'}
                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center pt-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: '#b6af95' }}
                disabled={loading}
              />
              <label htmlFor="remember" className="ml-2 text-sm" style={{ color: '#fdffff', opacity: 0.7 }}>
                Remember me
              </label>
            </div>

            {error && (
              <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: '#2a1715', color: '#d5b6a8' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              style={{ backgroundColor: '#b6af95', color: '#0d0c0a' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Warning */}
          <div className="mt-6 p-4 rounded-2xl" style={{ backgroundColor: '#2a2217', borderLeft: '3px solid #b6af95' }}>
            <p className="text-xs" style={{ color: '#d5c8a8' }}>
              <strong>Privacy Notice:</strong> Your credentials are encrypted and stored locally on
              this device. They are never transmitted to any server except the official SHC portal
              for authentication.
            </p>
          </div>
        </div>

        {/* Debug Link (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center">
            <a href="/debug" className="text-sm opacity-50 hover:opacity-70 transition-opacity" style={{ color: '#b6af95' }}>
              Debug Tool →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
