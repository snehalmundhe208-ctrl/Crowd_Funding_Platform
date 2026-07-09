import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useAuth } from '../context/AuthContext';
import ProgressBar from '../components/ProgressBar';
import {
  AlertTriangle, Award, BarChart2, Bookmark, Calendar, CheckCircle2,
  ChevronRight, Download, Heart, MessageSquare, QrCode, Share2, ShieldCheck
} from 'lucide-react';

const CampaignDetails = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('story');
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donationSubmitting, setDonationSubmitting] = useState(false);
  const [donationError, setDonationError] = useState('');
  const [paymentStep, setPaymentStep] = useState('amount');
  const [paymentResult, setPaymentResult] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyTarget, setReplyTarget] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('FRAUD');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [shareState, setShareState] = useState('');
  const [documentLoading, setDocumentLoading] = useState('');

  const serverBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

  const fetchCampaign = async () => {
    try {
      const res = await api.get(`/campaigns/${id}`);
      if (res.data.success) {
        setCampaign(res.data.campaign);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch campaign details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const qrValue = useMemo(() => encodeURIComponent(JSON.stringify({
    type: 'crowdflow_qr_payment',
    campaignId: id,
    campaign: campaign?.title || '',
    amount: Number(donationAmount || 0),
    donor: user?.name || 'Guest'
  })), [campaign?.title, donationAmount, id, user?.name]);

  const handleLike = async () => {
    if (!user) return navigate('/login');
    try {
      const res = await api.post(`/campaigns/${id}/like`);
      if (res.data.success) {
        setCampaign((prev) => ({
          ...prev,
          userHasLiked: res.data.liked,
          likesCount: res.data.liked ? prev.likesCount + 1 : prev.likesCount - 1
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookmark = async () => {
    if (!user) return navigate('/login');
    try {
      const res = await api.post(`/campaigns/${id}/bookmark`);
      if (res.data.success) {
        setCampaign((prev) => ({
          ...prev,
          userHasBookmarked: res.data.bookmarked,
          bookmarksCount: res.data.bookmarked ? prev.bookmarksCount + 1 : prev.bookmarksCount - 1
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async () => {
    if (!user) return navigate('/login');
    try {
      if (campaign.userHasFollowedCreator) {
        await api.delete(`/users/creator/${campaign.creator.id}/unfollow`);
        setCampaign((prev) => ({
          ...prev,
          userHasFollowedCreator: false,
          creator: {
            ...prev.creator,
            followersCount: Math.max((prev.creator.followersCount || 1) - 1, 0)
          }
        }));
      } else {
        await api.post(`/users/creator/${campaign.creator.id}/follow`);
        setCampaign((prev) => ({
          ...prev,
          userHasFollowedCreator: true,
          creator: {
            ...prev.creator,
            followersCount: (prev.creator.followersCount || 0) + 1
          }
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/campaigns/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: campaign.title,
          text: `Support ${campaign.title}`,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }

      setShareState(navigator.share ? 'Shared successfully.' : 'Link copied.');

      if (user) {
        const res = await api.post(`/campaigns/${id}/share`, {
          channel: navigator.share ? 'native_share' : 'copy_link'
        });
        if (res.data.success) {
          setCampaign((prev) => ({
            ...prev,
            userHasShared: true,
            sharesCount: res.data.sharesCount
          }));
        }
      }
    } catch (err) {
      setShareState('Unable to share right now.');
    }
  };

  const closeDonationFlow = () => {
    setDonationModalOpen(false);
    setSelectedReward(null);
    setPaymentStep('amount');
    setPaymentResult(null);
    setDonationError('');
  };

  const openProtectedPdf = async (url, loadingKey) => {
    setDocumentLoading(loadingKey);
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      setDonationError(err.response?.data?.error || 'Unable to open PDF.');
    } finally {
      setDocumentLoading('');
    }
  };

  const openDonationFlow = (reward = null) => {
    if (!user && !authLoading) return navigate('/login');
    setSelectedReward(reward);
    setDonationAmount(reward ? String(reward.minAmount) : '10');
    setDonationError('');
    setPaymentResult(null);
    setPaymentStep('amount');
    setDonationModalOpen(true);
  };

  const handleDonationSubmit = async () => {
    const amountValue = Number(donationAmount);

    if (!amountValue || amountValue <= 0) {
      setDonationError('Enter a valid contribution amount.');
      return;
    }

    if (selectedReward && amountValue < Number(selectedReward.minAmount)) {
      setDonationError(`Minimum contribution for this reward is $${selectedReward.minAmount}.`);
      return;
    }

    setDonationError('');
    setDonationSubmitting(true);

    try {
      const res = await api.post('/donations', {
        campaignId: id,
        amount: Number(donationAmount),
        paymentMethod: 'QR',
        paymentReference: `QR-${Date.now()}`,
        isAnonymous
      });

      if (res.data.success) {
        setPaymentResult(res.data);
        setPaymentStep('done');
        fetchCampaign();
      }
    } catch (err) {
      setDonationError(err.response?.data?.error || 'Contribution failed.');
    } finally {
      setDonationSubmitting(false);
    }
  };

  const handleProceedToQr = () => {
    const amountValue = Number(donationAmount);
    if (!amountValue || amountValue <= 0) {
      setDonationError('Enter a valid contribution amount.');
      return;
    }
    if (selectedReward && amountValue < Number(selectedReward.minAmount)) {
      setDonationError(`Minimum contribution for this reward is $${selectedReward.minAmount}.`);
      return;
    }
    setDonationError('');
    setPaymentStep('qr');
  };

  const handleCommentSubmit = async (e, parentId = null) => {
    e.preventDefault();
    const content = parentId ? replyDrafts[parentId]?.trim() : newComment.trim();
    if (!content) return;
    setCommentSubmitting(true);

    try {
      const res = await api.post(`/campaigns/${id}/comments`, { content, parentId });
      if (res.data.success) {
        if (parentId) {
          setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }));
          setReplyTarget(null);
        } else {
          setNewComment('');
        }
        fetchCampaign();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCommentDelete = async (commentId) => {
    try {
      const res = await api.delete(`/campaigns/comments/${commentId}`);
      if (res.data.success) {
        fetchCampaign();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      const res = await api.post(`/campaigns/${id}/report`, {
        reason: reportReason,
        description: reportDesc
      });
      if (res.data.success) {
        setReportModalOpen(false);
        setReportDesc('');
        fetchCampaign();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const getDaysLeft = (deadlineStr) => {
    const diff = new Date(deadlineStr) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darkbg flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-sm">Fetching campaign timeline...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-textPrimary">Failed to Load Campaign</h3>
        <p className="text-textSecondary mt-2">{error || 'Campaign not found.'}</p>
        <button onClick={() => navigate('/')} className="mt-6 bg-primary text-white px-5 py-2.5 rounded-full font-bold">
          Return Home
        </button>
      </div>
    );
  }

  const coverImage = campaign.imageUrl.startsWith('http') ? campaign.imageUrl : `${serverBase}${campaign.imageUrl}`;
  const creatorAvatar = campaign.creator.avatar ? (campaign.creator.avatar.startsWith('http') ? campaign.creator.avatar : `${serverBase}${campaign.creator.avatar}`) : null;
  const recentContributors = campaign.recentContributors || [];

  return (
    <div className="space-y-12 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 bg-darkbg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
            {campaign.category.name}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trust Integrity: {campaign.trustScore}%</span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-textPrimary leading-tight max-w-5xl">
          {campaign.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-darkborder/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-darkborder">
              {creatorAvatar ? (
                <img src={creatorAvatar} alt={campaign.creator.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-darkborder flex items-center justify-center text-sm font-bold text-textSecondary">
                  {campaign.creator.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-textPrimary">{campaign.creator.name}</span>
                {campaign.creator.isVerified && <Award className="w-4 h-4 text-primary fill-primary/10" />}
              </div>
              <span className="text-xs text-textSecondary">Platform Creator since {new Date(campaign.creator.createdAt).getFullYear()} · {campaign.creator.followersCount || 0} followers</span>
            </div>
            <button
              onClick={handleFollow}
              className={`ml-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                campaign.userHasFollowedCreator
                  ? 'bg-transparent border-darkborder text-textSecondary'
                  : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/25'
              }`}
            >
              {campaign.userHasFollowedCreator ? 'Following' : 'Follow'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`p-2.5 rounded-full border transition-all flex items-center gap-1.5 text-xs font-bold ${
                campaign.userHasLiked
                  ? 'bg-rose-500/10 border-rose-500/35 text-rose-400'
                  : 'bg-darksurface border-darkborder text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Heart className={`w-4 h-4 ${campaign.userHasLiked ? 'fill-rose-500 stroke-rose-500' : ''}`} />
              <span>{campaign.likesCount}</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`p-2.5 rounded-full border transition-all flex items-center gap-1.5 text-xs font-bold ${
                campaign.userHasBookmarked
                  ? 'bg-primary/10 border-primary/35 text-primary'
                  : 'bg-darksurface border-darkborder text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${campaign.userHasBookmarked ? 'fill-primary stroke-primary' : ''}`} />
              <span>{campaign.bookmarksCount}</span>
            </button>

            <button
              onClick={handleShare}
              className={`p-2.5 rounded-full border transition-all flex items-center gap-1.5 text-xs font-bold ${
                campaign.userHasShared
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400'
                  : 'bg-darksurface border-darkborder text-textSecondary hover:text-textPrimary'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>{campaign.sharesCount}</span>
            </button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="p-2.5 rounded-full border border-darkborder bg-darksurface text-textSecondary hover:text-rose-400 transition-all"
              title="Report Campaign"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </div>
        </div>
        {shareState && <p className="text-xs text-emerald-400">{shareState}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="relative h-96 w-full rounded-2xl overflow-hidden border border-darkborder card-shadow bg-white">
            <img src={coverImage} alt={campaign.title} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-darkbg to-transparent pointer-events-none" />
          </div>

          <div className="flex border-b border-darkborder/50 overflow-x-auto">
            {[
              ['story', 'Story Pitch', 0],
              ['updates', 'Updates', campaign.updates.length],
              ['comments', 'Comments', campaign.comments.length],
              ['activity', 'Activity Feed', campaign.activityFeed?.length || 0]
            ].map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all flex items-center gap-1.5 ${
                  activeTab === key ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textPrimary'
                }`}
              >
                <span>{label}</span>
                {count > 0 && <span className="bg-darkborder/50 text-[10px] text-textSecondary px-2 py-0.5 rounded-full">{count}</span>}
              </button>
            ))}
          </div>

          <div className="bg-white card-shadow border border-darkborder rounded-2xl p-6 min-h-[300px]">
            {activeTab === 'story' && (
              <div className="space-y-4 text-textSecondary leading-relaxed text-sm whitespace-pre-line">
                {campaign.description}
              </div>
            )}

            {activeTab === 'updates' && (
              <div className="space-y-6">
                {campaign.updates.length === 0 ? (
                  <p className="text-xs text-textSecondary text-center py-12">No project updates posted by the creator yet.</p>
                ) : (
                  campaign.updates.map((upd) => (
                    <div key={upd.id} className="border-l-2 border-primary pl-4 py-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-textPrimary">{upd.title}</h4>
                        <span className="text-[10px] text-textSecondary flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(upd.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-textSecondary leading-relaxed whitespace-pre-line">{upd.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-6">
                {user ? (
                  <form onSubmit={(e) => handleCommentSubmit(e)} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Add an encouraging comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="flex-1 bg-white border border-darkborder text-xs rounded-xl px-4 py-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="submit"
                      disabled={commentSubmitting}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all"
                    >
                      Post
                    </button>
                  </form>
                ) : (
                  <div className="bg-darksurface border border-darkborder/50 text-center py-4 rounded-xl text-xs text-textSecondary">
                    Please <Link to="/login" className="text-primary font-bold">Sign In</Link> to post comments.
                  </div>
                )}

                <div className="space-y-4">
                  {campaign.comments.length === 0 ? (
                    <p className="text-xs text-textSecondary text-center py-8">Be the first to leave a comment!</p>
                  ) : (
                    campaign.comments.map((comment) => {
                      const commentAvatar = comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${serverBase}${comment.user.avatar}`) : null;
                      return (
                        <div key={comment.id} className="p-3 bg-darksurface/50 border border-darkborder/40 rounded-xl space-y-3">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-darkborder shrink-0">
                              {commentAvatar ? (
                                <img src={commentAvatar} alt={comment.user.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-darkborder flex items-center justify-center text-xs font-bold text-textSecondary">
                                  {comment.user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-textPrimary">{comment.user.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-textSecondary">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                  {(user?.id === comment.userId || user?.role === 'ADMIN') && (
                                    <button onClick={() => handleCommentDelete(comment.id)} className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold">
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-textSecondary leading-relaxed">{comment.content}</p>
                              {user && (
                                <button onClick={() => setReplyTarget(replyTarget === comment.id ? null : comment.id)} className="text-[10px] font-semibold text-primary inline-flex items-center gap-1 mt-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Reply</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {comment.replies?.length > 0 && (
                            <div className="pl-11 space-y-3">
                              {comment.replies.map((reply) => {
                                const replyAvatar = reply.user.avatar ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${serverBase}${reply.user.avatar}`) : null;
                                return (
                                  <div key={reply.id} className="border border-darkborder/30 rounded-xl p-3 bg-darksurface/40">
                                    <div className="flex gap-3">
                                      <div className="w-7 h-7 rounded-full overflow-hidden border border-darkborder shrink-0">
                                        {replyAvatar ? (
                                          <img src={replyAvatar} alt={reply.user.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-darkborder flex items-center justify-center text-[10px] font-bold text-textSecondary">
                                            {reply.user.name.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-textPrimary">{reply.user.name}</span>
                                          <span className="text-[10px] text-textSecondary">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-textSecondary mt-1">{reply.content}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {user && replyTarget === comment.id && (
                            <form onSubmit={(e) => handleCommentSubmit(e, comment.id)} className="pl-11 flex gap-3">
                              <input
                                type="text"
                                placeholder="Write a reply..."
                                value={replyDrafts[comment.id] || ''}
                                onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                                className="flex-1 bg-white border border-darkborder text-xs rounded-xl px-4 py-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              />
                              <button type="submit" disabled={commentSubmitting} className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold px-4 py-3 rounded-xl text-xs">
                                Reply
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                {campaign.activityFeed?.length === 0 ? (
                  <p className="text-xs text-textSecondary text-center py-8">No activity recorded yet.</p>
                ) : (
                  campaign.activityFeed.map((item) => (
                    <div key={item.id} className="border border-darkborder/40 rounded-xl p-4 bg-darksurface/40">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-textPrimary">{item.title}</span>
                        <span className="text-[10px] text-textSecondary">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-textSecondary mt-2">{item.description}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white card-shadow rounded-2xl border border-darkborder p-6 space-y-6">
            <div className="space-y-1">
              <span className="text-xs text-textSecondary font-semibold uppercase tracking-wider">Total Raised</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black text-textPrimary">${campaign.raisedAmount.toLocaleString()}</span>
                <span className="text-xs text-textSecondary">of ${campaign.goalAmount.toLocaleString()} goal</span>
              </div>
            </div>

            <ProgressBar raised={campaign.raisedAmount} goal={campaign.goalAmount} size="lg" />

            <div className="grid grid-cols-2 gap-4 border-t border-b border-darkborder/50 py-4 my-2">
              <div>
                <span className="block text-xl font-black text-textPrimary">{campaign.donationsCount}</span>
                <span className="text-xs text-textSecondary font-medium">Unique Donations</span>
              </div>
              <div>
                <span className="block text-xl font-black text-textPrimary">{campaign.status === 'ACTIVE' ? getDaysLeft(campaign.deadline) : 0}</span>
                <span className="text-xs text-textSecondary font-medium">Days Remaining</span>
              </div>
              <div>
                <span className="block text-xl font-black text-textPrimary">{campaign.likesCount}</span>
                <span className="text-xs text-textSecondary font-medium">Likes</span>
              </div>
              <div>
                <span className="block text-xl font-black text-textPrimary">{campaign.sharesCount}</span>
                <span className="text-xs text-textSecondary font-medium">Shares</span>
              </div>
            </div>

            {campaign.status === 'ACTIVE' ? (
              <button onClick={() => openDonationFlow(null)} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02]">
                Back this Project
              </button>
            ) : (
              <div className="bg-darkborder/30 border border-darkborder/60 text-center py-3.5 rounded-xl text-sm text-textSecondary font-semibold">
                Campaign status: {campaign.status}
              </div>
            )}
          </div>

          <div className="bg-white card-shadow rounded-2xl border border-darkborder p-6 space-y-4">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Engagement Snapshot</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-darkborder/40 rounded-xl p-4">
                <span className="block text-xs text-textSecondary">Creator Trust</span>
                <span className="block text-xl font-black text-textPrimary mt-1">{campaign.creator.trustScore}%</span>
              </div>
              <div className="border border-darkborder/40 rounded-xl p-4">
                <span className="block text-xs text-textSecondary">Comment Threads</span>
                <span className="block text-xl font-black text-textPrimary mt-1">{campaign.comments.length}</span>
              </div>
              <div className="border border-darkborder/40 rounded-xl p-4">
                <span className="block text-xs text-textSecondary">Followers</span>
                <span className="block text-xl font-black text-textPrimary mt-1">{campaign.creator.followersCount || 0}</span>
              </div>
              <div className="border border-darkborder/40 rounded-xl p-4">
                <span className="block text-xs text-textSecondary">Goal Remaining</span>
                <span className="block text-xl font-black text-textPrimary mt-1">${Math.max(campaign.goalAmount - campaign.raisedAmount, 0).toLocaleString()}</span>
              </div>
            </div>
            <button onClick={() => setActiveTab('activity')} className="w-full border border-darkborder text-textPrimary px-4 py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <span>View Activity Feed</span>
            </button>
          </div>

          <div className="bg-white card-shadow rounded-2xl border border-darkborder p-6 space-y-4">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Recent Contributors</h3>
            {recentContributors.length === 0 ? (
              <p className="text-xs text-textSecondary">No public contributors yet.</p>
            ) : (
              <div className="space-y-3">
                {recentContributors.map((contributor) => (
                  <div key={contributor.id} className="flex items-center justify-between border-b border-darkborder/30 pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <span className="block text-xs font-bold text-textPrimary">
                        {contributor.isAnonymous ? 'Anonymous Donor' : contributor.donor?.name || 'Supporter'}
                      </span>
                      <span className="block text-[10px] text-textSecondary">{new Date(contributor.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="text-xs font-black text-primary">${contributor.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider pl-1">Choose Reward Tier</h3>
            {campaign.rewards.map((tier) => (
              <div
                key={tier.id}
                onClick={() => campaign.status === 'ACTIVE' && openDonationFlow(tier)}
                className={`glass-panel border rounded-2xl p-5 shadow-md flex flex-col justify-between group transition-all duration-300 ${
                  campaign.status === 'ACTIVE'
                    ? 'border-darkborder hover:border-primary/50 cursor-pointer hover:-translate-y-0.5 bg-white card-shadow'
                    : 'border-darkborder opacity-70'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-primary font-extrabold uppercase tracking-wide">Pledge ${tier.minAmount}+</span>
                    {campaign.status === 'ACTIVE' && <ChevronRight className="w-4 h-4 text-textSecondary group-hover:text-primary transition-colors shrink-0" />}
                  </div>
                  <h4 className="font-bold text-sm text-textPrimary mb-1.5 group-hover:text-primary transition-colors">{tier.title}</h4>
                  <p className="text-xs text-textSecondary leading-relaxed">{tier.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {donationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-darkbg/85 backdrop-blur-sm p-4">
          <div className="bg-white card-shadow border border-darkborder rounded-2xl max-w-md w-full p-6 space-y-6 relative animate-scaleIn">
            <h3 className="text-xl font-bold text-textPrimary">
              {selectedReward ? `Pledge for: ${selectedReward.title}` : 'Back this Project'}
            </h3>

            {donationError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-semibold">
                {donationError}
              </div>
            )}

            {paymentStep === 'amount' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Contribution Amount ($)</label>
                  <input
                    type="number"
                    required
                    min={selectedReward ? selectedReward.minAmount : 1}
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    className="w-full bg-white border border-darkborder rounded-xl text-sm p-3.5 text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-bold text-lg"
                  />
                  {selectedReward && <span className="text-[10px] text-textSecondary mt-1.5 block">Minimum requirement: ${selectedReward.minAmount}</span>}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[10, 25, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDonationAmount(String(amt))}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                          Number(donationAmount) === amt
                            ? 'bg-primary text-white scale-105 border-primary'
                            : 'border-darkborder bg-darksurface text-textSecondary hover:text-textPrimary'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 py-1.5">
                  <input
                    type="checkbox"
                    id="anonymousCheck"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 border border-darkborder rounded bg-white text-primary focus:ring-transparent accent-primary cursor-pointer"
                  />
                  <label htmlFor="anonymousCheck" className="text-xs text-textSecondary select-none cursor-pointer">
                    Hide my name from public campaign contributors list
                  </label>
                </div>

                <div className="border border-darkborder/40 rounded-xl p-4 bg-darksurface/40 space-y-2">
                  <div className="flex items-center gap-2 text-textPrimary">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold">QR Payment</span>
                  </div>
                  <p className="text-[11px] text-textSecondary">Generate the QR, complete the payment, then confirm to unlock the receipt and contribution certificate.</p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-darkborder/50">
                  <button type="button" onClick={handleProceedToQr} className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02]">
                    Generate QR
                  </button>
                  <button type="button" onClick={closeDonationFlow} className="px-5 py-3 rounded-xl border border-darkborder text-textSecondary hover:text-textPrimary text-xs font-bold transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'qr' && (
              <div className="space-y-4">
                <div className="border border-darkborder/40 rounded-2xl p-5 bg-darksurface/40 text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrValue}`}
                    alt="QR payment code"
                    className="w-56 h-56 mx-auto rounded-xl bg-white p-3"
                  />
                  <p className="text-xs text-textSecondary mt-4">Scan and pay ${Number(donationAmount || 0).toLocaleString()} for {campaign.title}.</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleDonationSubmit} disabled={donationSubmitting} className="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02]">
                    {donationSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></span> : 'Donate Now'}
                  </button>
                  <button type="button" onClick={() => setPaymentStep('amount')} className="px-5 py-3 rounded-xl border border-darkborder text-textSecondary hover:text-textPrimary text-xs font-bold transition-colors">
                    Back
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'done' && paymentResult && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-bold">Payment successful</span>
                  </div>
                  <p className="text-xs text-textSecondary mt-2">Receipt and contribution certificate are ready for download.</p>
                </div>
                {paymentResult.gamification && (
                  <div className="border border-darkborder/40 rounded-xl p-4 bg-darksurface/40">
                    <span className="block text-xs text-textSecondary">Current level</span>
                    <span className="block text-lg font-black text-textPrimary mt-1">Lv {paymentResult.gamification.level} · {paymentResult.gamification.title}</span>
                    <span className="block text-[10px] text-primary mt-1">{paymentResult.gamification.xp} XP · {paymentResult.gamification.rewardPreview}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => openProtectedPdf(`/donations/receipts/${paymentResult.receipt.id}/download?inline=true`, 'receipt')} disabled={documentLoading === 'receipt'} className="border border-darkborder text-textPrimary py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    <Download className="w-4 h-4" />
                    <span>{documentLoading === 'receipt' ? 'Opening...' : 'Receipt'}</span>
                  </button>
                  <button type="button" onClick={() => openProtectedPdf(`/donations/certificates/${paymentResult.certificate.id}/download?inline=true`, 'certificate')} disabled={documentLoading === 'certificate'} className="border border-darkborder text-textPrimary py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    <Download className="w-4 h-4" />
                    <span>{documentLoading === 'certificate' ? 'Opening...' : 'Certificate'}</span>
                  </button>
                </div>
                <button type="button" onClick={closeDonationFlow} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02]">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-darkbg/85 backdrop-blur-sm p-4">
          <div className="bg-white card-shadow border border-darkborder rounded-2xl max-w-md w-full p-6 space-y-6 relative animate-scaleIn">
            <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Report this Campaign</span>
            </h3>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Reason</label>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full bg-white border border-darkborder rounded-xl text-sm p-3.5 text-textPrimary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer">
                  <option value="FRAUD">Suspected Fraud or Scam</option>
                  <option value="COPYRIGHT">Copyright Infringement</option>
                  <option value="HARASSMENT">Violent or Harassing Content</option>
                  <option value="OTHER">Other Issues</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textSecondary mb-2">Description</label>
                <textarea
                  required
                  rows="4"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Provide supporting details or links explaining why this campaign violates safety terms..."
                  className="w-full bg-white border border-darkborder rounded-xl text-xs p-3 text-textPrimary placeholder:text-textSecondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-darkborder/50">
                <button type="submit" disabled={reportSubmitting} className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all">
                  {reportSubmitting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></span> : 'Submit Report'}
                </button>
                <button type="button" onClick={() => setReportModalOpen(false)} className="px-5 py-3 rounded-xl border border-darkborder text-textSecondary hover:text-textPrimary text-xs font-bold transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;