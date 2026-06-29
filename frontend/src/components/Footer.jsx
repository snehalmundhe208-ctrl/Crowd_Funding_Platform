import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-darksurface border-t border-darkborder py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Logo & Tagline */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💧</span>
              <span className="text-xl font-extrabold tracking-wider text-gradient">
                CROWDFLOW
              </span>
            </div>
            <p className="text-sm text-textSecondary leading-relaxed max-w-sm">
              Empowering next-generation ideas, community micro-projects, and breakthrough medical innovations through transparent, trust-verified crowdfunding.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-textSecondary hover:text-primary transition-colors">Browse Campaigns</Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-textSecondary hover:text-primary transition-colors">Donor Leaderboard</Link>
              </li>
              <li>
                <Link to="/register" className="text-textSecondary hover:text-primary transition-colors">Launch Project</Link>
              </li>
            </ul>
          </div>

          {/* Platform Info */}
          <div>
            <h4 className="text-sm font-bold text-textPrimary uppercase tracking-wider mb-4">Trust & Security</h4>
            <ul className="space-y-2 text-sm text-textSecondary">
              <li className="flex items-center gap-1.5">
                <span className="text-primary text-sm leading-none">•</span>
                <span>Dynamic Trust Score</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-primary text-sm leading-none">•</span>
                <span>Creator KYC Audit</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-primary text-sm leading-none">•</span>
                <span>Audit Trail Logging</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright Footer */}
        <div className="border-t border-darkborder/40 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-textSecondary">
            &copy; {new Date().getFullYear()} CrowdFlow Inc. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-textSecondary">
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Cookie Settings</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
