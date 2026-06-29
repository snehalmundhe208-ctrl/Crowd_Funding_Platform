import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import CampaignCard from '../components/CampaignCard';
import { Search, SlidersHorizontal, Award, ShieldAlert, Heart, Trophy, Flame } from 'lucide-react';

const Home = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRaised: 0, activeCount: 0 });

  const [displayRaised, setDisplayRaised] = useState(0);
  useEffect(() => {
    const target = stats.totalRaised;
    const steps = 40; const inc = target / steps; let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setDisplayRaised(target); clearInterval(t); }
      else setDisplayRaised(Math.floor(cur));
    }, 30);
    return () => clearInterval(t);
  }, [stats.totalRaised]);

  const [displayActiveCount, setDisplayActiveCount] = useState(0);
  useEffect(() => {
    const target = stats.activeCount;
    const steps = 40; const inc = target / steps; let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) { setDisplayActiveCount(target); clearInterval(t); }
      else setDisplayActiveCount(Math.floor(cur));
    }, 30);
    return () => clearInterval(t);
  }, [stats.activeCount]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/campaigns/categories');
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/donations/leaderboard');
      if (res.data.success) {
        setLeaderboard(res.data.leaderboard);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 6,
        sort: sortBy,
        status: 'ACTIVE'
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;

      const res = await api.get('/campaigns', { params });
      if (res.data.success) {
        setCampaigns(res.data.campaigns);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async () => {
    try {
      // Mock stats from public campaigns endpoint or custom fetch
      const res = await api.get('/campaigns', { params: { limit: 100 } });
      if (res.data.success) {
        const active = res.data.campaigns.filter(c => c.status === 'ACTIVE');
        const raisedSum = res.data.campaigns.reduce((sum, c) => sum + Number(c.raisedAmount), 0);
        setStats({
          totalRaised: raisedSum,
          activeCount: active.length
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchLeaderboard();
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [selectedCategory, sortBy, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCampaigns();
  };

  const topDonors = leaderboard?.donors?.allTime || [];

  return (
    <div className="space-y-16 pb-20 bg-darkbg">
      
      {/* Hero Section */}
      <section
        className="relative py-20 overflow-hidden bg-gradient-to-b from-darksurface/30 via-darkbg to-darkbg border-b border-darkborder/20"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgb(232 146 10 / 0.08) 0%, transparent 65%)' }}
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-[128px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/20 text-primary uppercase tracking-wide">
            <Flame className="w-3.5 h-3.5 fill-primary/10" />
            <span>Empower Next-Gen Innovations</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15] text-textPrimary animate-fadeInUp" style={{ animationDelay: '0ms' }}>
            Invest in Creators. <br />
            <span className="text-gradient">
              Fund Real-World Solutions.
            </span>
          </h1>

          <p className="text-textSecondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed animate-fadeInUp" style={{ animationDelay: '100ms' }}>
            CrowdFlow is a secure, trust-transparent crowdfunding ecosystem. Discover vetted tech prototypes, creative anthology media, and local community gardens.
          </p>

          <div className="flex justify-center animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <Link
              to="/register"
              className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3 rounded-full animate-fadeInUp transition-transform duration-200 hover:scale-105"
              style={{ animationDelay: '200ms' }}
            >
              Get Started
            </Link>
          </div>

          <img src="/src/assets/hero.svg" alt="Community" className="w-full max-w-md mx-auto mt-10 mb-4 animate-fadeInUp animate-float" style={{ animationDelay: '300ms' }} />

          {/* Quick Platform Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8 border-t border-darkborder/30">
            <div className="text-center p-3">
              <span className="block text-2xl sm:text-3xl font-black text-primary">${displayRaised.toLocaleString()}</span>
              <span className="text-xs text-textSecondary uppercase tracking-wider font-semibold">Total Funds Raised</span>
            </div>
            <div className="text-center p-3">
              <span className="block text-2xl sm:text-3xl font-black text-primary">{displayActiveCount}</span>
              <span className="text-xs text-textSecondary uppercase tracking-wider font-semibold">Active Campaigns</span>
            </div>
            <div className="text-center p-3">
              <span className="block text-2xl sm:text-3xl font-black text-primary">98.4%</span>
              <span className="text-xs text-textSecondary uppercase tracking-wider font-semibold">Trust Integrity</span>
            </div>
            <div className="text-center p-3">
              <span className="block text-2xl sm:text-3xl font-black text-primary">0%</span>
              <span className="text-xs text-textSecondary uppercase tracking-wider font-semibold">Platform Fee</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Browse Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Active Campaigns Column */}
          <div className="col-span-1 lg:col-span-3 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-textPrimary">Active Campaigns</h2>
                <p className="text-sm text-textSecondary">Discover live ideas waiting for community funding</p>
              </div>

              {/* Sorting Filter */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-textSecondary" />
                <select 
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="bg-darksurface border border-darkborder text-sm text-textPrimary rounded-lg py-1.5 px-3 focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="newest">Newest Launch</option>
                  <option value="mostFunded">Most Funded</option>
                  <option value="endingSoon">Ending Soon</option>
                </select>
              </div>
            </div>

            {/* Search & Categories */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:flex-1">
                <input 
                  type="text" 
                  placeholder="Search by keywords (e.g. smart, green, ring)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-darksurface/50 border border-darkborder text-textPrimary text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary transition-all"
                />
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-textSecondary" />
              </form>
              
              <div className="flex gap-2 overflow-x-auto scroll-smooth snap-x w-full sm:w-auto pb-1.5 sm:pb-0">
                <button 
                  onClick={() => {
                    setSelectedCategory('');
                    setPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    selectedCategory === '' 
                      ? 'bg-primary border-primary text-white' 
                      : 'bg-darkborder/30 border-darkborder text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                      selectedCategory === cat.id 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-darkborder/30 border-darkborder text-textSecondary hover:text-textPrimary'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="glass-panel border border-darkborder rounded-2xl h-96 animate-pulse"></div>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-darkborder rounded-2xl bg-darksurface/10">
                <ShieldAlert className="w-12 h-12 text-textSecondary/50 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-textPrimary">Nothing here yet 🌱 Be the first to launch a campaign!</h3>
                <p className="text-sm text-textSecondary mt-1">Try resetting the filters or search query.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map((camp, index) => (
                    <div key={camp.id} className="animate-fadeInUp" style={{ animationDelay: `${index * 80}ms` }}>
                      <CampaignCard campaign={camp} />
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 pt-6">
                    <button 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-lg bg-darksurface hover:bg-darkborder text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-textSecondary">Page {page} of {totalPages}</span>
                    <button 
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 rounded-lg bg-darksurface hover:bg-darkborder text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Contributor Leaderboard Panel */}
          <div className="col-span-1 space-y-6">
            <div className="bg-darksurface rounded-2xl border border-darkborder p-6 card-shadow">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-textPrimary">Top Contributors</h3>
              </div>

              <div className="space-y-4">
                {topDonors.length === 0 ? (
                  <p className="text-sm text-textSecondary text-center py-6">No donations recorded yet.</p>
                ) : (
                  topDonors.slice(0, 5).map((item, index) => {
                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                    const serverBase = API_URL.replace('/api', '');
                    const avatar = item.user.avatar ? (item.user.avatar.startsWith('http') ? item.user.avatar : `${serverBase}${item.user.avatar}`) : null;

                    return (
                      <div key={item.user.id} className="flex items-center justify-between border-b border-darkborder/30 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          
                          {/* Rank badge */}
                          <div className="relative">
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${
                              index === 0 ? 'bg-amber-50 text-amber-700' :
                              index === 1 ? 'bg-slate-50 text-slate-600' :
                              index === 2 ? 'bg-orange-50 text-orange-700' : 'bg-darkborder/50 text-textSecondary'
                            }`}>
                              {index + 1}
                            </span>
                          </div>

                          {/* Profile Circle */}
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-darkborder">
                            {avatar ? (
                              <img src={avatar} alt={item.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xs font-bold text-accent">
                                {item.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="block text-sm font-bold text-textPrimary line-clamp-1">{item.user.name}</span>
                            <span className="block text-[10px] text-textSecondary">Lv {item.level} · {item.badgesCount} badges · {item.donationsCount} contributions</span>
                          </div>
                        </div>

                        <span className="text-sm font-black text-primary">${item.totalDonated.toLocaleString()}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* Value Proposition Widget */}
            <div className="glass-panel rounded-2xl border border-darkborder p-6 shadow-xl relative overflow-hidden bg-gradient-to-r from-primary/5 to-accent/5">
              <h4 className="font-bold text-sm text-textPrimary mb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-accent" />
                <span>Zero Platform Fees</span>
              </h4>
              <p className="text-xs text-textSecondary leading-relaxed">
                CrowdFlow operates on a zero platform fee policy. 100% of your contributions go directly to supporting the campaigns and unlockable reward tiers.
              </p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Home;
