const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const prisma = require('../config/db');
const logger = require('../config/logger');
const { getUserGamification, refreshUserAchievements } = require('../utils/gamification');

const receiptsDir = path.join(__dirname, '../../receipts');
const certificatesDir = path.join(__dirname, '../../certificates');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const createPdfDocument = async ({ filePath, title, lines, footer }) => {
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    stream.on('finish', resolve);
    stream.on('error', reject);

    doc.pipe(stream);
    doc.fillColor('#0f172a').fontSize(24).text(title, { align: 'center' });
    doc.moveDown();
    doc.rect(50, 110, 500, 2).fill('#3b82f6');
    doc.moveDown(2);
    doc.fillColor('#0f172a').fontSize(12);

    lines.forEach((line) => {
      doc.text(line);
      doc.moveDown(0.5);
    });

    doc.moveDown(2);
    doc.fillColor('#64748b').fontSize(10).text(footer, { align: 'center' });
    doc.end();
  });

  return fs.statSync(filePath).size;
};

const sendPdfFile = ({ res, filePath, fileName, inline = false }) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename=${fileName}`);
  fs.createReadStream(filePath).pipe(res);
};

const donate = async (req, res, next) => {
  try {
    const { campaignId, amount, paymentMethod = 'QR', isAnonymous, paymentReference } = req.body;
    const donorId = req.user.id;

    if (!campaignId || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required donation parameters.' });
    }

    const donationAmount = Number(amount);
    if (isNaN(donationAmount) || donationAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Donation amount must be a positive number.' });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { creator: true }
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    if (campaign.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'This campaign is not active or accepting donations.' });
    }

    if (new Date(campaign.deadline) < new Date()) {
      return res.status(400).json({ success: false, error: 'This campaign has expired.' });
    }

    const transactionId = paymentReference || ('TXN-' + Date.now() + '-' + Math.round(Math.random() * 1e5));
    const receiptNo = 'REC-' + Date.now() + '-' + Math.round(Math.random() * 1e5);
    const certificateNo = 'CERT-' + Date.now() + '-' + Math.round(Math.random() * 1e5);

    ensureDir(receiptsDir);
    ensureDir(certificatesDir);

    const pdfPath = `receipts/${receiptNo}.pdf`;
    const fullPdfPath = path.join(__dirname, '../../', pdfPath);
    const certificatePath = `certificates/${certificateNo}.pdf`;
    const fullCertificatePath = path.join(__dirname, '../../', certificatePath);

    const result = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.create({
        data: {
          amount: donationAmount,
          isAnonymous: !!isAnonymous,
          campaignId,
          donorId
        }
      });

      const payment = await tx.payment.create({
        data: {
          donationId: donation.id,
          paymentMethod,
          transactionId,
          paymentStatus: 'SUCCESS',
          amount: donationAmount,
          paidAt: new Date()
        }
      });

      const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          raisedAmount: {
            increment: donationAmount
          }
        }
      });

      if (Number(updatedCampaign.raisedAmount) >= Number(updatedCampaign.goalAmount) && updatedCampaign.status === 'ACTIVE') {
        await tx.campaign.update({
          where: { id: campaignId },
          data: {
            status: 'COMPLETED'
          }
        });

        await tx.notification.create({
          data: {
            userId: campaign.creatorId,
            title: 'Campaign Goal Achieved!',
            message: `Congratulations! Your campaign "${campaign.title}" has reached its funding goal.`,
            type: 'CAMPAIGN_STATUS',
            redirectUrl: `/campaigns/${campaign.id}`
          }
        });
      }

      return { donation, payment };
    });

    const receiptSize = await createPdfDocument({
      filePath: fullPdfPath,
      title: 'Contribution Receipt',
      lines: [
        `Receipt Number: ${receiptNo}`,
        `Transaction ID: ${transactionId}`,
        `Date: ${new Date().toLocaleDateString()}`,
        `Campaign: ${campaign.title}`,
        `Creator: ${campaign.creator.name}`,
        `Contributor: ${isAnonymous ? 'Anonymous Donor' : req.user.name}`,
        `Amount: $${donationAmount.toFixed(2)}`,
        `Payment Method: ${paymentMethod}`
      ],
      footer: 'This is a computer-generated contribution receipt.'
    });

    const certificateSize = await createPdfDocument({
      filePath: fullCertificatePath,
      title: 'Contribution Certificate',
      lines: [
        `Certificate Number: ${certificateNo}`,
        `Awarded To: ${req.user.name}`,
        `Campaign: ${campaign.title}`,
        `Amount: $${donationAmount.toFixed(2)}`,
        `Contribution Date: ${new Date().toLocaleDateString()}`,
        'This certificate confirms a successful contribution to the campaign.'
      ],
      footer: 'Generated automatically after successful QR contribution.'
    });

    const receipt = await prisma.receipt.create({
      data: {
        donationId: result.donation.id,
        receiptNo,
        pdfPath,
        fileSize: receiptSize
      }
    });

    const certificate = await prisma.contributionCertificate.create({
      data: {
        donationId: result.donation.id,
        certificateNo,
        pdfPath: certificatePath,
        fileSize: certificateSize
      }
    });

    await prisma.notification.create({
      data: {
        userId: campaign.creatorId,
        title: 'Donation Received!',
        message: `Your campaign "${campaign.title}" received a donation of $${donationAmount.toFixed(2)}.`,
        type: 'DONATION_RECEIVED',
        redirectUrl: `/campaigns/${campaign.id}`
      }
    });

    await refreshUserAchievements(donorId);
    const gamification = await getUserGamification(donorId);

    logger.info(`Donation of $${donationAmount} completed by Donor ID: ${donorId} on Campaign ID: ${campaignId}`);

    res.status(201).json({
      success: true,
      message: 'QR contribution processed successfully.',
      donation: {
        ...result.donation,
        amount: Number(result.donation.amount)
      },
      receipt,
      certificate,
      gamification
    });

  } catch (error) {
    next(error);
  }
};

const getMyDonationHistory = async (req, res, next) => {
  try {
    const donations = await prisma.donation.findMany({
      where: { donorId: req.user.id },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            status: true
          }
        },
        receipt: true,
        payment: true,
        certificate: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      donations: donations.map(d => ({
        ...d,
        amount: Number(d.amount),
        payment: d.payment ? { ...d.payment, amount: Number(d.payment.amount) } : null
      }))
    });
  } catch (error) {
    next(error);
  }
};

const getReceiptRecord = async (receiptId) => prisma.receipt.findUnique({
  where: { id: receiptId },
  include: {
    donation: {
      include: {
        donor: true,
        campaign: {
          select: { creatorId: true }
        }
      }
    }
  }
});

const canAccessDonationFile = (donation, user) =>
  donation.donorId === user.id ||
  user.role === 'ADMIN' ||
  donation.campaign?.creatorId === user.id;

const downloadReceipt = async (req, res, next) => {
  try {
    const { receiptId } = req.params;
    const inline = req.query.inline === 'true';

    const receipt = await getReceiptRecord(receiptId);

    if (!receipt) {
      return res.status(404).json({ success: false, error: 'Receipt not found.' });
    }

    // Verify user owns this receipt, is an admin, or is the creator of the
    // campaign the donation was made to.
    if (!canAccessDonationFile(receipt.donation, req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized to download this receipt.' });
    }

    const fullPdfPath = path.join(__dirname, '../../', receipt.pdfPath);

    if (!fs.existsSync(fullPdfPath)) {
      return res.status(404).json({ success: false, error: 'Receipt PDF file is missing on disk.' });
    }

    sendPdfFile({
      res,
      filePath: fullPdfPath,
      fileName: `${receipt.receiptNo}.pdf`,
      inline
    });

  } catch (error) {
    next(error);
  }
};

const downloadCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const inline = req.query.inline === 'true';

    const certificate = await prisma.contributionCertificate.findUnique({
      where: { id: certificateId },
      include: {
        donation: {
          include: {
            donor: true,
            campaign: {
              select: { creatorId: true }
            }
          }
        }
      }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: 'Certificate not found.' });
    }

    if (!canAccessDonationFile(certificate.donation, req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized to download this certificate.' });
    }

    const fullPdfPath = path.join(__dirname, '../../', certificate.pdfPath);
    if (!fs.existsSync(fullPdfPath)) {
      return res.status(404).json({ success: false, error: 'Certificate PDF file is missing on disk.' });
    }

    sendPdfFile({
      res,
      filePath: fullPdfPath,
      fileName: `${certificate.certificateNo}.pdf`,
      inline
    });
  } catch (error) {
    next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const monthlyStart = new Date();
    monthlyStart.setDate(1);
    monthlyStart.setHours(0, 0, 0, 0);

    const buildDonorRankings = async (where = {}) => {
      const topDonors = await prisma.donation.groupBy({
        by: ['donorId'],
        where,
        _sum: {
          amount: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            amount: 'desc'
          }
        },
        take: 30
      });

      return Promise.all(topDonors.map(async (item) => {
        const user = await prisma.user.findUnique({
          where: { id: item.donorId },
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        });

        if (!user) {
          return null;
        }

        const gamification = await getUserGamification(user.id);

        return {
          user,
          totalDonated: Number(item._sum.amount),
          donationsCount: item._count.id,
          level: gamification?.level || 1,
          title: gamification?.title || 'Supporter',
          xp: gamification?.xp || 0,
          badgesCount: gamification?.badgesCount || 0
        };
      }));
    };

    const buildCreatorRankings = async (where = {}) => {
      const topCreators = await prisma.campaign.groupBy({
        by: ['creatorId'],
        where,
        _sum: {
          raisedAmount: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            raisedAmount: 'desc'
          }
        },
        take: 30
      });

      return Promise.all(topCreators.map(async (item) => {
        const user = await prisma.user.findUnique({
          where: { id: item.creatorId },
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        });

        if (!user) {
          return null;
        }

        const gamification = await getUserGamification(user.id);

        return {
          user,
          totalRaised: Number(item._sum.raisedAmount),
          campaignsCount: item._count.id,
          level: gamification?.level || 1,
          title: gamification?.title || 'Creator',
          xp: gamification?.xp || 0,
          badgesCount: gamification?.badgesCount || 0
        };
      }));
    };

    const buildCampaignRankings = async (where = {}) => {
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
          _count: {
            select: {
              donations: true,
              likes: true
            }
          }
        },
        orderBy: [
          { raisedAmount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 30
      });

      const shareCounts = await prisma.campaignShare.groupBy({
        by: ['campaignId'],
        where: {
          campaignId: {
            in: campaigns.map((campaign) => campaign.id)
          }
        },
        _count: {
          id: true
        }
      });

      const shareCountMap = new Map(
        shareCounts.map((item) => [item.campaignId, item._count.id])
      );

      return campaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        imageUrl: campaign.imageUrl,
        status: campaign.status,
        creator: campaign.creator,
        raisedAmount: Number(campaign.raisedAmount),
        goalAmount: Number(campaign.goalAmount),
        donationsCount: campaign._count.donations,
        likesCount: campaign._count.likes,
        sharesCount: shareCountMap.get(campaign.id) || 0
      }));
    };

    const [topDonorsAllTime, topDonorsMonthly, topCreatorsAllTime, topCreatorsMonthly, topCampaignsAllTime, topCampaignsMonthly] = await Promise.all([
      buildDonorRankings(),
      buildDonorRankings({ createdAt: { gte: monthlyStart } }),
      buildCreatorRankings(),
      buildCreatorRankings({ createdAt: { gte: monthlyStart } }),
      buildCampaignRankings(),
      buildCampaignRankings({ createdAt: { gte: monthlyStart } })
    ]);

    res.status(200).json({
      success: true,
      leaderboard: {
        donors: {
          allTime: topDonorsAllTime.filter(Boolean),
          monthly: topDonorsMonthly.filter(Boolean)
        },
        creators: {
          allTime: topCreatorsAllTime.filter(Boolean),
          monthly: topCreatorsMonthly.filter(Boolean)
        },
        campaigns: {
          allTime: topCampaignsAllTime,
          monthly: topCampaignsMonthly
        },
        generatedAt: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  donate,
  getMyDonationHistory,
  downloadReceipt,
  downloadCertificate,
  getLeaderboard
};