import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User as UserIcon, Award, Heart } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('DONOR'); // DONOR or CREATOR
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) {
      return setError('Please fill in all required fields.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    
    setError('');
    setLoading(true);

    const res = await register(email, password, name, role);
    setLoading(false);

    if (res.success) {
      navigate('/login', {
        replace: true,
        state: {
          registrationSuccess: res.message || 'Registration successful. Please sign in with your new account.',
          email
        }
      });
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 bg-darkbg">
      <div className="max-w-md w-full bg-white card-shadow border border-darkborder rounded-2xl p-8 space-y-6 animate-scaleIn">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-3xl">💧</span>
          <h2 className="mt-4 text-3xl font-extrabold text-textPrimary tracking-tight font-sans">Create Account</h2>
          <p className="mt-1 text-sm text-textSecondary">
            Join the decentralized funding network
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              type="button"
              onClick={() => setRole('DONOR')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                role === 'DONOR'
                  ? 'border-primary bg-primary text-white scale-[1.03]'
                  : 'border-darkborder bg-darksurface text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Heart className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Donor</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('CREATOR')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                role === 'CREATOR'
                  ? 'border-primary bg-primary text-white scale-[1.03]'
                  : 'border-darkborder bg-darksurface text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Award className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Creator</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">
              Full Name
            </label>
            <div className="relative">
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-white border border-darkborder rounded-xl text-sm pl-10 pr-4 py-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <UserIcon className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-textSecondary" />
            </div>
          </div>

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
                placeholder="john@example.com"
                className="w-full bg-white border border-darkborder rounded-xl text-sm pl-10 pr-4 py-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-textSecondary" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">
              Password
            </label>
            <div className="relative">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
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
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-textSecondary mt-4">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:text-primary-hover">
            Sign In
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Register;
