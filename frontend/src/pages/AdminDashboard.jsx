import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { 
  Users, BarChart2, ShieldCheck, Eye, RefreshCw,
  Bookmark, UserCheck, FileText, Receipt as ReceiptIcon, Download, Award
} from 'lucide-react';
import CampaignCard from '../components/CampaignCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [myActivity, setMyActivity] = useState(null);
  const [myActivityLoading, setMyActivityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  
  // Actions states
  const [processingId, setProcessingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingKycId, setRejectingKycId] = useState(null);

  const openProtectedFile = async (url, loadingId) => {
    if (loadingId) setDownloadingId(loadingId);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const contentType = res.headers['content-type'] || 'application/octet-stream';
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: contentType }));
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open document.');
    } finally {
      if (loadingId) setDownloadingId(null);
    }
  };

  const fetchStats = async () => {
    try {
      setError('');
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/logs');
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyActivity = async () => {
    setMyActivityLoading(true);
    try {
      const res = await api.get('/users/dashboard');
      if (res.data.success) {
        setMyActivity(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMyActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
    if (activeTab === 'myActivity') {
      fetchMyActivity();
    }
  }, [activeTab]);

  const handleReviewKyc = async (kycId, status) => {
    if (status === 'REJECTED' && !rejectionReason) {
      setRejectingKycId(kycId);
      return;
    }

    setProcessingId(kycId);
    try {
      const payload = { status };
      if (status === 'REJECTED') {
        payload.rejectionReason = rejectionReason;
      }

      const res = await api.put(`/admin/kyc/${kycId}/review`, payload);
      if (res.data.success) {
        setRejectionReason('');
        setRejectingKycId(null);
        setMessage(res.data.message);
        fetchStats();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to review KYC.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewCampaign = async (campaignId, status) => {
    setProcessingId(campaignId);
    try {
      const res = await api.put(`/admin/campaigns/${campaignId}/review`, { status });
      if (res.data.success) {
        setMessage(res.data.message);
        fetchStats();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to review campaign.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewReport = async (reportId, action) => {
    setProcessingId(reportId);
    try {
      const res = await api.put(`/admin/reports/${reportId}/review`, { action });
      if (res.data.success) {
        setMessage(res.data.message);
        fetchStats();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to review report.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleUserSuspension = async (userId) => {
    setProcessingId(userId);
    try {
      const res = await api.put(`/admin/users/${userId}/suspend`);
      if (res.data.success) {
        setMessage(res.data.message);
        fetchStats();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user state.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darkbg flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-sm">Initializing admin dashboards...</p>
      </div>
    );
  }

  if (!data) return null;

  const { stats, users, campaigns, reports, kycReviews, monthlyFundraising = [], campaignsByStatus = [], usersByRole = [] } = data;

  return (
    <div className="space-y-10 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 bg-darkbg">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-textPrimary tracking-tight">Admin Operations Command</h2>
            <p className="text-sm text-textSecondary mt-1">Vet creator KYC documents, moderate campaign drafts, handle community reports, and audit administrator action logs.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/create-campaign" className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold">
              <span>Create Campaign</span>
            </Link>
            <button onClick={fetchStats} className="inline-flex items-center gap-2 bg-darksurface border border-darkborder text-textPrimary px-4 py-2 rounded-xl text-xs font-bold">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
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

      {/* Stats Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center justify-between animate-fadeInUp" style={{ animationDelay: '0ms' }}>
          <div>
            <span className="block text-2xl font-black text-primary">${stats.totalRaised.toLocaleString()}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Total Platform Raised</span>
          </div>
          <span className="text-[10px] text-primary font-bold bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">0% Fee</span>
        </div>

        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center justify-between animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div>
            <span className="block text-2xl font-black text-primary">{kycReviews.filter(k => k.status === 'PENDING').length}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Pending KYC Files</span>
          </div>
          {kycReviews.filter(k => k.status === 'PENDING').length > 0 && <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse"></span>}
        </div>

        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center justify-between animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          <div>
            <span className="block text-2xl font-black text-primary">{campaigns.filter(c => c.status === 'PENDING').length}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Pending Campaigns</span>
          </div>
          {campaigns.filter(c => c.status === 'PENDING').length > 0 && <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse"></span>}
        </div>

        <div className="bg-white card-shadow border border-darkborder border-t-[3px] border-t-primary rounded-2xl p-5 flex items-center justify-between animate-fadeInUp" style={{ animationDelay: '300ms' }}>
          <div>
            <span className="block text-2xl font-black text-primary">{reports.filter(r => r.status === 'PENDING').length}</span>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-bold">Unresolved Reports</span>
          </div>
          {reports.filter(r => r.status === 'PENDING').length > 0 && <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>}
        </div>

      </div>

      {/* Tabs */}
      <div className="flex flex-wrap overflow-x-auto pb-1 gap-2">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
          }`}
        >
          System Overview
        </button>
        <button 
          onClick={() => setActiveTab('kyc')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'kyc' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
          }`}
        >
          <span>KYC Reviews</span>
          {kycReviews.filter(k => k.status === 'PENDING').length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {kycReviews.filter(k => k.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'campaigns' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
          }`}
        >
          <span>Campaign Approvals</span>
          {campaigns.filter(c => c.status === 'PENDING').length > 0 && (
            <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {campaigns.filter(c => c.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'users' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
          }`}
        >
          User Accounts
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
          }`}
        >
          <span>Fraud Reports</span>
          {reports.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {reports.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('myActivity')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'myActivity' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
          }`}
        >
          My Activity
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'logs' ? 'bg-primary text-white' : 'bg-darksurface text-textSecondary'
          }`}
        >
          Audit logs Trail
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6 min-h-[300px]">
        
        {/* Tab 1: System Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider border-b border-darkborder/50 pb-2">Platform Metrics Summary</h3>
              <ul className="space-y-3 text-xs">
                <li className="flex justify-between border-b border-darkborder/25 pb-2">
                  <span className="text-textSecondary">Total User Accounts:</span>
                  <span className="font-bold text-textPrimary">{stats.usersCount}</span>
                </li>
                <li className="flex justify-between border-b border-darkborder/25 pb-2">
                  <span className="text-textSecondary">Total Campaigns Launched:</span>
                  <span className="font-bold text-textPrimary">{stats.campaignsCount}</span>
                </li>
                <li className="flex justify-between border-b border-darkborder/25 pb-2">
                  <span className="text-textSecondary">Donations Count:</span>
                  <span className="font-bold text-textPrimary">{stats.donationsCount}</span>
                </li>
                <li className="flex justify-between border-b border-darkborder/25 pb-2">
                  <span className="text-textSecondary">Completed Campaign Success Rate:</span>
                  <span className="font-bold text-emerald-400">{stats.campaignSuccessRate}%</span>
                </li>
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-darksurface/40 border border-darkborder/50 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-3">Campaign Status Mix</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={campaignsByStatus}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={72}
                          paddingAngle={3}
                          animationDuration={800}
                        >
                          {campaignsByStatus.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={['rgb(232 146 10)', 'rgb(45 80 22)', 'rgb(245 158 11)', 'rgb(239 68 68)', 'rgb(217 119 6)', 'rgb(92 107 58)'][index % 6]}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgb(250 249 246)', borderColor: 'rgb(212 201 176)', borderRadius: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-darksurface/40 border border-darkborder/50 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-3">Users By Role</h4>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={usersByRole}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(212 201 176)" vertical={false} />
                        <XAxis dataKey="name" stroke="rgb(92 107 58)" fontSize={10} tickLine={false} />
                        <YAxis stroke="rgb(92 107 58)" fontSize={10} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgb(250 249 246)', borderColor: 'rgb(212 201 176)', borderRadius: '12px' }} />
                        <Bar dataKey="value" fill="rgb(232 146 10)" radius={[8, 8, 0, 0]} animationDuration={800} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center p-6 bg-darksurface/40 border border-darkborder/50 rounded-2xl">
                <ShieldCheck className="w-12 h-12 text-primary mb-3" />
                <h4 className="font-bold text-sm text-textPrimary">Audit Integrity Secured</h4>
                <p className="text-[11px] text-textSecondary text-center leading-relaxed mt-1 max-w-xs">
                  Every action taken by admins (suspensions, reviews, report resolutions) is logged in the append-only Audit Trail database logs.
                </p>
              </div>

              <div className="bg-darksurface/40 border border-darkborder/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider">Monthly Fundraising</h4>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyFundraising}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(212 201 176)" vertical={false} />
                      <XAxis dataKey="name" stroke="rgb(92 107 58)" fontSize={10} tickLine={false} />
                      <YAxis stroke="rgb(92 107 58)" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgb(250 249 246)', borderColor: 'rgb(212 201 176)', borderRadius: '12px' }} />
                      <Bar dataKey="amount" fill="rgb(45 80 22)" radius={[8, 8, 0, 0]} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: KYC Reviews */}
        {activeTab === 'kyc' && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Pending Creator KYC Reviews</h3>
            
            {kycReviews.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-8">No KYC submissions found in database.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-darkborder/50 text-textSecondary uppercase font-bold tracking-wider">
                      <th className="pb-3 pr-4">Creator</th>
                      <th className="pb-3 px-4">Doc Type</th>
                      <th className="pb-3 px-4">Submitted At</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycReviews.map((kyc) => (
                      <tr key={kyc.id} className={`border-b border-darkborder/30 last:border-b-0 hover:bg-darkbg/20 ${kyc.status === 'PENDING' ? 'bg-amber-50/50 ring-2 ring-amber-400/40' : ''}`}>
                        <td className="py-4 pr-4 font-bold text-textPrimary">
                          <span className="block">{kyc.user.name}</span>
                          <span className="block text-[10px] text-textSecondary">{kyc.user.email}</span>
                        </td>
                        <td className="py-4 px-4 text-textSecondary">{kyc.documentType}</td>
                        <td className="py-4 px-4 text-textSecondary">{new Date(kyc.submittedAt).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] border ${
                            kyc.status === 'APPROVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                            kyc.status === 'PENDING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                            'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`}>
                            {kyc.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 text-right space-y-2 sm:space-y-0 sm:space-x-2">
                          <button
                            type="button"
                            onClick={() => openProtectedFile(`/users/kyc/${kyc.id}/document?inline=true`)}
                            className="text-blue-400 hover:text-blue-300 font-bold mr-2 text-xs inline-flex items-center gap-0.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Doc</span>
                          </button>
                          
                          {kyc.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleReviewKyc(kyc.id, 'APPROVED')}
                                disabled={processingId === kyc.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] mr-2 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              
                              {rejectingKycId === kyc.id ? (
                                <div className="inline-flex flex-col items-end gap-1.5 mt-2">
                                  <input 
                                    type="text" 
                                    placeholder="Reason for rejection"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="bg-white border border-darkborder text-[10px] px-2 py-1 text-textPrimary rounded focus:outline-none"
                                  />
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleReviewKyc(kyc.id, 'REJECTED')}
                                      className="text-rose-400 hover:text-rose-300 font-bold text-[10px]"
                                    >
                                      Confirm Reject
                                    </button>
                                    <button 
                                      onClick={() => setRejectingKycId(null)}
                                      className="text-textSecondary text-[10px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setRejectingKycId(kyc.id)}
                                  disabled={processingId === kyc.id}
                                  className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Campaign Approvals */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Moderate Campaign Launches</h3>
            
            {campaigns.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-8">No campaigns in database.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-darkborder/50 text-textSecondary uppercase font-bold tracking-wider">
                      <th className="pb-3 pr-4">Campaign</th>
                      <th className="pb-3 px-4">Creator</th>
                      <th className="pb-3 px-4">Goal</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((camp) => (
                      <tr key={camp.id} className="border-b border-darkborder/30 last:border-b-0 hover:bg-darkbg/20">
                        <td className="py-4 pr-4 font-bold text-textPrimary">
                          <Link to={`/campaigns/${camp.id}`} className="hover:text-primary">{camp.title}</Link>
                        </td>
                        <td className="py-4 px-4 text-textSecondary">{camp.creator.name}</td>
                        <td className="py-4 px-4 font-bold text-textPrimary">${Number(camp.goalAmount).toLocaleString()}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] border ${
                            camp.status === 'ACTIVE' || camp.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                            camp.status === 'PENDING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                            'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 text-right">
                          {camp.status === 'PENDING' ? (
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleReviewCampaign(camp.id, 'APPROVED')}
                                disabled={processingId === camp.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewCampaign(camp.id, 'REJECTED')}
                                disabled={processingId === camp.id}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-textSecondary/50 font-medium">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: User Accounts */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">User Account Management</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-darkborder/50 text-textSecondary uppercase font-bold tracking-wider">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 px-4">Verified</th>
                    <th className="pb-3 px-4">Account Status</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className="border-b border-darkborder/30 last:border-b-0 hover:bg-darkbg/20">
                      <td className="py-4 pr-4 font-bold text-textPrimary">
                        <span className="block">{item.name}</span>
                        <span className="block text-[10px] text-textSecondary">{item.email}</span>
                      </td>
                      <td className="py-4 px-4 text-textSecondary">{item.role}</td>
                      <td className="py-4 px-4 text-textSecondary">{item.isVerified ? 'Yes' : 'No'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          item.isSuspended ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        }`}>
                          {item.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-4 pl-4 text-right">
                        {item.role !== 'ADMIN' ? (
                          <button
                            onClick={() => handleToggleUserSuspension(item.id)}
                            disabled={processingId === item.id}
                            className={`font-bold px-3 py-1.5 rounded-lg text-[10px] disabled:opacity-50 transition-colors ${
                              item.isSuspended 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                            }`}
                          >
                            {item.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                        ) : (
                          <span className="text-textSecondary/50 font-medium">Bypass</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Fraud Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Moderate Reported Campaigns</h3>
            
            {reports.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-8">No reports submitted by the community yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-darkborder/50 text-textSecondary uppercase font-bold tracking-wider">
                      <th className="pb-3 pr-4">Reported Campaign</th>
                      <th className="pb-3 px-4">Reporter</th>
                      <th className="pb-3 px-4">Reason</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((rep) => (
                      <tr key={rep.id} className="border-b border-darkborder/30 last:border-b-0 hover:bg-darkbg/20">
                        <td className="py-4 pr-4 font-bold text-textPrimary">
                          <Link to={`/campaigns/${rep.campaignId}`} className="hover:text-primary">{rep.campaign.title}</Link>
                          {rep.description && <span className="block text-[10px] text-textSecondary/80 font-normal mt-1 whitespace-pre-line">Desc: "{rep.description}"</span>}
                        </td>
                        <td className="py-4 px-4 text-textSecondary">{rep.reporter.name}</td>
                        <td className="py-4 px-4 text-rose-400 font-semibold">{rep.reason}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            rep.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                            rep.status === 'PENDING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                            'text-textSecondary bg-darkborder/50 border-darkborder'
                          }`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 text-right">
                          {rep.status === 'PENDING' ? (
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleReviewReport(rep.id, 'RESOLVED')}
                                disabled={processingId === rep.id}
                                className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] disabled:opacity-50"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleReviewReport(rep.id, 'DISMISSED')}
                                disabled={processingId === rep.id}
                                className="bg-darkborder border border-darkborder text-textSecondary hover:text-textPrimary font-bold px-3 py-1.5 rounded-lg text-[10px] disabled:opacity-50"
                              >
                                Dismiss
                              </button>
                            </div>
                          ) : (
                            <span className="text-textSecondary/50 font-medium">Closed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Audit trail Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider">Administrative System Audit Trail</h3>
            
            {logs.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-8">No action logs found in system database.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-darkborder/50 text-textSecondary uppercase font-bold tracking-wider">
                      <th className="pb-3 pr-4">Admin</th>
                      <th className="pb-3 px-4">Action Event</th>
                      <th className="pb-3 px-4">Details Summary</th>
                      <th className="pb-3 pl-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-darkborder/30 last:border-b-0 hover:bg-darkbg/25">
                        <td className="py-4 pr-4 font-bold text-textPrimary">{log.admin.name}</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-darkborder text-primary uppercase">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-textSecondary font-mono text-[10px] max-w-md truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="py-4 pl-4 text-right text-textSecondary">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'myActivity' && (
          <div className="space-y-8 animate-fadeIn">
            {myActivityLoading || !myActivity ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-xs text-textSecondary">Loading your personal activity...</p>
              </div>
            ) : (
              <>
                {/* Bookmarks */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider border-b border-darkborder/50 pb-2 flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-blue-400" />
                    <span>Bookmarks</span>
                  </h3>
                  {(myActivity.bookmarks || []).length === 0 ? (
                    <p className="text-xs text-textSecondary text-center py-8">No bookmarked campaigns.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      {myActivity.bookmarks.map((c) => (
                        <CampaignCard key={c.id} campaign={c} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Following */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider border-b border-darkborder/50 pb-2 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-accent" />
                    <span>Following</span>
                  </h3>
                  {(myActivity.followedCreators || []).length === 0 ? (
                    <p className="text-xs text-textSecondary text-center py-8">You are not following any creators.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myActivity.followedCreators.map((creator) => {
                        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                        const serverBase = API_URL.replace('/api', '');
                        const avatar = creator.avatar ? (creator.avatar.startsWith('http') ? creator.avatar : `${serverBase}${creator.avatar}`) : null;
                        return (
                          <div key={creator.id} className="flex items-center gap-3 border border-darkborder/40 rounded-xl p-3">
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
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* My Certificates */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider border-b border-darkborder/50 pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>My Certificates</span>
                  </h3>
                  {(myActivity.certificates || []).length === 0 ? (
                    <p className="text-xs text-textSecondary text-center py-8">No certificates yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {myActivity.certificates.map((certificate) => (
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
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-textPrimary uppercase tracking-wider border-b border-darkborder/50 pb-2 flex items-center gap-2">
                    <ReceiptIcon className="w-4 h-4 text-primary" />
                    <span>My Receipts</span>
                  </h3>
                  {(myActivity.receipts || []).length === 0 ? (
                    <p className="text-xs text-textSecondary text-center py-8">No receipts yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {myActivity.receipts.map((receipt) => (
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
              </>
            )}
          </div>
        )}

      </div>

    </div>
  );
};

export default AdminDashboard;
