import { DynamicCpmMode, CreatorTier } from '@prisma/client';
import { getCreatorTrustScore } from '../risk/riskService';
import { campaignRepository } from '@/server/campaigns/repositories';
import { creatorRepository } from '@/server/creators/repositories';
import { payoutQueueRepository } from '@/server/payouts/repositories';

export interface CpmAdjustmentResult {
  baseCpmCents: number;
  adjustedCpmCents: number;
  appliedMultiplier: number;
  creatorTrustScore: number;
  creatorTier: CreatorTier;
  minCpmCents: number;
  maxCpmCents: number;
  wasAdjusted: boolean;
  reason?: string;
}

export async function calculateAdjustedCpm(
  campaignId: string,
  creatorId: string
): Promise<CpmAdjustmentResult> {
  const campaign = await campaignRepository.findById(campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const trustScore = await getCreatorTrustScore(creatorId);
  
  const baseCpm = campaign.baseCpmCents || campaign.cpmCents;
  const minCpm = campaign.minCpmCents || Math.floor(baseCpm * 0.5);
  const maxCpm = campaign.maxCpmCents || Math.floor(baseCpm * 1.5);

  if (!campaign.dynamicCpmEnabled || !trustScore) {
    return {
      baseCpmCents: baseCpm,
      adjustedCpmCents: baseCpm,
      appliedMultiplier: 1.0,
      creatorTrustScore: trustScore?.trustScore || 50,
      creatorTier: trustScore?.tier || 'BRONZE',
      minCpmCents: minCpm,
      maxCpmCents: maxCpm,
      wasAdjusted: false,
      reason: 'Dynamic CPM not enabled or creator not found',
    };
  }

  const { tier, qualityMultiplier } = trustScore;

  let appliedMultiplier = qualityMultiplier;
  let reason = '';

  if (campaign.dynamicCpmMode === DynamicCpmMode.CONSERVATIVE) {
    if (tier === 'BRONZE') {
      appliedMultiplier = 0.5;
      reason = 'Conservative mode: BRONZE tier capped at 0.5x';
    } else if (tier === 'SILVER') {
      appliedMultiplier = 1.0;
      reason = 'Conservative mode: SILVER tier at 1.0x';
    } else {
      appliedMultiplier = 1.2;
      reason = 'Conservative mode: GOLD tier bonus at 1.2x';
    }
  } else {
    reason = `Aggressive mode: ${tier} tier at ${qualityMultiplier}x`;
  }

  let adjustedCpm = Math.round(baseCpm * appliedMultiplier);
  
  adjustedCpm = Math.max(minCpm, Math.min(maxCpm, adjustedCpm));

  if (adjustedCpm !== Math.round(baseCpm * appliedMultiplier)) {
    if (adjustedCpm === minCpm) {
      reason += ' (capped at min)';
    } else if (adjustedCpm === maxCpm) {
      reason += ' (capped at max)';
    }
  }

  return {
    baseCpmCents: baseCpm,
    adjustedCpmCents: adjustedCpm,
    appliedMultiplier: adjustedCpm / baseCpm,
    creatorTrustScore: trustScore.trustScore,
    creatorTier: tier,
    minCpmCents: minCpm,
    maxCpmCents: maxCpm,
    wasAdjusted: true,
    reason,
  };
}

export async function enableDynamicCpm(
  campaignId: string,
  minCpmCents?: number,
  maxCpmCents?: number,
  mode: DynamicCpmMode = DynamicCpmMode.AGGRESSIVE
) {
  const campaign = await campaignRepository.findById(campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const baseCpm = campaign.cpmCents;
  const minCpm = minCpmCents || Math.floor(baseCpm * 0.5);
  const maxCpm = maxCpmCents || Math.floor(baseCpm * 1.5);

  await campaignRepository.update(campaignId, {
    dynamicCpmEnabled: true,
    baseCpmCents: baseCpm,
    minCpmCents: minCpm,
    maxCpmCents: maxCpm,
    dynamicCpmMode: mode,
  });

  return {
    dynamicCpmEnabled: true,
    baseCpmCents: baseCpm,
    minCpmCents: minCpm,
    maxCpmCents: maxCpm,
    mode,
  };
}

export async function disableDynamicCpm(campaignId: string) {
  await campaignRepository.update(campaignId, {
    dynamicCpmEnabled: false,
  });

  return { dynamicCpmEnabled: false };
}

export async function getCampaignDynamicCpmSettings(campaignId: string) {
  const campaign = await campaignRepository.findById(campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  return {
    dynamicCpmEnabled: campaign.dynamicCpmEnabled,
    baseCpmCents: campaign.baseCpmCents,
    minCpmCents: campaign.minCpmCents,
    maxCpmCents: campaign.maxCpmCents,
    dynamicCpmMode: campaign.dynamicCpmMode,
    cpmCents: campaign.cpmCents,
  };
}

export async function getCampaignCpmStats(campaignId: string) {
  const campaign = await campaignRepository.findById(campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const payouts = await payoutQueueRepository.findMany({
    where: {
      campaignId,
      status: { in: ['RELEASED', 'PENDING'] },
    },
    select: {
      creatorId: true,
      amountCents: true,
    },
  });

  const creatorIds = [...new Set(payouts.map(p => p.creatorId))];
  
  const creators = await creatorRepository.findByIds(creatorIds);
  const creatorMap = new Map(creators.map(c => [c.id, c]));

  const tierDistribution = {
    GOLD: 0,
    SILVER: 0,
    BRONZE: 0,
  };

  let totalAdjustedCpm = 0;
  let adjustedCount = 0;

  for (const payout of payouts) {
    const creator = creatorMap.get(payout.creatorId) as { tier: string; qualityMultiplier: number } | undefined;
    if (creator) {
      tierDistribution[creator.tier]++;
      if (campaign.dynamicCpmEnabled) {
        const adjusted = campaign.cpmCents * creator.qualityMultiplier;
        totalAdjustedCpm += adjusted;
        adjustedCount++;
      }
    }
  }

  return {
    tierDistribution,
    averageAdjustedCpm: adjustedCount > 0 ? Math.round(totalAdjustedCpm / adjustedCount) : campaign.cpmCents,
    baseCpm: campaign.cpmCents,
    totalPayouts: payouts.length,
  };
}
