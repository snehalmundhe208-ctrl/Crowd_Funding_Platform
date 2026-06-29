import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn } from 'lucide-react';

const getDashboardPath = (user) => {
  if (user.role === 'CREATOR' && user.kycStatus !== 'APPROVED') return '/kyc-verification';
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'CREATOR') return '/creator';
  return '/donor';
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname;
  const registrationSuccess = location.state?.registrationSuccess;
  const prefilledEmail = location.state?.email || '';

  React.useEffect(() => {
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return setError('Please enter both email and password.');
    }
    setError('');
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      navigate(from || getDashboardPath(res.user), { replace: true });
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 bg-darkbg">
      <div className="max-w-md w-full bg-white card-shadow border border-darkborder rounded-2xl p-8 space-y-6 animate-scaleIn">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-3xl">💧</span>
          <h2 className="mt-4 text-3xl font-extrabold text-textPrimary tracking-tight">Welcome Back</h2>
          <p className="mt-1 text-sm text-textSecondary">
            Sign in to continue supporting creators
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}
        {registrationSuccess && !error && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
            {registrationSuccess}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">
              Email Address
            </label>
            <div className="relative">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white border border-darkborder rounded-xl text-sm pl-10 pr-4 py-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-textSecondary" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary-hover">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-darkborder rounded-xl text-sm pl-10 pr-4 py-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-textSecondary" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Signing you in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-textSecondary mt-4">
          New to CrowdFlow?{' '}
          <Link to="/register" className="font-bold text-primary hover:text-primary-hover">
            Create an Account
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Login;
