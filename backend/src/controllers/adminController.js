const prisma = require('../config/db');
const logger = require('../config/logger');

const logAdminAction = async (adminId, action, details) => {
  try {
    await prisma.adminLog.create({
      data: {
        adminId,
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details)
      }
    });
  } catch (error) {
    logger.error(`Failed to create AdminLog: ${error.message}`);
  }
};

const reviewKyc = async (req, res, next) => {
  try {
    const { kycId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be APPROVED or REJECTED.' });
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required when rejecting KYC.' });
    }

    const kyc = await prisma.kyc.findUnique({
      where: { id: kycId },
      include: { user: true }
    });

    if (!kyc) {
      return res.status(404).json({ success: false, error: 'KYC record not found.' });
    }

    const updatedKyc = await prisma.$transaction(async (tx) => {
      const record = await tx.kyc.update({
        where: { id: kycId },
        data: {
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          reviewedBy: req.user.id,
          reviewedAt: new Date()
        }
      });

      if (status === 'APPROVED') {
        await tx.user.update({
          where: { id: kyc.userId },
          data: { isVerified: true }
        });
      } else {
        await tx.user.update({
          where: { id: kyc.userId },
          data: { isVerified: false }
        });
      }

      return record;
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: kyc.userId,
        title: `KYC Verification ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: status === 'APPROVED' 
          ? 'Congratulations! Your identity has been verified. You can now launch campaigns.' 
          : `Your KYC documents were rejected. Reason: "${rejectionReason}". Please re-submit correct details.`,
        type: 'KYC_STATUS',
        redirectUrl: '/profile'
      }
    });

    // Create Audit Log
    await logAdminAction(
      req.user.id, 
      `KYC_${status}`, 
      { kycId, applicantId: kyc.userId, applicantEmail: kyc.user.email, rejectionReason }
    );

    logger.info(`Admin ${req.user.email} reviewed KYC ID: ${kycId}. Status: ${status}`);

    res.status(200).json({
      success: true,
      message: `KYC has been successfully ${status.toLowerCase()}.`,
      kyc: updatedKyc
    });

  } catch (error) {
    next(error);
  }
};

const reviewCampaign = async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const { status } = req.body; // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Campaign status review must be APPROVED or REJECTED.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { creator: true }
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const campaignStatus = status === 'APPROVED' ? 'ACTIVE' : 'REJECTED';

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: campaignStatus }
    });

    // Notify campaign creator
    await prisma.notification.create({
      data: {
        userId: campaign.creatorId,
        title: `Campaign Launch ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: status === 'APPROVED'
          ? `Your campaign "${campaign.title}" is now active and accepting donations!`
          : `Your campaign "${campaign.title}" was rejected by admin review.`,
        type: 'CAMPAIGN_STATUS',
        redirectUrl: `/campaigns/${campaignId}`
      }
    });

    // Create Audit Log
    await logAdminAction(
      req.user.id,
      `CAMPAIGN_${status}`,
      { campaignId, title: campaign.title, creatorId: campaign.creatorId, creatorEmail: campaign.creator.email }
    );

    logger.info(`Admin ${req.user.email} reviewed campaign "${campaign.title}" (ID: ${campaignId}). Status set to: ${campaignStatus}`);

    res.status(200).json({
      success: true,
      message: `Campaign has been ${status.toLowerCase()} and status updated to ${campaignStatus}.`,
      campaign: updatedCampaign
    });

  } catch (error) {
    next(error);
  }
};

const handleReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { action } = req.body; // RESOLVED or DISMISSED

    if (!['RESOLVED', 'DISMISSED'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Report action must be RESOLVED or DISMISSED.' });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { campaign: true }
    });

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report record not found.' });
    }

    const reportStatus = action === 'RESOLVED' ? 'RESOLVED' : 'DISMISSED';

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: reportId },
        data: {
          status: reportStatus,
          resolvedAt: new Date()
        }
      });

      // If dismissed, decrement fraud flags count since it's a false report
      if (action === 'DISMISSED') {
        await tx.campaign.update({
          where: { id: report.campaignId },
          data: {
            fraudFlagsCount: {
              decrement: 1
            }
          }
        });
      }
    });

    // Create Audit Log
    await logAdminAction(
      req.user.id,
      `REPORT_${action}`,
      { reportId, campaignId: report.campaignId, campaignTitle: report.campaign.title }
    );

    logger.info(`Admin ${req.user.email} handled report ID: ${reportId}. Action: ${action}`);

    res.status(200).json({
      success: true,
      message: `Report has been successfully ${action.toLowerCase()}.`
    });

  } catch (error) {
    next(error);
  }
};

const toggleUserSuspension = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot suspend your own admin account.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const newSuspensionState = !user.isSuspended;

    await prisma.user.update({
      where: { id: userId },
      data: { isSuspended: newSuspensionState }
    });

    // Create Audit Log
    await logAdminAction(
      req.user.id,
      newSuspensionState ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
      { userId, targetEmail: user.email }
    );

    logger.warn(`Admin ${req.user.email} toggled suspension for user ${user.email}. New state: ${newSuspensionState}`);

    res.status(200).json({
      success: true,
      message: `User account has been successfully ${newSuspensionState ? 'suspended' : 'unsuspended'}.`,
      isSuspended: newSuspensionState
    });

  } catch (error) {
    next(error);
  }
};

const getAdminLogs = async (req, res, next) => {
  try {
    const logs = await prisma.adminLog.findMany({
      include: {
        admin: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    next(error);
  }
};

const getAdminDashboardStats = async (req, res, next) => {
  try {
    const usersCount = await prisma.user.count();
    const campaignsCount = await prisma.campaign.count();
    const donationsCount = await prisma.donation.count();

    const donationsSum = await prisma.donation.aggregate({
      _sum: {
        amount: true
      }
    });
    const totalRaised = Number(donationsSum._sum.amount) || 0;

    // Review counts
    const pendingCampaigns = await prisma.campaign.count({ where: { status: 'PENDING' } });
    const pendingKyc = await prisma.kyc.count({ where: { status: 'PENDING' } });
    const pendingReports = await prisma.report.count({ where: { status: 'PENDING' } });

    // Users and campaigns lists
    const users = await prisma.user.findMany({
      include: { kyc: true },
      orderBy: { createdAt: 'desc' }
    });

    const campaigns = await prisma.campaign.findMany({
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const reports = await prisma.report.findMany({
      include: {
        campaign: true,
        reporter: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const kycReviews = await prisma.kyc.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Group monthly donations
    const donationsAll = await prisma.donation.findMany({
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

    const campaignsByStatus = Object.entries(
      campaigns.reduce((acc, campaign) => {
        acc[campaign.status] = (acc[campaign.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    const usersByRole = Object.entries(
      users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Campaign Success Rate calculation
    const now = new Date();
    const completedCampaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          { status: 'COMPLETED' },
          { deadline: { lt: now } }
        ]
      }
    });

    const successfulCampaignsCount = completedCampaigns.filter(
      c => c.status === 'COMPLETED' || Number(c.raisedAmount) >= Number(c.goalAmount)
    ).length;

    const campaignSuccessRate = completedCampaigns.length > 0
      ? Math.round((successfulCampaignsCount / completedCampaigns.length) * 100)
      : 0;

    res.status(200).json({
      success: true,
      stats: {
        usersCount,
        campaignsCount,
        donationsCount,
        totalRaised,
        pendingCampaigns,
        pendingKyc,
        pendingReports,
        campaignSuccessRate
      },
      users,
      campaigns: campaigns.map(c => ({
        ...c,
        raisedAmount: Number(c.raisedAmount),
        goalAmount: Number(c.goalAmount)
      })),
      reports,
      kycReviews,
      monthlyFundraising,
      campaignsByStatus,
      usersByRole
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  reviewKyc,
  reviewCampaign,
  handleReport,
  toggleUserSuspension,
  getAdminLogs,
  getAdminDashboardStats
};
