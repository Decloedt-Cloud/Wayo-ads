import { PrismaClient, CampaignStatus, ApplicationStatus, AssetType, AttributionModel, BusinessType, SocialPlatform, CreatorTier, PayoutMode, PacingMode, DynamicCpmMode, RiskLevel, LedgerEntryType, WithdrawalStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with golden image data...');

  // Clean existing data - delete in correct order due to foreign key constraints
  await prisma.creatorBusinessProfile.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.creatorBalance.deleteMany();
  await prisma.campaignBudgetLock.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.payoutLedger.deleteMany();
  await prisma.conversionEvent.deleteMany();
  await prisma.visitEvent.deleteMany();
  await prisma.creatorTrackingLink.deleteMany();
  await prisma.campaignApplication.deleteMany();
  await prisma.campaignAsset.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.platformSettings.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.creatorChannel.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.payoutQueue.deleteMany();
  await prisma.creatorTrafficMetrics.deleteMany();
  await prisma.emailPreferences.deleteMany();

  console.log('✅ Cleaned existing data');

  // ============================================
  // CREATE ADVERTISERS (Business Accounts)
  // ============================================

  // 1. TechStart GmbH - German SaaS Startup
  const advertiser1 = await prisma.user.create({
    data: {
      id: 'user_adv_techstart',
      email: 'marketing@techstart.de',
      name: 'TechStart GmbH',
      roles: 'USER,ADVERTISER',
      image: 'https://api.dicebear.com/7.x/building/svg?seed=techstart',
    },
  });
  console.log('✅ Created advertiser: TechStart GmbH');

  // Create wallet for TechStart with €10,000
  const wallet1 = await prisma.wallet.create({
    data: {
      id: 'wallet_techstart',
      ownerUserId: advertiser1.id,
      currency: 'EUR',
      availableCents: 1000000,
      pendingCents: 0,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_deposit_techstart_1',
      walletId: wallet1.id,
      type: 'DEPOSIT',
      amountCents: 1000000,
      currency: 'EUR',
      referenceType: 'STRIPE_DEPOSIT',
      referenceId: 'pi_techstart_001',
      description: 'Initial deposit via Stripe',
    },
  });
  console.log('✅ Created wallet for TechStart: €10,000');

  // 2. FashionForward SAS - French Fashion Brand
  const advertiser2 = await prisma.user.create({
    data: {
      id: 'user_adv_fashion',
      email: 'collab@fashionforward.fr',
      name: 'FashionForward SAS',
      roles: 'USER,ADVERTISER',
      image: 'https://api.dicebear.com/7.x/building/svg?seed=fashionforward',
    },
  });
  console.log('✅ Created advertiser: FashionForward SAS');

  const wallet2 = await prisma.wallet.create({
    data: {
      id: 'wallet_fashionforward',
      ownerUserId: advertiser2.id,
      currency: 'EUR',
      availableCents: 2500000,
      pendingCents: 0,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_deposit_fashion_1',
      walletId: wallet2.id,
      type: 'DEPOSIT',
      amountCents: 2500000,
      currency: 'EUR',
      referenceType: 'STRIPE_DEPOSIT',
      referenceId: 'pi_fashion_001',
      description: 'Initial deposit via Stripe',
    },
  });
  console.log('✅ Created wallet for FashionForward: €25,000');

  // 3. FoodieApp Ltd - UK Food Delivery
  const advertiser3 = await prisma.user.create({
    data: {
      id: 'user_adv_foodieapp',
      email: 'partnerships@foodieapp.co.uk',
      name: 'FoodieApp Ltd',
      roles: 'USER,ADVERTISER',
      image: 'https://api.dicebear.com/7.x/building/svg?seed=foodieapp',
    },
  });
  console.log('✅ Created advertiser: FoodieApp Ltd');

  const wallet3 = await prisma.wallet.create({
    data: {
      id: 'wallet_foodieapp',
      ownerUserId: advertiser3.id,
      currency: 'EUR',
      availableCents: 500000,
      pendingCents: 0,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_deposit_foodie_1',
      walletId: wallet3.id,
      type: 'DEPOSIT',
      amountCents: 500000,
      currency: 'EUR',
      referenceType: 'STRIPE_DEPOSIT',
      referenceId: 'pi_foodie_001',
      description: 'Initial deposit via Stripe',
    },
  });
  console.log('✅ Created wallet for FoodieApp: €5,000');

  // 4. FitLife Co - US Fitness App
  const advertiser4 = await prisma.user.create({
    data: {
      id: 'user_adv_fitlife',
      email: 'influencer@fitlifeco.com',
      name: 'FitLife Co',
      roles: 'USER,ADVERTISER',
      image: 'https://api.dicebear.com/7.x/building/svg?seed=fitlife',
    },
  });
  console.log('✅ Created advertiser: FitLife Co');

  const wallet4 = await prisma.wallet.create({
    data: {
      id: 'wallet_fitlife',
      ownerUserId: advertiser4.id,
      currency: 'EUR',
      availableCents: 1500000,
      pendingCents: 0,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_deposit_fitlife_1',
      walletId: wallet4.id,
      type: 'DEPOSIT',
      amountCents: 1500000,
      currency: 'EUR',
      referenceType: 'STRIPE_DEPOSIT',
      referenceId: 'pi_fitlife_001',
      description: 'Initial deposit via Stripe',
    },
  });
  console.log('✅ Created wallet for FitLife: €15,000');

  // 5. LearnOnline AB - Swedish EdTech
  const advertiser5 = await prisma.user.create({
    data: {
      id: 'user_adv_learnonline',
      email: 'campaigns@learnonline.se',
      name: 'LearnOnline AB',
      roles: 'USER,ADVERTISER',
      image: 'https://api.dicebear.com/7.x/building/svg?seed=learnonline',
    },
  });
  console.log('✅ Created advertiser: LearnOnline AB');

  const wallet5 = await prisma.wallet.create({
    data: {
      id: 'wallet_learnonline',
      ownerUserId: advertiser5.id,
      currency: 'EUR',
      availableCents: 800000,
      pendingCents: 0,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_deposit_learnonline_1',
      walletId: wallet5.id,
      type: 'DEPOSIT',
      amountCents: 800000,
      currency: 'EUR',
      referenceType: 'STRIPE_DEPOSIT',
      referenceId: 'pi_learnonline_001',
      description: 'Initial deposit via Stripe',
    },
  });
  console.log('✅ Created wallet for LearnOnline: €8,000');

  // 6. Original advertiser (keep for compatibility)
  const originalAdvertiser = await prisma.user.create({
    data: {
      id: 'user_advertiser_1',
      email: 'advertiser@example.com',
      name: 'John Advertiser',
      roles: 'USER,ADVERTISER',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=advertiser',
    },
  });

  const originalWallet = await prisma.wallet.create({
    data: {
      id: 'wallet_advertiser_1',
      ownerUserId: originalAdvertiser.id,
      currency: 'EUR',
      availableCents: 500000,
      pendingCents: 0,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_initial_deposit_1',
      walletId: originalWallet.id,
      type: 'DEPOSIT',
      amountCents: 500000,
      currency: 'EUR',
      referenceType: 'INITIAL_SEED',
      referenceId: 'seed',
      description: 'Initial seed funding for advertiser',
    },
  });
  console.log('✅ Created original advertiser: advertiser@example.com');

  // ============================================
  // CREATE CREATORS
  // ============================================

  // Creator 1 - Sarah (GOLD tier, French)
  const creator1 = await prisma.user.create({
    data: {
      id: 'user_creator_1',
      email: 'creator1@example.com',
      name: 'Sarah Creator',
      roles: 'USER,CREATOR',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator1',
      trustScore: 85,
      tier: CreatorTier.GOLD,
      qualityMultiplier: 1.5,
    },
  });

  await prisma.creatorBusinessProfile.create({
    data: {
      userId: creator1.id,
      businessType: BusinessType.PERSONAL,
      countryCode: 'FR',
    },
  });

  await prisma.creatorChannel.create({
    data: {
      id: 'channel_creator1_youtube',
      userId: creator1.id,
      platform: SocialPlatform.YOUTUBE,
      channelId: 'UC_sarah_lifestyle',
      channelName: 'Sarah Lifestyle',
      channelHandle: '@sarahlifestyle',
      channelAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      videoCount: 250,
      subscriberCount: 150000,
      lifetimeViews: 5000000,
      averageViewsPerVideo: 20000,
      topVideos: [
        { videoId: 'vid_sarah_001', title: 'Day in My Life as a Content Creator', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=vid1', viewCount: 150000 },
        { videoId: 'vid_sarah_002', title: 'My Morning Routine 2024', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=vid2', viewCount: 120000 },
        { videoId: 'vid_sarah_003', title: 'How I Edit My Videos - Full Setup', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=vid3', viewCount: 95000 },
        { videoId: 'vid_sarah_004', title: 'Q&A: Your Questions Answered', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=vid4', viewCount: 75000 },
        { videoId: 'vid_sarah_005', title: 'Behind the Scenes of My Brand Deal', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=vid5', viewCount: 60000 },
      ],
      isPublic: true,
    },
  });

  const balance1 = await prisma.creatorBalance.create({
    data: {
      id: 'creator_balance_1',
      creatorId: creator1.id,
      currency: 'EUR',
      availableCents: 15000,
      pendingCents: 5000,
      totalEarnedCents: 25000,
      riskLevel: RiskLevel.LOW,
      payoutDelayDays: 2,
    },
  });
  console.log('✅ Created creator: Sarah (GOLD tier, 150K subscribers)');

  // Creator 2 - Mike (SILVER tier, German)
  const creator2 = await prisma.user.create({
    data: {
      id: 'user_creator_2',
      email: 'creator2@example.com',
      name: 'Mike Influencer',
      roles: 'USER,CREATOR',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creator2',
      trustScore: 72,
      tier: CreatorTier.SILVER,
      qualityMultiplier: 1.2,
    },
  });

  await prisma.creatorBusinessProfile.create({
    data: {
      userId: creator2.id,
      businessType: BusinessType.SOLE_PROPRIETOR,
      vatNumber: 'DE987654321',
      addressLine1: 'Influencer Allee 42',
      city: 'Berlin',
      postalCode: '10115',
      countryCode: 'DE',
    },
  });

  await prisma.creatorChannel.create({
    data: {
      id: 'channel_creator2_youtube',
      userId: creator2.id,
      platform: SocialPlatform.YOUTUBE,
      channelId: 'UC_mike_tech',
      channelName: 'Mike Tech Reviews',
      channelHandle: '@miketechreviews',
      channelAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
      videoCount: 180,
      subscriberCount: 75000,
      lifetimeViews: 2250000,
      averageViewsPerVideo: 12500,
      topVideos: [
        { videoId: 'vid_mike_001', title: 'iPhone 16 Pro Review - Worth the Upgrade?', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=mk1', viewCount: 85000 },
        { videoId: 'vid_mike_002', title: 'Samsung S24 Ultra vs iPhone 15 Pro Max', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=mk2', viewCount: 72000 },
        { videoId: 'vid_mike_003', title: 'MacBook Pro M3 Review - Complete Guide', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=mk3', viewCount: 55000 },
        { videoId: 'vid_mike_004', title: 'Best Budget Laptops 2024', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=mk4', viewCount: 42000 },
      ],
      isPublic: true,
    },
  });

  await prisma.creatorBalance.create({
    data: {
      id: 'creator_balance_2',
      creatorId: creator2.id,
      currency: 'EUR',
      availableCents: 5000,
      pendingCents: 2500,
      totalEarnedCents: 12000,
      riskLevel: RiskLevel.MEDIUM,
      payoutDelayDays: 5,
    },
  });
  console.log('✅ Created creator: Mike (SILVER tier, 75K subscribers)');

  // Creator 3 - Emma (GOLD tier, UK)
  const creator3 = await prisma.user.create({
    data: {
      id: 'user_creator_3',
      email: 'emma@creator.example',
      name: 'Emma Fitness',
      roles: 'USER,CREATOR',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
      trustScore: 92,
      tier: CreatorTier.GOLD,
      qualityMultiplier: 1.75,
    },
  });

  await prisma.creatorBusinessProfile.create({
    data: {
      userId: creator3.id,
      businessType: BusinessType.REGISTERED_COMPANY,
      companyName: 'Emma Fitness Media Ltd',
      vatNumber: 'GB112233445',
      addressLine1: '45 Fitness Street',
      city: 'London',
      postalCode: 'SW1A 1AA',
      countryCode: 'GB',
    },
  });

  await prisma.creatorChannel.create({
    data: {
      id: 'channel_creator3_youtube',
      userId: creator3.id,
      platform: SocialPlatform.YOUTUBE,
      channelId: 'UC_emma_fitness',
      channelName: 'Emma Fitness',
      channelHandle: '@emmafitness',
      channelAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma2',
      videoCount: 400,
      subscriberCount: 250000,
      lifetimeViews: 12000000,
      averageViewsPerVideo: 30000,
      topVideos: [
        { videoId: 'vid_emma_001', title: '30-Day Full Body Transformation', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=em1', viewCount: 350000 },
        { videoId: 'vid_emma_002', title: 'Home Workout - No Equipment Needed', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=em2', viewCount: 280000 },
        { videoId: 'vid_emma_003', title: 'What I Eat in a Day - Fitness Routine', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=em3', viewCount: 195000 },
        { videoId: 'vid_emma_004', title: 'Morning Stretch Routine for Flexibility', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=em4', viewCount: 150000 },
        { videoId: 'vid_emma_005', title: 'Weight Loss Journey - 1 Year Update', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=em5', viewCount: 125000 },
      ],
      isPublic: true,
    },
  });

  await prisma.creatorBalance.create({
    data: {
      id: 'creator_balance_3',
      creatorId: creator3.id,
      currency: 'EUR',
      availableCents: 45000,
      pendingCents: 15000,
      totalEarnedCents: 120000,
      riskLevel: RiskLevel.LOW,
      payoutDelayDays: 2,
    },
  });
  console.log('✅ Created creator: Emma (GOLD tier, 250K YouTube + 500K TikTok)');

  // Creator 4 - Luca (BRONZE tier, Italian)
  const creator4 = await prisma.user.create({
    data: {
      id: 'user_creator_4',
      email: 'luca@creator.example',
      name: 'Luca Foodie',
      roles: 'USER,CREATOR',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luca',
      trustScore: 55,
      tier: CreatorTier.BRONZE,
      qualityMultiplier: 1.0,
    },
  });

  await prisma.creatorBusinessProfile.create({
    data: {
      userId: creator4.id,
      businessType: BusinessType.PERSONAL,
      countryCode: 'IT',
    },
  });

  await prisma.creatorChannel.create({
    data: {
      id: 'channel_creator4_youtube',
      userId: creator4.id,
      platform: SocialPlatform.YOUTUBE,
      channelId: 'UC_luca_foodie',
      channelName: 'Luca Foodie',
      channelHandle: '@lucafoodie',
      channelAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luca2',
      videoCount: 120,
      subscriberCount: 15000,
      lifetimeViews: 300000,
      averageViewsPerVideo: 2500,
      topVideos: [
        { videoId: 'vid_luca_001', title: 'Best Pasta in Rome - Food Tour', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=lp1', viewCount: 25000 },
        { videoId: 'vid_luca_002', title: 'Making Fresh Pasta from Scratch', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=lp2', viewCount: 18000 },
        { videoId: 'vid_luca_003', title: 'Street Food Guide: Rome', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=lp3', viewCount: 12000 },
      ],
      isPublic: true,
    },
  });

  await prisma.creatorBalance.create({
    data: {
      id: 'creator_balance_4',
      creatorId: creator4.id,
      currency: 'EUR',
      availableCents: 0,
      pendingCents: 0,
      totalEarnedCents: 500,
      riskLevel: RiskLevel.MEDIUM,
      payoutDelayDays: 5,
    },
  });
  console.log('✅ Created creator: Luca (BRONZE tier, 15K Instagram)');

  // Creator 5 - Nina (SILVER tier, Swedish)
  const creator5 = await prisma.user.create({
    data: {
      id: 'user_creator_5',
      email: 'nina@creator.example',
      name: 'Nina Tech',
      roles: 'USER,CREATOR',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nina',
      trustScore: 78,
      tier: CreatorTier.SILVER,
      qualityMultiplier: 1.25,
    },
  });

  await prisma.creatorBusinessProfile.create({
    data: {
      userId: creator5.id,
      businessType: BusinessType.SOLE_PROPRIETOR,
      vatNumber: 'SE556677889',
      addressLine1: 'Techvägen 15',
      city: 'Stockholm',
      postalCode: '112 34',
      countryCode: 'SE',
    },
  });

  await prisma.creatorChannel.create({
    data: {
      id: 'channel_creator5_youtube',
      userId: creator5.id,
      platform: SocialPlatform.YOUTUBE,
      channelId: 'UC_nina_tech',
      channelName: 'Nina Tech',
      channelHandle: '@ninatech',
      channelAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nina2',
      videoCount: 95,
      subscriberCount: 45000,
      lifetimeViews: 900000,
      averageViewsPerVideo: 9500,
      topVideos: [
        { videoId: 'vid_nina_001', title: 'Coding Setup Tour 2024', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=nn1', viewCount: 28000 },
        { videoId: 'vid_nina_002', title: 'Learn React in 1 Hour', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=nn2', viewCount: 22000 },
        { videoId: 'vid_nina_003', title: 'VS Code Extensions I Use', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=nn3', viewCount: 18000 },
      ],
      isPublic: true,
    },
  });

  await prisma.creatorBalance.create({
    data: {
      id: 'creator_balance_5',
      creatorId: creator5.id,
      currency: 'EUR',
      availableCents: 8000,
      pendingCents: 3000,
      totalEarnedCents: 18000,
      riskLevel: RiskLevel.LOW,
      payoutDelayDays: 3,
    },
  });
  console.log('✅ Created creator: Nina (SILVER tier, 45K YouTube)');

  // Creator 6 - Alex (Hybrid - both advertiser and creator)
  const hybridUser = await prisma.user.create({
    data: {
      id: 'user_hybrid_1',
      email: 'hybrid@example.com',
      name: 'Alex Hybrid',
      roles: 'USER,ADVERTISER,CREATOR',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hybrid',
      trustScore: 80,
      tier: CreatorTier.GOLD,
      qualityMultiplier: 1.5,
    },
  });

  await prisma.creatorBusinessProfile.create({
    data: {
      userId: hybridUser.id,
      businessType: BusinessType.REGISTERED_COMPANY,
      companyName: 'Hybrid Media Group Ltd',
      vatNumber: 'GB123456789',
      addressLine1: '123 Tech Lane',
      addressLine2: 'Floor 4',
      city: 'London',
      postalCode: 'EC1A 1BB',
      countryCode: 'GB',
    },
  });

  const hybridWallet = await prisma.wallet.create({
    data: {
      id: 'wallet_hybrid_1',
      ownerUserId: hybridUser.id,
      currency: 'EUR',
      availableCents: 200000,
      pendingCents: 0,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_deposit_hybrid_1',
      walletId: hybridWallet.id,
      type: 'DEPOSIT',
      amountCents: 200000,
      currency: 'EUR',
      referenceType: 'STRIPE_DEPOSIT',
      referenceId: 'pi_hybrid_001',
      description: 'Initial deposit for hybrid user',
    },
  });

  await prisma.creatorBalance.create({
    data: {
      id: 'creator_balance_hybrid',
      creatorId: hybridUser.id,
      currency: 'EUR',
      availableCents: 7500,
      pendingCents: 2500,
      totalEarnedCents: 12000,
      riskLevel: RiskLevel.LOW,
      payoutDelayDays: 2,
    },
  });

  await prisma.creatorChannel.create({
    data: {
      id: 'channel_hybrid_youtube',
      userId: hybridUser.id,
      platform: SocialPlatform.YOUTUBE,
      channelId: 'UC_alex_hybrid',
      channelName: 'Alex Hybrid',
      channelHandle: '@alexhybrid',
      channelAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hybrid2',
      videoCount: 200,
      subscriberCount: 120000,
      lifetimeViews: 4500000,
      averageViewsPerVideo: 22500,
      topVideos: [
        { videoId: 'vid_hybrid_001', title: 'How I Built My Marketing Agency', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=hy1', viewCount: 95000 },
        { videoId: 'vid_hybrid_002', title: 'From Employee to Entrepreneur', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=hy2', viewCount: 78000 },
        { videoId: 'vid_hybrid_003', title: 'My Content Creation Journey', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=hy3', viewCount: 55000 },
        { videoId: 'vid_hybrid_004', title: 'Behind the Scenes: Brand Deals', thumbnailUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=hy4', viewCount: 42000 },
      ],
      isPublic: true,
    },
  });
  console.log('✅ Created hybrid user: Alex (advertiser + creator)');

  // Superadmin
  const superAdmin = await prisma.user.create({
    data: {
      id: 'user_superadmin_1',
      email: 'admin@wayo.ma',
      name: 'Wayo Admin',
      roles: 'USER,SUPERADMIN',
      image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin',
    },
  });
  console.log('✅ Created superadmin: admin@wayo.ma');

  // Platform settings
  await prisma.platformSettings.create({
    data: {
      id: 'platform_settings_1',
      platformFeeRate: 0.03,
      platformFeeDescription: '3% (ex VAT)',
      defaultCurrency: 'EUR',
      minimumWithdrawalCents: 1000,
      pendingHoldDays: 7,
    },
  });
  console.log('✅ Created platform settings');

  // ============================================
  // CREATE CAMPAIGNS (Diverse Scenarios)
  // ============================================

  // Campaign 1: TechStart - Active with budget lock
  const campaign1 = await prisma.campaign.create({
    data: {
      id: 'campaign_techstart_1',
      advertiserId: advertiser1.id,
      title: 'TechStart Pro - SaaS Productivity Tool',
      description: 'Promote our all-in-one project management and collaboration tool for remote teams. Target: startup founders, project managers, and tech professionals.',
      landingUrl: 'https://techstart.de/pro',
      platforms: 'YOUTUBE,INSTAGRAM',
      totalBudgetCents: 1000000,
      cpmCents: 2000,
      spentBudgetCents: 150000,
      status: CampaignStatus.ACTIVE,
      attributionModel: AttributionModel.LAST_CLICK,
      payoutMode: PayoutMode.CPM_STRICT,
      fraudScoreThreshold: 50,
      notes: 'Focus on the productivity benefits and real-world use cases. Show actual dashboard demos if possible.',
      dynamicCpmEnabled: true,
      baseCpmCents: 2000,
      minCpmCents: 1500,
      maxCpmCents: 3000,
      pacingEnabled: true,
      dailyBudgetCents: 50000,
      pacingMode: PacingMode.EVEN,
      totalValidatedViews: 75000,
      totalBillableViews: 72000,
      totalPaidOutCents: 144000,
    },
  });

  // Budget lock for campaign 1
  await prisma.campaignBudgetLock.create({
    data: {
      id: 'budget_lock_c1',
      campaignId: campaign1.id,
      walletId: wallet1.id,
      lockedCents: 500000,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_hold_c1',
      walletId: wallet1.id,
      type: 'HOLD',
      amountCents: -500000,
      currency: 'EUR',
      referenceType: 'CAMPAIGN_BUDGET',
      referenceId: campaign1.id,
      description: `Budget lock for campaign: ${campaign1.title}`,
    },
  });

  await prisma.wallet.update({
    where: { id: wallet1.id },
    data: { availableCents: 500000 },
  });

  // Assets for campaign 1
  await prisma.campaignAsset.createMany({
    data: [
      {
        id: 'asset_c1_1',
        campaignId: campaign1.id,
        type: AssetType.IMAGE,
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
        title: 'Dashboard Overview',
      },
      {
        id: 'asset_c1_2',
        campaignId: campaign1.id,
        type: AssetType.VIDEO,
        url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        title: 'Product Demo Video',
      },
      {
        id: 'asset_c1_3',
        campaignId: campaign1.id,
        type: AssetType.BRAND_GUIDELINES,
        url: 'https://example.com/techstart-brand.pdf',
        title: 'Brand Guidelines',
      },
    ],
  });
  console.log('✅ Created campaign: TechStart Pro (ACTIVE, €10K budget)');

  // Campaign 2: FashionForward - Active
  const campaign2 = await prisma.campaign.create({
    data: {
      id: 'campaign_fashion_1',
      advertiserId: advertiser2.id,
      title: 'Spring Collection 2024 Launch',
      description: 'Launch our new sustainable fashion line. Looking for fashion, lifestyle, and beauty creators to showcase our spring collection.',
      landingUrl: 'https://fashionforward.fr/collection/spring-2024',
      platforms: 'INSTAGRAM,TIKTOK,YOUTUBE',
      totalBudgetCents: 2500000,
      cpmCents: 1800,
      spentBudgetCents: 0,
      status: CampaignStatus.ACTIVE,
      attributionModel: AttributionModel.WEIGHTED,
      payoutMode: PayoutMode.HYBRID,
      fraudScoreThreshold: 40,
      notes: 'Authentic, organic integration preferred. Show real people wearing the clothes.',
      isGeoTargeted: true,
      targetCountryCode: 'FR',
    },
  });

  await prisma.campaignBudgetLock.create({
    data: {
      id: 'budget_lock_c2',
      campaignId: campaign2.id,
      walletId: wallet2.id,
      lockedCents: 1000000,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_hold_c2',
      walletId: wallet2.id,
      type: 'HOLD',
      amountCents: -1000000,
      currency: 'EUR',
      referenceType: 'CAMPAIGN_BUDGET',
      referenceId: campaign2.id,
      description: `Budget lock for campaign: ${campaign2.title}`,
    },
  });

  await prisma.wallet.update({
    where: { id: wallet2.id },
    data: { availableCents: 1500000 },
  });

  await prisma.campaignAsset.createMany({
    data: [
      {
        id: 'asset_c2_1',
        campaignId: campaign2.id,
        type: AssetType.IMAGE,
        url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
        title: 'Spring Collection Hero',
      },
      {
        id: 'asset_c2_2',
        campaignId: campaign2.id,
        type: AssetType.IMAGE,
        url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        title: 'Product Detail',
      },
    ],
  });
  console.log('✅ Created campaign: FashionForward Spring Collection (ACTIVE, €25K budget)');

  // Campaign 3: FoodieApp - Paused
  const campaign3 = await prisma.campaign.create({
    data: {
      id: 'campaign_foodie_1',
      advertiserId: advertiser3.id,
      title: 'FoodieApp Summer Promotion',
      description: 'Get 50% off delivery fees for new users. Promote our food delivery app in your city!',
      landingUrl: 'https://foodieapp.co.uk/offer/summer50',
      platforms: 'INSTAGRAM,TIKTOK',
      totalBudgetCents: 300000,
      cpmCents: 1200,
      spentBudgetCents: 120000,
      status: CampaignStatus.PAUSED,
      attributionModel: AttributionModel.FIRST_CLICK,
      payoutMode: PayoutMode.CPM_STRICT,
      notes: 'Include promo code in your bio or description.',
    },
  });

  await prisma.campaignBudgetLock.create({
    data: {
      id: 'budget_lock_c3',
      campaignId: campaign3.id,
      walletId: wallet3.id,
      lockedCents: 180000,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_hold_c3',
      walletId: wallet3.id,
      type: 'HOLD',
      amountCents: -180000,
      currency: 'EUR',
      referenceType: 'CAMPAIGN_BUDGET',
      referenceId: campaign3.id,
      description: `Budget lock for campaign: ${campaign3.title}`,
    },
  });

  await prisma.wallet.update({
    where: { id: wallet3.id },
    data: { availableCents: 320000 },
  });

  await prisma.campaignAsset.create({
    data: {
      id: 'asset_c3_1',
      campaignId: campaign3.id,
      type: AssetType.IMAGE,
      url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      title: 'Summer Promo Banner',
    },
  });
  console.log('✅ Created campaign: FoodieApp Summer Promotion (PAUSED, €3K budget)');

  // Campaign 4: FitLife - Completed
  const campaign4 = await prisma.campaign.create({
    data: {
      id: 'campaign_fitlife_1',
      advertiserId: advertiser4.id,
      title: 'FitLife Premium - New Year Resolution',
      description: 'Help your audience achieve their fitness goals with FitLife Premium. Free 30-day trial for your followers!',
      landingUrl: 'https://fitlifeco.com/promo/newyear',
      platforms: 'YOUTUBE,INSTAGRAM,TIKTOK,FACEBOOK',
      totalBudgetCents: 1500000,
      cpmCents: 2500,
      spentBudgetCents: 1500000,
      status: CampaignStatus.COMPLETED,
      attributionModel: AttributionModel.LAST_CLICK,
      payoutMode: PayoutMode.CPM_STRICT,
      fraudScoreThreshold: 45,
      notes: 'Show before/after transformations if you have them. Focus on the app features.',
      totalValidatedViews: 600000,
      totalBillableViews: 588000,
      totalPaidOutCents: 1470000,
    },
  });

  await prisma.campaignAsset.create({
    data: {
      id: 'asset_c4_1',
      campaignId: campaign4.id,
      type: AssetType.IMAGE,
      url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
      title: 'Fitness App Screenshot',
    },
  });
  console.log('✅ Created campaign: FitLife Premium (COMPLETED, €15K budget)');

  // Campaign 5: LearnOnline - Under Review
  const campaign5 = await prisma.campaign.create({
    data: {
      id: 'campaign_learnonline_1',
      advertiserId: advertiser5.id,
      title: 'LearnOnline Language Courses',
      description: 'Promote our online language learning platform. 50% off annual subscriptions for new students.',
      landingUrl: 'https://learnonline.se/languages',
      platforms: 'YOUTUBE',
      totalBudgetCents: 500000,
      cpmCents: 2200,
      spentBudgetCents: 0,
      status: CampaignStatus.UNDER_REVIEW,
      attributionModel: AttributionModel.LAST_CLICK,
      payoutMode: PayoutMode.CPM_STRICT,
      notes: 'Educational content preferred. Highlight the variety of languages available.',
    },
  });
  console.log('✅ Created campaign: LearnOnline Language Courses (UNDER_REVIEW, €5K budget)');

  // Campaign 6: TechStart - Draft
  const campaign6 = await prisma.campaign.create({
    data: {
      id: 'campaign_techstart_2',
      advertiserId: advertiser1.id,
      title: 'TechStart Enterprise - Q3 Launch',
      description: 'Enterprise solution for large teams. Coming Q3 2024.',
      landingUrl: 'https://techstart.de/enterprise',
      platforms: 'YOUTUBE,LINKEDIN',
      totalBudgetCents: 2000000,
      cpmCents: 3000,
      spentBudgetCents: 0,
      status: CampaignStatus.DRAFT,
      attributionModel: AttributionModel.LAST_CLICK,
    },
  });
  console.log('✅ Created campaign: TechStart Enterprise (DRAFT, €20K budget)');

  // Campaign 7: Original advertiser campaign
  const campaign7 = await prisma.campaign.create({
    data: {
      id: 'campaign_1',
      advertiserId: originalAdvertiser.id,
      title: 'Wayo Online Course Promotion',
      description: 'Promote our comprehensive online course on digital marketing. Perfect for content creators in the education, business, and marketing niches.',
      landingUrl: 'https://example.com/wayo-course',
      platforms: 'YOUTUBE,INSTAGRAM,TIKTOK',
      totalBudgetCents: 1000000,
      cpmCents: 1500,
      spentBudgetCents: 0,
      status: CampaignStatus.ACTIVE,
      attributionModel: AttributionModel.LAST_CLICK,
      notes: 'Please focus on the practical benefits of the course. Highlight real-world applications and success stories. Avoid making unrealistic income claims.',
    },
  });

  await prisma.campaignBudgetLock.create({
    data: {
      id: 'budget_lock_1',
      campaignId: campaign7.id,
      walletId: originalWallet.id,
      lockedCents: 500000,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_budget_hold_1',
      walletId: originalWallet.id,
      type: 'HOLD',
      amountCents: -500000,
      currency: 'EUR',
      referenceType: 'CAMPAIGN_BUDGET',
      referenceId: campaign7.id,
      description: `Budget lock for campaign: ${campaign7.title}`,
    },
  });

  await prisma.wallet.update({
    where: { id: originalWallet.id },
    data: { availableCents: 0 },
  });

  await prisma.campaignAsset.createMany({
    data: [
      {
        id: 'asset_1',
        campaignId: campaign7.id,
        type: AssetType.IMAGE,
        url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        title: 'Course Hero Banner',
      },
      {
        id: 'asset_2',
        campaignId: campaign7.id,
        type: AssetType.IMAGE,
        url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
        title: 'Learning Environment',
      },
    ],
  });
  console.log('✅ Created campaign: Wayo Online Course (ACTIVE, €10K budget)');

  // Campaign 8: FoodieApp - Draft
  const campaign8 = await prisma.campaign.create({
    data: {
      id: 'campaign_foodie_2',
      advertiserId: advertiser3.id,
      title: 'FoodieApp Corporate Lunch',
      description: 'Corporate catering service for businesses. Team lunch ordering made easy.',
      landingUrl: 'https://foodieapp.co.uk/corporate',
      platforms: 'LINKEDIN',
      totalBudgetCents: 200000,
      cpmCents: 1500,
      spentBudgetCents: 0,
      status: CampaignStatus.DRAFT,
      attributionModel: AttributionModel.LAST_CLICK,
    },
  });
  console.log('✅ Created campaign: FoodieApp Corporate (DRAFT, €2K budget)');

  // Campaign 9: FitLife - Active
  const campaign9 = await prisma.campaign.create({
    data: {
      id: 'campaign_fitlife_2',
      advertiserId: advertiser4.id,
      title: 'FitLife App - Summer Fitness Challenge',
      description: 'Join our 30-day summer fitness challenge. Get the app, complete daily workouts, win prizes!',
      landingUrl: 'https://fitlifeco.com/challenge/summer',
      platforms: 'TIKTOK,INSTAGRAM',
      totalBudgetCents: 800000,
      cpmCents: 1600,
      spentBudgetCents: 0,
      status: CampaignStatus.ACTIVE,
      attributionModel: AttributionModel.WEIGHTED,
      payoutMode: PayoutMode.HYBRID,
      notes: 'Create engaging challenge content. Show workouts, share progress!',
    },
  });

  await prisma.campaignBudgetLock.create({
    data: {
      id: 'budget_lock_c9',
      campaignId: campaign9.id,
      walletId: wallet4.id,
      lockedCents: 400000,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      id: 'tx_hold_c9',
      walletId: wallet4.id,
      type: 'HOLD',
      amountCents: -400000,
      currency: 'EUR',
      referenceType: 'CAMPAIGN_BUDGET',
      referenceId: campaign9.id,
      description: `Budget lock for campaign: ${campaign9.title}`,
    },
  });

  await prisma.wallet.update({
    where: { id: wallet4.id },
    data: { availableCents: 1100000 },
  });
  console.log('✅ Created campaign: FitLife Summer Challenge (ACTIVE, €8K budget)');

  // ============================================
  // CREATE CAMPAIGN APPLICATIONS
  // ============================================

  // Applications for TechStart campaign
  const app1 = await prisma.campaignApplication.create({
    data: {
      id: 'app_c1_creator1',
      campaignId: campaign1.id,
      creatorId: creator1.id,
      status: ApplicationStatus.APPROVED,
      message: 'I have 150K subscribers interested in productivity tools. Would love to demo your platform!',
      reviewedAt: new Date(),
      reviewedBy: superAdmin.id,
    },
  });

  await prisma.campaignApplication.create({
    data: {
      id: 'app_c1_creator2',
      campaignId: campaign1.id,
      creatorId: creator2.id,
      status: ApplicationStatus.APPROVED,
      message: 'My tech review channel would be perfect for this SaaS product.',
      reviewedAt: new Date(),
      reviewedBy: superAdmin.id,
    },
  });

  await prisma.campaignApplication.create({
    data: {
      id: 'app_c1_creator3',
      campaignId: campaign1.id,
      creatorId: creator3.id,
      status: ApplicationStatus.PENDING,
      message: 'Fitness meets tech! Let me show how TechStart helps track team productivity.',
    },
  });

  await prisma.campaignApplication.create({
    data: {
      id: 'app_c1_creator5',
      campaignId: campaign1.id,
      creatorId: creator5.id,
      status: ApplicationStatus.REJECTED,
      message: 'I cover general tech but this seems too niche.',
      reviewedAt: new Date(),
      reviewedBy: superAdmin.id,
    },
  });
  console.log('✅ Created applications for TechStart campaign');

  // Applications for FashionForward campaign
  await prisma.campaignApplication.create({
    data: {
      id: 'app_c2_creator1',
      campaignId: campaign2.id,
      creatorId: creator1.id,
      status: ApplicationStatus.APPROVED,
      message: 'French fashion on a French channel! Perfect match.',
      reviewedAt: new Date(),
      reviewedBy: superAdmin.id,
    },
  });

  await prisma.campaignApplication.create({
    data: {
      id: 'app_c2_creator3',
      campaignId: campaign2.id,
      creatorId: creator3.id,
      status: ApplicationStatus.APPROVED,
      message: 'Love the sustainable fashion angle! My audience is very eco-conscious.',
      reviewedAt: new Date(),
      reviewedBy: superAdmin.id,
    },
  });

  await prisma.campaignApplication.create({
    data: {
      id: 'app_c2_creator4',
      campaignId: campaign2.id,
      creatorId: creator4.id,
      status: ApplicationStatus.PENDING,
      message: 'Food and fashion - great combination for content!',
    },
  });
  console.log('✅ Created applications for FashionForward campaign');

  // Applications for Wayo course campaign
  await prisma.campaignApplication.create({
    data: {
      id: 'application_1',
      campaignId: campaign7.id,
      creatorId: creator1.id,
      status: ApplicationStatus.APPROVED,
      message: 'I have an audience of 50k subscribers interested in digital marketing education. Would love to promote this course!',
      reviewedAt: new Date(),
      reviewedBy: superAdmin.id,
    },
  });

  await prisma.campaignApplication.create({
    data: {
      id: 'application_2',
      campaignId: campaign7.id,
      creatorId: creator2.id,
      status: ApplicationStatus.PENDING,
      message: 'My YouTube channel focuses on career development. This course would be a great fit for my audience.',
    },
  });
  console.log('✅ Created applications for Wayo course campaign');

  // ============================================
  // CREATE TRACKING LINKS
  // ============================================

  const trackingLink1 = await prisma.creatorTrackingLink.create({
    data: {
      id: 'link_c1_sarah',
      campaignId: campaign1.id,
      creatorId: creator1.id,
      slug: 'techstart-sarah',
    },
  });

  const trackingLink2 = await prisma.creatorTrackingLink.create({
    data: {
      id: 'link_c1_mike',
      campaignId: campaign1.id,
      creatorId: creator2.id,
      slug: 'techstart-mike',
    },
  });

  const trackingLink3 = await prisma.creatorTrackingLink.create({
    data: {
      id: 'link_c7_sarah',
      campaignId: campaign7.id,
      creatorId: creator1.id,
      slug: 'wayo-sarah-2024',
    },
  });

  const trackingLink4 = await prisma.creatorTrackingLink.create({
    data: {
      id: 'link_c2_sarah',
      campaignId: campaign2.id,
      creatorId: creator1.id,
      slug: 'fashion-sarah',
    },
  });

  const trackingLink5 = await prisma.creatorTrackingLink.create({
    data: {
      id: 'link_c2_emma',
      campaignId: campaign2.id,
      creatorId: creator3.id,
      slug: 'fashion-emma',
    },
  });
  console.log('✅ Created tracking links');

  // ============================================
  // CREATE VISIT EVENTS & CONVERSIONS (Sample Data)
  // ============================================

  // Visit events for campaign 1
  await prisma.visitEvent.createMany({
    data: [
      {
        id: 'visit_c1_1',
        campaignId: campaign1.id,
        creatorId: creator1.id,
        linkId: trackingLink1.id,
        visitorId: 'v001',
        isRecorded: true,
        isValidated: true,
        isBillable: true,
        fraudScore: 10,
        geoCountry: 'FR',
        occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'visit_c1_2',
        campaignId: campaign1.id,
        creatorId: creator1.id,
        linkId: trackingLink1.id,
        visitorId: 'v002',
        isRecorded: true,
        isValidated: true,
        isBillable: true,
        fraudScore: 5,
        geoCountry: 'DE',
        occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'visit_c1_3',
        campaignId: campaign1.id,
        creatorId: creator2.id,
        linkId: trackingLink2.id,
        visitorId: 'v003',
        isRecorded: true,
        isValidated: true,
        isBillable: true,
        fraudScore: 15,
        geoCountry: 'US',
        occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Conversion events
  await prisma.conversionEvent.createMany({
    data: [
      {
        id: 'conv_c1_1',
        campaignId: campaign1.id,
        creatorId: creator1.id,
        visitorId: 'v001',
        type: 'SIGNUP',
        revenueCents: 0,
        attributedTo: 'LAST_CLICK',
        occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'conv_c1_2',
        campaignId: campaign1.id,
        creatorId: creator2.id,
        visitorId: 'v003',
        type: 'SUBSCRIPTION',
        revenueCents: 2900,
        attributedTo: 'LAST_CLICK',
        occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  console.log('✅ Created visit events and conversions');

  // ============================================
  // CREATE LEDGER ENTRIES (Past Earnings)
  // ============================================

  await prisma.ledgerEntry.createMany({
    data: [
      {
        id: 'ledger_1',
        campaignId: campaign4.id,
        creatorId: creator1.id,
        type: LedgerEntryType.VIEW_PAYOUT,
        amountCents: 50000,
        description: 'View payout for 33,333 valid views at €1.50 CPM',
      },
      {
        id: 'ledger_2',
        campaignId: campaign4.id,
        creatorId: creator1.id,
        type: LedgerEntryType.PLATFORM_FEE,
        amountCents: 1500,
        description: 'Platform fee for view payouts',
      },
      {
        id: 'ledger_3',
        campaignId: campaign4.id,
        creatorId: creator1.id,
        type: LedgerEntryType.CONVERSION_PAYOUT,
        amountCents: 25000,
        description: 'Conversion payout - 10 signups at €2.50 each',
      },
      {
        id: 'ledger_4',
        campaignId: campaign4.id,
        creatorId: creator3.id,
        type: LedgerEntryType.VIEW_PAYOUT,
        amountCents: 75000,
        description: 'View payout for 50,000 valid views at €1.50 CPM',
      },
      {
        id: 'ledger_5',
        campaignId: campaign4.id,
        creatorId: creator3.id,
        type: LedgerEntryType.PLATFORM_FEE,
        amountCents: 2250,
        description: 'Platform fee for view payouts',
      },
    ],
  });
  console.log('✅ Created ledger entries');

  // ============================================
  // CREATE PAYOUT LEDGER
  // ============================================

  await prisma.payoutLedger.createMany({
    data: [
      {
        id: 'payout_1',
        campaignId: campaign4.id,
        creatorId: creator1.id,
        amountCents: 50000,
        reason: 'VIEW',
        refEventId: 'visit_c4_1',
      },
      {
        id: 'payout_2',
        campaignId: campaign4.id,
        creatorId: creator1.id,
        amountCents: 25000,
        reason: 'CONVERSION',
        refEventId: 'conv_c4_1',
      },
      {
        id: 'payout_3',
        campaignId: campaign4.id,
        creatorId: creator3.id,
        amountCents: 75000,
        reason: 'VIEW',
        refEventId: 'visit_c4_2',
      },
    ],
  });
  console.log('✅ Created payout ledger entries');

  // ============================================
  // SUMMARY
  // ============================================

  console.log('');
  console.log('🎉 Seeding completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log('---');
  console.log('👤 ADVERTISERS (6):');
  console.log('  1. TechStart GmbH (marketing@techstart.de) - €10,000 wallet');
  console.log('  2. FashionForward SAS (collab@fashionforward.fr) - €25,000 wallet');
  console.log('  3. FoodieApp Ltd (partnerships@foodieapp.co.uk) - €5,000 wallet');
  console.log('  4. FitLife Co (influencer@fitlifeco.com) - €15,000 wallet');
  console.log('  5. LearnOnline AB (campaigns@learnonline.se) - €8,000 wallet');
  console.log('  6. John Advertiser (advertiser@example.com) - €5,000 wallet');
  console.log('');
  console.log('🎨 CREATORS (6):');
  console.log('  1. Sarah Creator (creator1@example.com) - GOLD, 150K YouTube + 80K IG');
  console.log('  2. Mike Influencer (creator2@example.com) - SILVER, 75K YouTube');
  console.log('  3. Emma Fitness (emma@creator.example) - GOLD, 250K YT + 500K TT');
  console.log('  4. Luca Foodie (luca@creator.example) - BRONZE, 15K IG');
  console.log('  5. Nina Tech (nina@creator.example) - SILVER, 45K YouTube');
  console.log('  6. Alex Hybrid (hybrid@example.com) - advertiser + creator');
  console.log('');
  console.log('📢 CAMPAIGNS (9):');
  console.log('  1. TechStart Pro - ACTIVE (€10,000)');
  console.log('  2. FashionForward Spring - ACTIVE (€25,000)');
  console.log('  3. FoodieApp Summer - PAUSED (€3,000)');
  console.log('  4. FitLife Premium - COMPLETED (€15,000)');
  console.log('  5. LearnOnline Languages - UNDER_REVIEW (€5,000)');
  console.log('  6. TechStart Enterprise - DRAFT (€20,000)');
  console.log('  7. Wayo Online Course - ACTIVE (€10,000)');
  console.log('  8. FoodieApp Corporate - DRAFT (€2,000)');
  console.log('  9. FitLife Summer Challenge - ACTIVE (€8,000)');
  console.log('');
  console.log('💰 Wallet Summary:');
  console.log('  - TechStart: €10,000 (€5,000 locked)');
  console.log('  - FashionForward: €25,000 (€10,000 locked)');
  console.log('  - FoodieApp: €5,000 (€1,800 locked)');
  console.log('  - FitLife: €15,000 (€4,000 locked)');
  console.log('  - LearnOnline: €8,000 (€0 locked)');
  console.log('  - Original Advertiser: €5,000 (€5,000 locked)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
