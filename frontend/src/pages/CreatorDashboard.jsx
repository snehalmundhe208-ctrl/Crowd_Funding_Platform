import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import CampaignCard from '../components/CampaignCard';
import {
  Plus, Users, DollarSign, Rocket,
  Send, BarChart2, CheckCircle2, ShieldCheck, Inbox, Award,
  Bookmark, UserCheck, FileText, Receipt as ReceiptIcon, Download
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CreatorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns'); // campaigns, publishUpdate, myActivity
  
  // Update state
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');

  const fetchCreatorData = async () => {
    try {
      const res = await api.get('/users/dashboard');
      if (res.data.success) {
        setData(res.data);
        if (res.data.campaigns.length > 0) {
          setSelectedCampaignId(res.data.campaigns[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatorData();
  }, []);

  const openProtectedFile = async (url, loadingId) => {
    setDownloadingId(loadingId);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const contentType = res.headers['content-type'] || 'application/octet-stream';
      const fileURL = URL.createObjectURL(new Blob([res.data], { type: contentType }));
      window.open(fileURL, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(fileURL), 60000);
    } catch (err) {
      console.error('File open failed', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePublishUpdate = async (e) => {
    e.preventDefault();
    if (!selectedCampaignId || !updateTitle || !updateContent) {
      return setUpdateError('Please fill in all update fields.');
    }
    setUpdateError('');
    setUpdateMessage('');
    setUpdateSubmitting(true);

    try {
      const res = await api.post(`/campaigns/${selectedCampaignId}/updates`, {
        title: updateTitle,
        content: updateContent
      });

      if (res.data.success) {
        setUpdateMessage('Campaign update published and notifications broadcasted successfully!');
        setUpdateTitle('');
        setUpdateContent('');
        fetchCreatorData(); // refresh list
      }
    } catch (err) {
      setUpdateError(err.response?.data?.error || 'Failed to post update.');
    } finally {
      setUpdateSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darkbg flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-sm">Loading analytics modules...</p>
      </div>
    );
  }

  if (!data) return null;

  const {
    metrics, campaigns, recentDonations, monthlyFundraising, badges = [], gamification,
    bookmarks = [], followedCreators = [], certificates = [], receipts = []
  } = data;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = API_URL.replace('/api', '');

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 bg-darkbg">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-textPrimary tracking-tight">Creator Analytics Hub</h2>
          <p className="text-sm text-textSecondary mt-1 font-medium">Analyze campaign funding cycles, post updates, and track followers.</p>
        </div>

        <Link 
          to="/create-campaign"
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white font-bold px-5 py-3 rounded-xl text-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Launch Campaign</span>
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">${metrics.totalRaised.toLocaleString()}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Total Raised</span>
          </div>
        </div>

        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl">
            <Rocket className="w-6 h-6 text-accent" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">{metrics.totalCampaignsCount}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Launched Projects</span>
          </div>
        </div>

        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">{metrics.followersCount}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Followers</span>
          </div>
        </div>

        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">{metrics.trustScore}%</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Dynamic Trust Score</span>
          </div>
        </div>
      </div>

      {gamification && (
        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
          <div>
            <span className="block text-2xl font-black text-primary">Lv {gamification.level} · {gamification.title}</span>
            <span className="block text-xs text-textSecondary mt-1">{gamification.xp} XP · {gamification.rewardPreview}</span>
          </div>
          <div className="text-sm font-bold text-primary">{gamification.progressPercent}% to next level</div>
        </div>
      )}

      {/* Chart Section */}
      {monthlyFundraising.length > 0 && (
        <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-textPrimary">Monthly Fundraising Trends</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyFundraising} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(232 146 10)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="rgb(232 146 10)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(212 201 176)" vertical={false} />
                <XAxis dataKey="name" stroke="rgb(92 107 58)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgb(92 107 58)" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgb(250 249 246)', borderColor: 'rgb(212 201 176)', borderRadius: '12px' }}
                  labelStyle={{ color: 'rgb(92 107 58)', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: 'rgb(232 146 10)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="amount" stroke="rgb(232 146 10)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmount)" animationDuration={800} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Layout columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left main area (tabs) */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'campaigns' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
              }`}
            >
              My Campaigns
            </button>
            <button 
              onClick={() => setActiveTab('publishUpdate')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'publishUpdate' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
              }`}
            >
              Post Project Update
            </button>
            <button 
              onClick={() => setActiveTab('myActivity')}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'myActivity' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
              }`}
            >
              My Activity
            </button>
          </div>

          {activeTab === 'campaigns' && (
            <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6 animate-fadeIn">
              {campaigns.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox className="w-12 h-12 text-textSecondary/35 mx-auto mb-4" />
                  <h4 className="font-bold text-textPrimary">No Campaigns Launched</h4>
                  <p className="text-xs text-textSecondary mt-1 max-w-sm mx-auto">Get verified and start launching smart wearable or organic garden designs today!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {campaigns.map((camp) => (
                    <div key={camp.id} className="border-b border-darkborder/30 last:border-0 pb-6 last:pb-0 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                      <div className="w-24 h-16 rounded-lg overflow-hidden border border-darkborder shrink-0">
                        <img 
                          src={camp.imageUrl.startsWith('http') ? camp.imageUrl : `${serverBase}${camp.imageUrl}`} 
                          alt={camp.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-textPrimary">
                              <Link to={`/campaigns/${camp.id}`} className="hover:text-primary transition-colors">
                                {camp.title}
                              </Link>
                            </h4>
                            <span className="text-[10px] text-textSecondary uppercase tracking-wider font-semibold">Status: {camp.status}</span>
                          </div>
                          
                          <span className="text-xs font-bold text-textSecondary bg-darkborder/50 px-2.5 py-1 border border-darkborder rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                            <span>Trust: {camp.trustScore}</span>
                          </span>
                        </div>

                        <ProgressBar raised={camp.raisedAmount} goal={camp.goalAmount} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'publishUpdate' && (
            <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6 animate-fadeIn">
              <h3 className="text-lg font-bold text-textPrimary mb-4">Post Campaign Updates</h3>
              
              {campaigns.length === 0 ? (
                <p className="text-xs text-textSecondary">You need at least one active campaign to post updates.</p>
              ) : (
                <form onSubmit={handlePublishUpdate} className="space-y-4">
                  {updateError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold">
                      {updateError}
                    </div>
                  )}
                  {updateMessage && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold">
                      {updateMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Select Campaign</label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="w-full bg-white border border-darkborder rounded-xl text-xs p-3.5 text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Update Title</label>
                    <input 
                      type="text" 
                      required
                      value={updateTitle}
                      onChange={(e) => setUpdateTitle(e.target.value)}
                      placeholder="e.g. Completed Carbon Fiber Prototype stress testing!"
                      className="w-full bg-white border border-darkborder rounded-xl text-xs p-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Content Message</label>
                    <textarea 
                      required
                      rows="5"
                      value={updateContent}
                      onChange={(e) => setUpdateContent(e.target.value)}
                      placeholder="Provide raw engineering yields, design progress updates, shipping estimates, or logistical summaries..."
                      className="w-full bg-white border border-darkborder rounded-xl text-xs p-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={updateSubmitting}
                    className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all flex items-center gap-1.5"
                  >
                    {updateSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Publish & Notify Donors</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'myActivity' && (
            <div className="space-y-8 animate-fadeIn">

              {/* Bookmarks */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-blue-400" />
                  <span>Bookmarks</span>
                </h3>
                {bookmarks.length === 0 ? (
                  <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6 text-center py-10">
                    <Bookmark className="w-8 h-8 text-textSecondary/35 mx-auto mb-3" />
                    <p className="text-sm text-textSecondary">No bookmarked campaigns.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {bookmarks.map((c) => (
                      <CampaignCard key={c.id} campaign={c} />
                    ))}
                  </div>
                )}
              </div>

              {/* Following */}
              <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
                <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-accent" />
                  <span>Following</span>
                </h3>
                {followedCreators.length === 0 ? (
                  <p className="text-xs text-textSecondary text-center py-8">You are not following any creators.</p>
                ) : (
                  <div className="space-y-4">
                    {followedCreators.map((creator) => {
                      const avatar = creator.avatar ? (creator.avatar.startsWith('http') ? creator.avatar : `${serverBase}${creator.avatar}`) : null;
                      return (
                        <div key={creator.id} className="flex items-center justify-between border-b border-darkborder/30 pb-3 last:border-b-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-darkborder shrink-0">
                              {avatar ? (
                                <img src={avatar} alt={creator.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-darkborder flex items-center justify-center text-xs font-bold text-textSecondary">
                                  {creator.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-textPrimary">{creator.name}</span>
                                {creator.isVerified && <Award className="w-3.5 h-3.5 text-primary fill-primary/10" />}
                              </div>
                              <span className="text-[10px] text-textSecondary">Verified Creator</span>
                            </div>
                          </div>
                          <Link
                            to={`/`}
                            className="text-[10px] font-bold bg-darkborder/50 border border-darkborder text-textPrimary px-3 py-1.5 rounded-lg hover:bg-darkborder transition-colors"
                          >
                            View Projects
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My Certificates */}
              <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
                <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>My Certificates</span>
                </h3>
                {certificates.length === 0 ? (
                  <p className="text-xs text-textSecondary text-center py-6">No certificates yet.</p>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((certificate) => (
                      <div key={certificate.id} className="border border-darkborder/40 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-textPrimary truncate">{certificate.campaignTitle}</span>
                          <span className="block text-[10px] text-textSecondary mt-1">${Number(certificate.amount).toFixed(2)} · {new Date(certificate.donationDate).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => openProtectedFile(`/donations/certificates/${certificate.id}/download?inline=true`, `certificate-${certificate.id}`)}
                          disabled={downloadingId === `certificate-${certificate.id}`}
                          className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-1 disabled:opacity-50 text-[10px] shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingId === `certificate-${certificate.id}` ? '...' : 'PDF'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* My Receipts */}
              <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
                <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
                  <ReceiptIcon className="w-5 h-5 text-primary" />
                  <span>My Receipts</span>
                </h3>
                {receipts.length === 0 ? (
                  <p className="text-xs text-textSecondary text-center py-6">No receipts yet.</p>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div key={receipt.id} className="border border-darkborder/40 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-textPrimary truncate">{receipt.campaignTitle}</span>
                          <span className="block text-[10px] text-textSecondary mt-1">${Number(receipt.amount).toFixed(2)} · {new Date(receipt.donationDate).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => openProtectedFile(`/donations/receipts/${receipt.id}/download?inline=true`, `receipt-${receipt.id}`)}
                          disabled={downloadingId === `receipt-${receipt.id}`}
                          className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-1 disabled:opacity-50 text-[10px] shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingId === `receipt-${receipt.id}` ? '...' : 'PDF'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Right Column (Recent Contributions list) */}
        <div className="space-y-6">
          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
            <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-accent" />
              <span>Recent Contributions</span>
            </h3>

            {recentDonations.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-8">No contributions recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {recentDonations.map((don) => (
                  <div key={don.id} className="border-b border-darkborder/30 pb-3.5 last:border-b-0 last:pb-0 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="block text-xs font-bold text-textPrimary">
                        {don.isAnonymous ? 'Anonymous Donor' : don.donor.name}
                      </span>
                      <span className="block text-[10px] text-textSecondary line-clamp-1">
                        on "{don.campaign.title}"
                      </span>
                      <span className="block text-[9px] text-textSecondary/75">
                        {new Date(don.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <span className="text-xs font-black text-primary shrink-0">+${Number(don.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
            <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Badges</span>
            </h3>
            {badges.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-6">No badges unlocked yet.</p>
            ) : (
              <div className="space-y-3">
                {badges.map((badge) => (
                  <div key={badge.id} className="border border-darkborder/40 rounded-xl p-3">
                    <span className="block text-xs font-bold text-textPrimary">{badge.name}</span>
                    <span className="block text-[10px] text-textSecondary mt-1">{badge.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default CreatorDashboard;
