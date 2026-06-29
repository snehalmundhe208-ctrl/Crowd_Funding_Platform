import React from 'react';
import { Heart, Shield, Award, HelpCircle } from 'lucide-react';

const BadgeList = ({ badges }) => {
  const getBadgeIcon = (iconName) => {
    const iconProps = { className: 'w-6 h-6 text-darkbg' };
    if (iconName === 'heart') return <Heart {...iconProps} className="fill-rose-400 stroke-rose-400" />;
    if (iconName === 'shield') return <Shield {...iconProps} className="fill-amber-400 stroke-amber-400" />;
    if (iconName === 'award') return <Award {...iconProps} className="fill-primary stroke-primary" />;
    return <HelpCircle {...iconProps} />;
  };

  const getBadgeColor = (iconName) => {
    if (iconName === 'heart') return 'bg-rose-500/15 border-rose-500/30';
    if (iconName === 'shield') return 'bg-amber-500/15 border-amber-500/30';
    if (iconName === 'award') return 'bg-primary/15 border-primary/30';
    return 'bg-darkborder/50 border-darkborder';
  };

  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-darkborder rounded-xl">
        <p className="text-sm text-textSecondary">No contributor badges unlocked yet.</p>
        <p className="text-xs text-textSecondary/70 mt-1">Donate to active campaigns to unlock badges!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {badges.map((badge, index) => (
        <div 
          key={badge.id} 
          className={`flex items-center gap-3.5 p-4 rounded-xl border ${getBadgeColor(badge.icon)} glass-panel animate-fadeInUp`}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="p-2.5 bg-darkbg rounded-lg border border-darkborder">
            {getBadgeIcon(badge.icon)}
          </div>
          <div>
            <h5 className="text-sm font-bold text-textPrimary">{badge.name}</h5>
            <p className="text-xs text-textSecondary mt-0.5 leading-relaxed">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BadgeList;
