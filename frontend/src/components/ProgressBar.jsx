import React, { useEffect, useState } from 'react';

const ProgressBar = ({ raised, goal, size = 'md' }) => {
  const percentage = Math.min(100, Math.max(0, goal > 0 ? Math.round((raised / goal) * 100) : 0));

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const barHeights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const getFillColor = () => {
    if (percentage > 75) return 'bg-emerald-600';
    if (percentage >= 40) return 'bg-primary';
    return 'bg-amber-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-xs font-semibold">
        <span className="text-primary font-bold">{percentage}% Raised</span>
        <span className="text-textSecondary">${Number(raised).toLocaleString()} of ${Number(goal).toLocaleString()}</span>
      </div>
      <div className={`w-full bg-darkborder rounded-full ${barHeights[size]} overflow-hidden`}>
        <div 
          className={`relative h-full rounded-full ${getFillColor()} shimmer-loading transition-all duration-1000 ease-out`}
          style={{ width: mounted ? `${percentage}%` : '0%' }}
        >
          <div className="absolute inset-0 opacity-70"></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
