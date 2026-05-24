import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, notifyAuthChanged } from '../services/api';
import { Eye, EyeOff, AlertCircle, Droplets, Zap, Shield } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getLoginErrorMessage = (err) => {
    if (!err.response) return 'Cannot reach the server. Please check the API URL or try again in a moment.';
    return err.response?.data?.detail || 'Login failed. Please check your credentials.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const normalizedUsername = username.trim();
      const normalizedPassword = password.trim();
      const response = await authService.login(normalizedUsername, normalizedPassword);
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      const profile = await authService.getProfile();
      localStorage.setItem('user_role', profile.data.role);
      localStorage.setItem('user_id', profile.data.id);
      localStorage.setItem('username', normalizedUsername);
      notifyAuthChanged();
      navigate('/dashboard');
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto px-4 py-4 sm:py-5 lg:py-6" style={{background:'linear-gradient(135deg,#4a0e0e 0%,#6b1414 35%,#8B1A1A 65%,#a52020 100%)'}}>
      <div className="pointer-events-none fixed inset-0 opacity-5" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.18) 1px,transparent 1px)',backgroundSize:'40px 40px'}} />

      <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col justify-center sm:min-h-[calc(100dvh-2.5rem)] lg:min-h-[calc(100dvh-3rem)]">
        {/* Brand header */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl mb-3 shadow-2xl" style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.25)'}}>
            <Droplets className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-2 tracking-tight whitespace-nowrap">Smart Reporting</h1>
          <p className="text-white/70 text-sm sm:text-base lg:text-lg font-medium tracking-wide uppercase">PBPA Petroleum Inspection System</p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          {[{icon:Zap,label:'Real-time'},{icon:Shield,label:'Secure'},{icon:Droplets,label:'Petroleum'}].map(({icon:Icon,label})=>(
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm sm:text-base font-semibold text-white/85" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)'}}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />{label}
            </div>
          ))}
        </div>

        {/* Glass card */}
        <div className="rounded-2xl shadow-2xl p-7 sm:p-9 lg:p-10" style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)'}}>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-4 sm:mb-5">Sign in to access your dashboard</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-5 flex items-start gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white text-gray-900 text-sm transition-all"
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl bg-gray-50 focus:bg-white text-gray-900 text-sm transition-all pr-12"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3.5 rounded-2xl transition-all disabled:opacity-50 mt-2 text-sm tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              style={{background:'linear-gradient(135deg,#8B1A1A 0%,#a52020 100%)'}}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

        </div>

        <p className="text-center mt-3 sm:mt-4 text-white/70 text-sm">
          Contact your administrator to get access.
        </p>
      </div>
    </div>
  );
};
