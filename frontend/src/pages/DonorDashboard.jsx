import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import CampaignCard from '../components/CampaignCard';
import {
  Heart, Bookmark, DollarSign, Award, Clock,
  Download, ArrowRight, UserCheck, Inbox, ShieldCheck, Activity, Sparkles,
  FileText, Receipt as ReceiptIcon
} from 'lucide-react';

const DonorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/users/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openProtectedFile = async (url, loadingId) => {
    setDownloadingId(loadingId);
    try {
      const res = await api.get(url, {
        responseType: 'blob'
      });

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

  if (loading) {
    return (
      <div className="min-h-screen bg-darkbg flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-sm">Loading donor metrics...</p>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, donations, bookmarks, followedCreators, certificates = [], receipts = [], badges = [], gamification, activityFeed = [] } = data;

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 bg-darkbg">
      
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-textPrimary tracking-tight">Donor Dashboard</h2>
        <p className="text-sm text-textSecondary mt-1">Monitor your contributions, receipts and saved campaigns.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '0ms' }}>
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">${metrics.totalDonated.toLocaleString()}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Total Contributed</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="p-3 bg-accent/10 border border-accent/20 rounded-xl">
            <Heart className="w-6 h-6 text-accent" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">{metrics.totalDonationsCount}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Contributions</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Bookmark className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">{metrics.bookmarksCount}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Bookmarked</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Award className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">{metrics.badgesCount}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Badges Earned</span>
          </div>
        </div>

        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center gap-4 col-span-2 lg:col-span-4 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="block text-2xl font-black text-primary">{metrics.trustScore}%</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Trust Score</span>
          </div>
        </div>

        {gamification && (
          <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center justify-between gap-4 col-span-2 lg:col-span-4 animate-fadeInUp" style={{ animationDelay: '500ms' }}>
            <div>
              <span className="block text-2xl font-black text-primary">Lv {gamification.level} · {gamification.title}</span>
              <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">{gamification.xp} XP · {gamification.rewardPreview}</span>
            </div>
            <span className="text-sm font-bold text-primary">{gamification.progressPercent}% to next level</span>
          </div>
        )}

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
        
        {/* Left Column (Donation History Table) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-textPrimary">Contribution History</h3>
            
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-10 h-10 text-textSecondary/40 mx-auto mb-3" />
                <p className="text-sm text-textSecondary">You haven't supported any campaigns yet.</p>
                <Link to="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  <span>Explore campaigns</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-darkborder/50 text-textSecondary uppercase font-bold tracking-wider">
                      <th className="pb-3 pr-4">Campaign</th>
                      <th className="pb-3 px-4">Date</th>
                      <th className="pb-3 px-4">Amount</th>
                      <th className="pb-3 px-4 text-right">Receipt</th>
                      <th className="pb-3 pl-4 text-right">Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((don) => (
                      <tr key={don.id} className="border-b border-darkborder/30 last:border-b-0 hover:bg-darkborder/10 transition-colors">
                        <td className="py-4 pr-4 font-bold text-textPrimary max-w-[200px] truncate">
                          <Link to={`/campaigns/${don.campaignId}`} className="hover:text-primary">
                            {don.campaign.title}
                          </Link>
                        </td>
                        <td className="py-4 px-4 text-textSecondary">
                          {new Date(don.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 font-extrabold text-textPrimary">
                          ${Number(don.amount).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {don.receipt ? (
                            <button
                              onClick={() => openProtectedFile(`/donations/receipts/${don.receipt.id}/download?inline=true`, `receipt-${don.receipt.id}`)}
                              disabled={downloadingId === `receipt-${don.receipt.id}`}
                              className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{downloadingId === `receipt-${don.receipt.id}` ? 'Loading...' : 'PDF'}</span>
                            </button>
                          ) : (
                            <span className="text-textSecondary/50 font-medium">N/A</span>
                          )}
                        </td>
                        <td className="py-4 pl-4 text-right">
                          {don.certificate ? (
                            <button
                              onClick={() => openProtectedFile(`/donations/certificates/${don.certificate.id}/download?inline=true`, `certificate-${don.certificate.id}`)}
                              disabled={downloadingId === `certificate-${don.certificate.id}`}
                              className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{downloadingId === `certificate-${don.certificate.id}` ? 'Loading...' : 'PDF'}</span>
                            </button>
                          ) : (
                            <span className="text-textSecondary/50 font-medium">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bookmarked grid */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-textPrimary pl-1">Saved Bookmarks</h3>
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
        </div>

        {/* Right Column (Followed Creators) */}
        <div className="space-y-6">
          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
            <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-accent" />
              <span>Followed Creators</span>
            </h3>

            {followedCreators.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-8">You are not following any creators.</p>
            ) : (
              <div className="space-y-4">
                {followedCreators.map((creator) => {
                  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                  const serverBase = API_URL.replace('/api', '');
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

          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
            {gamification?.milestones?.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span>XP Milestones</span>
                </h3>
                {gamification.milestones.slice(0, 4).map((milestone) => (
                  <div key={milestone.id} className="border border-darkborder/40 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-textPrimary">{milestone.label}</span>
                      <span className={`text-[10px] font-bold ${milestone.unlocked ? 'text-emerald-400' : 'text-textSecondary'}`}>
                        {milestone.current}/{milestone.target}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <span>Recent Activity</span>
            </h3>
            {activityFeed.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-6">No recent activity.</p>
            ) : (
              <div className="space-y-3 mb-6">
                {activityFeed.slice(0, 6).map((item) => (
                  <div key={item.id} className="border border-darkborder/40 rounded-xl p-3">
                    <span className="block text-xs font-bold text-textPrimary">{item.title}</span>
                    <span className="block text-[10px] text-textSecondary mt-1">{item.description}</span>
                  </div>
                ))}
              </div>
            )}

          </div>

          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
            <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Badge Collection</span>
            </h3>
            {badges.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-6">No badges yet.</p>
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

          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
            <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>My Certificates</span>
            </h3>
            {certificates.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-6">No certificates yet.</p>
            ) : (
              <div className="space-y-3">
                {certificates.slice(0, 6).map((certificate) => (
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

          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6">
            <h3 className="text-lg font-bold text-textPrimary mb-6 flex items-center gap-2">
              <ReceiptIcon className="w-5 h-5 text-primary" />
              <span>My Receipts</span>
            </h3>
            {receipts.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-6">No receipts yet.</p>
            ) : (
              <div className="space-y-3">
                {receipts.slice(0, 6).map((receipt) => (
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

      </div>

    </div>
  );
};

export default DonorDashboard;
