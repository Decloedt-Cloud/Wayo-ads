import { Prisma, User, CreatorChannel, CreatorTrafficMetrics, CreatorBusinessProfile, CreatorTier, Campaign, SubmittedVideo } from '@prisma/client';
import { db } from '@/lib/db';

export interface ICreatorRepository {
  findById(id: string): Promise<User | null>;
  findByIdWithDetails(id: string): Promise<(User & { businessProfile: any; channels: any }) | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(params?: { tier?: CreatorTier; search?: string; page?: number; limit?: number }): Promise<{ creators: User[]; total: number }>;
  findByRole(role: string): Promise<Pick<User, 'id'>[]>;
  findByIds(ids: string[]): Promise<Pick<User, 'id' | 'trustScore' | 'tier' | 'qualityMultiplier'>[]>;
  updateTier(id: string, tier: CreatorTier): Promise<User>;
  findByIdWithTx(tx: any, id: string): Promise<User | null>;
  updateTierWithTx(tx: any, id: string, tier: CreatorTier): Promise<User>;
  updateTrustScore(id: string, trustScore: number, tier: CreatorTier, qualityMultiplier: number): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
}

export class CreatorRepository implements ICreatorRepository {
  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({ where: { id } });
  }

  async findByIdWithDetails(id: string): Promise<(User & { businessProfile: any; channels: any }) | null> {
    return db.user.findUnique({
      where: { id },
      include: {
        creatorBusinessProfile: true,
        creatorChannels: true,
      },
    }) as Promise<(User & { businessProfile: any; channels: any }) | null>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({ where: { email } });
  }

  async findAll(params?: { tier?: CreatorTier; search?: string; page?: number; limit?: number }): Promise<{ creators: User[]; total: number }> {
    const { tier, search, page = 1, limit = 20 } = params || {};
    const where: any = {};
    
    if (tier) {
      where.tier = tier;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [creators, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    return { creators, total };
  }

  async findByRole(role: string): Promise<Pick<User, 'id'>[]> {
    return db.user.findMany({
      where: {
        roles: { contains: role },
      },
      select: { id: true },
    });
  }

  async findByIds(ids: string[]): Promise<Pick<User, 'id' | 'trustScore' | 'tier' | 'qualityMultiplier'>[]> {
    return db.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        trustScore: true,
        tier: true,
        qualityMultiplier: true,
      },
    });
  }

  async updateTier(id: string, tier: CreatorTier): Promise<User> {
    return db.user.update({ where: { id }, data: { tier } });
  }

  async findByIdWithTx(tx: any, id: string): Promise<User | null> {
    return tx.user.findUnique({ where: { id } });
  }

  async updateTierWithTx(tx: any, id: string, tier: CreatorTier): Promise<User> {
    return tx.user.update({ where: { id }, data: { tier } });
  }

  async updateTrustScore(id: string, trustScore: number, tier: CreatorTier, qualityMultiplier: number): Promise<User> {
    return db.user.update({
      where: { id },
      data: { trustScore, tier, qualityMultiplier },
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return db.user.update({ where: { id }, data });
  }
}

export interface ICreatorChannelRepository {
  findById(id: string): Promise<CreatorChannel | null>;
  findByCreatorId(creatorId: string): Promise<CreatorChannel[]>;
  findByUserId(userId: string): Promise<CreatorChannel[]>;
  findByUserIdAndPlatform(userId: string, platform: string): Promise<CreatorChannel | null>;
  findByPlatformChannelId(platform: string, channelId: string): Promise<CreatorChannel | null>;
  findFeatured(limit?: number): Promise<CreatorChannel[]>;
  create(data: Prisma.CreatorChannelUncheckedCreateInput): Promise<CreatorChannel>;
  update(id: string, data: Prisma.CreatorChannelUncheckedUpdateInput): Promise<CreatorChannel>;
  delete(id: string): Promise<void>;
}

export class CreatorChannelRepository implements ICreatorChannelRepository {
  async findById(id: string): Promise<CreatorChannel | null> {
    return db.creatorChannel.findUnique({ where: { id } });
  }

  async findByCreatorId(creatorId: string): Promise<CreatorChannel[]> {
    return db.creatorChannel.findMany({
      where: { userId: creatorId },
      orderBy: { subscriberCount: 'desc' },
    });
  }

  async findByUserId(userId: string): Promise<CreatorChannel[]> {
    return db.creatorChannel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserIdAndPlatform(userId: string, platform: string): Promise<CreatorChannel | null> {
    return db.creatorChannel.findFirst({
      where: {
        userId,
        platform: platform as any,
      },
    });
  }

  async findByPlatformChannelId(platform: string, channelId: string): Promise<CreatorChannel | null> {
    return db.creatorChannel.findFirst({
      where: { platform: platform as any, channelId },
    });
  }

  async findFeatured(limit = 12): Promise<CreatorChannel[]> {
    return db.creatorChannel.findMany({
      where: {
        platform: 'YOUTUBE',
        isPublic: true,
      },
      orderBy: {
        subscriberCount: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.CreatorChannelUncheckedCreateInput): Promise<CreatorChannel> {
    return db.creatorChannel.create({ data });
  }

  async update(id: string, data: Prisma.CreatorChannelUncheckedUpdateInput): Promise<CreatorChannel> {
    return db.creatorChannel.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await db.creatorChannel.delete({ where: { id } });
  }
}

export interface ICreatorBusinessProfileRepository {
  findByUserId(userId: string): Promise<CreatorBusinessProfile | null>;
  create(data: Prisma.CreatorBusinessProfileUncheckedCreateInput): Promise<CreatorBusinessProfile>;
  update(userId: string, data: Prisma.CreatorBusinessProfileUncheckedUpdateInput): Promise<CreatorBusinessProfile>;
}

export class CreatorBusinessProfileRepository implements ICreatorBusinessProfileRepository {
  async findByUserId(userId: string): Promise<CreatorBusinessProfile | null> {
    return db.creatorBusinessProfile.findUnique({ where: { userId } });
  }

  async create(data: Prisma.CreatorBusinessProfileUncheckedCreateInput): Promise<CreatorBusinessProfile> {
    return db.creatorBusinessProfile.create({ data });
  }

  async update(userId: string, data: Prisma.CreatorBusinessProfileUncheckedUpdateInput): Promise<CreatorBusinessProfile> {
    return db.creatorBusinessProfile.update({ where: { userId }, data });
  }
}

export interface ICreatorTrafficMetricsRepository {
  findByCreatorId(creatorId: string, startDate?: Date, endDate?: Date): Promise<CreatorTrafficMetrics[]>;
  findLatestByCreatorId(creatorId: string): Promise<CreatorTrafficMetrics | null>;
  create(data: Prisma.CreatorTrafficMetricsUncheckedCreateInput): Promise<CreatorTrafficMetrics>;
  aggregateRecentByCreatorId(creatorId: string, startDate: Date): Promise<{
    _avg: { validationRate: number | null; conversionRate: number | null; avgFraudScore: number | null; anomalyScore: number | null };
    _count: { id: number };
    _sum: { totalValidated: number | null; totalConversions: number | null };
  }>;
  countFlagged(creatorId: string, since: Date): Promise<number>;
  aggregateByCampaign(campaignId: string, startDate: Date): Promise<{
    _count: { id: number };
    _sum: { anomalyScore: number | null };
    _avg: { anomalyScore: number | null };
  }>;
  countFlaggedByCampaign(campaignId: string, since: Date): Promise<number>;
  countByCampaign(campaignId: string, since: Date): Promise<number>;
}

export class CreatorTrafficMetricsRepository implements ICreatorTrafficMetricsRepository {
  async findByCreatorId(creatorId: string, startDate?: Date, endDate?: Date): Promise<CreatorTrafficMetrics[]> {
    return db.creatorTrafficMetrics.findMany({
      where: {
        creatorId,
        ...(startDate || endDate
          ? {
              date: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {}),
      },
      orderBy: { date: 'desc' },
    });
  }

  async findLatestByCreatorId(creatorId: string): Promise<CreatorTrafficMetrics | null> {
    return db.creatorTrafficMetrics.findFirst({
      where: { creatorId },
      orderBy: { date: 'desc' },
    });
  }

  async create(data: Prisma.CreatorTrafficMetricsUncheckedCreateInput): Promise<CreatorTrafficMetrics> {
    return db.creatorTrafficMetrics.create({ data });
  }

  async aggregateRecentByCreatorId(creatorId: string, startDate: Date): Promise<{
    _avg: { validationRate: number | null; conversionRate: number | null; avgFraudScore: number | null; anomalyScore: number | null };
    _count: { id: number };
    _sum: { totalValidated: number | null; totalConversions: number | null };
  }> {
    return db.creatorTrafficMetrics.aggregate({
      where: {
        creatorId,
        date: { gte: startDate },
      },
      _avg: {
        validationRate: true,
        conversionRate: true,
        avgFraudScore: true,
        anomalyScore: true,
      },
      _count: { id: true },
      _sum: {
        totalValidated: true,
        totalConversions: true,
      },
    });
  }

  async countFlagged(creatorId: string, since: Date): Promise<number> {
    return db.creatorTrafficMetrics.count({
      where: {
        creatorId,
        flagged: true,
        date: { gte: since },
      },
    });
  }

  async aggregateByCampaign(campaignId: string, startDate: Date): Promise<{
    _count: { id: number };
    _sum: { anomalyScore: number | null };
    _avg: { anomalyScore: number | null };
  }> {
    return db.creatorTrafficMetrics.aggregate({
      where: {
        campaignId,
        date: { gte: startDate },
      },
      _count: { id: true },
      _sum: { anomalyScore: true },
      _avg: { anomalyScore: true },
    });
  }

  async countFlaggedByCampaign(campaignId: string, since: Date): Promise<number> {
    return db.creatorTrafficMetrics.count({
      where: {
        campaignId,
        flagged: true,
        date: { gte: since },
      },
    });
  }

  async countByCampaign(campaignId: string, since: Date): Promise<number> {
    return db.creatorTrafficMetrics.count({
      where: {
        campaignId,
        date: { gte: since },
      },
    });
  }
}

export interface ISubmittedVideoRepository {
  findById(id: string): Promise<SubmittedVideo | null>;
  findByIdWithCampaign(id: string): Promise<(SubmittedVideo & { campaign: Campaign }) | null>;
  findByCampaignAndCreator(campaignId: string, creatorId: string, videoId: string): Promise<SubmittedVideo | null>;
  findByCampaignIds(campaignIds: string[], status?: string): Promise<any[]>;
  create(data: Prisma.SubmittedVideoUncheckedCreateInput): Promise<SubmittedVideo>;
  update(id: string, data: Prisma.SubmittedVideoUncheckedUpdateInput): Promise<SubmittedVideo>;
}

export class SubmittedVideoRepository implements ISubmittedVideoRepository {
  async findById(id: string): Promise<SubmittedVideo | null> {
    return db.submittedVideo.findUnique({ where: { id } });
  }

  async findByIdWithCampaign(id: string): Promise<(SubmittedVideo & { campaign: Campaign }) | null> {
    return db.submittedVideo.findUnique({
      where: { id },
      include: { campaign: true },
    });
  }

  async findByCampaignAndCreator(campaignId: string, creatorId: string, videoId: string): Promise<SubmittedVideo | null> {
    return db.submittedVideo.findFirst({
      where: {
        campaignId,
        creatorId,
        videoId,
      },
    });
  }

  async findByCampaignIds(campaignIds: string[], status?: string): Promise<any[]> {
    const where: any = {
      campaignId: { in: campaignIds },
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    return db.submittedVideo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.SubmittedVideoUncheckedCreateInput): Promise<SubmittedVideo> {
    return db.submittedVideo.create({ data });
  }

  async update(id: string, data: Prisma.SubmittedVideoUncheckedUpdateInput): Promise<SubmittedVideo> {
    return db.submittedVideo.update({ where: { id }, data });
  }
}

export interface ICampaignMinRepository {
  findById(id: string): Promise<Campaign | null>;
  findByAdvertiserId(advertiserId: string): Promise<{ id: string; title: string }[]>;
}

export class CampaignMinRepository implements ICampaignMinRepository {
  async findById(id: string): Promise<Campaign | null> {
    return db.campaign.findUnique({ where: { id } });
  }

  async findByAdvertiserId(advertiserId: string): Promise<{ id: string; title: string }[]> {
    return db.campaign.findMany({
      where: { advertiserId },
      select: { id: true, title: true },
    });
  }
}

export interface ICreatorTrackingLinkRepository {
  findByCreatorId(creatorId: string): Promise<any[]>;
}

export class CreatorTrackingLinkRepository implements ICreatorTrackingLinkRepository {
  async findByCreatorId(creatorId: string): Promise<any[]> {
    return db.creatorTrackingLink.findMany({
      where: { creatorId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        _count: {
          select: { visitEvents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const creatorRepository = new CreatorRepository();
export const creatorChannelRepository = new CreatorChannelRepository();
export const creatorBusinessProfileRepository = new CreatorBusinessProfileRepository();
export const creatorTrafficMetricsRepository = new CreatorTrafficMetricsRepository();
export const submittedVideoRepository = new SubmittedVideoRepository();
export const campaignMinRepository = new CampaignMinRepository();
export const creatorTrackingLinkRepository = new CreatorTrackingLinkRepository();

export interface ICampaignApplicationMinRepository {
  findByCreatorId(creatorId: string): Promise<any[]>;
}

export class CampaignApplicationMinRepository implements ICampaignApplicationMinRepository {
  async findByCreatorId(creatorId: string): Promise<any[]> {
    return db.campaignApplication.findMany({
      where: { creatorId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true,
            type: true,
            cpmCents: true,
            advertiser: {
              select: { name: true, email: true },
            },
          },
        },
        socialPosts: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const campaignApplicationMinRepository = new CampaignApplicationMinRepository();
