import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, Clock, Users } from 'lucide-react';
import ProgressBar from './ProgressBar';

const CampaignCard = ({ campaign }) => {
  const {
    id,
    title,
    description,
    imageUrl,
    goalAmount,
    raisedAmount,
    deadline,
    status,
    creator,
    category,
    trustScore,
    donationsCount
  } = campaign;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverBase = API_URL.replace('/api', '');
  const coverImage = imageUrl.startsWith('http') ? imageUrl : `${serverBase}${imageUrl}`;

  // Days left calculation
  const getDaysLeft = () => {
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysLeft = getDaysLeft();

  return (
    <div className="animate-fadeInUp">
      <div className="bg-white rounded-2xl border border-darkborder overflow-hidden flex flex-col group hover:-translate-y-1.5 transition-all duration-500 card-shadow hover:card-shadow-hover">
        <div className="relative h-48 w-full overflow-hidden">
          <img 
            src={coverImage} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
          />
          <div className="absolute top-4 left-4 bg-darkbg/85 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-darkborder text-primary">
            {category?.name || 'Category'}
          </div>
          
          <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20 ${trustScore >= 85 ? 'animate-pulse' : ''}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trust: {trustScore}</span>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-textSecondary">By {creator?.name}</span>
              {creator?.isVerified && (
                <span className="text-primary" title="Verified Creator">
                  <Award className="w-3.5 h-3.5 fill-primary/20" />
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-textPrimary leading-snug mb-2 group-hover:text-primary transition-colors">
              <Link to={`/campaigns/${id}`}>{title}</Link>
            </h3>

            <p className="text-sm text-textSecondary leading-relaxed mb-6 line-clamp-2">
              {description}
            </p>
          </div>

          <div>
            <div className="mb-4">
              <ProgressBar raised={raisedAmount} goal={goalAmount} />
            </div>

            <div className="flex justify-between items-center border-t border-darkborder/50 pt-4 mt-2">
              <div className="flex items-center gap-1.5 text-textSecondary text-xs font-medium">
                <Clock className="w-4 h-4 text-primary" />
                <span>{status === 'ACTIVE' ? `${daysLeft} days left` : status}</span>
              </div>
              <div className="flex items-center gap-1.5 text-textSecondary text-xs font-medium">
                <Users className="w-4 h-4 text-accent" />
                <span>{donationsCount || 0} donations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;
