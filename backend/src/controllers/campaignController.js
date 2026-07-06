const prisma = require('../config/db');
const logger = require('../config/logger');
const { calculateCampaignTrustScore, calculateUserTrustScore } = require('../utils/trustScore');
const { refreshUserAchievements } = require('../utils/gamification');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return process.env.JWT_SECRET;
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

const createCampaign = async (req, res, next) => {
  try {
    if (!['CREATOR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Only creators or admins can launch campaigns.' });
    }

    if (req.user.role === 'CREATOR') {
      const kyc = await prisma.kyc.findUnique({
        where: { userId: req.user.id }
      });

      if (!kyc || kyc.status !== 'APPROVED') {
        return res.status(403).json({
          success: false,
          error: 'Your KYC verification must be APPROVED by an Admin before launching campaigns.'
        });
      }
    }

    const { title: rawTitle, description: rawDescription, goalAmount, categoryId, deadline, rewards } = req.body;
    const title = rawTitle?.trim();
    const description = rawDescription?.trim();

    if (!title || !description || !goalAmount || !categoryId || !deadline) {
      return res.status(400).json({ success: false, error: 'Missing required campaign fields.' });
    }

    if (isNaN(Number(goalAmount)) || Number(goalAmount) <= 0) {
      return res.status(400).json({ success: false, error: 'Goal amount must be a positive number.' });
    }

    if (isNaN(new Date(deadline).getTime()) || new Date(deadline) <= new Date()) {
      return res.status(400).json({ success: false, error: 'Deadline must be a valid date in the future.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a campaign cover image.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(400).json({ success: false, error: 'Invalid Category selected.' });
    }

    // Parse rewards
    let rewardTiers = [];
    if (rewards) {
      try {
        rewardTiers = typeof rewards === 'string' ? JSON.parse(rewards) : rewards;
      } catch (err) {
        return res.status(400).json({ success: false, error: 'Invalid rewards format. Must be a JSON array.' });
      }
    }

    if (!Array.isArray(rewardTiers) || rewardTiers.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one reward tier is required.' });
    }

    for (const tier of rewardTiers) {
      if (typeof tier.title === 'string') tier.title = tier.title.trim();
      if (typeof tier.description === 'string') tier.description = tier.description.trim();

      if (
        !tier.title ||
        !tier.description ||
        tier.minAmount === undefined ||
        tier.minAmount === null ||
        isNaN(Number(tier.minAmount)) ||
        Number(tier.minAmount) <= 0
      ) {
        return res.status(400).json({ success: false, error: 'Each reward tier requires a title, description, and a positive minAmount.' });
      }
    }

    // Prisma transaction to create campaign and reward tiers
    const campaign = await prisma.$transaction(async (tx) => {
      const newCampaign = await tx.campaign.create({
        data: {
          title,
          description,
          imageUrl,
          goalAmount: Number(goalAmount),
          deadline: new Date(deadline),
          creatorId: req.user.id,
          categoryId: categoryId,
          status: 'PENDING' // Awaiting admin approval
        }
      });

      const tierData = rewardTiers.map(tier => ({
        title: tier.title,
        description: tier.description,
        minAmount: Number(tier.minAmount),
        campaignId: newCampaign.id
      }));

      await tx.rewardTier.createMany({
        data: tierData
      });

      return newCampaign;
    });

    logger.info(`Campaign created: ${campaign.title} (ID: ${campaign.id}) by Creator: ${req.user.email}`);
    await refreshUserAchievements(req.user.id);

    // Notify admins about the new campaign
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Campaign Awaiting Approval',
          message: `Campaign "${title}" was created by ${req.user.name} and needs review.`,
          type: 'CAMPAIGN_STATUS',
          redirectUrl: `/admin/campaigns`
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully. Waiting for admin approval.',
      campaign
    });

  } catch (error) {
    next(error);
  }
};

const getCampaigns = async (req, res, next) => {
  try {
    const { search, category, status, sort, page = 1, limit = 9 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      AND: []
    };

    // Search
    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    // Category (fixed: search and category filters no longer clobber each other)
    if (category) {
      where.AND.push({
        OR: [
          { categoryId: category },
          { category: { slug: category } }
        ]
      });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    const authHeader = req.headers.authorization;
    let requestingUser = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, getJwtSecret());

        requestingUser = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            role: true
          }
        });
      } catch (err) {
        requestingUser = null;
      }
    }

    const isAdmin = requestingUser?.role === 'ADMIN';

    if (status && isAdmin) {
      where.status = status;
    } else if (status === 'COMPLETED' || status === 'EXPIRED') {
      where.status = status;
    } else {
      where.status = 'ACTIVE';
    }

    let orderBy = { createdAt: 'desc' };

    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'mostFunded') {
      orderBy = { raisedAmount: 'desc' };
    } else if (sort === 'endingSoon') {
      orderBy = { deadline: 'asc' };
      where.deadline = { gte: new Date() };
    }

    const total = await prisma.campaign.count({ where });

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        },
        category: true,
        donations: {
          select: {
            id: true
          }
        }
      },
      orderBy,
      skip,
      take: limitNum
    });

    const campaignsWithScores = await Promise.all(
      campaigns.map(async (c) => {
        const score = await calculateCampaignTrustScore(c.id);

        return {
          ...c,
          trustScore: score,
          raisedAmount: Number(c.raisedAmount),
          goalAmount: Number(c.goalAmount),
          donationsCount: c.donations.length
        };
      })
    );

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      },
      campaigns: campaignsWithScores
    });

  } catch (error) {
    next(error);
  }
};

const getCampaignDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            isVerified: true,
            createdAt: true
          }
        },
        category: true,
        rewards: {
          orderBy: { minAmount: 'asc' }
        },
        updates: {
          orderBy: { createdAt: 'desc' }
        },
        donations: {
          include: {
            donor: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 8
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          where: { parentId: null },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            likes: true,
            bookmarks: true,
            donations: true,
            shares: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    if (campaign.status !== 'ACTIVE' && campaign.status !== 'COMPLETED' && campaign.status !== 'EXPIRED') {
      let canViewPrivate = false;

      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = require('jsonwebtoken').verify(token, getJwtSecret());
          const viewer = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, role: true }
          });
          canViewPrivate = !!viewer && (viewer.role === 'ADMIN' || viewer.id === campaign.creatorId);
        } catch (err) {
          canViewPrivate = false;
        }
      }

      if (!canViewPrivate) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }
    }

    // Dynamic trust scores
    const campaignScore = await calculateCampaignTrustScore(campaign.id);
    const creatorScore = await calculateUserTrustScore(campaign.creatorId);
    const creatorFollowersCount = await prisma.follow.count({
      where: { creatorId: campaign.creatorId }
    });

    // Check relationship flags if authenticated
    let userHasLiked = false;
    let userHasBookmarked = false;
    let userHasFollowedCreator = false;
    let userHasShared = false;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = require('jsonwebtoken').verify(token, getJwtSecret());

        const like = await prisma.like.findUnique({
          where: { campaignId_userId: { campaignId: id, userId: decoded.id } }
        });
        userHasLiked = !!like;

        const bookmark = await prisma.bookmark.findUnique({
          where: { campaignId_userId: { campaignId: id, userId: decoded.id } }
        });
        userHasBookmarked = !!bookmark;

        const follow = await prisma.follow.findUnique({
          where: { followerId_creatorId: { followerId: decoded.id, creatorId: campaign.creatorId } }
        });
        userHasFollowedCreator = !!follow;

        const share = await prisma.campaignShare.findFirst({
          where: {
            campaignId: id,
            userId: decoded.id
          }
        });
        userHasShared = !!share;
      } catch (err) {
        // ignore invalid token for detail fetch
      }
    }

    const recentShares = await prisma.campaignShare.findMany({
      where: { campaignId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const activityFeed = [
      ...campaign.updates.map((update) => ({
        id: `update-${update.id}`,
        type: 'UPDATE',
        title: update.title,
        description: update.content,
        createdAt: update.createdAt
      })),
      ...campaign.comments.flatMap((comment) => ([
        {
          id: `comment-${comment.id}`,
          type: 'COMMENT',
          title: `${comment.user.name} commented`,
          description: comment.content,
          createdAt: comment.createdAt
        },
        ...comment.replies.map((reply) => ({
          id: `reply-${reply.id}`,
          type: 'REPLY',
          title: `${reply.user.name} replied`,
          description: reply.content,
          createdAt: reply.createdAt
        }))
      ])),
      ...recentShares.map((share) => ({
        id: `share-${share.id}`,
        type: 'SHARE',
        title: `${share.user?.name || 'A supporter'} shared this campaign`,
        description: share.channel ? `Shared via ${share.channel}.` : 'Shared this campaign.',
        createdAt: share.createdAt
      }))
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    res.status(200).json({
      success: true,
      campaign: {
        ...campaign,
        trustScore: campaignScore,
        creator: {
          ...campaign.creator,
          trustScore: creatorScore,
          followersCount: creatorFollowersCount
        },
        raisedAmount: Number(campaign.raisedAmount),
        goalAmount: Number(campaign.goalAmount),
        rewards: campaign.rewards.map(r => ({ ...r, minAmount: Number(r.minAmount) })),
        recentContributors: campaign.donations.map((donation) => ({
          id: donation.id,
          amount: Number(donation.amount),
          isAnonymous: donation.isAnonymous,
          createdAt: donation.createdAt,
          donor: donation.isAnonymous ? null : donation.donor
        })),
        likesCount: campaign._count.likes,
        bookmarksCount: campaign._count.bookmarks,
        sharesCount: campaign._count.shares,
        donationsCount: campaign._count.donations,
        userHasLiked,
        userHasBookmarked,
        userHasFollowedCreator,
        userHasShared,
        activityFeed
      }
    });

  } catch (error) {
    next(error);
  }
};

const updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rawTitle = req.body.title;
    const rawDescription = req.body.description;
    const { categoryId } = req.body;

    const title = rawTitle !== undefined ? rawTitle.trim() : undefined;
    const description = rawDescription !== undefined ? rawDescription.trim() : undefined;

    if (title !== undefined && title.length === 0) {
      return res.status(400).json({ success: false, error: 'Title cannot be empty.' });
    }

    if (description !== undefined && description.length === 0) {
      return res.status(400).json({ success: false, error: 'Description cannot be empty.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    if (campaign.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized to edit this campaign.' });
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(400).json({ success: false, error: 'Invalid Category selected.' });
      }
    }

    let imageUrl = campaign.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        title: title || campaign.title,
        description: description || campaign.description,
        categoryId: categoryId || campaign.categoryId,
        imageUrl
      }
    });

    logger.info(`Campaign updated: ${updated.title} (ID: ${updated.id})`);

    res.status(200).json({
      success: true,
      message: 'Campaign updated successfully.',
      campaign: updated
    });
  } catch (error) {
    next(error);
  }
};

const deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    if (campaign.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete this campaign.' });
    }

    if (Number(campaign.raisedAmount) > 0 && req.user.role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'Campaign has already received donations and cannot be deleted.'
      });
    }

    await prisma.campaign.delete({
      where: { id }
    });

    logger.info(`Campaign deleted: ${campaign.title} (ID: ${id})`);

    res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

const createUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and Content are required for the update.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        donations: {
          select: { donorId: true },
          distinct: ['donorId']
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    if (campaign.creatorId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the creator can post updates.' });
    }

    const update = await prisma.campaignUpdate.create({
      data: {
        title,
        content,
        campaignId: id
      }
    });

    logger.info(`Campaign update posted: "${title}" for campaign ID: ${id}`);

    // Notify all unique donors who funded this campaign
    for (const d of campaign.donations) {
      await prisma.notification.create({
        data: {
          userId: d.donorId,
          title: `Campaign Update: ${campaign.title}`,
          message: `The creator posted a new update: "${title}". Check it out!`,
          type: 'CAMPAIGN_UPDATE',
          redirectUrl: `/campaigns/${id}`
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Campaign update posted successfully and notifications sent.',
      update
    });

  } catch (error) {
    next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Comment content cannot be empty.' });
    }

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });

      if (!parentComment || parentComment.campaignId !== id) {
        return res.status(400).json({ success: false, error: 'Invalid parent comment.' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        campaignId: id,
        userId: req.user.id,
        parentId: parentId || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    logger.info(`Comment added by user: ${req.user.email} on Campaign: ${campaign.title}`);

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true }
      });

      if (parentComment && parentComment.userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: parentComment.userId,
            title: 'New reply to your comment',
            message: `${req.user.name} replied to your comment.`,
            type: 'CAMPAIGN_UPDATE',
            redirectUrl: `/campaigns/${id}`
          }
        });
      }
    }

    if (campaign.creatorId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: campaign.creatorId,
          title: 'New campaign comment',
          message: `${req.user.name} commented on "${campaign.title}".`,
          type: 'CAMPAIGN_UPDATE',
          redirectUrl: `/campaigns/${id}`
        }
      });
    }

    await refreshUserAchievements(req.user.id);

    res.status(201).json({
      success: true,
      comment
    });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found.' });
    }

    if (comment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete this comment.' });
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        campaignId_userId: {
          campaignId: id,
          userId
        }
      }
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id }
      });
      return res.status(200).json({ success: true, liked: false, message: 'Unliked campaign.' });
    } else {
      await prisma.like.create({
        data: {
          campaignId: id,
          userId
        }
      });

      if (campaign.creatorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: campaign.creatorId,
            title: 'Campaign liked',
            message: `${req.user.name} liked "${campaign.title}".`,
            type: 'CAMPAIGN_UPDATE',
            redirectUrl: `/campaigns/${id}`
          }
        });
      }

      await refreshUserAchievements(userId);

      return res.status(200).json({ success: true, liked: true, message: 'Liked campaign.' });
    }
  } catch (error) {
    next(error);
  }
};

const toggleBookmark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        campaignId_userId: {
          campaignId: id,
          userId
        }
      }
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: { id: existingBookmark.id }
      });
      return res.status(200).json({ success: true, bookmarked: false, message: 'Removed from bookmarks.' });
    } else {
      await prisma.bookmark.create({
        data: {
          campaignId: id,
          userId
        }
      });
      await refreshUserAchievements(userId);
      return res.status(200).json({ success: true, bookmarked: true, message: 'Added to bookmarks.' });
    }
  } catch (error) {
    next(error);
  }
};

const shareCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { channel } = req.body;

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const share = await prisma.campaignShare.create({
      data: {
        campaignId: id,
        userId: req.user?.id || null,
        channel: channel || 'direct'
      }
    });

    if (req.user?.id) {
      await refreshUserAchievements(req.user.id);
    }

    if (campaign.creatorId !== req.user?.id) {
      await prisma.notification.create({
        data: {
          userId: campaign.creatorId,
          title: 'Campaign shared',
          message: `${req.user?.name || 'A supporter'} shared "${campaign.title}".`,
          type: 'CAMPAIGN_UPDATE',
          redirectUrl: `/campaigns/${id}`
        }
      });
    }

    const sharesCount = await prisma.campaignShare.count({
      where: { campaignId: id }
    });

    return res.status(201).json({
      success: true,
      message: 'Campaign shared successfully.',
      share,
      sharesCount
    });
  } catch (error) {
    next(error);
  }
};

const reportCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reason for report is required.' });
    }

    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const existingReport = await prisma.report.findFirst({
      where: {
        campaignId: id,
        reporterId: req.user.id,
        status: 'PENDING'
      }
    });

    if (existingReport) {
      return res.status(400).json({ success: false, error: 'You already have a pending report for this campaign.' });
    }

    // Create Report and increment campaign fraudFlagsCount
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.report.create({
        data: {
          reason,
          description,
          campaignId: id,
          reporterId: req.user.id
        }
      });

      await tx.campaign.update({
        where: { id },
        data: {
          fraudFlagsCount: {
            increment: 1
          }
        }
      });

      return newReport;
    });

    logger.warn(`Campaign ID: ${id} reported by user: ${req.user.email}. Reason: ${reason}`);

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'New campaign report',
          message: `A report for "${campaign.title}" requires review.`,
          type: 'SYSTEM',
          redirectUrl: '/admin'
        }))
      });
    }

    res.status(201).json({
      success: true,
      message: 'Campaign reported successfully. Administration has been notified.',
      report
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCampaign,
  getCampaigns,
  getCampaignDetails,
  updateCampaign,
  deleteCampaign,
  createUpdate,
  addComment,
  deleteComment,
  toggleLike,
  toggleBookmark,
  shareCampaign,
  reportCampaign
};