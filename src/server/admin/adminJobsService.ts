import { db } from '@/lib/db';
import { config } from '@/lib/tracking';
import { youtubeService } from '@/server/integrations/youtubeService';
import { createPayoutQueueEntry } from '@/server/payouts/payoutService';
import { LedgerEntryType } from '@prisma/client';
import { 
  notifyFraudDetected, 
  notifyCampaignAutoPaused, 
  notifySuspiciousActivity, 
  notifyFraudScoreExceeded 
} from '@/server/notifications/notificationTriggers';

const MAX_POSTS_PER_RUN = 50;
const MAX_DELTA_PERCENT = 300;
const HOURLY_VIEW_CAP = 10000;

export interface FraudCheckResult {
  passed: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface CheckPostViewsInput {
  maxPosts?: number;
}

export interface CheckPostViewsResult {
  success: boolean;
  processed: number;
  validatedDeltas: number;
  flaggedPosts: number;
  quotaUsage: { used: number; limit: number; percentUsed: number };
  results: Array<{
    postId: string;
    success: boolean;
    delta?: number;
    validated?: boolean;
    flagged?: boolean;
    error?: string;
  }>;
}

export async function validateViewDelta(
  post: { id: string; currentViews: number; lastCheckedViews: number; trustScore: number; dailyCap: number | null },
  delta: number,
  campaignDailyBudgetCents: number | null
): Promise<FraudCheckResult> {
  if (delta <= 0) {
    return { passed: false, reason: 'No view growth', severity: 'low' };
  }

  const percentIncrease = post.lastCheckedViews > 0 
    ? ((delta / post.lastCheckedViews) * 100)
    : 100;

  if (percentIncrease > MAX_DELTA_PERCENT) {
    return { 
      passed: false, 
      reason: `View growth ${percentIncrease.toFixed(0)}% exceeds maximum ${MAX_DELTA_PERCENT}%`,
      severity: 'high'
    };
  }

  if (campaignDailyBudgetCents && delta > (campaignDailyBudgetCents / 1000)) {
    return {
      passed: false,
      reason: `Delta ${delta} exceeds campaign daily budget`,
      severity: 'medium'
    };
  }

  if (delta > HOURLY_VIEW_CAP) {
    return {
      passed: false,
      reason: `Delta ${delta} exceeds hourly cap ${HOURLY_VIEW_CAP}`,
      severity: 'high'
    };
  }

  if (post.trustScore < 30) {
    return {
      passed: true,
      reason: 'Low trust score - reduced payout',
      severity: 'low'
    };
  }

  return { passed: true };
}

export async function checkPostViews(input: CheckPostViewsInput = {}): Promise<CheckPostViewsResult> {
  const maxPosts = input.maxPosts || MAX_POSTS_PER_RUN;
  
  const quotaUsage = youtubeService.getQuotaUsage();
  
  if (quotaUsage.percentUsed > 80) {
    return {
      success: false,
      processed: 0,
      validatedDeltas: 0,
      flaggedPosts: 0,
      quotaUsage,
      results: [],
    };
  }

  const activePosts = await db.socialPost.findMany({
    where: {
      platform: 'YOUTUBE',
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

  let processed = 0;
  let validatedDeltas = 0;
  let flaggedPosts = 0;
  const results: Array<{
    postId: string;
    success: boolean;
    delta?: number;
    validated?: boolean;
    flagged?: boolean;
    error?: string;
  }> = [];

  for (const post of activePosts) {
    try {
      const stats = await youtubeService.getVideoStatistics(post.externalPostId);
      const currentViews = stats.viewCount;
      const delta = currentViews - post.lastCheckedViews;

      const campaignDailyBudget = post.campaignApplication?.campaign?.dailyBudgetCents 
        ? Math.floor(post.campaignApplication.campaign.dailyBudgetCents / 1000) 
        : null;

      const fraudCheck = await validateViewDelta(
        {
          id: post.id,
          currentViews: post.currentViews,
          lastCheckedViews: post.lastCheckedViews,
          trustScore: post.trustScore,
          dailyCap: post.dailyCap,
        },
        delta,
        campaignDailyBudget
      );

      const snapshot = await db.postViewSnapshot.create({
        data: {
          socialPostId: post.id,
          viewCount: currentViews,
          likeCount: stats.likeCount,
          commentCount: stats.commentCount,
          deltaViews: delta,
          deltaLikes: 0,
          deltaComments: 0,
          isValidated: fraudCheck.passed,
          validationReason: fraudCheck.reason,
          isFlagged: !fraudCheck.passed,
          flagReason: fraudCheck.reason || null,
        },
      });

      if (!fraudCheck.passed) {
        await db.socialPost.update({
          where: { id: post.id },
          data: {
            status: 'FLAGGED',
            flagReason: fraudCheck.reason || 'Unknown',
            flagReasonDetails: `Delta: ${delta}, Severity: ${fraudCheck.severity}`,
            currentViews,
            lastCheckedViews: currentViews,
            lastCheckedAt: new Date(),
          },
        });
        flaggedPosts++;
      } else {
        if (delta > 0) {
          const trustMultiplier = post.trustScore >= 70 ? 1.0 : post.trustScore >= 50 ? 0.8 : 0.5;
          const payoutAmount = Math.floor((delta * (post.cpmCents / 1000)) * trustMultiplier);

          if (payoutAmount > 0 && post.campaignApplication?.campaign?.id && post.campaignApplication?.creator?.id) {
            const payoutResult = await createPayoutQueueEntry({
              creatorId: post.campaignApplication.creator.id,
              campaignId: post.campaignApplication.campaign.id,
              amountCents: payoutAmount,
              type: LedgerEntryType.VIEW_PAYOUT,
              riskScore: 100 - post.trustScore,
            });

            if (payoutResult.success) {
              await db.postViewSnapshot.update({
                where: { id: snapshot.id },
                data: {
                  payoutAmountCents: payoutAmount,
                  payoutQueueId: payoutResult.payoutQueueId,
                },
              });
            }
          }

          await db.socialPost.update({
            where: { id: post.id },
            data: {
              currentViews,
              lastCheckedViews: currentViews,
              totalValidatedViews: { increment: delta },
              lastCheckedAt: new Date(),
            },
          });
          validatedDeltas++;
        } else {
          await db.socialPost.update({
            where: { id: post.id },
            data: {
              currentViews,
              lastCheckedViews: currentViews,
              lastCheckedAt: new Date(),
            },
          });
        }
      }

      processed++;
      results.push({
        postId: post.id,
        success: true,
        delta,
        validated: fraudCheck.passed,
        flagged: !fraudCheck.passed,
      });
    } catch (error) {
      console.error(`Error processing post ${post.id}:`, error);
      results.push({
        postId: post.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const newQuotaUsage = youtubeService.getQuotaUsage();

  return {
    success: true,
    processed,
    validatedDeltas,
    flaggedPosts,
    quotaUsage: newQuotaUsage,
    results,
  };
}

export async function getCheckPostViewsStats() {
  const stats = await db.socialPost.groupBy({
    by: ['status'],
    where: {
      platform: 'YOUTUBE',
    },
    _count: true,
  });

  const recentSnapshots = await db.postViewSnapshot.findMany({
    where: {
      checkedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    orderBy: {
      checkedAt: 'desc',
    },
    take: 20,
    include: {
      socialPost: {
        select: {
          id: true,
          title: true,
          externalPostId: true,
        },
      },
    },
  });

  return {
    postsByStatus: stats,
    recentSnapshots,
    quotaUsage: youtubeService.getQuotaUsage(),
  };
}

const BATCH_SIZE = 50;

export interface RefreshVideoStatusResult {
  message: string;
  processed: number;
  updated: number;
  failed: number;
  quotaUsage: { used: number; limit: number; percentUsed: number };
}

export async function refreshVideoStatus(): Promise<RefreshVideoStatusResult> {
  const quotaUsage = youtubeService.getQuotaUsage();
  
  if (quotaUsage.percentUsed > 80) {
    return {
      message: 'API quota exceeded threshold',
      processed: 0,
      updated: 0,
      failed: 0,
      quotaUsage,
    };
  }

  const posts = await db.socialPost.findMany({
    where: {
      platform: 'YOUTUBE',
      status: { in: ['PENDING', 'ACTIVE'] },
      externalPostId: { not: undefined },
    },
    select: {
      id: true,
      externalPostId: true,
      youtubePrivacyStatus: true,
      title: true,
      thumbnailUrl: true,
    },
    take: BATCH_SIZE,
    orderBy: {
      updatedAt: 'asc',
    },
  });

  if (posts.length === 0) {
    return {
      message: 'No YouTube videos need status refresh',
      processed: 0,
      updated: 0,
      failed: 0,
      quotaUsage: youtubeService.getQuotaUsage(),
    };
  }

  const validPosts = posts.filter((p): p is typeof p & { externalPostId: string } => !!p.externalPostId);
  const videoIds = validPosts.map(p => p.externalPostId);
  const results = await youtubeService.fetchBatchVideoStatus(videoIds);

  let updated = 0;
  let failed = 0;

  for (const post of validPosts) {
    const videoData = results.get(post.externalPostId);
    
    if (videoData) {
      await db.socialPost.update({
        where: { id: post.id },
        data: {
          youtubePrivacyStatus: videoData.privacyStatus,
          title: videoData.title || post.title,
          thumbnailUrl: videoData.thumbnail || post.thumbnailUrl,
        },
      });
      updated++;
    } else {
      failed++;
    }
  }

  return {
    message: `Processed ${posts.length} videos`,
    processed: posts.length,
    updated,
    failed,
    quotaUsage: youtubeService.getQuotaUsage(),
  };
}

export interface CreatorMetricResult {
  creatorId: string;
  campaignId: string;
  totalRecorded: number;
  totalValidated: number;
  totalBillable: number;
  totalConversions: number;
  avgFraudScore: number;
  uniqueIPs: number;
  uniqueFingerprints: number;
  geoDiversity: number;
  validationRate: number;
  conversionRate: number;
  previousAvgViews: number;
  spikePercent: number;
  anomalyScore: number;
  flagged: boolean;
  flagReasons: string[];
}

export interface AggregateCreatorMetricsResult {
  success: boolean;
  date: string;
  processed: number;
  flagged: number;
  results: CreatorMetricResult[];
}

export function calculateAnomalyScore(metrics: CreatorMetricResult): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (metrics.totalRecorded === 0) {
    return { score: 0, reasons: [] };
  }

  if (metrics.validationRate > 0.95) {
    score += 2;
    reasons.push('VALIDATION_RATE_TOO_HIGH');
  }

  if (metrics.validationRate < 0.20 && metrics.totalRecorded > 10) {
    score += 3;
    reasons.push('VALIDATION_RATE_TOO_LOW');
  }

  const ipConcentrationRatio = metrics.totalValidated > 0 
    ? metrics.uniqueIPs / metrics.totalValidated 
    : 0;
  
  if (ipConcentrationRatio < 0.2 && metrics.totalValidated > 10) {
    score += 2;
    reasons.push('IP_CONCENTRATION_TOO_HIGH');
  }

  if (metrics.geoDiversity < 0.1 && metrics.totalValidated > 10) {
    score += 3;
    reasons.push('GEO_DIVERSITY_TOO_LOW');
  }

  if (metrics.avgFraudScore > (config.fraudScoreThreshold || 50)) {
    score += 3;
    reasons.push('AVG_FRAUD_SCORE_HIGH');
  }

  if (metrics.spikePercent > 300 && metrics.previousAvgViews > 0) {
    score += 2;
    reasons.push('TRAFFIC_SPIKE_ANOMALY');
  }

  return { score, reasons: reasons.length >= 5 ? reasons : [] };
}

async function getPrevious3DayAverage(creatorId: string, campaignId: string, currentDate: Date): Promise<number> {
  const threeDaysAgo = new Date(currentDate);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const oneDayAgo = new Date(currentDate);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  oneDayAgo.setHours(23, 59, 59, 999);

  const previousMetrics = await db.creatorTrafficMetrics.findMany({
    where: {
      creatorId,
      campaignId,
      date: {
        gte: threeDaysAgo,
        lt: oneDayAgo,
      },
    },
    select: {
      totalRecorded: true,
    },
  });

  if (previousMetrics.length === 0) return 0;

  const totalViews = previousMetrics.reduce((sum, m) => sum + m.totalRecorded, 0);
  return totalViews / previousMetrics.length;
}

async function createSafetyNotification(creatorId: string, campaignId: string, reasons: string[]) {
  await db.notification.create({
    data: {
      scope: 'USER',
      toUserId: creatorId,
      type: 'FRAUD_DETECTED',
      priority: 'P1_HIGH',
      title: 'Campaign Flagged for Review',
      message: `Your campaign has been flagged due to: ${reasons.join(', ')}. Traffic is under review.`,
      actionUrl: `/admin/campaigns/${campaignId}`,
    },
  });
}

async function processCampaignSafety(metrics: CreatorMetricResult) {
  if (!metrics.flagged || !metrics.campaignId) {
    return;
  }

  const existingCampaign = await db.campaign.findUnique({
    where: { id: metrics.campaignId },
    select: { status: true },
  });

  if (existingCampaign && existingCampaign.status === 'ACTIVE') {
    await db.campaign.update({
      where: { id: metrics.campaignId },
      data: { status: 'UNDER_REVIEW' },
    });

    await createSafetyNotification(metrics.creatorId, metrics.campaignId, metrics.flagReasons);

    await notifyFraudDetected({
      campaignId: metrics.campaignId,
      reason: metrics.flagReasons.join(', '),
    });

    if (metrics.avgFraudScore > 30) {
      try {
        await notifyFraudScoreExceeded({
          creatorId: metrics.creatorId,
          score: metrics.avgFraudScore,
          campaignId: metrics.campaignId,
        });
      } catch (notifyError) {
        console.error('[FRAUD_SCORE] Failed to send notification:', notifyError);
      }
    }

    console.log(`[TRAFFIC_SAFETY] Campaign ${metrics.campaignId} flagged for review`, {
      creatorId: metrics.creatorId,
      anomalyScore: metrics.anomalyScore,
      reasons: metrics.flagReasons,
    });
  }
}

export async function aggregateCreatorMetrics(targetDate?: Date): Promise<AggregateCreatorMetricsResult> {
  const date = targetDate || new Date();
  date.setHours(0, 0, 0, 0);

  console.log(`[AGGREGATE_METRICS] Starting aggregation for ${date.toISOString().split('T')[0]}`);

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const creatorCampaigns = await db.visitEvent.findMany({
    where: {
      occurredAt: { gte: startOfDay, lte: endOfDay },
    },
    select: {
      creatorId: true,
      campaignId: true,
    },
    distinct: ['creatorId', 'campaignId'],
  });

  const results: CreatorMetricResult[] = [];

  for (const { creatorId, campaignId } of creatorCampaigns) {
    const [
      totalRecorded,
      totalValidated,
      totalBillable,
      fraudScoreAgg,
      uniqueIPs,
      uniqueFingerprints,
      conversionsAgg,
      geoCountries,
    ] = await Promise.all([
      db.visitEvent.count({
        where: { creatorId, campaignId, occurredAt: { gte: startOfDay, lte: endOfDay } },
      }),
      db.visitEvent.count({
        where: { creatorId, campaignId, isValidated: true, occurredAt: { gte: startOfDay, lte: endOfDay } },
      }),
      db.visitEvent.count({
        where: { creatorId, campaignId, isBillable: true, occurredAt: { gte: startOfDay, lte: endOfDay } },
      }),
      db.visitEvent.aggregate({
        _avg: { fraudScore: true },
        where: { creatorId, campaignId, isValidated: true, occurredAt: { gte: startOfDay, lte: endOfDay } },
      }),
      db.visitEvent.findMany({
        where: { creatorId, campaignId, isValidated: true, ipHash: { not: null }, occurredAt: { gte: startOfDay, lte: endOfDay } },
        select: { ipHash: true },
        distinct: ['ipHash'],
      }),
      db.visitEvent.findMany({
        where: { creatorId, campaignId, isValidated: true, deviceFingerprintHash: { not: null }, occurredAt: { gte: startOfDay, lte: endOfDay } },
        select: { deviceFingerprintHash: true },
        distinct: ['deviceFingerprintHash'],
      }),
      db.conversionEvent.count({
        where: { creatorId, campaignId, occurredAt: { gte: startOfDay, lte: endOfDay } },
      }),
      db.visitEvent.findMany({
        where: { creatorId, campaignId, isValidated: true, geoCountry: { not: null }, occurredAt: { gte: startOfDay, lte: endOfDay } },
        select: { geoCountry: true },
        distinct: ['geoCountry'],
      }),
    ]);

    const uniqueIPCount = uniqueIPs.length;
    const uniqueFingerprintCount = uniqueFingerprints.length;
    const geoDiversity = totalValidated > 0 ? geoCountries.length / totalValidated : 0;
    const validationRate = totalRecorded > 0 ? totalValidated / totalRecorded : 0;
    const conversionRate = totalValidated > 0 ? conversionsAgg / totalValidated : 0;

    const previousAvgViews = await getPrevious3DayAverage(creatorId, campaignId, date);
    const spikePercent = previousAvgViews > 0 ? ((totalRecorded - previousAvgViews) / previousAvgViews) * 100 : 0;

    const { score, reasons } = calculateAnomalyScore({
      creatorId,
      campaignId,
      totalRecorded,
      totalValidated,
      totalBillable,
      totalConversions: conversionsAgg,
      avgFraudScore: fraudScoreAgg._avg.fraudScore || 0,
      uniqueIPs: uniqueIPCount,
      uniqueFingerprints: uniqueFingerprintCount,
      geoDiversity,
      validationRate,
      conversionRate,
      previousAvgViews,
      spikePercent,
      anomalyScore: 0,
      flagged: false,
      flagReasons: [],
    });

    const flagged = score >= 5;

    const metricResult: CreatorMetricResult = {
      creatorId,
      campaignId,
      totalRecorded,
      totalValidated,
      totalBillable,
      totalConversions: conversionsAgg,
      avgFraudScore: fraudScoreAgg._avg.fraudScore || 0,
      uniqueIPs: uniqueIPCount,
      uniqueFingerprints: uniqueFingerprintCount,
      geoDiversity,
      validationRate,
      conversionRate,
      previousAvgViews,
      spikePercent,
      anomalyScore: score,
      flagged,
      flagReasons: reasons,
    };

    await db.creatorTrafficMetrics.upsert({
      where: {
        creatorId_campaignId_date: {
          creatorId,
          campaignId,
          date: startOfDay,
        },
      },
      update: {
        totalRecorded,
        totalValidated,
        totalBillable,
        totalConversions: conversionsAgg,
        avgFraudScore: fraudScoreAgg._avg.fraudScore || 0,
        uniqueIPs: uniqueIPCount,
        uniqueFingerprints: uniqueFingerprintCount,
        geoDiversityScore: geoDiversity,
        validationRate,
        conversionRate,
        previousAvgViews,
        spikePercent,
        anomalyScore: score,
        flagged,
        flagReasons: reasons.length > 0 ? JSON.stringify(reasons) : null,
        updatedAt: new Date(),
      },
      create: {
        creatorId,
        campaignId,
        date: startOfDay,
        totalRecorded,
        totalValidated,
        totalBillable,
        totalConversions: conversionsAgg,
        avgFraudScore: fraudScoreAgg._avg.fraudScore || 0,
        uniqueIPs: uniqueIPCount,
        uniqueFingerprints: uniqueFingerprintCount,
        geoDiversityScore: geoDiversity,
        validationRate,
        conversionRate,
        previousAvgViews,
        spikePercent,
        anomalyScore: score,
        flagged,
        flagReasons: reasons.length > 0 ? JSON.stringify(reasons) : null,
      },
    });

    await processCampaignSafety(metricResult);

    results.push(metricResult);
  }

  const flaggedCount = results.filter(r => r.flagged).length;

  console.log(`[AGGREGATE_METRICS] Completed. Processed ${results.length} creator-campaigns, ${flaggedCount} flagged`);

  return {
    success: true,
    date: date.toISOString().split('T')[0],
    processed: results.length,
    flagged: flaggedCount,
    results: results.slice(0, 10),
  };
}

export async function getAggregateCreatorMetricsStats() {
  const last7Days = await db.creatorTrafficMetrics.findMany({
    where: {
      date: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: 'desc' },
    take: 100,
  });

  const flaggedCount = await db.creatorTrafficMetrics.count({
    where: { flagged: true },
  });

  const avgAnomalyScore = await db.creatorTrafficMetrics.aggregate({
    _avg: { anomalyScore: true },
    where: {
      date: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  return {
    summary: {
      totalMetrics: last7Days.length,
      flaggedCreators: flaggedCount,
      avgAnomalyScore: avgAnomalyScore._avg.anomalyScore || 0,
    },
    recentMetrics: last7Days.slice(0, 20),
  };
}
