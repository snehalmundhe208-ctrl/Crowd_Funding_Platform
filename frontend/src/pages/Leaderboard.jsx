import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { Trophy, Award, Crown, Medal, Calendar } from 'lucide-react';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boardType, setBoardType] = useState('donors');
  const [timeframe, setTimeframe] = useState('allTime');

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/donations/leaderboard');
      if (res.data.success) {
        setLeaderboard(res.data.leaderboard);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = API_URL.replace('/api', '');

  const activeItems = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard?.[boardType]?.[timeframe] || [];
  }, [leaderboard, boardType, timeframe]);

  const getAvatar = (value) => {
    if (!value) return null;
    return value.startsWith('http') ? value : `${serverBase}${value}`;
  };

  const isCampaignBoard = boardType === 'campaigns';

  if (loading) {
    return (
      <div className="min-h-screen bg-darkbg flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-textSecondary text-sm">Organizing contributor rankings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 space-y-10 bg-darkbg">
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-2">
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-textPrimary">Leaderboard Arena</h2>
        <p className="text-sm text-textSecondary max-w-2xl mx-auto leading-relaxed">
          Rankings update across donors, creators, and campaigns with XP, levels, badges, and all-time or monthly standings.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 justify-center">
        {[
          ['donors', 'Donors'],
          ['creators', 'Creators'],
          ['campaigns', 'Campaigns']
        ].map(([value, label]) => (
          <button key={value} onClick={() => setBoardType(value)} className={`px-5 py-3 rounded-xl text-sm font-bold border transition-colors ${boardType === value ? 'bg-primary text-white border-primary' : 'bg-darksurface border-darkborder text-textSecondary'}`}>
            {label}
          </button>
        ))}
        {[
          ['allTime', 'All Time'],
          ['monthly', 'Monthly']
        ].map(([value, label]) => (
          <button key={value} onClick={() => setTimeframe(value)} className={`px-5 py-3 rounded-xl text-sm font-bold border transition-colors ${timeframe === value ? 'bg-primary text-white border-primary' : 'bg-darksurface border-darkborder text-textSecondary'}`}>
            {label}
          </button>
        ))}
      </div>

      {!isCampaignBoard && activeItems.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 items-end">
          {[1, 0, 2].map((podiumIndex, orderIndex) => {
            const item = activeItems[podiumIndex];
            if (!item) return null;
            const avatar = getAvatar(item.user.avatar);
            const rank = podiumIndex + 1;
            const heightClass = orderIndex === 1 ? 'md:h-80 scale-105 border-primary/40' : 'md:h-72';
            return (
              <div key={item.user.id} className={`bg-white card-shadow border border-darkborder rounded-3xl p-8 text-center flex flex-col justify-center relative ${heightClass}`}>
                <span className="absolute top-5 left-5 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black bg-darkborder/70 text-textPrimary">{rank}</span>
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/40 mx-auto mb-4">
                  {avatar ? (
                    <img src={avatar} alt={item.user.name} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xl font-bold text-accent">
                      {item.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h4 className="font-black text-lg text-textPrimary truncate">{item.user.name}</h4>
                <span className="text-xs text-textSecondary mt-1">{item.title}</span>
                <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                  <div>
                    <span className="block text-xs text-textSecondary">Level</span>
                    <span className="block text-sm font-black text-textPrimary">{item.level}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-textSecondary">XP</span>
                    <span className="block text-sm font-black text-textPrimary">{item.xp}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-textSecondary">Badges</span>
                    <span className="block text-sm font-black text-textPrimary">{item.badgesCount}</span>
                  </div>
                </div>
                <span className="text-xl font-black text-primary block mt-5">
                  {boardType === 'donors' ? `$${item.totalDonated.toLocaleString()}` : `$${item.totalRaised.toLocaleString()}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white card-shadow border border-darkborder rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-darkborder/50">
          <span className="font-bold text-sm text-textPrimary">Standings</span>
          <span className="text-xs text-textSecondary">{activeItems.length} ranked entries</span>
        </div>

        <div className="space-y-3">
          {activeItems.length === 0 ? (
            <p className="text-xs text-textSecondary text-center py-6">No rankings yet 🏆 Start donating to claim your spot!</p>
          ) : (
            activeItems.map((item, index) => {
              const rowHighlight =
                index === 0 ? 'bg-amber-50 border-l-4 border-amber-400' :
                index === 1 ? 'bg-slate-50 border-l-4 border-slate-400' :
                index === 2 ? 'bg-orange-50 border-l-4 border-orange-400' :
                'bg-white';

              const medalIcon =
                index === 0 ? <span className="text-base">🥇</span> :
                index === 1 ? <span className="text-base">🥈</span> :
                index === 2 ? <span className="text-base">🥉</span> :
                null;

              if (isCampaignBoard) {
                const image = getAvatar(item.imageUrl);
                return (
                  <Link key={item.id} to={`/campaigns/${item.id}`} className={`flex items-center justify-between gap-4 p-4 border border-darkborder rounded-2xl hover:bg-darksurface transition-colors ${rowHighlight}`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-sm font-black text-textSecondary w-6 text-center">{index + 1}</span>
                      <div className="w-16 h-12 rounded-xl overflow-hidden border border-darkborder shrink-0">
                        {image ? <img src={image} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-darksurface" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {medalIcon}
                          <span className="block text-sm font-bold text-textPrimary truncate">{item.title}</span>
                        </div>
                        <span className="block text-[10px] text-textSecondary mt-1">{item.creator.name} · {item.donationsCount} donations · {item.likesCount} likes · {item.sharesCount} shares</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-sm font-black text-primary">${item.raisedAmount.toLocaleString()}</span>
                      <span className="block text-[10px] text-textSecondary">of ${item.goalAmount.toLocaleString()}</span>
                    </div>
                  </Link>
                );
              }

              const avatar = getAvatar(item.user.avatar);
              return (
                <div key={item.user.id} className={`flex items-center justify-between gap-4 p-4 border border-darkborder rounded-2xl hover:bg-darksurface transition-colors ${rowHighlight}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm font-black text-textSecondary w-6 text-center">{index + 1}</span>
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-darkborder shrink-0">
                      {avatar ? (
                        <img src={avatar} alt={item.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold text-accent">
                          {item.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {medalIcon}
                        <span className="text-sm font-bold text-textPrimary truncate">{item.user.name}</span>
                        {item.user.isVerified && <Award className="w-3.5 h-3.5 text-primary fill-primary/10" />}
                      </div>
                      <span className="block text-[10px] text-textSecondary mt-1">{item.title} · Lv {item.level} · {item.xp} XP · {item.badgesCount} badges</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-sm font-black text-primary">
                      {boardType === 'donors' ? `$${item.totalDonated.toLocaleString()}` : `$${item.totalRaised.toLocaleString()}`}
                    </span>
                    <span className="block text-[10px] text-textSecondary">
                      {boardType === 'donors' ? `${item.donationsCount} contributions` : `${item.campaignsCount} campaigns`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white card-shadow border border-darkborder rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2"><Crown className="w-4 h-4 text-primary" /><span className="text-sm font-bold text-textPrimary">XP Rankings</span></div>
          <p className="text-xs text-textSecondary">Levels scale from platform XP earned by donations, social actions, campaign creation, and updates.</p>
        </div>
        <div className="bg-white card-shadow border border-darkborder rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2"><Medal className="w-4 h-4 text-primary" /><span className="text-sm font-bold text-textPrimary">Badges</span></div>
          <p className="text-xs text-textSecondary">Badge counts track consistency, impact, and community participation across the platform.</p>
        </div>
        <div className="bg-white card-shadow border border-darkborder rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-primary" /><span className="text-sm font-bold text-textPrimary">Monthly Reset</span></div>
          <p className="text-xs text-textSecondary">Monthly boards spotlight current momentum while all-time rankings preserve lifetime impact.</p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
