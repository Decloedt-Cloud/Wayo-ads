import { db } from '@/lib/db';

export interface GetAdminTransactionsParams {
  page?: number;
  limit?: number;
  reason?: string;
  campaignId?: string;
  creatorId?: string;
}

export interface TransactionWithRelations {
  id: string;
  amountCents: number;
  reason: string;
  createdAt: Date;
  campaign: {
    id: string;
    title: string;
    advertiser: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  creator: {
    id: string;
    name: string | null;
    email: string;
    trustScore: number;
    tier: string | null;
    creatorChannels: {
      channelName: string;
      subscriberCount: number;
    }[];
  };
}

export interface AdminTransactionsResult {
  transactions: TransactionWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmountCents: number;
    totalTransactions: number;
    byReason: { reason: string; _sum: { amountCents: number | null }; _count: { id: number } }[];
    topCampaigns: { campaignId: string; _sum: { amountCents: number | null }; _count: { id: number }; campaign: { id: string; title: string } | undefined }[];
  };
}

export async function getAdminTransactions(
  params: GetAdminTransactionsParams
): Promise<AdminTransactionsResult> {
  const { page = 1, limit = 50, reason, campaignId, creatorId } = params;

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (reason) {
    where.reason = reason;
  }
  if (campaignId) {
    where.campaignId = campaignId;
  }
  if (creatorId) {
    where.creatorId = creatorId;
  }

  const total = await db.payoutLedger.count({ where });

  const transactions = await db.payoutLedger.findMany({
    where,
    include: {
      campaign: {
        select: {
          id: true,
          title: true,
          advertiser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          trustScore: true,
          tier: true,
          creatorChannels: {
            where: { platform: 'YOUTUBE' },
            select: {
              channelName: true,
              subscriberCount: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip,
    take: limit,
  });

  const totalPayouts = await db.payoutLedger.aggregate({
    _sum: {
      amountCents: true,
    },
  });

  const payoutsByReason = await db.payoutLedger.groupBy({
    by: ['reason'],
    _sum: {
      amountCents: true,
    },
    _count: {
      id: true,
    },
  });

  const payoutsByCampaign = await db.payoutLedger.groupBy({
    by: ['campaignId'],
    _sum: {
      amountCents: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        amountCents: 'desc',
      },
    },
    take: 10,
  });

  const topCampaignIds = payoutsByCampaign.map(p => p.campaignId);
  const topCampaignsDetails = await db.campaign.findMany({
    where: {
      id: { in: topCampaignIds },
    },
    select: {
      id: true,
      title: true,
    },
  });

  const topCampaignsWithDetails = payoutsByCampaign.map(p => ({
    ...p,
    campaign: topCampaignsDetails.find(c => c.id === p.campaignId),
  }));

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      totalAmountCents: totalPayouts._sum.amountCents || 0,
      totalTransactions: total,
      byReason: payoutsByReason,
      topCampaigns: topCampaignsWithDetails,
    },
  };
}
