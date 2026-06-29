import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';
import { Plus, Trash, Rocket, Calendar, DollarSign, Image } from 'lucide-react';

const CreateCampaign = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Campaign Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  
  // Reward Tiers State (Array of {title, description, minAmount})
  const [rewards, setRewards] = useState([
    { title: 'Early Supporter Pack', description: 'Thank you email plus name on project website credit scroll.', minAmount: '10' }
  ]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/campaigns/categories');
      if (res.data.success) {
        setCategories(res.data.categories);
        if (res.data.categories.length > 0) {
          setCategoryId(res.data.categories[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !['CREATOR', 'ADMIN'].includes(user.role)) {
      navigate('/');
    } else if (user.role === 'CREATOR' && user.kycStatus !== 'APPROVED') {
      navigate('/kyc-verification');
    } else {
      fetchCategories();
    }
  }, [user, navigate]);

  const handleAddReward = () => {
    setRewards([...rewards, { title: '', description: '', minAmount: '' }]);
  };

  const handleRemoveReward = (index) => {
    if (rewards.length === 1) return;
    setRewards(rewards.filter((_, i) => i !== index));
  };

  const handleRewardChange = (index, field, value) => {
    const updated = [...rewards];
    updated[index][field] = value;
    setRewards(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !goalAmount || !deadline || !coverImage) {
      return setError('Please fill in all required campaign fields.');
    }
    
    // Validate rewards
    for (const tier of rewards) {
      if (!tier.title || !tier.description || !tier.minAmount) {
        return setError('Please complete all fields for your reward tiers.');
      }
      if (Number(tier.minAmount) <= 0) {
        return setError('Reward tier minimum amount must be a positive number.');
      }
    }

    setError('');
    setSubmitting(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('goalAmount', goalAmount);
    formData.append('categoryId', categoryId);
    formData.append('deadline', deadline);
    formData.append('coverImage', coverImage);
    formData.append('rewards', JSON.stringify(rewards));

    try {
      const res = await api.post('/campaigns', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        navigate('/creator'); // Send back to dashboard
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign. Please verify fields.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-xs">Loading platform categories...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="glass-panel border border-darkborder rounded-2xl p-8 shadow-2xl space-y-8">
        
        {/* Header */}
        <div>
          <h2 className="text-3xl font-extrabold text-textPrimary tracking-tight">Launch Campaign</h2>
          <p className="text-sm text-textSecondary mt-1">
            {user?.role === 'ADMIN'
              ? 'Create and submit campaigns from the admin workspace.'
              : 'Fill in your campaign story, goal amounts, and design unique contributor reward tiers.'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Main Story Area */}
          <div className="space-y-4">
            <h3 className="text-md font-bold text-primary uppercase tracking-wider border-b border-darkborder pb-2">1. Campaign Story</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Campaign Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AeroRing Smart wearable"
                  className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-sm p-3.5 text-textPrimary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-sm p-3.5 text-textPrimary focus:outline-none focus:border-primary cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Pitch / Detailed Story</label>
              <textarea 
                required
                rows="5"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pitch your project detailed architecture, timelines, manufacturing plans, and why people should contribute..."
                className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-sm p-3.5 text-textPrimary focus:outline-none focus:border-primary"
              ></textarea>
            </div>
          </div>

          {/* Funding Details */}
          <div className="space-y-4">
            <h3 className="text-md font-bold text-primary uppercase tracking-wider border-b border-darkborder pb-2">2. Funding Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Funding Goal ($)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-sm pl-10 pr-4 py-3.5 text-textPrimary focus:outline-none focus:border-primary"
                  />
                  <DollarSign className="absolute left-3 top-3.5 w-4.5 h-4.5 text-textSecondary" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Deadline Date</label>
                <div className="relative">
                  <input 
                    type="date" 
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-sm pl-10 pr-4 py-3.5 text-textPrimary focus:outline-none focus:border-primary cursor-pointer"
                  />
                  <Calendar className="absolute left-3 top-3.5 w-4.5 h-4.5 text-textSecondary" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Cover Photo</label>
                <div className="relative flex items-center justify-center border border-dashed border-darkborder rounded-xl p-3.5 bg-darkbg/20 hover:bg-darkbg/40 cursor-pointer">
                  <input 
                    type="file" 
                    required
                    accept="image/*"
                    onChange={(e) => setCoverImage(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-textSecondary" />
                    <span className="text-xs text-textSecondary truncate max-w-[150px]">
                      {coverImage ? coverImage.name : 'Select Image'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Reward Tiers */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-darkborder pb-2">
              <h3 className="text-md font-bold text-primary uppercase tracking-wider">3. Contributor Reward Tiers</h3>
              <button 
                type="button"
                onClick={handleAddReward}
                className="flex items-center gap-1 text-xs font-bold bg-darkborder/50 border border-darkborder text-primary px-3 py-1.5 rounded-lg hover:bg-darkborder transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tier</span>
              </button>
            </div>

            <div className="space-y-4">
              {rewards.map((tier, index) => (
                <div key={index} className="p-5 rounded-xl bg-darkbg/35 border border-darkborder space-y-4 relative">
                  
                  {/* Delete Button */}
                  {rewards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReward(index)}
                      className="absolute top-4 right-4 text-textSecondary hover:text-rose-400 p-1.5 rounded-lg"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-textSecondary mb-1.5">Tier Title</label>
                      <input 
                        type="text" 
                        required
                        value={tier.title}
                        onChange={(e) => handleRewardChange(index, 'title', e.target.value)}
                        placeholder="e.g. Standard Early Bird Ring"
                        className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-xs p-3 text-textPrimary focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-textSecondary mb-1.5">Minimum Contribution ($)</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={tier.minAmount}
                        onChange={(e) => handleRewardChange(index, 'minAmount', e.target.value)}
                        placeholder="120"
                        className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-xs p-3 text-textPrimary focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-textSecondary mb-1.5">Description of Reward Pack</label>
                    <textarea 
                      required
                      rows="2"
                      value={tier.description}
                      onChange={(e) => handleRewardChange(index, 'description', e.target.value)}
                      placeholder="List all physical goods, alpha software access, shipping terms included in this funding package..."
                      className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-xs p-3 text-textPrimary focus:outline-none focus:border-primary"
                    ></textarea>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-6 border-t border-darkborder/50 flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-50 text-darkbg font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/10"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-darkbg border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Launch Campaign Draft</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(user?.role === 'ADMIN' ? '/admin' : '/creator')}
              className="px-6 py-3 rounded-xl border border-darkborder text-textSecondary hover:text-textPrimary text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CreateCampaign;
