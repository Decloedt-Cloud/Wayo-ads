import { Prisma, Campaign, CampaignStatus, CampaignApplication, ApplicationStatus, SocialPost, CreatorTrackingLink, SocialPlatform } from '@prisma/client';
import { db } from '@/lib/db';

export interface ICampaignRepository {
  findById(id: string): Promise<Campaign | null>;
  findByIdWithAdvertiser(id: string): Promise<Campaign | null>;
  findByIdWithTx(tx: Prisma.TransactionClient, id: string): Promise<Campaign | null>;
  findByIdSelect(id: string, select: any): Promise<Campaign | null>;
  findByIdWithAssets(id: string): Promise<Campaign | null>;
  findByIdWithAssetsAndApplications(id: string): Promise<Campaign | null>;
  findByAdvertiserId(advertiserId: string, status?: CampaignStatus): Promise<Campaign[]>;
  findAll(params?: { status?: CampaignStatus; page?: number; limit?: number; search?: string; advertiserId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<{ campaigns: Campaign[]; total: number }>;
  findPacingEnabled(advertiserId?: string): Promise<Campaign[]>;
  create(data: Prisma.CampaignUncheckedCreateInput): Promise<Campaign>;
  update(id: string, data: Prisma.CampaignUncheckedUpdateInput): Promise<Campaign>;
  findByIdForAdvertiserAccess(id: string): Promise<{ advertiserId: string } | null>;
  findByIdWithCpm(id: string): Promise<{ cpmCents: number } | null>;
  updateCpmBounds(id: string, minCpmCents: number, maxCpmCents: number): Promise<Campaign>;
  updateWithTx(tx: Prisma.TransactionClient, id: string, data: Prisma.CampaignUncheckedUpdateInput): Promise<Campaign>;
  updateStatus(id: string, status: CampaignStatus): Promise<Campaign>;
  delete(id: string): Promise<void>;
  countByStatus(advertiserId: string): Promise<Record<CampaignStatus, number>>;
  findByIdWithBudgetLock(id: string): Promise<(Campaign & { budgetLock: { lockedCents: number } | null }) | null>;
  findBudgetLockByCampaignId(campaignId: string): Promise<{ lockedCents: number } | null>;
  getCampaignStats(campaignId: string): Promise<{ views: number; conversions: number; spent: number }>;
  findByIdWithPacingInfo(id: string): Promise<any>;
}

export class CampaignRepository implements ICampaignRepository {
  async findById(id: string): Promise<Campaign | null> {
    return db.campaign.findUnique({ where: { id } });
  }

  async findByIdWithAdvertiser(id: string): Promise<Campaign | null> {
    return db.campaign.findUnique({
      where: { id },
      include: { advertiser: true },
    });
  }

  async findByIdWithTx(tx: Prisma.TransactionClient, id: string): Promise<Campaign | null> {
    return tx.campaign.findUnique({ where: { id } });
  }

  async findByIdSelect(id: string, select: any): Promise<any> {
    return db.campaign.findUnique({ where: { id }, select });
  }

  async findByAdvertiserId(advertiserId: string, status?: CampaignStatus): Promise<Campaign[]> {
    return db.campaign.findMany({
      where: { advertiserId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.CampaignUncheckedCreateInput): Promise<Campaign> {
    return db.campaign.create({ data });
  }

  async update(id: string, data: Prisma.CampaignUncheckedUpdateInput): Promise<Campaign> {
    return db.campaign.update({ where: { id }, data });
  }

  async findByIdForAdvertiserAccess(id: string) {
    return db.campaign.findUnique({
      where: { id },
      select: { advertiserId: true },
    });
  }

  async findByIdWithCpm(id: string) {
    return db.campaign.findUnique({
      where: { id },
      select: { cpmCents: true },
    });
  }

  async updateCpmBounds(id: string, minCpmCents: number, maxCpmCents: number) {
    return db.campaign.update({
      where: { id },
      data: { minCpmCents, maxCpmCents },
    });
  }

  async updateWithTx(tx: Prisma.TransactionClient, id: string, data: Prisma.CampaignUncheckedUpdateInput): Promise<Campaign> {
    return tx.campaign.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    return db.campaign.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await db.campaign.delete({ where: { id } });
  }

  async countByStatus(advertiserId: string): Promise<Record<CampaignStatus, number>> {
    const campaigns = await db.campaign.groupBy({
      by: ['status'],
      where: { advertiserId },
      _count: { id: true },
    });

    const result: Record<string, number> = {};
    for (const c of campaigns) {
      result[c.status] = c._count.id;
    }
    return result as Record<CampaignStatus, number>;
  }

  async findByIdWithBudgetLock(id: string): Promise<(Campaign & { budgetLock: { lockedCents: number } | null }) | null> {
    return db.campaign.findUnique({
      where: { id },
      include: { budgetLock: true },
    }) as Promise<(Campaign & { budgetLock: { lockedCents: number } | null }) | null>;
  }

  async findByIdWithAssets(id: string): Promise<Campaign | null> {
    return db.campaign.findUnique({
      where: { id },
      include: { assets: true },
    });
  }

  async findByIdWithAssetsAndApplications(id: string): Promise<Campaign | null> {
    return db.campaign.findUnique({
      where: { id },
      include: {
        assets: true,
        applications: {
          select: { id: true, creatorId: true, status: true },
        },
      },
    });
  }

  async findAll(params?: { status?: CampaignStatus; page?: number; limit?: number; search?: string; advertiserId?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<{ campaigns: Campaign[]; total: number }> {
    const { status, page = 1, limit = 20, search, advertiserId, sortBy = 'createdAt', sortOrder = 'desc' } = params || {};
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (advertiserId) {
      where.advertiserId = advertiserId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      db.campaign.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  async findPacingEnabled(advertiserId?: string): Promise<Campaign[]> {
    const where: any = {
      pacingEnabled: true,
      status: { in: ['ACTIVE', 'PAUSED'] },
    };

    if (advertiserId) {
      where.advertiserId = advertiserId;
    }

    return db.campaign.findMany({
      where,
      select: { id: true },
    }) as any;
  }

  async findPacingEnabledWithStatus(): Promise<any[]> {
    return db.campaign.findMany({
      where: {
        pacingEnabled: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        pacingEnabled: true,
        pacingMode: true,
        totalBudgetCents: true,
        spentBudgetCents: true,
        dailyBudgetCents: true,
        targetSpendPerHourCents: true,
        deliveryProgressPercent: true,
        isOverDelivering: true,
        isUnderDelivering: true,
        campaignStartDate: true,
        campaignEndDate: true,
        status: true,
      },
    });
  }

  async findBudgetLockByCampaignId(campaignId: string): Promise<{ lockedCents: number } | null> {
    return db.campaignBudgetLock.findUnique({
      where: { campaignId },
      select: { lockedCents: true },
    });
  }

  async getCampaignStats(campaignId: string): Promise<{ views: number; conversions: number; spent: number }> {
    const [views, conversions, spent] = await Promise.all([
      db.visitEvent.count({ where: { campaignId } }),
      db.conversionEvent.count({ where: { campaignId } }),
      db.ledgerEntry.aggregate({
        where: { campaignId },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      views,
      conversions,
      spent: spent._sum.amountCents || 0,
    };
  }

  async findByIdWithPacingInfo(id: string) {
    return db.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        pacingEnabled: true,
        pacingMode: true,
        dailyBudgetCents: true,
        totalBudgetCents: true,
        spentBudgetCents: true,
        deliveryProgressPercent: true,
        campaignStartDate: true,
        campaignEndDate: true,
        status: true,
      },
    });
  }
}

export interface ICampaignApplicationRepository {
  findById(id: string): Promise<CampaignApplication | null>;
  findByCampaignId(campaignId: string): Promise<CampaignApplication[]>;
  findByCreatorId(creatorId: string): Promise<CampaignApplication[]>;
  findPendingByCampaignId(campaignId: string): Promise<CampaignApplication[]>;
  findApprovedByCampaignIdWithYouTubePosts(campaignId: string): Promise<any[]>;
  findApprovedApplication(campaignId: string, creatorId: string): Promise<CampaignApplication | null>;
  create(data: Prisma.CampaignApplicationUncheckedCreateInput): Promise<CampaignApplication>;
  updateStatus(id: string, status: ApplicationStatus): Promise<CampaignApplication>;
}

export class CampaignApplicationRepository implements ICampaignApplicationRepository {
  async findById(id: string): Promise<CampaignApplication | null> {
    return db.campaignApplication.findUnique({ where: { id } });
  }

  async findByCampaignId(campaignId: string): Promise<CampaignApplication[]> {
    return db.campaignApplication.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCreatorId(creatorId: string): Promise<CampaignApplication[]> {
    return db.campaignApplication.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByCampaignId(campaignId: string): Promise<CampaignApplication[]> {
    return db.campaignApplication.findMany({
      where: { campaignId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findApprovedByCampaignIdWithYouTubePosts(campaignId: string): Promise<any[]> {
    return db.campaignApplication.findMany({
      where: {
        campaignId,
        status: 'APPROVED',
      },
      include: {
        socialPosts: {
          where: {
            platform: 'YOUTUBE',
            status: { in: ['ACTIVE', 'PAUSED'] },
          },
        },
      },
    });
  }

  async findApprovedApplication(campaignId: string, creatorId: string): Promise<CampaignApplication | null> {
    return db.campaignApplication.findFirst({
      where: {
        campaignId,
        creatorId,
        status: 'APPROVED',
      },
    });
  }

  async create(data: Prisma.CampaignApplicationUncheckedCreateInput): Promise<CampaignApplication> {
    return db.campaignApplication.create({ data });
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<CampaignApplication> {
    return db.campaignApplication.update({
      where: { id },
      data: { status },
    });
  }
}

export interface ISocialPostRepository {
  findById(id: string): Promise<SocialPost | null>;
  findActiveWithCampaign(platform: string, maxPosts?: number): Promise<any[]>;
  updateViews(id: string, data: { lastCheckedViews: number; currentViews: number }): Promise<SocialPost>;
  groupByPlatform(): Promise<any[]>;
  updateStatus(id: string, status: string, rejectionReason?: string): Promise<SocialPost>;
  findMany(where: any, select?: any): Promise<any[]>;
  findByIdWithCreatorVerification(id: string): Promise<any>;
}

export class SocialPostRepository implements ISocialPostRepository {
  async findById(id: string): Promise<SocialPost | null> {
    return db.socialPost.findUnique({ where: { id } });
  }

  async findActiveWithCampaign(platform: SocialPlatform, maxPosts?: number): Promise<any[]> {
    return db.socialPost.findMany({
      where: {
        platform,
        status: 'ACTIVE',
      },
      include: {
        campaignApplication: {
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                dailyBudgetCents: true,
              }
            },
            creator: {
              select: { id: true }
            }
          }
        }
      },
      take: maxPosts,
    });
  }

  async updateViews(id: string, data: { lastCheckedViews: number; currentViews: number }): Promise<SocialPost> {
    return db.socialPost.update({
      where: { id },
      data: {
        lastCheckedViews: data.lastCheckedViews,
        currentViews: data.currentViews,
      },
    });
  }

  async groupByPlatform() {
    return db.socialPost.groupBy({
      by: ['platform'],
      _count: { id: true },
      where: { status: 'ACTIVE' },
    });
  }

  async updateStatus(id: string, status: string, rejectionReason?: string): Promise<SocialPost> {
    return db.socialPost.update({
      where: { id },
      data: {
        status: status as any,
        rejectionReason,
      },
    });
  }

  async findMany(where: any, select?: any): Promise<any[]> {
    return db.socialPost.findMany({
      where,
      select,
    });
  }

  async findByIdWithCreatorVerification(id: string): Promise<any> {
    return db.socialPost.findUnique({
      where: { id },
      include: {
        campaignApplication: {
          include: {
            creator: {
              select: { verificationLevel: true },
            },
          },
        },
      },
    });
  }
}

export interface ITrackingLinkRepository {
  findByCampaignAndCreator(campaignId: string, creatorId: string): Promise<CreatorTrackingLink[]>;
  findBySlug(campaignId: string, creatorId: string, slug: string): Promise<CreatorTrackingLink | null>;
  create(data: Prisma.CreatorTrackingLinkUncheckedCreateInput): Promise<CreatorTrackingLink>;
}

export class TrackingLinkRepository implements ITrackingLinkRepository {
  async findByCampaignAndCreator(campaignId: string, creatorId: string): Promise<CreatorTrackingLink[]> {
    return db.creatorTrackingLink.findMany({
      where: {
        campaignId,
        creatorId,
      },
      include: {
        _count: {
          select: { visitEvents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(campaignId: string, creatorId: string, slug: string): Promise<CreatorTrackingLink | null> {
    return db.creatorTrackingLink.findFirst({
      where: {
        campaignId,
        creatorId,
        slug,
      },
    });
  }

  async create(data: Prisma.CreatorTrackingLinkUncheckedCreateInput): Promise<CreatorTrackingLink> {
    return db.creatorTrackingLink.create({
      data,
      include: {
        campaign: {
          select: {
            title: true,
          },
        },
      },
    });
  }
}

export const campaignRepository = new CampaignRepository();
export const campaignApplicationRepository = new CampaignApplicationRepository();
export const socialPostRepository = new SocialPostRepository();
export const trackingLinkRepository = new TrackingLinkRepository();
