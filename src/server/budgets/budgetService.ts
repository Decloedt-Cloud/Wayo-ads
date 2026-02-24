import { Prisma, CampaignStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { campaignRepository } from '@/server/campaigns/repositories';
import { walletRepository } from '@/server/wallets/repositories';
import { campaignBudgetLockRepository } from './repositories';

export interface CampaignBudgetInfo {
  campaignId: string;
  totalBudgetCents: number;
  lockedCents: number;
  spentCents: number;
  remainingCents: number;
  cpmCents: number;
  payoutPerViewCents: number;
}

export interface LockBudgetResult {
  success: boolean;
  budgetLockId: string;
  lockedCents: number;
  newAvailableCents: number;
  error?: string;
}

export interface ReleaseBudgetResult {
  success: boolean;
  releasedCents: number;
  newAvailableCents: number;
  error?: string;
}

export async function lockCampaignBudget(params: {
  campaignId: string;
  amountCents: number;
}): Promise<LockBudgetResult> {
  const { campaignId, amountCents } = params;

  const campaign = await campaignRepository.findById(campaignId);

  if (!campaign) {
    return { success: false, budgetLockId: '', lockedCents: 0, newAvailableCents: 0, error: 'Campaign not found' };
  }

  if (campaign.status !== CampaignStatus.ACTIVE) {
    return { success: false, budgetLockId: '', lockedCents: 0, newAvailableCents: 0, error: 'Campaign is not active' };
  }

  const wallet = await walletRepository.findByUserId(campaign.advertiserId);

  if (!wallet || wallet.availableCents < amountCents) {
    return { success: false, budgetLockId: '', lockedCents: 0, newAvailableCents: 0, error: 'Insufficient funds' };
  }

  const spentAmount = campaign.spentBudgetCents || 0;
  const remaining = campaign.totalBudgetCents - spentAmount;
  if (amountCents > remaining) {
    return { success: false, budgetLockId: '', lockedCents: 0, newAvailableCents: 0, error: 'Amount exceeds remaining budget' };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const existingLock = await campaignBudgetLockRepository.findByCampaignIdWithTx(tx, campaignId);
      const currentLocked = existingLock?.lockedCents || 0;
      const newLocked = currentLocked + amountCents;

      let budgetLock;
      if (existingLock) {
        budgetLock = await campaignBudgetLockRepository.updateWithTx(tx, campaignId, { lockedCents: newLocked });
      } else {
        budgetLock = await campaignBudgetLockRepository.createWithTx(tx, {
          campaignId,
          walletId: wallet.id,
          lockedCents: newLocked,
        });
      }

      await walletRepository.updateBalanceWithTx(tx, wallet.id, {
        availableCents: { decrement: amountCents },
        pendingCents: { increment: amountCents },
      });

      return { budgetLock, newAvailableCents: wallet.availableCents - amountCents };
    });

    return {
      success: true,
      budgetLockId: result.budgetLock.id,
      lockedCents: amountCents,
      newAvailableCents: result.newAvailableCents,
    };
  } catch (error) {
    return { success: false, budgetLockId: '', lockedCents: 0, newAvailableCents: 0, error: 'Failed to lock budget' };
  }
}

export async function releaseCampaignBudget(params: {
  campaignId: string;
  amountCents: number;
}): Promise<ReleaseBudgetResult> {
  const { campaignId, amountCents } = params;

  const campaign = await campaignRepository.findById(campaignId);

  if (!campaign) {
    return { success: false, releasedCents: 0, newAvailableCents: 0, error: 'Campaign not found' };
  }

  const wallet = await walletRepository.findByUserId(campaign.advertiserId);

  if (!wallet) {
    return { success: false, releasedCents: 0, newAvailableCents: 0, error: 'Wallet not found' };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const existingLock = await campaignBudgetLockRepository.findByCampaignIdWithTx(tx, campaignId);
      
      if (!existingLock) {
        throw new Error('No budget lock found');
      }

      const currentLocked = existingLock.lockedCents;
      const newLocked = Math.max(0, currentLocked - amountCents);

      await campaignBudgetLockRepository.updateByIdWithTx(tx, existingLock.id, { lockedCents: newLocked });

      await walletRepository.updateBalanceWithTx(tx, wallet.id, {
        availableCents: { increment: amountCents },
        pendingCents: { decrement: amountCents },
      });

      return { newAvailableCents: wallet.availableCents + amountCents };
    });

    return {
      success: true,
      releasedCents: amountCents,
      newAvailableCents: result.newAvailableCents,
    };
  } catch (error) {
    return { success: false, releasedCents: 0, newAvailableCents: 0, error: 'Failed to release budget' };
  }
}

export async function computeCampaignBudget(campaignId: string): Promise<CampaignBudgetInfo | null> {
  const campaign = await campaignRepository.findById(campaignId);

  if (!campaign) {
    return null;
  }

  const existingLock = await campaignBudgetLockRepository.findByCampaignId(campaignId);
  const lockedCents = existingLock?.lockedCents || 0;
  const spentCents = campaign.spentBudgetCents || 0;
  const remainingCents = Math.max(0, campaign.totalBudgetCents - spentCents - lockedCents);

  return {
    campaignId: campaign.id,
    totalBudgetCents: campaign.totalBudgetCents,
    lockedCents,
    spentCents,
    remainingCents,
    cpmCents: campaign.cpmCents || 0,
    payoutPerViewCents: campaign.cpmCents ? Math.floor(campaign.cpmCents / 1000 * 100) : 0,
  };
}

export async function spendCampaignBudget(params: {
  campaignId: string;
  amountCents: number;
}): Promise<boolean> {
  const { campaignId, amountCents } = params;

  try {
    await db.$transaction(async (tx) => {
      const campaign = await campaignRepository.findByIdWithTx(tx, campaignId);

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const existingLock = await campaignBudgetLockRepository.findByCampaignIdWithTx(tx, campaignId);

      if (!existingLock) {
        throw new Error('No budget lock found');
      }

      const wallet = await walletRepository.findByUserIdWithTx(tx, campaign.advertiserId);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const lockedCents = existingLock?.lockedCents || 0;
      const spentSoFar = campaign.spentBudgetCents || 0;
      const newSpent = spentSoFar + amountCents;
      const newLocked = Math.max(0, lockedCents - amountCents);

      await campaignRepository.updateWithTx(tx, campaignId, { spentBudgetCents: newSpent });
      await campaignBudgetLockRepository.updateByIdWithTx(tx, existingLock.id, { lockedCents: newLocked });

      await walletRepository.updateBalanceWithTx(tx, wallet.id, {
        pendingCents: { decrement: amountCents },
      });
    });

    return true;
  } catch (error) {
    console.error('Failed to spend campaign budget:', error);
    return false;
  }
}
