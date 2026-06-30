import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import BadgeList from '../components/BadgeList';
import { User, Mail, Camera, Save, RefreshCw } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [badges, setBadges] = useState([]);
  
  const [updating, setUpdating] = useState(false);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchUserBadges = async () => {
    try {
      const res = await api.get('/users/dashboard');
      if (res.data.success && res.data.badges) {
        setBadges(res.data.badges);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBadges(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const serverBase = API_URL.replace('/api', '');
      
      if (user.avatar) {
        setAvatarPreview(user.avatar.startsWith('http') ? user.avatar : `${serverBase}${user.avatar}`);
      }
      
      fetchUserBadges();
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setUpdating(true);

    const formData = new FormData();
    formData.append('name', name);
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const res = await updateProfile(formData);
    setUpdating(false);

    if (res.success) {
      setMessage('Profile settings updated successfully.');
      await refreshUser();
    } else {
      setError(res.error);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-12 bg-darkbg">
      
      {/* Profile Settings Panel */}
      <div className="bg-white card-shadow border border-darkborder rounded-2xl p-8 space-y-8 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
        <div>
          <h2 className="text-3xl font-extrabold text-textPrimary tracking-tight">Profile Settings</h2>
          <p className="text-sm text-textSecondary mt-1">Manage your identity, credentials and profile visuals.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            
            {/* Avatar Preview & Upload Area */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-primary/50 hover:ring-primary transition-all duration-300 group shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-accent font-bold text-2xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
                <Camera className="w-5 h-5 text-white" />
                <span className="text-[9px] text-white font-bold mt-1 uppercase">Change</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Account Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-darkborder rounded-xl text-sm pl-10 pr-4 py-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <User className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-textSecondary" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Email Address (Read Only)</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      disabled
                      value={user.email}
                      className="w-full bg-darkbg/25 border border-darkborder/50 rounded-xl text-sm pl-10 pr-4 py-3 text-textSecondary cursor-not-allowed"
                    />
                    <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-textSecondary/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-darkborder/40 flex justify-end">
            <button
              type="submit"
              disabled={updating}
              className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-1.5"
            >
              {updating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Badges Section */}
      <div className="bg-white card-shadow border border-darkborder rounded-2xl p-8 space-y-6 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
        <div>
          <h3 className="text-xl font-extrabold text-textPrimary tracking-tight">Unlocked Contributor Badges</h3>
          <p className="text-xs text-textSecondary mt-0.5">Badges earned by donating, supporting, or reaching milestones on CrowdFlow.</p>
        </div>

        {loadingBadges ? (
          <div className="h-24 bg-darksurface/30 animate-pulse rounded-xl"></div>
        ) : (
          <BadgeList badges={badges} />
        )}
      </div>

    </div>
  );
};

export default Profile;
