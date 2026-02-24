import { db } from '@/lib/db';
import { RiskLevel, LedgerEntryType } from '@prisma/client';
import { domainEventBus } from '@/lib/events/domainEventBus';
import { payoutQueueRepository, creatorBalanceRepository } from './repositories';
import { creatorRepository, creatorTrafficMetricsRepository } from '@/server/creators/repositories';
import { socialPostRepository } from '@/server/campaigns/repositories';

export interface CreatePayoutQueueParams {
  creatorId: string;
  campaignId: string;
  amountCents: number;
  type: LedgerEntryType;
  riskScore?: number;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  payoutDelayDays: number;
  reservePercent: number;
  reserveAmountCents: number;
}

export async function assessCreatorRisk(creatorId: string): Promise<RiskAssessment> {
  const balance = await creatorBalanceRepository.findByCreatorId(creatorId);

  if (balance) {
    return {
      riskLevel: balance.riskLevel,
      payoutDelayDays: balance.payoutDelayDays,
      reservePercent: balance.riskLevel === 'HIGH' ? 20 : 0,
      reserveAmountCents: 0,
    };
  }

  return {
    riskLevel: 'MEDIUM',
    payoutDelayDays: 3,
    reservePercent: 0,
    reserveAmountCents: 0,
  };
}

export async function assessCreatorRiskByScore(anomalyScore: number): Promise<RiskAssessment> {
  if (anomalyScore < 3) {
    return {
      riskLevel: 'LOW',
      payoutDelayDays: 2,
      reservePercent: 0,
      reserveAmountCents: 0,
    };
  }

  if (anomalyScore >= 3 && anomalyScore < 7) {
    return {
      riskLevel: 'MEDIUM',
      payoutDelayDays: 5,
      reservePercent: 0,
      reserveAmountCents: 0,
    };
  }

  return {
    riskLevel: 'HIGH',
    payoutDelayDays: 14,
    reservePercent: 20,
    reserveAmountCents: 0,
  };
}

export async function getVerificationAdjustedRisk(creatorId: string, baseAnomalyScore: number): Promise<{
  adjustedAnomalyScore: number;
  spikeThreshold: number;
  dailyCapMultiplier: number;
  isVerified: boolean;
}> {
  const user = await creatorRepository.findById(creatorId);

  const isVerified = user?.verificationLevel === 'YOUTUBE_VERIFIED';

  if (isVerified) {
    return {
      adjustedAnomalyScore: baseAnomalyScore,
      spikeThreshold: 300,
      dailyCapMultiplier: 1.0,
      isVerified: true,
    };
  }

  return {
    adjustedAnomalyScore: baseAnomalyScore + 2,
    spikeThreshold: 200,
    dailyCapMultiplier: 0.6,
    isVerified: false,
  };
}

export async function getEffectiveDailyCap(socialPostId: string, baseDailyCap: number | null): Promise<number | null> {
  const socialPost = await socialPostRepository.findByIdWithCreatorVerification(socialPostId);

  if (!socialPost || !baseDailyCap) {
    return baseDailyCap;
  }

  const isVerified = socialPost.campaignApplication.creator.verificationLevel === 'YOUTUBE_VERIFIED';
  
  if (isVerified) {
    return baseDailyCap;
  }

  return Math.round(baseDailyCap * 0.6);
}

export async function getLatestAnomalyScore(creatorId: string): Promise<number> {
  const latestMetrics = await creatorTrafficMetricsRepository.findLatestByCreatorId(creatorId);

  if (!latestMetrics) {
    return 0;
  }

  return latestMetrics.anomalyScore;
}

export async function createPayoutQueueEntry(params: CreatePayoutQueueParams): Promise<{ success: boolean; payoutQueueId?: string; error?: string }> {
  const { creatorId, campaignId, amountCents, type, riskScore = 0 } = params;

  try {
    const riskAssessment = await assessCreatorRiskByScore(riskScore);
    const balance = await creatorBalanceRepository.findByCreatorId(creatorId);

    if (!balance) {
      return { success: false, error: 'Creator balance not found' };
    }

    const { calculateAdjustedCpm } = await import('@/server/pricing/dynamicCpmService');
    
    let finalAmountCents = amountCents;
    let cpmAdjustment: {
      baseCpmCents: number;
      adjustedCpmCents: number;
      appliedMultiplier: number;
      creatorTrustScore: number;
      creatorTier: 'BRONZE' | 'SILVER' | 'GOLD';
      wasAdjusted: boolean;
    } = {
      baseCpmCents: amountCents * 1000,
      adjustedCpmCents: amountCents * 1000,
      appliedMultiplier: 1.0,
      creatorTrustScore: 50,
      creatorTier: 'BRONZE',
      wasAdjusted: false,
    };

    try {
      cpmAdjustment = await calculateAdjustedCpm(campaignId, creatorId);
      if (cpmAdjustment.wasAdjusted) {
        finalAmountCents = cpmAdjustment.adjustedCpmCents / 1000;
      }
    } catch (e) {
      console.warn('[DYNAMIC_CPM] Failed to calculate adjusted CPM, using base:', e);
    }

    const reserveAmountCents = Math.round(finalAmountCents * (riskAssessment.reservePercent / 100));
    const eligibleAt = new Date();
    eligibleAt.setDate(eligibleAt.getDate() + riskAssessment.payoutDelayDays);

    const payoutQueueEntry = await payoutQueueRepository.create({
      creatorId,
      campaignId,
      amountCents: finalAmountCents,
      type,
      status: 'PENDING',
      eligibleAt,
      riskSnapshotScore: riskScore,
      riskLevel: riskAssessment.riskLevel,
      reservePercent: riskAssessment.reservePercent,
      reserveAmountCents,
      appliedMultiplier: cpmAdjustment.appliedMultiplier,
      creatorTrustScoreSnapshot: cpmAdjustment.creatorTrustScore,
      creatorTierSnapshot: cpmAdjustment.creatorTier,
    });

    await creatorBalanceRepository.update(creatorId, {
      pendingBalanceCents: finalAmountCents,
    });

    console.log('[PAYOUT_QUEUE] Created payout queue entry', {
      payoutQueueId: payoutQueueEntry.id,
      campaignId,
      creatorId,
      baseAmount: amountCents,
      finalAmount: finalAmountCents,
      cpmAdjusted: cpmAdjustment.wasAdjusted,
      multiplier: cpmAdjustment.appliedMultiplier,
      trustScore: cpmAdjustment.creatorTrustScore,
      tier: cpmAdjustment.creatorTier,
    });

    return { success: true, payoutQueueId: payoutQueueEntry.id };
  } catch (error) {
    console.error('[PAYOUT_QUEUE] Error creating payout queue entry', error);
    return { success: false, error: 'Failed to create payout queue entry' };
  }
}

export async function releaseEligiblePayouts(): Promise<{
  released: number;
  failed: number;
  errors: string[];
}> {
  const result = { released: 0, failed: 0, errors: [] as string[] };

  const eligiblePayouts = await payoutQueueRepository.findEligibleForRelease();

  for (const payout of eligiblePayouts) {
    try {
      const campaign = payout.campaign;
      
      if (campaign.status === 'UNDER_REVIEW') {
        console.log('[PAYOUT_RELEASE] Skipping - campaign UNDER_REVIEW', {
          payoutId: payout.id,
          campaignId: payout.campaignId,
        });
        continue;
      }

      const latestAnomalyScore = await getLatestAnomalyScore(payout.creatorId);
      
      if (latestAnomalyScore >= 7) {
        await payoutQueueRepository.update(payout.id, {
          status: 'FROZEN',
          cancelReason: 'High anomaly score detected',
        });

        try {
          await domainEventBus.publish(domainEventBus.createEvent('VELOCITY_SPIKE_DETECTED', {
            creatorId: payout.creatorId,
            spikeAmount: latestAnomalyScore,
            threshold: 100,
          }));
        } catch (notifyError) {
          console.error('[VELOCITY_SPIKE] Failed to publish event:', notifyError);
        }
        
        console.log('[PAYOUT_RELEASE] Frozen - high anomaly score', {
          payoutId: payout.id,
          anomalyScore: latestAnomalyScore,
        });
        continue;
      }

      const amountToRelease = payout.amountCents - payout.reserveAmountCents;
      
      await db.$transaction(async (tx) => {
        await payoutQueueRepository.updateWithTx(tx, payout.id, {
          status: 'RELEASED',
          releasedAt: new Date(),
        });
        
        await creatorBalanceRepository.updateWithTx(tx, payout.creatorId, {
          pendingBalanceCents: -payout.amountCents,
          availableBalanceCents: amountToRelease,
          lockedReserveCents: payout.reserveAmountCents,
        });
      });

      result.released++;
      
      console.log('[PAYOUT_RELEASE] Released payout', {
        payoutId: payout.id,
        amountCents: payout.amountCents,
        releasedAmount: amountToRelease,
        reserveAmount: payout.reserveAmountCents,
      });
    } catch (error) {
      result.failed++;
      result.errors.push(`Failed to release payout ${payout.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('[PAYOUT_RELEASE] Error releasing payout', { payoutId: payout.id, error });
    }
  }

  return result;
}

export async function forceReleasePayout(payoutId: string, forcedBy: string): Promise<{ success: boolean; error?: string }> {
  try {
    const payout = await payoutQueueRepository.findById(payoutId);

    if (!payout) {
      return { success: false, error: 'Payout not found' };
    }

    if (payout.status === 'RELEASED') {
      return { success: false, error: 'Payout already released' };
    }

    const amountToRelease = payout.amountCents - payout.reserveAmountCents;

    await db.$transaction(async (tx) => {
      await payoutQueueRepository.updateWithTx(tx, payoutId, {
        status: 'RELEASED',
        releasedAt: new Date(),
      });
      
      await creatorBalanceRepository.updateWithTx(tx, payout.creatorId, {
        pendingBalanceCents: -payout.amountCents,
        availableBalanceCents: amountToRelease,
      });
    });

    console.log('[PAYOUT_FORCE_RELEASE] Admin forced release', {
      payoutId,
      forcedBy,
      amountCents: payout.amountCents,
    });

    return { success: true };
  } catch (error) {
    console.error('[PAYOUT_FORCE_RELEASE] Error', error);
    return { success: false, error: 'Failed to force release payout' };
  }
}

export async function cancelPayout(payoutId: string, reason: string, cancelledBy: string): Promise<{ success: boolean; error?: string }> {
  try {
    const payout = await payoutQueueRepository.findById(payoutId);

    if (!payout) {
      return { success: false, error: 'Payout not found' };
    }

    if (payout.status !== 'PENDING') {
      return { success: false, error: 'Can only cancel pending payouts' };
    }

    await db.$transaction(async (tx) => {
      await payoutQueueRepository.updateWithTx(tx, payoutId, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      });
      
      await creatorBalanceRepository.updateWithTx(tx, payout.creatorId, {
        pendingBalanceCents: -payout.amountCents,
      });
    });

    console.log('[PAYOUT_CANCEL] Admin cancelled payout', {
      payoutId,
      cancelledBy,
      reason,
      amountCents: payout.amountCents,
    });

    return { success: true };
  } catch (error) {
    console.error('[PAYOUT_CANCEL] Error', error);
    return { success: false, error: 'Failed to cancel payout' };
  }
}

export async function freezePayout(payoutId: string, reason: string, frozenBy: string): Promise<{ success: boolean; error?: string }> {
  try {
    const payout = await payoutQueueRepository.findById(payoutId);

    if (!payout) {
      return { success: false, error: 'Payout not found' };
    }

    await payoutQueueRepository.update(payoutId, {
      status: 'FROZEN',
      cancelReason: reason,
    });

    console.log('[PAYOUT_FREEZE] Admin froze payout', {
      payoutId,
      frozenBy,
      reason,
    });

    return { success: true };
  } catch (error) {
    console.error('[PAYOUT_FREEZE] Error', error);
    return { success: false, error: 'Failed to freeze payout' };
  }
}

export async function updateCreatorRiskLevel(
  creatorId: string,
  riskLevel: RiskLevel,
  payoutDelayDays?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: {
      riskLevel: RiskLevel;
      payoutDelayDays?: number;
    } = {
      riskLevel,
    };

    if (payoutDelayDays !== undefined) {
      updateData.payoutDelayDays = payoutDelayDays;
    }

    await creatorBalanceRepository.update(creatorId, updateData);

    console.log('[RISK_UPDATE] Updated creator risk level', {
      creatorId,
      riskLevel,
      payoutDelayDays,
    });

    // Send notification to admin when creator is flagged as high risk
    if (riskLevel === 'HIGH') {
      try {
        await domainEventBus.publish(domainEventBus.createEvent('CREATOR_FLAGGED', {
          creatorId,
          reason: `Risk level set to ${riskLevel}. Delay: ${payoutDelayDays || 0} days.`,
          severity: riskLevel,
        }));
      } catch (notifyError) {
        console.error('[RISK_UPDATE] Failed to publish event:', notifyError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[RISK_UPDATE] Error', error);
    return { success: false, error: 'Failed to update creator risk level' };
  }
}

export async function getCreatorPayoutSummary(creatorId: string) {
  const balance = await creatorBalanceRepository.findByCreatorId(creatorId);

  const pendingPayouts = await payoutQueueRepository.findByCreatorId(creatorId, 'PENDING');

  const nextReleaseDate = pendingPayouts.length > 0 
    ? pendingPayouts[0].eligibleAt 
    : null;

  return {
    availableBalanceCents: balance?.availableBalanceCents || 0,
    pendingBalanceCents: balance?.pendingBalanceCents || 0,
    lockedReserveCents: balance?.lockedReserveCents || 0,
    riskLevel: balance?.riskLevel || 'MEDIUM',
    payoutDelayDays: balance?.payoutDelayDays || 3,
    nextReleaseDate,
    pendingPayoutCount: pendingPayouts.length,
    totalPendingAmount: pendingPayouts.reduce((sum, p) => sum + p.amountCents, 0),
  };
}

export async function releaseExpiredReserves(): Promise<{
  released: number;
  amountReleased: number;
}> {
  const result = { released: 0, amountReleased: 0 };

  const reservesToRelease = await payoutQueueRepository.findWithExpiredReserves();

  for (const payout of reservesToRelease) {
    try {
      await db.$transaction(async (tx) => {
        await payoutQueueRepository.updateWithTx(tx, payout.id, {
          reserveAmountCents: 0,
          reservePercent: 0,
        });
        
        await creatorBalanceRepository.updateWithTx(tx, payout.creatorId, {
          availableBalanceCents: payout.reserveAmountCents,
          lockedReserveCents: -payout.reserveAmountCents,
        });
      });

      result.released++;
      result.amountReleased += payout.reserveAmountCents;

      console.log('[RESERVE_RELEASE] Released expired reserve', {
        payoutId: payout.id,
        amountCents: payout.reserveAmountCents,
      });
    } catch (error) {
      console.error('[RESERVE_RELEASE] Error releasing reserve', { payoutId: payout.id, error });
    }
  }

  return result;
}
