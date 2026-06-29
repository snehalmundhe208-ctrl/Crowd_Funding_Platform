import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { Mail, ArrowLeft, Send } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      return setError('Please enter your email.');
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setMessage(res.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send recovery email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 bg-darkbg">
      <div className="max-w-md w-full bg-white card-shadow border border-darkborder rounded-2xl p-8 space-y-6 animate-scaleIn">
        
        {/* Back link */}
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-textSecondary hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>

        {/* Header */}
        <div className="text-center">
          <span className="text-3xl">💧</span>
          <h2 className="mt-4 text-3xl font-extrabold text-textPrimary tracking-tight">Recover Password</h2>
          <p className="mt-1 text-sm text-textSecondary">
            We will send you recovery instructions
          </p>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
            {message}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Sending link...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Reset Link</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default ForgotPassword;
