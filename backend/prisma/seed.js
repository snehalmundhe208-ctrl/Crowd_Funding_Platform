const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

const receiptsDir = path.join(__dirname, '../receipts');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const createSeedReceiptPdf = async (receiptNo, campaignTitle, donorName, amount) => {
  ensureDir(receiptsDir);
  const fullPath = path.join(receiptsDir, `${receiptNo}.pdf`);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(fullPath);

    stream.on('finish', resolve);
    stream.on('error', reject);

    doc.pipe(stream);
    doc.fontSize(20).text('CrowdFlow Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt Number: ${receiptNo}`);
    doc.text(`Campaign: ${campaignTitle}`);
    doc.text(`Donor: ${donorName}`);
    doc.text(`Amount: $${Number(amount).toFixed(2)}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.end();
  });

  return fs.statSync(fullPath).size;
};

async function main() {
  console.log('Clearing database...');
  ensureDir(receiptsDir);
  
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.campaignUpdate.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.rewardTier.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.category.deleteMany();
  await prisma.kyc.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding data...');

  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);

  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@crowdflow.com',
      passwordHash: defaultPasswordHash,
      name: 'Sarah Connor',
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      isVerified: true
    }
  });


  const creator1 = await prisma.user.create({
    data: {
      email: 'creator1@crowdflow.com',
      passwordHash: defaultPasswordHash,
      name: 'Alex Rivera',
      role: 'CREATOR',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isVerified: true,
      kyc: {
        create: {
          documentType: 'PASSPORT',
          documentUrl: '/uploads/kyc_passport_alex.pdf',
          status: 'APPROVED',
          reviewedBy: adminUser.id,
          reviewedAt: new Date()
        }
      }
    }
  });

  const creator2 = await prisma.user.create({
    data: {
      email: 'creator2@crowdflow.com',
      passwordHash: defaultPasswordHash,
      name: 'Marcus Chen',
      role: 'CREATOR',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isVerified: true,
      kyc: {
        create: {
          documentType: 'NATIONAL_ID',
          documentUrl: '/uploads/kyc_id_marcus.pdf',
          status: 'APPROVED',
          reviewedBy: adminUser.id,
          reviewedAt: new Date()
        }
      }
    }
  });

  const creator3 = await prisma.user.create({
    data: {
      email: 'creator3@crowdflow.com',
      passwordHash: defaultPasswordHash,
      name: 'Elena Rostova',
      role: 'CREATOR',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      isVerified: false,
      kyc: {
        create: {
          documentType: 'DRIVING_LICENSE',
          documentUrl: '/uploads/kyc_lic_elena.pdf',
          status: 'PENDING'
        }
      }
    }
  });

 
  const donorNames = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Robert Miller', 'Emily Davis'];
  const donors = [];
  for (let i = 0; i < donorNames.length; i++) {
    const donor = await prisma.user.create({
      data: {
        email: `donor${i + 1}@crowdflow.com`,
        passwordHash: defaultPasswordHash,
        name: donorNames[i],
        role: 'DONOR',
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&sig=${i}`,
        isVerified: false
      }
    });
    donors.push(donor);
  }


  const categoryNames = [
    { name: 'Technology', slug: 'technology', description: 'Tech gadgets, hardware, software, and innovative designs.' },
    { name: 'Creative Arts', slug: 'creative-arts', description: 'Films, music albums, books, design, and physical visual art.' },
    { name: 'Community Projects', slug: 'community', description: 'Local campaigns, parks, public support and charity causes.' },
    { name: 'Medical & Health', slug: 'medical', description: 'Healthcare access, treatments support, and medical innovations.' }
  ];

  const categories = [];
  for (const cat of categoryNames) {
    const category = await prisma.category.create({
      data: cat
    });
    categories.push(category);
  }

 
  const campaign1 = await prisma.campaign.create({
    data: {
      title: 'AeroRing: The Ultimate Minimalist Smart Ring',
      description: 'Track your health, manage device gestures, and make secure transactions directly from your finger. AeroRing is crafted with carbon titanium, lasts 8 days on a single charge, and syncs seamlessly across iOS and Android platforms.',
      imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800',
      goalAmount: 25000.00,
      raisedAmount: 18500.00,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
      status: 'ACTIVE',
      creatorId: creator1.id,
      categoryId: categories[0].id,
      isFeatured: true,
      rewards: {
        create: [
          { title: 'Super Early Bird Ring', description: 'Get AeroRing in titanium black at 40% off retail value.', minAmount: 120.00 },
          { title: 'Early Bird Pack', description: 'Get AeroRing plus a wireless travel charger hub.', minAmount: 150.00 },
          { title: 'Duo Companion Set', description: 'Two AeroRings of any size. Perfect for couples.', minAmount: 260.00 }
        ]
      }
    }
  });

  
  const campaign2 = await prisma.campaign.create({
    data: {
      title: 'Urban Oasis: Green Rooftop Community Gardens',
      description: 'Transforming underutilized concrete rooftops in urban neighborhoods into blooming organic vegetable patches and honeybee sanctuaries. Funds go towards initial waterproofing layers, organic soil bins, seed packages, and community composting systems.',
      imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800',
      goalAmount: 10000.00,
      raisedAmount: 9200.00,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 
      status: 'ACTIVE',
      creatorId: creator2.id,
      categoryId: categories[2].id,
      isFeatured: false,
      rewards: {
        create: [
          { title: 'Green Sponsor Badge', description: 'Name engraved on the central wall planter box.', minAmount: 25.00 },
          { title: 'Urban Garden Kit', description: 'Organic seed starter pack containing custom herbs.', minAmount: 60.00 },
          { title: 'Rooftop Gala Ticket', description: 'VIP invite to our rooftop opening dinner & fresh harvest.', minAmount: 150.00 }
        ]
      }
    }
  });

 
  const campaign3 = await prisma.campaign.create({
    data: {
      title: 'Whispering Winds: A Cinematic Anthology Film',
      description: 'A visual exploration of isolated lives across rural borders, woven together by wind-focused ambient soundscapes. Shot entirely on anamorphic 16mm film.',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
      goalAmount: 15000.00,
      raisedAmount: 0.00,
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      creatorId: creator3.id,
      categoryId: categories[1].id,
      isFeatured: false,
      rewards: {
        create: [
          { title: 'Digital Stream Copy', description: 'Early digital screening copy of the completed film.', minAmount: 15.00 },
          { title: 'Behind the Scenes Photobook', description: 'Physical linen-bound film print set.', minAmount: 50.00 },
          { title: 'Associate Producer Credit', description: 'Screen name listing on the closing credits scroll.', minAmount: 300.00 }
        ]
      }
    }
  });

  const campaign4 = await prisma.campaign.create({
    data: {
      title: 'OpenHand: Accessible High-Precision Prosthetics',
      description: 'Developing affordable, open-source 3D-printable bionic arms with custom haptic feedback nodes. Designed to make high-dexterity prostheses affordable for low-income families worldwide.',
      imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800',
      goalAmount: 40000.00,
      raisedAmount: 41200.00, 
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 
      status: 'COMPLETED',
      creatorId: creator1.id,
      categoryId: categories[3].id,
      isFeatured: true,
      rewards: {
        create: [
          { title: 'OpenHand Supporter', description: 'Monthly project development email summaries.', minAmount: 10.00 },
          { title: 'Sponsor a Hand Assembly', description: 'Covers printing costs for a children-sized OpenHand kit.', minAmount: 200.00 },
          { title: 'Adopt-A-Device Program', description: 'Name engraved on a customized bionic arm.', minAmount: 500.00 }
        ]
      }
    }
  });


  const firstContributionBadge = await prisma.badge.create({
    data: {
      name: 'First Contribution',
      description: 'Made their very first donation on the platform.',
      icon: 'heart'
    }
  });

  const superDonorBadge = await prisma.badge.create({
    data: {
      name: 'Super Donor',
      description: 'Contributed $1,000 or more in a single donation.',
      icon: 'shield'
    }
  });

  const philanthropistBadge = await prisma.badge.create({
    data: {
      name: 'Philanthropist',
      description: 'Supported 5 or more campaigns.',
      icon: 'award'
    }
  });

  
  const rec1Size = await createSeedReceiptPdf('REC-SEED-001', campaign1.title, donors[0].name, 1000);
  const rec2Size = await createSeedReceiptPdf('REC-SEED-002', campaign1.title, 'Anonymous Donor', 250);
  const rec3Size = await createSeedReceiptPdf('REC-SEED-003', campaign2.title, donors[2].name, 5000);

  
  const don1 = await prisma.donation.create({
    data: {
      amount: 1000.00,
      isAnonymous: false,
      campaignId: campaign1.id,
      donorId: donors[0].id,
      payment: {
        create: {
          paymentMethod: 'CARD',
          transactionId: 'TXN-SEED-001',
          paymentStatus: 'SUCCESS',
          amount: 1000.00,
          paidAt: new Date()
        }
      },
      receipt: {
        create: {
          receiptNo: 'REC-SEED-001',
          pdfPath: 'receipts/REC-SEED-001.pdf',
          fileSize: rec1Size
        }
      }
    }
  });
  await prisma.userBadge.create({
    data: { userId: donors[0].id, badgeId: firstContributionBadge.id }
  });
  await prisma.userBadge.create({
    data: { userId: donors[0].id, badgeId: superDonorBadge.id }
  });

 
  const don2 = await prisma.donation.create({
    data: {
      amount: 250.00,
      isAnonymous: true,
      campaignId: campaign1.id,
      donorId: donors[1].id,
      payment: {
        create: {
          paymentMethod: 'UPI',
          transactionId: 'TXN-SEED-002',
          paymentStatus: 'SUCCESS',
          amount: 250.00,
          paidAt: new Date()
        }
      },
      receipt: {
        create: {
          receiptNo: 'REC-SEED-002',
          pdfPath: 'receipts/REC-SEED-002.pdf',
          fileSize: rec2Size
        }
      }
    }
  });
  await prisma.userBadge.create({
    data: { userId: donors[1].id, badgeId: firstContributionBadge.id }
  });

 
  const don3 = await prisma.donation.create({
    data: {
      amount: 5000.00,
      isAnonymous: false,
      campaignId: campaign2.id,
      donorId: donors[2].id,
      payment: {
        create: {
          paymentMethod: 'CARD',
          transactionId: 'TXN-SEED-003',
          paymentStatus: 'SUCCESS',
          amount: 5000.00,
          paidAt: new Date()
        }
      },
      receipt: {
        create: {
          receiptNo: 'REC-SEED-003',
          pdfPath: 'receipts/REC-SEED-003.pdf',
          fileSize: rec3Size
        }
      }
    }
  });
  await prisma.userBadge.create({
    data: { userId: donors[2].id, badgeId: firstContributionBadge.id }
  });
  await prisma.userBadge.create({
    data: { userId: donors[2].id, badgeId: superDonorBadge.id }
  });


  await prisma.follow.create({
    data: { followerId: donors[0].id, creatorId: creator1.id }
  });
  await prisma.follow.create({
    data: { followerId: donors[1].id, creatorId: creator1.id }
  });


  await prisma.comment.create({
    data: {
      content: 'This smart ring is exactly what the biohacking community has been waiting for. Supported!',
      campaignId: campaign1.id,
      userId: donors[0].id
    }
  });

  await prisma.comment.create({
    data: {
      content: 'Amazing progress, can we choose ring sizing custom charts after order?',
      campaignId: campaign1.id,
      userId: donors[1].id
    }
  });

  await prisma.like.create({
    data: { campaignId: campaign1.id, userId: donors[0].id }
  });
  await prisma.like.create({
    data: { campaignId: campaign1.id, userId: donors[1].id }
  });


  await prisma.campaignUpdate.create({
    data: {
      title: 'AeroRing Carbon Mold Testing: Complete Success',
      content: 'We just wrapped up our physical stress tests on the first batch of carbon composite molds. The structural yields are exceeding target tolerances by 15%, ensuring maximum durability.',
      campaignId: campaign1.id
    }
  });


  await prisma.notification.create({
    data: {
      userId: creator1.id,
      title: 'New Donation Received',
      message: 'Alex, your AeroRing campaign received a donation of $1,000.00.',
      type: 'DONATION_RECEIVED',
      redirectUrl: `/campaigns/${campaign1.id}`
    }
  });

  await prisma.notification.create({
    data: {
      userId: donors[0].id,
      title: 'Welcome to CrowdFlow',
      message: 'Thank you John, explore campaigns to start supporting creators!',
      type: 'SYSTEM'
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
