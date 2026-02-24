import { campaignRepository } from '@/server/campaigns/repositories';

const PacingMode = {
  EVEN: 'EVEN',
  ACCELERATED: 'ACCELERATED',
  CONSERVATIVE: 'CONSERVATIVE',
} as const;
type PacingModeType = typeof PacingMode[keyof typeof PacingMode];

export interface PacingStatus {
  campaignId: string;
  pacingEnabled: boolean;
  pacingMode: string;
  totalBudgetCents: number;
  spentBudgetCents: number;
  dailyBudgetCents: number;
  campaignDurationHours: number;
  targetSpendPerHourCents: number;
  actualSpendPerHourCents: number;
  deliveryProgressPercent: number;
  isOverDelivering: boolean;
  isUnderDelivering: boolean;
  hoursElapsed: number;
  hoursRemaining: number;
  predictedExhaustionDate: Date | null;
  recommendedAction: 'BOOST' | 'MAINTAIN' | 'REDUCE' | 'NONE';
}

export interface PacingThrottleResult {
  shouldBill: boolean;
  probability: number;
  effectiveCpmMultiplier: number;
  reason: string;
  pacingStatus: PacingStatus;
}

export async function calculatePacingStatus(campaignId: string): Promise<PacingStatus | null> {
  const campaign = await campaignRepository.findByIdSelect(campaignId, {
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
  });

  if (!campaign || !campaign.pacingEnabled) {
    return null;
  }

  const now = new Date();
  const startDate = campaign.campaignStartDate || now;
  const hoursElapsed = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  const campaignDurationHours = campaign.campaignEndDate
    ? (campaign.campaignEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    : hoursElapsed * 2;

  const hoursRemaining = Math.max(0, campaignDurationHours - hoursElapsed);
  const targetSpendPerHour = campaign.targetSpendPerHourCents || 
    Math.floor(campaign.totalBudgetCents / campaignDurationHours);
  const actualSpendPerHour = Math.floor(campaign.spentBudgetCents / hoursElapsed);
  
  const deliveryProgress = campaign.totalBudgetCents > 0
    ? (campaign.spentBudgetCents / campaign.totalBudgetCents) * 100
    : 0;

  const targetProgressPercent = (hoursElapsed / campaignDurationHours) * 100;
  const variance = deliveryProgress - targetProgressPercent;

  const isOverDelivering = variance > 20;
  const isUnderDelivering = variance < -50;

  let predictedExhaustionDate: Date | null = null;
  if (actualSpendPerHour > 0 && campaign.spentBudgetCents < campaign.totalBudgetCents) {
    const hoursUntilExhaustion = (campaign.totalBudgetCents - campaign.spentBudgetCents) / actualSpendPerHour;
    predictedExhaustionDate = new Date(now.getTime() + hoursUntilExhaustion * 60 * 60 * 1000);
  }

  let recommendedAction: 'BOOST' | 'MAINTAIN' | 'REDUCE' | 'NONE' = 'NONE';
  if (isUnderDelivering) {
    recommendedAction = 'BOOST';
  } else if (isOverDelivering) {
    recommendedAction = 'REDUCE';
  } else if (Math.abs(variance) < 10) {
    recommendedAction = 'MAINTAIN';
  }

  return {
    campaignId: campaign.id,
    pacingEnabled: campaign.pacingEnabled,
    pacingMode: campaign.pacingMode,
    totalBudgetCents: campaign.totalBudgetCents,
    spentBudgetCents: campaign.spentBudgetCents,
    dailyBudgetCents: campaign.dailyBudgetCents,
    campaignDurationHours,
    targetSpendPerHourCents: targetSpendPerHour,
    actualSpendPerHourCents: actualSpendPerHour,
    deliveryProgressPercent: deliveryProgress,
    isOverDelivering,
    isUnderDelivering,
    hoursElapsed,
    hoursRemaining,
    predictedExhaustionDate,
    recommendedAction,
  };
}

export async function applyPacingThrottle(
  campaignId: string,
  creatorTrustScore: number,
  velocityRiskScore: number
): Promise<PacingThrottleResult> {
  const pacingStatus = await calculatePacingStatus(campaignId);

  if (!pacingStatus || !pacingStatus.pacingEnabled) {
    return {
      shouldBill: true,
      probability: 1.0,
      effectiveCpmMultiplier: 1.0,
      reason: 'Pacing not enabled',
      pacingStatus: {
        campaignId,
        pacingEnabled: false,
        pacingMode: PacingMode.EVEN,
        totalBudgetCents: 0,
        spentBudgetCents: 0,
        dailyBudgetCents: 0,
        campaignDurationHours: 0,
        targetSpendPerHourCents: 0,
        actualSpendPerHourCents: 0,
        deliveryProgressPercent: 0,
        isOverDelivering: false,
        isUnderDelivering: false,
        hoursElapsed: 0,
        hoursRemaining: 0,
        predictedExhaustionDate: null,
        recommendedAction: 'NONE',
      },
    };
  }

  let shouldBill = true;
  let probability = 1.0;
  let effectiveCpmMultiplier = 1.0;
  let reason = 'Normal delivery';

  const trustBoost = creatorTrustScore > 70 ? 1.1 : creatorTrustScore > 50 ? 1.0 : 0.9;
  const riskPenalty = velocityRiskScore > 70 ? 0.5 : velocityRiskScore > 50 ? 0.8 : 1.0;

  if (pacingStatus.isOverDelivering) {
    if (pacingStatus.pacingMode === PacingMode.CONSERVATIVE) {
      shouldBill = Math.random() > 0.3;
      probability = 0.7;
      effectiveCpmMultiplier = 0.7;
      reason = 'Over-delivering - Conservative mode: reducing billable probability';
    } else if (pacingStatus.pacingMode === PacingMode.EVEN) {
      probability = 0.85;
      effectiveCpmMultiplier = 0.85;
      reason = 'Over-delivering - Even mode: slight reduction in CPM';
    } else {
      probability = trustBoost > 1.0 ? 1.0 : 0.9;
      effectiveCpmMultiplier = trustBoost;
      reason = 'Over-delivering - Accelerated mode: high-trust creators get boost';
    }
  } else if (pacingStatus.isUnderDelivering) {
    if (creatorTrustScore > 60 && velocityRiskScore < 50) {
      shouldBill = true;
      probability = 1.2;
      effectiveCpmMultiplier = 1.15;
      reason = 'Under-delivering - Boosting high-trust, low-risk creators';
    } else {
      probability = 1.0;
      effectiveCpmMultiplier = 1.0;
      reason = 'Under-delivering - Standard allocation';
    }
  }

  const finalProbability = Math.min(1.5, Math.max(0.5, probability * riskPenalty));
  const finalMultiplier = effectiveCpmMultiplier * riskPenalty;

  return {
    shouldBill,
    probability: finalProbability,
    effectiveCpmMultiplier: Math.max(0.5, Math.min(1.5, finalMultiplier)),
    reason: `${reason} (risk penalty: ${riskPenalty})`,
    pacingStatus,
  };
}

export async function updateCampaignPacingMetrics(campaignId: string): Promise<void> {
  const pacingStatus = await calculatePacingStatus(campaignId);

  if (!pacingStatus) {
    return;
  }

  await campaignRepository.update(campaignId, {
    deliveryProgressPercent: pacingStatus.deliveryProgressPercent,
    isOverDelivering: pacingStatus.isOverDelivering,
    isUnderDelivering: pacingStatus.isUnderDelivering,
    lastPacingCheckAt: new Date(),
  });
}

export async function getAllCampaignsPacingStatus(): Promise<PacingStatus[]> {
  const campaigns = await campaignRepository.findPacingEnabledWithStatus();

  const pacingStatuses: PacingStatus[] = [];
  
  for (const campaign of campaigns) {
    const now = new Date();
    const startDate = campaign.campaignStartDate || now;
    const hoursElapsed = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
    const campaignDurationHours = campaign.campaignEndDate
      ? (campaign.campaignEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      : hoursElapsed * 2;

    const hoursRemaining = Math.max(0, campaignDurationHours - hoursElapsed);
    const targetSpendPerHour = campaign.targetSpendPerHourCents || 
      Math.floor(campaign.totalBudgetCents / campaignDurationHours);
    const actualSpendPerHour = Math.floor(campaign.spentBudgetCents / hoursElapsed);
    
    const deliveryProgress = campaign.totalBudgetCents > 0
      ? (campaign.spentBudgetCents / campaign.totalBudgetCents) * 100
      : 0;

    const targetProgressPercent = (hoursElapsed / campaignDurationHours) * 100;
    const variance = deliveryProgress - targetProgressPercent;

    const isOverDelivering = variance > 20;
    const isUnderDelivering = variance < -50;

    let predictedExhaustionDate: Date | null = null;
    if (actualSpendPerHour > 0 && campaign.spentBudgetCents < campaign.totalBudgetCents) {
      const hoursUntilExhaustion = (campaign.totalBudgetCents - campaign.spentBudgetCents) / actualSpendPerHour;
      predictedExhaustionDate = new Date(now.getTime() + hoursUntilExhaustion * 60 * 60 * 1000);
    }

    let recommendedAction: 'BOOST' | 'MAINTAIN' | 'REDUCE' | 'NONE' = 'NONE';
    if (isUnderDelivering) {
      recommendedAction = 'BOOST';
    } else if (isOverDelivering) {
      recommendedAction = 'REDUCE';
    } else if (Math.abs(variance) < 10) {
      recommendedAction = 'MAINTAIN';
    }

    pacingStatuses.push({
      campaignId: campaign.id,
      pacingEnabled: campaign.pacingEnabled,
      pacingMode: campaign.pacingMode,
      totalBudgetCents: campaign.totalBudgetCents,
      spentBudgetCents: campaign.spentBudgetCents,
      dailyBudgetCents: campaign.dailyBudgetCents,
      campaignDurationHours,
      targetSpendPerHourCents: targetSpendPerHour,
      actualSpendPerHourCents: actualSpendPerHour,
      deliveryProgressPercent: deliveryProgress,
      isOverDelivering,
      isUnderDelivering,
      hoursElapsed,
      hoursRemaining,
      predictedExhaustionDate,
      recommendedAction,
    });
  }

  return pacingStatuses;
}
