const prisma = require('../config/db');

const LEVEL_XP_STEP = 250;

const ensureBadge = async (userId, name, description, icon) => {
  const badge = await prisma.badge.upsert({
    where: { name },
    update: {},
    create: { name, description, icon }
  });

  const existing = await prisma.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id
      }
    }
  });

  if (existing) {
    return false;
  }

  await prisma.userBadge.create({
    data: {
      userId,
      badgeId: badge.id
    }
  });

  await prisma.notification.create({
    data: {
      userId,
      title: 'New badge unlocked',
      message: `You unlocked the "${name}" badge.`,
      type: 'BADGE_EARNED',
      redirectUrl: '/profile'
    }
  });

  return true;
};

const getTitleForXp = (role, xp) => {
  const donorTitles = ['New Supporter', 'Active Supporter', 'Community Backer', 'Impact Donor', 'Legendary Patron'];
  const creatorTitles = ['New Builder', 'Verified Builder', 'Trusted Creator', 'Impact Maker', 'Vision Leader'];
  const adminTitles = ['Platform Operator', 'Platform Steward', 'Platform Guardian', 'Platform Director', 'Platform Architect'];
  const titles = role === 'CREATOR' ? creatorTitles : role === 'ADMIN' ? adminTitles : donorTitles;
  const index = Math.min(titles.length - 1, Math.floor(xp / 500));
  return titles[index];
};

const getRewardPreview = (level) => {
  if (level >= 12) return 'Priority platform recognition';
  if (level >= 8) return 'Elite supporter title';
  if (level >= 5) return 'Advanced achievement rewards';
  if (level >= 3) return 'Expanded badge unlocks';
  return 'Starter achievement rewards';
};

const getUserGamification = async (userId) => {
  const [user, shareCount] = await Promise.all([
    prisma.user.findUnique({
    where: { id: userId },
    include: {
      donations: true,
      comments: true,
      bookmarks: true,
      following: true,
      campaigns: {
        include: {
          updates: true,
          donations: true
        }
      },
      badges: {
        include: {
          badge: true
        }
      }
    }
    }),
    prisma.campaignShare.count({
      where: { userId }
    })
  ]);

  if (!user) {
    return null;
  }

  const totalDonated = user.donations.reduce((sum, donation) => sum + Number(donation.amount), 0);
  const campaignsRaised = user.campaigns.reduce((sum, campaign) => sum + Number(campaign.raisedAmount), 0);
  const completedCampaigns = user.campaigns.filter((campaign) => campaign.status === 'COMPLETED').length;
  const totalCampaignDonations = user.campaigns.reduce((sum, campaign) => sum + campaign.donations.length, 0);
  const totalUpdates = user.campaigns.reduce((sum, campaign) => sum + campaign.updates.length, 0);

  const xp = Math.max(0,
    Math.round(totalDonated / 5) +
    (user.donations.length * 120) +
    (user.comments.length * 20) +
    (shareCount * 30) +
    (user.bookmarks.length * 10) +
    (user.following.length * 25) +
    (user.campaigns.length * 150) +
    (completedCampaigns * 200) +
    (totalCampaignDonations * 25) +
    (totalUpdates * 15)
  );

  const level = Math.max(1, Math.floor(xp / LEVEL_XP_STEP) + 1);
  const levelStartXp = (level - 1) * LEVEL_XP_STEP;
  const nextLevelXp = level * LEVEL_XP_STEP;
  const xpIntoLevel = xp - levelStartXp;
  const xpForNextLevel = nextLevelXp - levelStartXp;
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));

  const milestones = [
    {
      id: 'donations',
      label: 'Donation milestone',
      current: user.donations.length,
      target: 5,
      unlocked: user.donations.length >= 5
    },
    {
      id: 'impact',
      label: 'Impact milestone',
      current: Math.round(totalDonated),
      target: 1000,
      unlocked: totalDonated >= 1000
    },
    {
      id: 'social',
      label: 'Social milestone',
      current: user.comments.length + shareCount + user.following.length,
      target: 10,
      unlocked: (user.comments.length + shareCount + user.following.length) >= 10
    },
    {
      id: 'creator',
      label: 'Creator milestone',
      current: user.campaigns.length,
      target: 3,
      unlocked: user.campaigns.length >= 3
    }
  ];

  return {
    xp,
    level,
    levelStartXp,
    nextLevelXp,
    progressPercent,
    title: getTitleForXp(user.role, xp),
    rewardPreview: getRewardPreview(level),
    totalDonated,
    campaignsRaised,
    completedCampaigns,
    badgesCount: user.badges.length,
    milestones
  };
};

const refreshUserAchievements = async (userId) => {
  const [user, shareCount] = await Promise.all([
    prisma.user.findUnique({
    where: { id: userId },
    include: {
      donations: true,
      comments: true,
      bookmarks: true,
      following: true,
      campaigns: true
    }
    }),
    prisma.campaignShare.count({
      where: { userId }
    })
  ]);

  if (!user) {
    return [];
  }

  const totalDonated = user.donations.reduce((sum, donation) => sum + Number(donation.amount), 0);
  const awarded = [];

  if (user.donations.length >= 1 && await ensureBadge(userId, 'First Contribution', 'Made the first contribution on the platform.', 'heart')) {
    awarded.push('First Contribution');
  }

  if (totalDonated >= 1000 && await ensureBadge(userId, 'Super Donor', 'Contributed 1,000 or more in total.', 'shield')) {
    awarded.push('Super Donor');
  }

  if (user.donations.length >= 5 && await ensureBadge(userId, 'Philanthropist', 'Supported 5 or more campaigns.', 'award')) {
    awarded.push('Philanthropist');
  }

  if ((user.comments.length + shareCount + user.following.length) >= 5 && await ensureBadge(userId, 'Community Voice', 'Stayed active across social features.', 'award')) {
    awarded.push('Community Voice');
  }

  if (user.bookmarks.length >= 3 && await ensureBadge(userId, 'Curator', 'Bookmarked multiple campaigns.', 'shield')) {
    awarded.push('Curator');
  }

  if (user.campaigns.length >= 1 && await ensureBadge(userId, 'Campaign Starter', 'Created the first campaign.', 'award')) {
    awarded.push('Campaign Starter');
  }

  if (user.campaigns.filter((campaign) => campaign.status === 'COMPLETED').length >= 1 && await ensureBadge(userId, 'Goal Closer', 'Completed a campaign goal.', 'shield')) {
    awarded.push('Goal Closer');
  }

  return awarded;
};

module.exports = {
  getUserGamification,
  refreshUserAchievements
};
