import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { computeCampaignBudget } from '@/server/finance/financeService';

/**
 * Get valid views count for a campaign
 */
export async function getValidViewsCount(campaignId: string): Promise<number> {
  const result = await db.visitEvent.count({
    where: {
      campaignId,
      isValidated: true,
    },
  });
  return result;
}

/**
 * Get valid views count for a specific creator in a campaign
 */
export async function getCreatorValidViewsCount(
  campaignId: string,
  creatorId: string
): Promise<number> {
  const result = await db.visitEvent.count({
    where: {
      campaignId,
      creatorId,
      isValidated: true,
    },
  });
  return result;
}

/**
 * Get budget spent for a campaign from the new ledger system
 * Uses LedgerEntry instead of PayoutLedger
 */
export async function getBudgetSpent(campaignId: string): Promise<number> {
  const result = await db.ledgerEntry.aggregate({
    where: {
      campaignId,
      type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT', 'PLATFORM_FEE'] },
      amountCents: { gt: 0 },
    },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents || 0;
}

/**
 * Get budget remaining for a campaign using the new finance system
 */
export async function getBudgetRemaining(
  campaignId: string
): Promise<{ total: number; locked: number; spent: number; remaining: number }> {
  const budgetInfo = await computeCampaignBudget(campaignId);

  return {
    total: budgetInfo.totalBudgetCents,
    locked: budgetInfo.lockedCents,
    spent: budgetInfo.spentCents,
    remaining: budgetInfo.remainingCents,
  };
}

/**
 * Get creator earnings for a specific campaign from the new ledger system
 */
export async function getCreatorCampaignEarnings(
  campaignId: string,
  creatorId: string
): Promise<{
  grossEarnings: number;
  platformFees: number;
  netEarnings: number;
  paidViews: number;
}> {
  const [payouts, fees, paidViewsCount] = await Promise.all([
    db.ledgerEntry.aggregate({
      where: {
        campaignId,
        creatorId,
        type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT'] },
        amountCents: { gt: 0 },
      },
      _sum: { amountCents: true },
    }),
    db.ledgerEntry.aggregate({
      where: {
        campaignId,
        creatorId,
        type: 'PLATFORM_FEE',
        amountCents: { gt: 0 },
      },
      _sum: { amountCents: true },
    }),
    db.ledgerEntry.count({
      where: {
        campaignId,
        creatorId,
        type: 'VIEW_PAYOUT',
      },
    }),
  ]);

  const netEarnings = payouts._sum.amountCents || 0;
  const platformFees = fees._sum.amountCents || 0;
  const grossEarnings = netEarnings + platformFees;

  return {
    grossEarnings,
    platformFees,
    netEarnings,
    paidViews: paidViewsCount,
  };
}

/**
 * Get top creators for a campaign using the new ledger system
 */
export async function getTopCreators(
  campaignId: string,
  limit: number = 10
): Promise<
  Array<{
    creatorId: string;
    creatorName: string | null;
    creatorEmail: string;
    creatorImage: string | null;
    validViews: number;
    paidViews: number;
    netEarnings: number;
    grossEarnings: number;
  }>
> {
  // Get creators with tracking links for this campaign
  const trackingLinks = await db.creatorTrackingLink.findMany({
    where: { campaignId },
    select: { creatorId: true },
    distinct: ['creatorId'],
  });

  const creatorIds = trackingLinks.map((tl) => tl.creatorId);

  // Get all stats in parallel
  const creatorsWithStats = await Promise.all(
    creatorIds.map(async (creatorId) => {
      const [creator, validViews, earnings] = await Promise.all([
        db.user.findUnique({
          where: { id: creatorId },
          select: { id: true, name: true, email: true, image: true },
        }),
        db.visitEvent.count({
          where: { campaignId, creatorId, isValidated: true },
        }),
        getCreatorCampaignEarnings(campaignId, creatorId),
      ]);

      return {
        creatorId,
        creatorName: creator?.name || null,
        creatorEmail: creator?.email || '',
        creatorImage: creator?.image || null,
        validViews,
        paidViews: earnings.paidViews,
        netEarnings: earnings.netEarnings,
        grossEarnings: earnings.grossEarnings,
      };
    })
  );

  // Sort by valid views descending and take top N
  return creatorsWithStats
    .sort((a, b) => b.validViews - a.validViews)
    .slice(0, limit);
}

/**
 * Get campaign statistics using the new finance system
 */
export async function getCampaignStats(campaignId: string) {
  const [validViews, budget, creators, campaign] = await Promise.all([
    getValidViewsCount(campaignId),
    getBudgetRemaining(campaignId),
    db.campaignApplication.count({
      where: { campaignId, status: 'APPROVED' },
    }),
    db.campaign.findUnique({
      where: { id: campaignId },
      select: { type: true },
    }),
  ]);

  let pendingVideos = 0;
  if (campaign?.type === 'VIDEO') {
    pendingVideos = await db.socialPost.count({
      where: {
        campaignApplication: { campaignId },
        status: 'PENDING',
      },
    });
  }

  return {
    validViews,
    totalBudget: budget.total,
    lockedBudget: budget.locked,
    spentBudget: budget.spent,
    remainingBudget: budget.remaining,
    approvedCreators: creators,
    pendingVideos,
  };
}

/**
 * Get creator statistics across all campaigns using the new ledger system
 */
export async function getCreatorStats(creatorId: string) {
  const [totalViews, earnings, activeCampaigns, balance] = await Promise.all([
    db.visitEvent.count({
      where: { creatorId, isValidated: true },
    }),
    db.ledgerEntry.aggregate({
      where: {
        creatorId,
        type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT'] },
        amountCents: { gt: 0 },
      },
      _sum: { amountCents: true },
    }),
    db.campaignApplication.count({
      where: { creatorId, status: 'APPROVED' },
    }),
    db.creatorBalance.findUnique({
      where: { creatorId },
    }),
  ]);

  return {
    totalViews,
    totalEarnings: earnings._sum.amountCents || 0,
    activeCampaigns,
    availableBalance: balance?.availableCents || 0,
  };
}

/**
 * Get creator's total balance from CreatorBalance table
 */
export async function getCreatorBalance(creatorId: string): Promise<{
  availableCents: number;
  pendingCents: number;
  totalEarnedCents: number;
}> {
  const balance = await db.creatorBalance.findUnique({
    where: { creatorId },
  });

  return {
    availableCents: balance?.availableCents || 0,
    pendingCents: balance?.pendingCents || 0,
    totalEarnedCents: balance?.totalEarnedCents || 0,
  };
}

/**
 * Get advertiser wallet balance
 */
export async function getAdvertiserWallet(advertiserId: string): Promise<{
  availableCents: number;
  pendingCents: number;
}> {
  const wallet = await db.wallet.findUnique({
    where: { ownerUserId: advertiserId },
  });

  return {
    availableCents: wallet?.availableCents || 0,
    pendingCents: wallet?.pendingCents || 0,
  };
}

/**
 * Get creator's daily stats for the last 7 days
 */
export async function getCreatorDailyStats(creatorId: string): Promise<{
  dailyEarnings: { day: string; value: number }[];
  dailyViews: { day: string; value: number }[];
}> {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: { dailyEarnings: { day: string; value: number }[]; dailyViews: { day: string; value: number }[] } = {
    dailyEarnings: [],
    dailyViews: [],
  };

  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    const dayName = dayNames[date.getDay()];
    
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [earningsResult, viewsResult] = await Promise.all([
      db.ledgerEntry.aggregate({
        where: {
          creatorId,
          type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT'] },
          amountCents: { gt: 0 },
          createdAt: { gte: dayStart, lte: dayEnd },
        },
        _sum: { amountCents: true },
      }),
      db.visitEvent.count({
        where: {
          creatorId,
          isValidated: true,
          occurredAt: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

    result.dailyEarnings.push({
      day: dayName,
      value: (earningsResult._sum.amountCents || 0) / 100,
    });
    result.dailyViews.push({
      day: dayName,
      value: viewsResult,
    });
  }

  return result;
}
