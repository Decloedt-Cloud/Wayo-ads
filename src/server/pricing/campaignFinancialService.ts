import { db } from '@/lib/db';
import { CampaignStatus, NotificationPriority } from '@prisma/client';
import { campaignRepository } from '@/server/campaigns/repositories';
import { creatorTrafficMetricsRepository } from '@/server/creators/repositories';

export interface CampaignFinancialSummary {
  campaignId: string;
  campaignTitle: string;
  campaignStatus: CampaignStatus;
  
  totalBudget: number;
  lockedBudget: number;
  spentBillable: number;
  paidToCreators: number;
  pendingPayouts: number;
  reservedAmount: number;
  underReviewAmount: number;
  remainingBudget: number;
  
  effectiveCPM: number;
  effectiveCPA: number | null;
  validationRate: number;
  fraudBlockRate: number;
  
  confidenceScore: number;
  confidenceBadge: 'HEALTHY' | 'MONITOR' | 'RISK';
  
  totalViews: number;
  validatedViews: number;
  billableViews: number;
  conversions: number;
  
  creatorRiskBreakdown: {
    low: number;
    medium: number;
    high: number;
    flagged: number;
  };
  
  dailySpend: Array<{
    date: string;
    spend: number;
    views: number;
    conversions: number;
  }>;
}

function calculateConfidenceScore(params: {
  validationRate: number;
  flaggedCreatorsPercent: number;
  fraudBlockRate: number;
  reserveExposurePercent: number;
  hasTrafficSpike: boolean;
}): { score: number; badge: 'HEALTHY' | 'MONITOR' | 'RISK' } {
  let score = 100;
  
  const { validationRate, flaggedCreatorsPercent, fraudBlockRate, reserveExposurePercent, hasTrafficSpike } = params;
  
  if (validationRate < 50) {
    score -= 10;
  }
  
  if (flaggedCreatorsPercent > 20) {
    score -= 15;
  }
  
  if (fraudBlockRate > 25) {
    score -= 10;
  }
  
  if (reserveExposurePercent > 15) {
    score -= 5;
  }
  
  if (hasTrafficSpike) {
    score -= 10;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let badge: 'HEALTHY' | 'MONITOR' | 'RISK';
  if (score >= 80) {
    badge = 'HEALTHY';
  } else if (score >= 60) {
    badge = 'MONITOR';
  } else {
    badge = 'RISK';
  }
  
  return { score, badge };
}

export async function computeCampaignFinancials(campaignId: string): Promise<CampaignFinancialSummary> {
  const campaign = await campaignRepository.findByIdWithBudgetLock(campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    visitStats,
    payoutStats,
    trafficMetricsData,
    last7DaysData,
    conversionStats,
  ] = await Promise.all([
    db.visitEvent.groupBy({
      by: ['isValidated', 'isBillable'],
      where: { campaignId },
      _count: { id: true },
    }),
    db.payoutQueue.groupBy({
      by: ['status'],
      where: { campaignId },
      _sum: { amountCents: true },
    }),
    creatorTrafficMetricsRepository.aggregateByCampaign(campaignId, sevenDaysAgo),
    db.ledgerEntry.groupBy({
      by: ['createdAt'],
      where: {
        campaignId,
        type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT'] },
      },
      _sum: { amountCents: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.conversionEvent.count({
      where: { campaignId },
    }),
  ]);

  const totalViews = visitStats.reduce((sum, v) => sum + v._count.id, 0);
  const validatedViews = visitStats
    .filter(v => v.isValidated)
    .reduce((sum, v) => sum + v._count.id, 0);
  const billableViews = visitStats
    .filter(v => v.isBillable)
    .reduce((sum, v) => sum + v._count.id, 0);
  
  const pendingPayouts = payoutStats
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + (p._sum.amountCents || 0), 0);
  
  const reservedAmount = payoutStats
    .filter(p => p.status === 'RELEASED')
    .reduce((sum, p) => {
      return sum + (p._sum.amountCents || 0) * 0.2;
    }, 0);

  const totalCreatorsWithTraffic = trafficMetricsData._count.id || 0;
  const flaggedCreators = await creatorTrafficMetricsRepository.countFlaggedByCampaign(campaignId, sevenDaysAgo);
  
  const flaggedCreatorsPercent = totalCreatorsWithTraffic > 0 
    ? (flaggedCreators / totalCreatorsWithTraffic) * 100 
    : 0;

  const validationRate = totalViews > 0 ? (validatedViews / totalViews) * 100 : 0;
  const fraudBlockRate = totalViews > 0 ? ((totalViews - validatedViews) / totalViews) * 100 : 0;
  const reserveExposurePercent = campaign.totalBudgetCents > 0 
    ? (reservedAmount / campaign.totalBudgetCents) * 100 
    : 0;

  const effectiveCPM = billableViews > 0 
    ? (campaign.spentBudgetCents / billableViews) * 1000 
    : 0;

  const effectiveCPA = conversionStats > 0 
    ? campaign.spentBudgetCents / conversionStats 
    : null;

  const hasTrafficSpike = last7DaysData.length > 0 && (() => {
    if (last7DaysData.length < 2) return false;
    const latest = last7DaysData[0]._sum.amountCents || 0;
    const previous = last7DaysData.slice(1, 4).reduce((sum, d) => sum + (d._sum.amountCents || 0), 0) / 3;
    if (previous === 0) return latest > 1000;
    return (latest - previous) / previous > 3;
  })();

  const { score: confidenceScore, badge: confidenceBadge } = calculateConfidenceScore({
    validationRate,
    flaggedCreatorsPercent,
    fraudBlockRate,
    reserveExposurePercent,
    hasTrafficSpike,
  });

  const dailySpendMap = new Map<string, { spend: number; views: number; conversions: number }>();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailySpendMap.set(dateStr, { spend: 0, views: 0, conversions: 0 });
  }

  for (const entry of last7DaysData) {
    const dateStr = entry.createdAt.toISOString().split('T')[0];
    const existing = dailySpendMap.get(dateStr);
    if (existing) {
      existing.spend += entry._sum.amountCents || 0;
    }
  }

  const dailySpend = Array.from(dailySpendMap.entries()).map(([date, data]) => ({
    date,
    spend: data.spend,
    views: data.views,
    conversions: data.conversions,
  }));

  await campaignRepository.update(campaignId, {
    totalValidatedViews: validatedViews,
    totalBillableViews: billableViews,
    totalPendingPayoutCents: pendingPayouts,
    totalReservedCents: reservedAmount,
    advertiserConfidenceScore: confidenceScore,
  });

  return {
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    campaignStatus: campaign.status,
    
    totalBudget: campaign.totalBudgetCents,
    lockedBudget: campaign.budgetLock?.lockedCents || 0,
    spentBillable: campaign.spentBudgetCents,
    paidToCreators: campaign.totalPaidOutCents,
    pendingPayouts,
    reservedAmount,
    underReviewAmount: campaign.totalUnderReviewCents,
    remainingBudget: campaign.totalBudgetCents - campaign.spentBudgetCents - pendingPayouts - reservedAmount,
    
    effectiveCPM,
    effectiveCPA,
    validationRate,
    fraudBlockRate,
    
    confidenceScore,
    confidenceBadge,
    
    totalViews,
    validatedViews,
    billableViews,
    conversions: conversionStats,
    
    creatorRiskBreakdown: {
      low: 0,
      medium: 0,
      high: 0,
      flagged: flaggedCreators,
    },
    
    dailySpend,
  };
}

export async function sendCampaignAlert(campaignId: string, alertType: 'LOW_CONFIDENCE' | 'HIGH_RISK_CREATORS') {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      advertiserId: true,
      title: true,
      advertiserConfidenceScore: true,
      status: true,
    },
  });

  if (!campaign || campaign.status !== 'ACTIVE') {
    return;
  }

  let message = '';
  let priority: NotificationPriority = 'P2_NORMAL';

  if (alertType === 'LOW_CONFIDENCE') {
    message = `Campaign "${campaign.title}" has a low confidence score of ${campaign.advertiserConfidenceScore}. Consider reviewing your campaign settings or creator selection.`;
    priority = campaign.advertiserConfidenceScore < 40 ? 'P1_HIGH' : 'P2_NORMAL';
  } else if (alertType === 'HIGH_RISK_CREATORS') {
    message = `Campaign "${campaign.title}" has creators with high risk flags. Consider restricting to LOW risk creators only.`;
    priority = 'P1_HIGH';
  }

  const notificationType = alertType === 'LOW_CONFIDENCE' ? 'CAMPAIGN_CONFIDENCE_LOW' : 'CAMPAIGN_UNDER_REVIEW';

  await db.notification.create({
    data: {
      scope: 'USER',
      toUserId: campaign.advertiserId,
      type: notificationType,
      title: `Campaign Alert: ${campaign.title}`,
      message,
      priority,
      actionUrl: `/dashboard/advertiser/campaigns/${campaignId}`,
    },
  });
}

export async function checkAndAlertCampaignHealth(campaignId: string) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      advertiserConfidenceScore: true,
      status: true,
    },
  });

  if (!campaign || campaign.status !== 'ACTIVE') {
    return;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (campaign.advertiserConfidenceScore < 60) {
    await sendCampaignAlert(campaignId, 'LOW_CONFIDENCE');
  }

  const flaggedCreators = await creatorTrafficMetricsRepository.countFlaggedByCampaign(campaignId, sevenDaysAgo);

  const totalCreators = await creatorTrafficMetricsRepository.countByCampaign(campaignId, sevenDaysAgo);

  if (totalCreators > 0 && (flaggedCreators / totalCreators) > 0.2) {
    await sendCampaignAlert(campaignId, 'HIGH_RISK_CREATORS');
  }
}

export interface CampaignFinancialStats {
  byStatus: Array<{
    status: CampaignStatus;
    _count: { id: number };
    _avg: { advertiserConfidenceScore: number | null };
  }>;
  lowConfidenceCampaigns: number;
  campaignsWithFlaggedCreators: number;
}

export async function getCampaignFinancialStats(): Promise<CampaignFinancialStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stats = await db.campaign.groupBy({
    by: ['status'],
    _count: { id: true },
    _avg: { advertiserConfidenceScore: true },
  });

  const lowConfidence = await db.campaign.count({
    where: {
      status: 'ACTIVE',
      advertiserConfidenceScore: { lt: 60 },
    },
  });

  const flaggedCreators = await db.creatorTrafficMetrics.groupBy({
    by: ['campaignId'],
    where: {
      flagged: true,
      date: { gte: sevenDaysAgo },
    },
    _count: { id: true },
  });

  return {
    byStatus: stats,
    lowConfidenceCampaigns: lowConfidence,
    campaignsWithFlaggedCreators: flaggedCreators.length,
  };
}
