const prisma = require('../config/db');
const logger = require('../config/logger');
const { calculateCampaignTrustScore, calculateUserTrustScore } = require('../utils/trustScore');
const { getUserGamification, refreshUserAchievements } = require('../utils/gamification');
const fs = require('fs');
const path = require('path');

const normalizeNotification = (notification) => ({
  ...notification,
  createdAt: notification.createdAt,
  readAt: notification.readAt
});

// Shared helper: fetches a user's personal Bookmarks, Following, Certificates
// and Receipts collections. Used by the DONOR, CREATOR and ADMIN dashboard
// branches so every role can see these sections according to their own data.
const getPersonalCollections = async (userId) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      campaign: {
        include: {
          creator: {
            select: { id: true, name: true, isVerified: true }
          },
          category: true,
          donations: {
            select: { id: true }
          }
        }
      }
    }
  });

  const followedCreators = await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      creator: {
        select: { id: true, name: true, avatar: true, isVerified: true }
      }
    }
  });

  const myDonationsWithFiles = await prisma.donation.findMany({
    where: { donorId: userId },
    include: {
      campaign: { select: { id: true, title: true } },
      receipt: true,
      certificate: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const normalizedBookmarks = await Promise.all(
    bookmarks.map(async (bookmark) => ({
      ...bookmark.campaign,
      trustScore: await calculateCampaignTrustScore(bookmark.campaign.id),
      goalAmount: Number(bookmark.campaign.goalAmount),
      raisedAmount: Number(bookmark.campaign.raisedAmount),
      donationsCount: bookmark.campaign.donations.length
    }))
  );

  const certificates = myDonationsWithFiles
    .filter((donation) => donation.certificate)
    .map((donation) => ({
      ...donation.certificate,
      campaignId: donation.campaign.id,
      campaignTitle: donation.campaign.title,
      amount: Number(donation.amount),
      donationDate: donation.createdAt
    }));

  const receipts = myDonationsWithFiles
    .filter((donation) => donation.receipt)
    .map((donation) => ({
      ...donation.receipt,
      campaignId: donation.campaign.id,
      campaignTitle: donation.campaign.title,
      amount: Number(donation.amount),
      donationDate: donation.createdAt
    }));

  return {
    bookmarks: normalizedBookmarks,
    followedCreators: followedCreators.map((f) => f.creator),
    certificates,
    receipts
  };
};

const getMimeType = (absolutePath) => {
  const extension = path.extname(absolutePath).toLowerCase();
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
};

const sendStoredFile = ({ res, absolutePath, downloadName, inline = false }) => {
  res.setHeader('Content-Type', getMimeType(absolutePath));
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename=${downloadName}`);
  fs.createReadStream(absolutePath).pipe(res);
};

const submitKyc = async (req, res, next) => {
  try {
    if (req.user.role !== 'CREATOR') {
      return res.status(403).json({ success: false, error: 'Only Campaign Creators can submit KYC verification.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a KYC document file.' });
    }

    const { documentType } = req.body;
    if (!documentType) {
      return res.status(400).json({ success: false, error: 'Document type is required.' });
    }

    const documentUrl = `/uploads/${req.file.filename}`;

    const existingKyc = await prisma.kyc.findUnique({
      where: { userId: req.user.id }
    });

    if (existingKyc && existingKyc.status === 'APPROVED') {
      return res.status(400).json({ success: false, error: 'Your KYC is already approved.' });
    }

    let kyc;
    if (existingKyc) {
      kyc = await prisma.kyc.update({
        where: { userId: req.user.id },
        data: {
          documentType,
          documentUrl,
          status: 'PENDING',
          rejectionReason: null,
          submittedAt: new Date(),
          reviewedBy: null,
          reviewedAt: null
        }
      });
    } else {
      kyc = await prisma.kyc.create({
        data: {
          userId: req.user.id,
          documentType,
          documentUrl,
          status: 'PENDING'
        }
      });
    }

    logger.info(`KYC submitted by creator: ${req.user.email} (ID: ${kyc.id})`);

    res.status(200).json({
      success: true,
      message: 'KYC documents submitted successfully. Admin review pending.',
      kyc
    });
  } catch (error) {
    next(error);
  }
};

const followCreator = async (req, res, next) => {
  try {
    const { creatorId } = req.params;

    if (req.user.id === creatorId) {
      return res.status(400).json({ success: false, error: 'You cannot follow yourself.' });
    }

    const creator = await prisma.user.findUnique({
      where: { id: creatorId }
    });

    if (!creator || creator.role !== 'CREATOR') {
      return res.status(404).json({ success: false, error: 'Creator not found.' });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_creatorId: {
          followerId: req.user.id,
          creatorId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({ success: false, error: 'You are already following this creator.' });
    }

    await prisma.follow.create({
      data: {
        followerId: req.user.id,
        creatorId
      }
    });

    await prisma.notification.create({
      data: {
        userId: creatorId,
        title: 'New follower',
        message: `${req.user.name} started following your creator profile.`,
        type: 'INFO',
        redirectUrl: `/campaigns`
      }
    });

    await refreshUserAchievements(req.user.id);

    logger.info(`User ${req.user.email} followed Creator ${creator.email}`);

    res.status(200).json({
      success: true,
      message: 'Followed creator successfully.'
    });
  } catch (error) {
    next(error);
  }
};

const unfollowCreator = async (req, res, next) => {
  try {
    const { creatorId } = req.params;

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_creatorId: {
          followerId: req.user.id,
          creatorId
        }
      }
    });

    if (!existingFollow) {
      return res.status(400).json({ success: false, error: 'You are not following this creator.' });
    }

    await prisma.follow.delete({
      where: {
        id: existingFollow.id
      }
    });

    logger.info(`User ${req.user.email} unfollowed Creator (ID: ${creatorId})`);

    res.status(200).json({
      success: true,
      message: 'Unfollowed creator successfully.'
    });
  } catch (error) {
    next(error);
  }
};

const getDashboardMetrics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'DONOR') {
      // Fetch donor analytics
      const donations = await prisma.donation.findMany({
        where: { donorId: userId },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              imageUrl: true
            }
          },
          receipt: true,
          certificate: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalDonated = donations.reduce((sum, don) => sum + Number(don.amount), 0);
      const totalDonationsCount = donations.length;

      // Bookmarked campaigns
      const bookmarks = await prisma.bookmark.findMany({
        where: { userId },
        include: {
          campaign: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true
                }
              },
              category: true,
              donations: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      });

      // Followed creators
      const followedCreators = await prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              isVerified: true
            }
          }
        }
      });

      // Badges
      const badges = await prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true }
      });

      // Notifications
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      const donorTrustScore = await calculateUserTrustScore(userId);
      const gamification = await getUserGamification(userId);
      const normalizedBookmarks = await Promise.all(
        bookmarks.map(async (bookmark) => ({
          ...bookmark.campaign,
          trustScore: await calculateCampaignTrustScore(bookmark.campaign.id),
          goalAmount: Number(bookmark.campaign.goalAmount),
          raisedAmount: Number(bookmark.campaign.raisedAmount),
          donationsCount: bookmark.campaign.donations.length
        }))
      );
      const normalizedDonations = donations.map((donation) => ({
        ...donation,
        amount: Number(donation.amount)
      }));

      // My Certificates & My Receipts (derived from own donations)
      const certificates = normalizedDonations
        .filter((donation) => donation.certificate)
        .map((donation) => ({
          ...donation.certificate,
          campaignId: donation.campaign.id,
          campaignTitle: donation.campaign.title,
          amount: donation.amount,
          donationDate: donation.createdAt
        }));
      const receipts = normalizedDonations
        .filter((donation) => donation.receipt)
        .map((donation) => ({
          ...donation.receipt,
          campaignId: donation.campaign.id,
          campaignTitle: donation.campaign.title,
          amount: donation.amount,
          donationDate: donation.createdAt
        }));

      const activityFeed = [
        ...normalizedDonations.slice(0, 10).map((donation) => ({
          id: `donation-${donation.id}`,
          type: 'DONATION',
          title: `Contributed to ${donation.campaign.title}`,
          description: `$${Number(donation.amount).toFixed(2)} contribution completed.`,
          createdAt: donation.createdAt
        })),
        ...followedCreators.slice(0, 10).map((follow) => ({
          id: `follow-${follow.id}`,
          type: 'FOLLOW',
          title: `Following ${follow.creator.name}`,
          description: 'Creator added to your network.',
          createdAt: follow.createdAt
        }))
      ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 15);

      return res.status(200).json({
        success: true,
        role: 'DONOR',
        metrics: {
          totalDonated,
          totalDonationsCount,
          bookmarksCount: bookmarks.length,
          followingCount: followedCreators.length,
          badgesCount: badges.length,
          certificatesCount: certificates.length,
          receiptsCount: receipts.length,
          trustScore: donorTrustScore
        },
        donations: normalizedDonations,
        bookmarks: normalizedBookmarks,
        followedCreators: followedCreators.map(f => f.creator),
        certificates,
        receipts,
        badges: badges.map(b => b.badge),
        notifications: notifications.map(normalizeNotification),
        gamification,
        activityFeed
      });

    } else if (userRole === 'CREATOR') {
      // Creator dashboard
      const campaigns = await prisma.campaign.findMany({
        where: { creatorId: userId },
        include: {
          donations: true,
          updates: true,
          reports: true,
          category: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalCampaignsCount = campaigns.length;
      let totalRaised = 0;
      let totalDonationsCount = 0;
      let activeCampaignsCount = 0;
      let completedCampaignsCount = 0;
      let successfulCampaignsCount = 0;

      campaigns.forEach(c => {
        totalRaised += Number(c.raisedAmount);
        totalDonationsCount += c.donations.length;
        
        if (c.status === 'ACTIVE') {
          activeCampaignsCount++;
        }
        
        const now = new Date();
        const isExpired = new Date(c.deadline) < now;
        if (c.status === 'COMPLETED' || (isExpired && Number(c.raisedAmount) >= Number(c.goalAmount))) {
          completedCampaignsCount++;
          successfulCampaignsCount++;
        } else if (isExpired) {
          completedCampaignsCount++;
        }
      });

      const successRate = completedCampaignsCount > 0 
        ? Math.round((successfulCampaignsCount / completedCampaignsCount) * 100) 
        : 0;

      // Followers
      const followersCount = await prisma.follow.count({
        where: { creatorId: userId }
      });

      // Trust score
      const trustScore = await calculateUserTrustScore(userId);
      const gamification = await getUserGamification(userId);

      // Latest donations on creator campaigns
      const campaignIds = campaigns.map(c => c.id);
      const recentDonations = await prisma.donation.findMany({
        where: { campaignId: { in: campaignIds } },
        include: {
          donor: {
            select: {
              name: true,
              email: true
            }
          },
          campaign: {
            select: {
              title: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Group monthly fundraising for charts
      const donationsAll = await prisma.donation.findMany({
        where: { campaignId: { in: campaignIds } },
        orderBy: { createdAt: 'asc' }
      });

      const monthlyData = {};
      donationsAll.forEach(don => {
        const date = new Date(don.createdAt);
        const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyData[key] = (monthlyData[key] || 0) + Number(don.amount);
      });

      const monthlyFundraising = Object.keys(monthlyData).map(key => ({
        name: key,
        amount: monthlyData[key]
      }));

      // Badges
      const badges = await prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true }
      });

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      // Bookmarks, Following, Certificates & Receipts for this creator's own account
      const personalCollections = await getPersonalCollections(userId);

      const shares = await prisma.campaignShare.findMany({
        where: { campaign: { creatorId: userId } },
        include: {
          user: {
            select: {
              name: true
            }
          },
          campaign: {
            select: {
              title: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const normalizedCampaigns = await Promise.all(
        campaigns.map(async (campaign) => ({
          ...campaign,
          goalAmount: Number(campaign.goalAmount),
          raisedAmount: Number(campaign.raisedAmount),
          trustScore: await calculateCampaignTrustScore(campaign.id),
          donationsCount: campaign.donations.length
        }))
      );
      const normalizedRecentDonations = recentDonations.map((donation) => ({
        ...donation,
        amount: Number(donation.amount)
      }));
      const activityFeed = [
        ...normalizedRecentDonations.map((donation) => ({
          id: `donation-${donation.id}`,
          type: 'DONATION',
          title: `${donation.donor.name} contributed`,
          description: `${donation.campaign.title} received $${Number(donation.amount).toFixed(2)}.`,
          createdAt: donation.createdAt
        })),
        ...shares.map((share) => ({
          id: `share-${share.id}`,
          type: 'SHARE',
          title: `${share.user?.name || 'A supporter'} shared your campaign`,
          description: share.campaign.title,
          createdAt: share.createdAt
        }))
      ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 15);

      res.status(200).json({
        success: true,
        role: 'CREATOR',
        metrics: {
          totalCampaignsCount,
          activeCampaignsCount,
          totalRaised,
          totalDonationsCount,
          followersCount,
          successRate,
          trustScore,
          badgesCount: badges.length,
          bookmarksCount: personalCollections.bookmarks.length,
          followingCount: personalCollections.followedCreators.length,
          certificatesCount: personalCollections.certificates.length,
          receiptsCount: personalCollections.receipts.length
        },
        campaigns: normalizedCampaigns,
        recentDonations: normalizedRecentDonations,
        monthlyFundraising,
        badges: badges.map(b => b.badge),
        notifications: notifications.map(normalizeNotification),
        gamification,
        activityFeed,
        bookmarks: personalCollections.bookmarks,
        followedCreators: personalCollections.followedCreators,
        certificates: personalCollections.certificates,
        receipts: personalCollections.receipts
      });
    } else if (userRole === 'ADMIN') {
      // Admin's personal collections (an admin account can still bookmark
      // campaigns / follow creators like any other user). Platform-wide
      // stats continue to be served separately by /admin/stats.
      const personalCollections = await getPersonalCollections(userId);
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      res.status(200).json({
        success: true,
        role: 'ADMIN',
        metrics: {
          bookmarksCount: personalCollections.bookmarks.length,
          followingCount: personalCollections.followedCreators.length,
          certificatesCount: personalCollections.certificates.length,
          receiptsCount: personalCollections.receipts.length
        },
        bookmarks: personalCollections.bookmarks,
        followedCreators: personalCollections.followedCreators,
        certificates: personalCollections.certificates,
        receipts: personalCollections.receipts,
        notifications: notifications.map(normalizeNotification)
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid user role context.' });
    }
  } catch (error) {
    next(error);
  }
};

const getKycDocument = async (req, res, next) => {
  try {
    const { kycId } = req.params;
    const inline = req.query.inline === 'true';

    const kyc = await prisma.kyc.findUnique({
      where: { id: kycId }
    });

    if (!kyc) {
      return res.status(404).json({ success: false, error: 'KYC document not found.' });
    }

    if (req.user.role !== 'ADMIN' && kyc.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to access this document.' });
    }

    const relativePath = kyc.documentUrl.replace(/^\//, '');
    const absolutePath = path.join(__dirname, '../../', relativePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'KYC file missing on disk.' });
    }

    sendStoredFile({
      res,
      absolutePath,
      downloadName: path.basename(relativePath),
      inline
    });
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      notification: updatedNotification
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitKyc,
  followCreator,
  unfollowCreator,
  getDashboardMetrics,
  getKycDocument,
  getNotifications,
  markNotificationRead
};
