import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  lockCampaignBudget,
  releaseCampaignBudget,
  computeCampaignBudget,
  spendCampaignBudget,
} from '../budgets/budgetService';
import { db } from '@/lib/db';
import { CampaignStatus } from '@prisma/client';

function createTxMock() {
  return {
    campaign: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'campaign-1',
        advertiserId: 'user-1',
        spentBudgetCents: 5000,
        budgetLock: { id: 'budget-lock-1', lockedCents: 10000 },
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    campaignBudgetLock: {
      create: vi.fn().mockResolvedValue({ id: 'budget-lock-1', lockedCents: 10000 }),
      update: vi.fn().mockResolvedValue({ id: 'budget-lock-1', lockedCents: 0 }),
      findUnique: vi.fn(),
    },
    wallet: {
      findFirst: vi.fn().mockResolvedValue({ id: 'wallet-1', pendingCents: 10000 }),
      update: vi.fn().mockResolvedValue({}),
    },
    ledgerEntry: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn((callback) => callback(createTxMock())),
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    wallet: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    campaignBudgetLock: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ledgerEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('BudgetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('lockCampaignBudget', () => {
    it('should lock campaign budget successfully', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        advertiserId: 'user-1',
        status: CampaignStatus.ACTIVE,
        totalBudgetCents: 100000,
        spentBudgetCents: 0,
        budgetLock: null,
      } as any);
      (db as any).wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        ownerUserId: 'user-1',
        availableCents: 100000,
        pendingCents: 0,
      } as any);

      const result = await lockCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.lockedCents).toBe(10000);
      expect(result.error).toBeUndefined();
    });

    it('should fail when campaign not found', async () => {
      (db as any).campaign.findUnique.mockResolvedValue(null);

      const result = await lockCampaignBudget({
        campaignId: 'non-existent',
        amountCents: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign not found');
    });

    it('should fail when campaign is not active', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        status: CampaignStatus.DRAFT,
        totalBudgetCents: 100000,
        spentBudgetCents: 0,
      } as any);

      const result = await lockCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign is not active');
    });

    it('should fail when insufficient funds', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        advertiserId: 'user-1',
        status: CampaignStatus.ACTIVE,
        totalBudgetCents: 100000,
        spentBudgetCents: 0,
        budgetLock: null,
      } as any);
      (db as any).wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        availableCents: 5000,
      } as any);

      const result = await lockCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should fail when amount exceeds remaining budget', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        advertiserId: 'user-1',
        status: CampaignStatus.ACTIVE,
        totalBudgetCents: 10000,
        spentBudgetCents: 5000,
        budgetLock: null,
      } as any);
      (db as any).wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        availableCents: 100000,
      } as any);

      const result = await lockCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Amount exceeds remaining budget');
    });
  });

  describe('releaseCampaignBudget', () => {
    it('should release campaign budget successfully', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        advertiserId: 'user-1',
        totalBudgetCents: 100000,
        spentBudgetCents: 0,
        budgetLock: {
          id: 'budget-lock-1',
          campaignId: 'campaign-1',
          walletId: 'wallet-1',
          lockedCents: 10000,
        },
      } as any);
      (db as any).wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        pendingCents: 10000,
      } as any);

      const result = await releaseCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.releasedCents).toBe(10000);
    });

    it('should fail when campaign not found', async () => {
      (db as any).campaign.findUnique.mockResolvedValue(null);

      const result = await releaseCampaignBudget({
        campaignId: 'non-existent',
        amountCents: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Campaign not found');
    });

    it('should fail when no budget lock exists', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        budgetLock: null,
      } as any);
      (db as any).wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        pendingCents: 0,
      } as any);

      const result = await releaseCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to release budget');
    });
  });

  describe('computeCampaignBudget', () => {
    it('should compute campaign budget correctly', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        totalBudgetCents: 100000,
        spentBudgetCents: 25000,
        budgetLock: {
          lockedCents: 15000,
        },
      } as any);
      (db as any).ledgerEntry.findMany.mockResolvedValue([
        { amountCents: 1000 },
        { amountCents: 2000 },
      ] as any);

      const result = await computeCampaignBudget('campaign-1');

      expect(result).not.toBeNull();
      expect(result?.campaignId).toBe('campaign-1');
      expect(result?.totalBudgetCents).toBe(100000);
      expect(result?.spentCents).toBe(25000);
      expect(result?.lockedCents).toBe(15000);
      expect(result?.remainingCents).toBe(60000);
    });

    it('should return null when campaign not found', async () => {
      (db as any).campaign.findUnique.mockResolvedValue(null);

      const result = await computeCampaignBudget('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('spendCampaignBudget', () => {
    it('should spend campaign budget successfully', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        totalBudgetCents: 100000,
        spentBudgetCents: 5000,
        budgetLock: {
          lockedCents: 10000,
        },
      } as any);
      (db as any).wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        pendingCents: 10000,
      } as any);

      const result = await spendCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 3000,
      });

      expect(result).toBe(true);
    });

    it('should fail when campaign not found', async () => {
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = createTxMock() as any;
        tx.campaign.findUnique = vi.fn().mockResolvedValue(null);
        return callback(tx);
      });

      const result = await spendCampaignBudget({
        campaignId: 'non-existent',
        amountCents: 1000,
      });

      expect(result).toBe(false);
    });

    it('should fail when no budget lock exists', async () => {
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = createTxMock() as any;
        tx.campaign.findUnique = vi.fn().mockResolvedValue({
          id: 'campaign-1',
          budgetLock: null,
        });
        return callback(tx);
      });

      const result = await spendCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 1000,
      });

      expect(result).toBe(false);
    });

    it('should succeed when sufficient locked budget exists', async () => {
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = createTxMock() as any;
        tx.campaign.findUnique = vi.fn().mockResolvedValue({
          id: 'campaign-1',
          advertiserId: 'user-1',
          spentBudgetCents: 5000,
          totalBudgetCents: 100000,
          budgetLock: { id: 'budget-lock-1', lockedCents: 10000 },
        });
        return callback(tx);
      });

      const result = await spendCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 5000,
      });

      expect(result).toBe(true);
    });
  });

  describe('lockCampaignBudget with existing lock', () => {
    it('should update existing budget lock', async () => {
      (db as any).campaign.findUnique = vi.fn().mockResolvedValue({
        id: 'campaign-1',
        advertiserId: 'user-1',
        status: CampaignStatus.ACTIVE,
        totalBudgetCents: 100000,
        spentBudgetCents: 10000,
        budgetLock: { id: 'budget-lock-1', lockedCents: 5000 },
      } as any);
      (db as any).wallet.findFirst = vi.fn().mockResolvedValue({ id: 'wallet-1', availableCents: 100000 });
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = createTxMock() as any;
        tx.campaignBudgetLock.update.mockResolvedValue({
          id: 'budget-lock-1',
          lockedCents: 8000,
        });
        tx.wallet.update.mockResolvedValue({});
        return callback(tx);
      });

      const result = await lockCampaignBudget({
        campaignId: 'campaign-1',
        amountCents: 3000,
      });

      expect(result.success).toBe(true);
      expect(result.lockedCents).toBe(3000);
    });
  });

  describe('computeCampaignBudget with locked amount', () => {
    it('should return budget info with locked amount', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        totalBudgetCents: 100000,
        spentBudgetCents: 30000,
        budgetLock: { lockedCents: 10000 },
      } as any);

      const result = await computeCampaignBudget('campaign-1');

      expect(result).toBeDefined();
      expect(result?.totalBudgetCents).toBe(100000);
      expect(result?.spentCents).toBe(30000);
      expect(result?.lockedCents).toBe(10000);
      expect(result?.remainingCents).toBe(60000);
    });

    it('should return 0 for locked when no lock exists', async () => {
      (db as any).campaign.findUnique.mockResolvedValue({
        id: 'campaign-1',
        totalBudgetCents: 100000,
        spentBudgetCents: 30000,
        budgetLock: null,
      } as any);

      const result = await computeCampaignBudget('campaign-1');

      expect(result).toBeDefined();
      expect(result?.lockedCents).toBe(0);
    });
  });
});
