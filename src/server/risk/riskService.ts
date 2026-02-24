import { CreatorTier } from '@prisma/client';
import { domainEventBus } from '@/lib/events/domainEventBus';
import { creatorRepository, creatorTrafficMetricsRepository } from '@/server/creators/repositories';

export interface TrustScoreResult {
  trustScore: number;
  tier: CreatorTier;
  qualityMultiplier: number;
  isVerified: boolean;
  
  breakdown: {
    validationRatePoints: number;
    conversionRatePoints: number;
    fraudScorePoints: number;
    anomalyScorePoints: number;
  };
}

export interface CreatorMetrics {
  validationRate: number;
  conversionRate: number;
  avgFraudScore: number;
  avgAnomalyScore: number;
  isFlagged: boolean;
  totalViews: number;
  totalConversions: number;
}

const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 50,
  GOLD: 80,
};

const QUALITY_MULTIPLIERS = {
  BRONZE: 0.8,
  SILVER: 1.0,
  GOLD: 1.2,
};

function calculateTier(trustScore: number): CreatorTier {
  if (trustScore >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (trustScore >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

function getQualityMultiplier(tier: CreatorTier): number {
  return QUALITY_MULTIPLIERS[tier];
}

export async function computeCreatorTrustScore(creatorId: string): Promise<TrustScoreResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentMetrics = await creatorTrafficMetricsRepository.aggregateRecentByCreatorId(creatorId, thirtyDaysAgo);

  const user = await creatorRepository.findById(creatorId);

  const isVerified = user?.verificationLevel === 'YOUTUBE_VERIFIED';

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const flaggedCount = await creatorTrafficMetricsRepository.countFlagged(creatorId, sevenDaysAgo);
  const isFlagged = flaggedCount > 0;

  const validationRate = recentMetrics._avg.validationRate || 0;
  const conversionRate = recentMetrics._avg.conversionRate || 0;
  const avgFraudScore = recentMetrics._avg.avgFraudScore || 0;
  const avgAnomalyScore = recentMetrics._avg.anomalyScore || 0;

  let trustScore = 50;

  const validationRatePoints = Math.min(30, (validationRate / 100) * 30);
  const conversionRatePoints = Math.min(30, Math.min(30, conversionRate * 30));
  const fraudScorePoints = Math.max(0, 20 - (avgFraudScore / 100) * 20);
  const anomalyScorePoints = Math.max(0, 20 - (avgAnomalyScore / 10) * 20);

  trustScore = Math.round(
    validationRatePoints +
    conversionRatePoints +
    fraudScorePoints +
    anomalyScorePoints
  );

  trustScore = Math.max(0, Math.min(100, trustScore));

  if (isFlagged) {
    trustScore = Math.min(trustScore, 30);
  }

  trustScore = isVerified ? trustScore : Math.min(Math.round(trustScore * 0.75), 70);

  const tier = calculateTier(trustScore);
  const qualityMultiplier = isVerified 
    ? getQualityMultiplier(tier) 
    : Math.round(getQualityMultiplier(tier) * 0.85 * 100) / 100;

  // Get old values before update
  const oldUser = await creatorRepository.findById(creatorId);

  const oldTrustScore = oldUser?.trustScore ?? 100;
  const oldTier = oldUser?.tier ?? 'BRONZE';

  await creatorRepository.updateTrustScore(creatorId, trustScore, tier, qualityMultiplier);

  // Send notifications for score/tier changes
  try {
    if (oldTrustScore > trustScore && (oldTrustScore - trustScore) >= 10) {
      await domainEventBus.publish(domainEventBus.createEvent('TRUST_SCORE_DOWNGRADED', {
        creatorId,
        oldScore: oldTrustScore,
        newScore: trustScore,
      }));
    }

    if (oldTier !== tier) {
      await domainEventBus.publish(domainEventBus.createEvent('CREATOR_TIER_CHANGED', {
        creatorId,
        oldTier,
        newTier: tier,
      }));
    }
  } catch (notifyError) {
    console.error('Failed to send trust score notifications:', notifyError);
  }

  return {
    trustScore,
    tier,
    qualityMultiplier,
    isVerified,
    breakdown: {
      validationRatePoints: Math.round(validationRatePoints * 10) / 10,
      conversionRatePoints: Math.round(conversionRatePoints * 10) / 10,
      fraudScorePoints: Math.round(fraudScorePoints * 10) / 10,
      anomalyScorePoints: Math.round(anomalyScorePoints * 10) / 10,
    },
  };
}

export async function getCreatorTrustScore(creatorId: string): Promise<TrustScoreResult | null> {
  const user = await creatorRepository.findById(creatorId);

  if (!user) return null;

  const isVerified = user.verificationLevel === 'YOUTUBE_VERIFIED';
  const effectiveTrustScore = isVerified 
    ? user.trustScore 
    : Math.min(Math.round(user.trustScore * 0.75), 70);
  const effectiveMultiplier = isVerified
    ? user.qualityMultiplier
    : Math.round(user.qualityMultiplier * 0.85 * 100) / 100;

  return {
    trustScore: effectiveTrustScore,
    tier: user.tier,
    qualityMultiplier: effectiveMultiplier,
    isVerified,
    breakdown: {
      validationRatePoints: 0,
      conversionRatePoints: 0,
      fraudScorePoints: 0,
      anomalyScorePoints: 0,
    },
  };
}

export async function batchComputeTrustScores(): Promise<{ success: number; failed: number }> {
  const creators = await creatorRepository.findByRole('CREATOR');

  let success = 0;
  let failed = 0;

  for (const creator of creators) {
    try {
      await computeCreatorTrustScore(creator.id);
      success++;
    } catch (error) {
      console.error(`Failed to compute trust score for creator ${creator.id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

export function getTierColor(tier: CreatorTier): string {
  switch (tier) {
    case 'GOLD': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'SILVER': return 'text-gray-600 bg-gray-100 border-gray-200';
    case 'BRONZE': return 'text-amber-700 bg-amber-100 border-amber-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
}

export function getTierLabel(tier: CreatorTier): string {
  switch (tier) {
    case 'GOLD': return 'Gold';
    case 'SILVER': return 'Silver';
    case 'BRONZE': return 'Bronze';
    default: return 'Unknown';
  }
}
