import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';
import { Save, Image } from 'lucide-react';

const EditCampaign = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [coverImage, setCoverImage] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = API_URL.replace('/api', '');

  const fetchData = async () => {
    try {
      const [catRes, campRes] = await Promise.all([
        api.get('/campaigns/categories'),
        api.get(`/campaigns/${id}`)
      ]);

      if (catRes.data.success) {
        setCategories(catRes.data.categories);
      }

      if (campRes.data.success) {
        const campaign = campRes.data.campaign;

        const isOwner = campaign.creator?.id === user?.id;
        const isAdmin = user?.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
          navigate(`/campaigns/${id}`);
          return;
        }

        setTitle(campaign.title);
        setDescription(campaign.description);
        setCategoryId(campaign.category?.id || '');
        setExistingImageUrl(campaign.imageUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load campaign.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !['CREATOR', 'ADMIN'].includes(user.role)) {
      navigate('/');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return setError('Title and description cannot be empty.');
    }

    setError('');
    setSubmitting(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('categoryId', categoryId);
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    try {
      const res = await api.put(`/campaigns/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        navigate(`/campaigns/${id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-xs">Loading campaign...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="glass-panel border border-darkborder rounded-2xl p-8 shadow-2xl space-y-8">

        <div>
          <h2 className="text-3xl font-extrabold text-textPrimary tracking-tight">Edit Campaign</h2>
          <p className="text-sm text-textSecondary mt-1">
            Update your campaign story, category, or cover photo.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                className="w-full bg-darkbg/50 border border-darkborder rounded-xl text-sm p-3.5 text-textPrimary focus:outline-none focus:border-primary"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Cover Photo</label>
              <div className="flex items-center gap-4">
                {existingImageUrl && (
                  <img
                    src={existingImageUrl.startsWith('http') ? existingImageUrl : `${serverBase}${existingImageUrl}`}
                    alt="Current cover"
                    className="w-20 h-14 object-cover rounded-lg border border-darkborder shrink-0"
                  />
                )}
                <div className="relative flex-1 flex items-center justify-center border border-dashed border-darkborder rounded-xl p-3.5 bg-darkbg/20 hover:bg-darkbg/40 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverImage(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-textSecondary" />
                    <span className="text-xs text-textSecondary truncate max-w-[200px]">
                      {coverImage ? coverImage.name : 'Replace image (optional)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/campaigns/${id}`)}
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

export default EditCampaign;