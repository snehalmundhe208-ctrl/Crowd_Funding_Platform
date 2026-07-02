const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { refreshUserAchievements } = require('../src/utils/gamification');

const prisma = new PrismaClient();
const uploadsDir = path.join(__dirname, '../uploads');
const receiptsDir = path.join(__dirname, '../receipts');
const certificatesDir = path.join(__dirname, '../certificates');

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0Q8AAAAASUVORK5CYII=';
const tinyJpgBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEA8QEA8QDw8PEA8PDw8QEA8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDQ0NDg0NDisZHxkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//AABEIAAEAAQMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAAAAQID/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAB6gD/xAAXEAADAQAAAAAAAAAAAAAAAAAAAREx/9oACAEBAAEFAg1P/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAwEBPwEf/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPwEf/8QAFxAAAwEAAAAAAAAAAAAAAAAAAAERIf/aAAgBAQAGPwJbP//EABcQAQEBAQAAAAAAAAAAAAAAAAERABH/2gAIAQEAAT8hM0t//9oADAMBAAIAAwAAABCf/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPxB//8QAFxABAQEBAAAAAAAAAAAAAAAAAREAITFhcf/aAAgBAQABPxA8aR6f/9k=';

const creatorNames = [
  'Selena Hart', 'Kai Monroe', 'Ariana Vale', 'Mason Ryder', 'Zendaya Brooks',
  'Leo Sterling', 'Sabrina Cole', 'Theo Legend', 'Dua Sinclair', 'Milo Nova',
  'Luna Vega', 'Roman Blake', 'Billie Winters', 'Julian Star', 'Olivia Quinn',
  'Drake Mercer', 'Isla Phoenix', 'Shawn Navarro', 'Rihanna Knight', 'Finn Halo'
];

const donorNames = [
  'Olivia Grant', 'Ethan Parker', 'Mia Sullivan', 'Liam Brooks', 'Charlotte Reed',
  'Noah Bennett', 'Amelia Ross', 'James Carter', 'Harper Morgan', 'Benjamin Hayes',
  'Evelyn Cooper', 'Lucas Foster', 'Abigail Ward', 'Henry Adams', 'Emily Scott',
  'Alexander Cruz', 'Ella Torres', 'Daniel Kim', 'Scarlett Price', 'Matthew Bell',
  'Grace Phillips', 'Samuel Diaz', 'Victoria Long', 'David Murphy', 'Hannah Cox',
  'Joseph Kelly'
];

const campaignTemplates = [
  { title: 'Starlight XR Glasses', category: 'technology', goal: 180000, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1200', description: 'Lightweight mixed-reality glasses for daily creators and remote teams.' },
  { title: 'Ocean Pulse Smart Fin', category: 'technology', goal: 95000, image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200', description: 'AI-guided swim training fin for elite athletes and casual swimmers.' },
  { title: 'EchoVerse Studio Sessions', category: 'creative-arts', goal: 64000, image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200', description: 'An immersive live-album recording project blending orchestral and electronic sound.' },
  { title: 'City Canopy School Gardens', category: 'community', goal: 42000, image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200', description: 'Building climate-smart rooftop gardens for public school campuses.' },
  { title: 'VitalBand Recovery Sensor', category: 'medical', goal: 125000, image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200', description: 'A recovery wearable for clinics to monitor motion, pain, and rehab adherence.' },
  { title: 'Moonlight Frames', category: 'creative-arts', goal: 58000, image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200', description: 'A short film anthology celebrating migration, memory, and modern cities.' },
  { title: 'Solar Harbor Kits', category: 'community', goal: 73000, image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200', description: 'Portable solar resilience kits for storm-prone coastal neighborhoods.' },
  { title: 'NovaChef Precision Cooker', category: 'technology', goal: 110000, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200', description: 'A smart countertop cooker with chef-grade thermal controls.' },
  { title: 'Open Motion Prosthetic Lab', category: 'medical', goal: 160000, image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200', description: 'Affordable open-source prosthetic development with rapid local fabrication.' },
  { title: 'Aurora Creators Residency', category: 'creative-arts', goal: 47000, image: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1200', description: 'Supporting 12 emerging filmmakers, composers, and digital artists.' },
  { title: 'Green Mile Food Forest', category: 'community', goal: 52000, image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200', description: 'Turning vacant lots into community-run edible landscapes.' },
  { title: 'PulseNote Health Journal', category: 'medical', goal: 68000, image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200', description: 'A guided health journaling system with clinician-ready summaries.' },
  { title: 'Halo Drone Lightshow', category: 'technology', goal: 145000, image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1200', description: 'A compact synchronized drone system for live entertainment and events.' },
  { title: 'Studio North Documentary', category: 'creative-arts', goal: 56000, image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200', description: 'A documentary series profiling makers building clean-energy futures.' },
  { title: 'CareBridge Mobile Clinic', category: 'medical', goal: 172000, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200', description: 'A mobile care unit bringing diagnostics and telehealth to rural areas.' },
  { title: 'Bluebird Literacy Bus', category: 'community', goal: 61000, image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200', description: 'A traveling literacy lab for underserved neighborhoods.' },
  { title: 'Helio Trail Camera', category: 'technology', goal: 88000, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200', description: 'A solar wildlife camera for conservation teams and researchers.' },
  { title: 'Velvet Room Sessions', category: 'creative-arts', goal: 53000, image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200', description: 'A live performance video series with genre-crossing musicians.' },
  { title: 'HeartWay Rehab Pods', category: 'medical', goal: 98000, image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200', description: 'Private modular rehab spaces designed for post-op community recovery.' },
  { title: 'Riverlight Cleanup Fleet', category: 'community', goal: 77000, image: 'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=1200', description: 'Electric cleanup boats and monitoring sensors for urban rivers.' }
];

const rewardTemplates = [
  ['Supporter Access', 'Exclusive updates and supporter wall mention.', 25],
  ['Collector Edition', 'Special edition product or signed creator pack.', 95],
  ['VIP Circle', 'VIP recognition and early insider access.', 250]
];

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeBinaryFile = (fullPath, base64) => {
  ensureDir(path.dirname(fullPath));
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, Buffer.from(base64, 'base64'));
  }
};

const writePdf = async (fullPath, title, lines) => {
  ensureDir(path.dirname(fullPath));
  if (fs.existsSync(fullPath)) {
    return fs.statSync(fullPath).size;
  }

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(fullPath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);
    doc.fontSize(22).text(title, { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(12);
    lines.forEach((line) => {
      doc.text(line);
      doc.moveDown(0.4);
    });
    doc.end();
  });

  return fs.statSync(fullPath).size;
};

const getKycFileName = (index) => {
  const extCycle = ['pdf', 'png', 'jpg', 'jpeg'];
  return `demo-kyc-${index + 1}.${extCycle[index % extCycle.length]}`;
};

const getKycDocumentType = (index) => ['PASSPORT', 'NATIONAL_ID', 'DRIVING_LICENSE'][index % 3];

const getDateOffset = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

async function main() {
  ensureDir(uploadsDir);
  ensureDir(receiptsDir);
  ensureDir(certificatesDir);

  const passwordHash = bcrypt.hashSync('password123', 10);

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    throw new Error('Admin user required before bootstrapping demo data.');
  }

  const categoryMap = {};
  for (const category of [
    { name: 'Technology', slug: 'technology', description: 'Tech gadgets and innovation.' },
    { name: 'Creative Arts', slug: 'creative-arts', description: 'Film, music, and creative productions.' },
    { name: 'Community Projects', slug: 'community', description: 'Neighborhood, climate, and civic projects.' },
    { name: 'Medical & Health', slug: 'medical', description: 'Health access and medical innovation.' }
  ]) {
    categoryMap[category.slug] = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category
    });
  }

  const creators = [];
  for (let i = 0; i < creatorNames.length; i++) {
    const fileName = getKycFileName(i);
    const fullPath = path.join(uploadsDir, fileName);
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.pdf') {
      await writePdf(fullPath, 'Creator Identity Proof', [
        `Creator: ${creatorNames[i]}`,
        `Document: ${getKycDocumentType(i)}`,
        'CrowdFlow verified demo creator proof file.'
      ]);
    } else if (ext === '.png') {
      writeBinaryFile(fullPath, tinyPngBase64);
    } else {
      writeBinaryFile(fullPath, tinyJpgBase64);
    }

    const email = `demo.creator${i + 1}@crowdflow.com`;
    const creator = await prisma.user.upsert({
      where: { email },
      update: {
        name: creatorNames[i],
        role: 'CREATOR',
        isVerified: true,
        avatar: `https://images.unsplash.com/photo-${1510000000000 + i}?w=200&fit=crop&crop=faces`
      },
      create: {
        email,
        passwordHash,
        name: creatorNames[i],
        role: 'CREATOR',
        isVerified: true,
        avatar: `https://images.unsplash.com/photo-${1510000000000 + i}?w=200&fit=crop&crop=faces`
      }
    });

    await prisma.kyc.upsert({
      where: { userId: creator.id },
      update: {
        documentType: getKycDocumentType(i),
        documentUrl: `/uploads/${fileName}`,
        status: 'APPROVED',
        reviewedBy: admin.id,
        reviewedAt: new Date()
      },
      create: {
        userId: creator.id,
        documentType: getKycDocumentType(i),
        documentUrl: `/uploads/${fileName}`,
        status: 'APPROVED',
        reviewedBy: admin.id,
        reviewedAt: new Date()
      }
    });

    creators.push(creator);
  }

  const donors = [];
  for (let i = 0; i < donorNames.length; i++) {
    donors.push(await prisma.user.upsert({
      where: { email: `demo.donor${i + 1}@crowdflow.com` },
      update: {
        name: donorNames[i],
        role: 'DONOR',
        avatar: `https://images.unsplash.com/photo-${1520000000000 + i}?w=200&fit=crop&crop=faces`
      },
      create: {
        email: `demo.donor${i + 1}@crowdflow.com`,
        passwordHash,
        name: donorNames[i],
        role: 'DONOR',
        avatar: `https://images.unsplash.com/photo-${1520000000000 + i}?w=200&fit=crop&crop=faces`
      }
    }));
  }

  const campaigns = [];
  for (let i = 0; i < campaignTemplates.length; i++) {
    const template = campaignTemplates[i];
    const creator = creators[i];
    let campaign = await prisma.campaign.findFirst({
      where: { title: template.title, creatorId: creator.id }
    });

    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: {
          title: template.title,
          description: template.description,
          imageUrl: template.image,
          goalAmount: template.goal,
          raisedAmount: 0,
          deadline: new Date(Date.now() + (35 + i) * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
          creatorId: creator.id,
          categoryId: categoryMap[template.category].id,
          isFeatured: i < 8
        }
      });

      await prisma.rewardTier.createMany({
        data: rewardTemplates.map(([title, description, minAmount], rewardIndex) => ({
          title: `${title} ${rewardIndex + 1}`,
          description,
          minAmount: minAmount + (i * 5),
          campaignId: campaign.id
        }))
      });
    }

    campaigns.push(campaign);
  }

  const donationPlan = [
    9200, 7600, 6500, 6100, 5400, 4800, 4300, 3900, 3500, 3200, 3000, 2800, 2550,
    2300, 2100, 1950, 1800, 1600, 1450, 1300, 1150, 980, 860, 720, 580, 440
  ];

  for (let i = 0; i < donors.length; i++) {
    const donor = donors[i];
    const allTimeAmount = donationPlan[i];
    const monthlyAmount = Math.round(allTimeAmount * 0.45);
    const historicalAmount = allTimeAmount - monthlyAmount;
    const campaignA = campaigns[i % campaigns.length];
    const campaignB = campaigns[(i + 7) % campaigns.length];

    for (const [slot, amount, createdAt, campaign] of [
      ['M', monthlyAmount, getDateOffset((i % 9) + 1), campaignA],
      ['A', historicalAmount, getDateOffset(40 + (i % 18)), campaignB]
    ]) {
      const transactionId = `DEMO-TXN-${i + 1}-${slot}`;
      const existingPayment = await prisma.payment.findUnique({ where: { transactionId } });
      if (existingPayment) continue;

      const receiptNo = `DEMO-REC-${i + 1}-${slot}`;
      const certificateNo = `DEMO-CERT-${i + 1}-${slot}`;
      const receiptPath = path.join(receiptsDir, `${receiptNo}.pdf`);
      const certificatePath = path.join(certificatesDir, `${certificateNo}.pdf`);
      const receiptSize = await writePdf(receiptPath, 'CrowdFlow Receipt', [
        `Receipt: ${receiptNo}`,
        `Donor: ${donor.name}`,
        `Campaign: ${campaign.title}`,
        `Amount: $${amount.toFixed(2)}`
      ]);
      const certificateSize = await writePdf(certificatePath, 'CrowdFlow Donation Certificate', [
        `Certificate: ${certificateNo}`,
        `Awarded to: ${donor.name}`,
        `Campaign: ${campaign.title}`,
        `Amount: $${amount.toFixed(2)}`
      ]);

      await prisma.donation.create({
        data: {
          amount,
          isAnonymous: i % 7 === 0 && slot === 'A',
          campaignId: campaign.id,
          donorId: donor.id,
          createdAt,
          payment: {
            create: {
              paymentMethod: slot === 'M' ? 'QR' : 'CARD',
              transactionId,
              paymentStatus: 'SUCCESS',
              amount,
              paidAt: createdAt,
              createdAt
            }
          },
          receipt: {
            create: {
              receiptNo,
              pdfPath: `receipts/${receiptNo}.pdf`,
              fileSize: receiptSize,
              createdAt
            }
          },
          certificate: {
            create: {
              certificateNo,
              pdfPath: `certificates/${certificateNo}.pdf`,
              fileSize: certificateSize,
              createdAt
            }
          }
        }
      });
    }
  }

  for (let i = 0; i < donors.length; i++) {
    const donor = donors[i];
    const followedCreatorIndexes = [i, i + 5, i + 9].map((value) => value % creators.length);
    for (const creatorIndex of followedCreatorIndexes) {
      const creator = creators[creatorIndex];
      await prisma.follow.upsert({
        where: {
          followerId_creatorId: {
            followerId: donor.id,
            creatorId: creator.id
          }
        },
        update: {},
        create: {
          followerId: donor.id,
          creatorId: creator.id
        }
      });
    }

    const campaign = campaigns[i % campaigns.length];
    const likedCampaignIndexes = [i, i + 4].map((value) => value % campaigns.length);
    for (const campaignIndex of likedCampaignIndexes) {
      await prisma.like.upsert({
        where: {
          campaignId_userId: {
            campaignId: campaigns[campaignIndex].id,
            userId: donor.id
          }
        },
        update: {},
        create: {
          campaignId: campaigns[campaignIndex].id,
          userId: donor.id
        }
      });
    }

    if (i < 20) {
      await prisma.bookmark.upsert({
        where: {
          campaignId_userId: {
            campaignId: campaigns[(i + 3) % campaigns.length].id,
            userId: donor.id
          }
        },
        update: {},
        create: {
          campaignId: campaigns[(i + 3) % campaigns.length].id,
          userId: donor.id
        }
      });

      await prisma.bookmark.upsert({
        where: {
          campaignId_userId: {
            campaignId: campaigns[(i + 8) % campaigns.length].id,
            userId: donor.id
          }
        },
        update: {},
        create: {
          campaignId: campaigns[(i + 8) % campaigns.length].id,
          userId: donor.id
        }
      });
    }

    const sharePlans = [
      [campaigns[i % campaigns.length], i % 2 === 0 ? 'copy_link' : 'native_share'],
      [campaigns[(i + 6) % campaigns.length], 'social_story']
    ];
    for (const [shareCampaign, channel] of sharePlans) {
      const shareExists = await prisma.campaignShare.findFirst({
        where: {
          campaignId: shareCampaign.id,
          userId: donor.id,
          channel
        }
      });
      if (!shareExists) {
        await prisma.campaignShare.create({
          data: {
            campaignId: shareCampaign.id,
            userId: donor.id,
            channel,
            createdAt: getDateOffset((i % 10) + 1)
          }
        });
      }
    }

    const commentContent = `Backed this because ${campaign.title.toLowerCase()} feels like a real-world win for the community.`;
    const existingComment = await prisma.comment.findFirst({
      where: {
        campaignId: campaign.id,
        userId: donor.id,
        content: commentContent
      }
    });
    if (!existingComment && i < 20) {
      const comment = await prisma.comment.create({
        data: {
          campaignId: campaign.id,
          userId: donor.id,
          content: commentContent,
          createdAt: getDateOffset((i % 12) + 1)
        }
      });

      if (i < 10) {
        await prisma.comment.create({
          data: {
            campaignId: campaign.id,
            userId: creators[i % creators.length].id,
            parentId: comment.id,
            content: 'Thank you for backing this. We are shipping the next milestone update soon.',
            createdAt: getDateOffset(i % 5)
          }
        });
      }
    }
  }

  for (let i = 0; i < campaigns.length; i++) {
    const updateTitle = `Milestone ${i + 1}: production update`;
    const existingUpdate = await prisma.campaignUpdate.findFirst({
      where: { campaignId: campaigns[i].id, title: updateTitle }
    });
    if (!existingUpdate) {
      await prisma.campaignUpdate.create({
        data: {
          campaignId: campaigns[i].id,
          title: updateTitle,
          content: 'Prototype reviews, supplier confirmations, and community feedback all remain on track.',
          createdAt: getDateOffset((i % 8) + 2)
        }
      });
    }
  }

  for (let i = 0; i < donors.length; i++) {
    const donor = donors[i];
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: donor.id,
        title: 'Your donor dashboard is live'
      }
    });
    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          userId: donor.id,
          title: 'Your donor dashboard is live',
          message: 'Track certificates, badges, followed creators, and contribution milestones here.',
          type: 'SYSTEM'
        }
      });
    }
  }

  for (const campaign of campaigns) {
    const raised = await prisma.donation.aggregate({
      where: { campaignId: campaign.id },
      _sum: { amount: true },
      _count: { id: true }
    });
    const totalRaised = Number(raised._sum.amount || 0);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        raisedAmount: totalRaised,
        status: totalRaised >= Number(campaign.goalAmount) ? 'COMPLETED' : 'ACTIVE'
      }
    });
  }

  for (const user of [...donors, ...creators]) {
    await refreshUserAchievements(user.id);
  }

  console.log(`Demo bootstrap complete: ${creators.length} creators, ${donors.length} donors, ${campaigns.length} campaigns.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
