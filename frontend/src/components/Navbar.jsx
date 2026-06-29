import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';
import { 
  Menu, X, Bell, LogOut, User as UserIcon, 
  TrendingUp, Award, Settings, ShieldCheck, Heart 
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/users/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.notifications.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll notifications every 45 seconds if logged in
    let interval;
    if (user) {
      interval = setInterval(fetchNotifications, 45000);
    }
    return () => clearInterval(interval);
  }, [user]);

  const handleNotificationRead = async (id) => {
    try {
      await api.put(`/users/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'CREATOR') return user.kycStatus === 'APPROVED' ? '/creator' : '/kyc-verification';
    return '/donor';
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = API_URL.replace('/api', '');
  const avatarUrl = user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${serverBase}${user.avatar}`) : null;

  return (
    <nav className="sticky top-0 z-40 bg-darkbg/95 backdrop-blur-md border-b border-darkborder">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2.5 transition-all duration-200">
              <span className="text-2xl">💧</span>
              <span className="text-xl font-extrabold tracking-wider text-gradient">
                CROWDFLOW
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm font-semibold text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/' ? 'border-b-2 border-primary text-primary' : ''}`}>
              Explore
            </Link>
            <Link to="/leaderboard" className={`text-sm font-semibold text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/leaderboard' ? 'border-b-2 border-primary text-primary' : ''}`}>
              Leaderboard
            </Link>
            
            {user && ['CREATOR', 'ADMIN'].includes(user.role) && (
              <Link to="/create-campaign" className={`text-sm font-semibold text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/create-campaign' ? 'border-b-2 border-primary text-primary' : ''}`}>
                Launch Campaign
              </Link>
            )}

            {user && user.role === 'CREATOR' && !user.kycStatus && (
              <Link to="/kyc-verification" className={`text-sm font-semibold text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/kyc-verification' ? 'border-b-2 border-primary text-primary' : ''}`}>
                Submit KYC
              </Link>
            )}
          </div>

          {/* Session controls */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                
                <div className="relative">
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping"></span>
                  )}
                  <button 
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2 text-textSecondary hover:text-primary rounded-full hover:bg-darksurface transition-colors duration-200 relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-3 w-80 glass-panel rounded-2xl border border-darkborder shadow-2xl p-4 overflow-hidden z-50">
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-darkborder/50">
                        <span className="font-bold text-sm text-textPrimary">Notifications</span>
                        <span className="text-xs text-textSecondary">{unreadCount} unread</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-textSecondary text-center py-4">No notifications yet.</p>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                handleNotificationRead(notif.id);
                                if (notif.redirectUrl) navigate(notif.redirectUrl);
                                setNotificationsOpen(false);
                              }}
                              className={`p-2.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                                notif.isRead 
                                  ? 'bg-transparent border-transparent text-textSecondary' 
                                  : 'bg-primary/5 border-primary/20 text-textPrimary'
                              }`}
                            >
                              <div className="flex justify-between font-semibold mb-1">
                                <span>{notif.title}</span>
                                {!notif.isRead && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
                              </div>
                              <p className="line-clamp-2 leading-relaxed">{notif.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dashboard Nav Link */}
                <Link 
                  to={getDashboardPath()}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-primary hover:bg-primary-hover px-4 py-2 rounded-full border border-primary text-white transition-colors duration-200"
                >
                  <UserIcon className="w-4 h-4 text-white" />
                  <span>Dashboard</span>
                </Link>

                {/* Profile Avatar */}
                <Link to="/profile" className="w-8 h-8 rounded-full overflow-hidden border border-primary/40 hover:border-primary transition-all duration-200">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-accent flex items-center justify-center text-white font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>

                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="p-2 text-textSecondary hover:text-rose-400 rounded-full hover:bg-rose-500/10 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className={`text-sm font-semibold px-4 py-2 text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/login' ? 'border-b-2 border-primary text-primary' : ''}`}>
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className={`text-sm font-bold bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full transition-colors duration-200 ${location.pathname === '/register' ? 'border-b-2 border-primary' : ''}`}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            {user && (
              <div className="relative">
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping"></span>
                )}
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 text-textSecondary hover:text-primary rounded-full relative transition-colors duration-200"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-textSecondary hover:text-primary transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-darkbg border border-darkborder py-4 px-4 space-y-3 animate-fadeIn">
          <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block text-sm font-medium text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/' ? 'border-b-2 border-primary text-primary' : ''}`}
          >
            Explore Campaigns
          </Link>
          <Link 
            to="/leaderboard" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block text-sm font-medium text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/leaderboard' ? 'border-b-2 border-primary text-primary' : ''}`}
          >
            Leaderboard
          </Link>
          {user && ['CREATOR', 'ADMIN'].includes(user.role) && (
            <Link 
              to="/create-campaign" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block text-sm font-medium text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/create-campaign' ? 'border-b-2 border-primary text-primary' : ''}`}
            >
              Launch Campaign
            </Link>
          )}
          {user && (
            <>
              <Link 
                to={getDashboardPath()} 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-primary transition-all duration-200"
              >
                Go to Dashboard
              </Link>
              <Link 
                to="/profile" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-sm font-medium text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/profile' ? 'border-b-2 border-primary text-primary' : ''}`}
              >
                My Profile
              </Link>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left text-sm font-medium text-rose-400"
              >
                Sign Out
              </button>
            </>
          )}
          {!user && (
            <div className="flex flex-col gap-2 pt-2 border-t border-darkborder/50">
              <Link 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className={`text-center text-sm font-medium py-2 rounded-lg border border-darkborder text-textPrimary hover:text-primary transition-colors duration-200 ${location.pathname === '/login' ? 'border-b-2 border-primary text-primary' : ''}`}
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                onClick={() => setMobileMenuOpen(false)}
                className={`text-center text-sm font-bold py-2.5 rounded-lg bg-primary text-white transition-colors duration-200 ${location.pathname === '/register' ? 'border-b-2 border-primary' : ''}`}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
