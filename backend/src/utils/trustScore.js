const prisma = require('../config/db');

/**
 * Calculates a user's trust score (0 to 100) dynamically.
 * @param {string} userId - User ID
 */
const calculateUserTrustScore = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kyc: true,
      campaigns: {
        include: {
          donations: true,
          updates: true,
          reports: true
        }
      },
      donations: true
    }
  });

  if (!user) return 70; 

  let score = 70;

  
  if (user.kyc) {
    if (user.kyc.status === 'APPROVED') {
      score += 15;
    } else if (user.kyc.status === 'REJECTED') {
      score -= 10;
    }
  } else {
    score -= 5; 
  }

  
  if (user.isVerified) {
    score += 10;
  }


  if (user.campaigns.length > 0) {
    let completedCount = 0;
    let successfulCount = 0;
    let totalUpdates = 0;
    let totalFraudFlags = 0;
    let resolvedReportsCount = 0;

    user.campaigns.forEach(campaign => {
      totalUpdates += campaign.updates.length;
      totalFraudFlags += campaign.fraudFlagsCount;
      
      
      const resolvedReports = campaign.reports.filter(r => r.status === 'RESOLVED');
      resolvedReportsCount += resolvedReports.length;

     
      const now = new Date();
      const isExpired = new Date(campaign.deadline) < now;
      const raised = Number(campaign.raisedAmount);
      const goal = Number(campaign.goalAmount);
      
      if (campaign.status === 'COMPLETED' || (isExpired && raised >= goal)) {
        successfulCount++;
        completedCount++;
      } else if (isExpired && raised < goal) {
        completedCount++;
      }
    });

    
    if (completedCount > 0) {
      const rate = successfulCount / completedCount;
      if (rate >= 0.8) {
        score += 10;
      } else if (rate >= 0.5) {
        score += 5;
      }
    }

    
    const avgUpdates = totalUpdates / user.campaigns.length;
    if (avgUpdates >= 2) {
      score += 5;
    }

    
    score -= (resolvedReportsCount * 10);
    score -= (totalFraudFlags * 15);
  }

  
  if (user.donations.length > 0) {
    score += 5;
  }

  
  return Math.max(0, Math.min(100, score));
};

/**
 * Calculates a campaign's trust score (0 to 100) dynamically.
 * @param {string} campaignId - Campaign ID
 */
const calculateCampaignTrustScore = async (campaignId) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      creator: true,
      rewards: true,
      updates: true,
      reports: true
    }
  });

  if (!campaign) return 70;

  const creatorTrustScore = await calculateUserTrustScore(campaign.creatorId);

 
  let score = creatorTrustScore * 0.7;

  
  if (campaign.rewards.length >= 3) {
    score += 5;
  }


  if (campaign.updates.length >= 1) {
    score += 5;
  }

 
  const activeReportsCount = campaign.reports.filter(r => r.status === 'PENDING').length;
  score -= (activeReportsCount * 10);

  if (campaign.fraudFlagsCount > 2) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

module.exports = {
  calculateUserTrustScore,
  calculateCampaignTrustScore
};
