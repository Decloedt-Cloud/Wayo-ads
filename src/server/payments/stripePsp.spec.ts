import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    withdrawalRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/server/finance/financeService', () => ({
  getCreatorBalance: vi.fn(),
}));

vi.mock('../admin/stripeSettingsService', () => ({
  getStripeCredentials: vi.fn(),
}));

const mockCreateTransfer = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      transfers: {
        create: mockCreateTransfer,
      },
    })),
  };
});

import { db } from '@/lib/db';
import { getCreatorBalance } from '@/server/finance/financeService';
import { getStripeCredentials } from '@/server/admin/stripeSettingsService';
import { StripePSP } from './stripePsp';

const mockDb = db as any;
const mockGetCreatorBalance = getCreatorBalance as any;
const mockGetStripeCredentials = getStripeCredentials as any;

describe('StripePSP.createPayout', () => {
  let stripePSP: StripePSP;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransfer.mockReset();
    stripePSP = new StripePSP();
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
  });

  describe('validation checks', () => {
    it('should throw error if user not found', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      await expect(
        stripePSP.createPayout({
          userId: 'user-123',
          amountCents: 1000,
          withdrawalRequestId: 'withdrawal-123',
        })
      ).rejects.toThrow('Creator not found');
    });

    it('should throw error if user has no Stripe account connected', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: null,
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: true,
      });

      await expect(
        stripePSP.createPayout({
          userId: 'user-123',
          amountCents: 1000,
          withdrawalRequestId: 'withdrawal-123',
        })
      ).rejects.toThrow('Creator has not connected their Stripe account');
    });

    it('should throw error if user has not completed Stripe onboarding', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: 'acct_123',
        stripeOnboardingCompleted: false,
        stripePayoutsEnabled: true,
      });

      await expect(
        stripePSP.createPayout({
          userId: 'user-123',
          amountCents: 1000,
          withdrawalRequestId: 'withdrawal-123',
        })
      ).rejects.toThrow('Creator has not completed Stripe onboarding');
    });

    it('should throw error if creator payouts are not enabled', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: 'acct_123',
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: false,
      });

      await expect(
        stripePSP.createPayout({
          userId: 'user-123',
          amountCents: 1000,
          withdrawalRequestId: 'withdrawal-123',
        })
      ).rejects.toThrow('Creator payouts are not enabled on their Stripe account');
    });

    it('should throw error if withdrawal request not found', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: 'acct_123',
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: true,
      });
      mockDb.withdrawalRequest.findUnique.mockResolvedValue(null);

      await expect(
        stripePSP.createPayout({
          userId: 'user-123',
          amountCents: 1000,
          withdrawalRequestId: 'withdrawal-123',
        })
      ).rejects.toThrow('Withdrawal request not found');
    });

    it('should throw error if withdrawal is not in PENDING status', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: 'acct_123',
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: true,
      });
      mockDb.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'withdrawal-123',
        status: 'PROCESSING',
        amountCents: 1000,
        creatorId: 'user-123',
        createdAt: new Date(),
      });

      await expect(
        stripePSP.createPayout({
          userId: 'user-123',
          amountCents: 1000,
          withdrawalRequestId: 'withdrawal-123',
        })
      ).rejects.toThrow('Withdrawal is not in a valid state for payout');
    });

    it('should throw error if insufficient balance', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: 'acct_123',
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: true,
      });
      mockDb.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'withdrawal-123',
        status: 'PENDING',
        amountCents: 1000,
        creatorId: 'user-123',
        createdAt: new Date(),
      });
      mockGetCreatorBalance.mockResolvedValue({
        availableCents: 500,
        pendingCents: 0,
      });

      await expect(
        stripePSP.createPayout({
          userId: 'user-123',
          amountCents: 1000,
          withdrawalRequestId: 'withdrawal-123',
        })
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('successful payout creation', () => {
    it('should create transfer successfully with valid parameters', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: 'acct_123',
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: true,
      });
      mockDb.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'withdrawal-123',
        status: 'PENDING',
        amountCents: 1000,
        creatorId: 'user-123',
        createdAt: new Date(),
      });
      mockGetCreatorBalance.mockResolvedValue({
        availableCents: 5000,
        pendingCents: 0,
      });

      mockCreateTransfer.mockResolvedValue({
        id: 'tr_123',
        amount: 1000,
        currency: 'eur',
        created: Date.now(),
      });

      mockDb.withdrawalRequest.update.mockResolvedValue({});

      const result = await stripePSP.createPayout({
        userId: 'user-123',
        amountCents: 1000,
        currency: 'EUR',
        withdrawalRequestId: 'withdrawal-123',
      });

      expect(mockCreateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
          currency: 'eur',
          destination: 'acct_123',
        }),
        expect.objectContaining({
          idempotencyKey: expect.stringContaining('payout_withdrawal-123'),
        })
      );

      expect(mockDb.withdrawalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'withdrawal-123' },
          data: expect.objectContaining({
            stripeTransferId: 'tr_123',
            psReference: 'tr_123',
            status: 'PROCESSING',
          }),
        })
      );
    });

    it('should include metadata in transfer creation', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: 'acct_123',
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: true,
      });
      mockDb.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'withdrawal-123',
        status: 'PENDING',
        amountCents: 1000,
        creatorId: 'user-123',
        createdAt: new Date(),
      });
      mockGetCreatorBalance.mockResolvedValue({
        availableCents: 5000,
        pendingCents: 0,
      });

      mockCreateTransfer.mockResolvedValue({
        id: 'tr_123',
        amount: 1000,
        currency: 'eur',
        created: Date.now(),
      });

      mockDb.withdrawalRequest.update.mockResolvedValue({});

      await stripePSP.createPayout({
        userId: 'user-123',
        amountCents: 1000,
        currency: 'EUR',
        withdrawalRequestId: 'withdrawal-123',
        metadata: { campaignId: 'campaign-456' },
      });

      expect(mockCreateTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            withdrawalRequestId: 'withdrawal-123',
            userId: 'user-123',
            campaignId: 'campaign-456',
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle Stripe transfer creation failure', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'user-123',
        stripeAccountId: 'acct_123',
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: true,
      });
      mockDb.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'withdrawal-123',
        status: 'PENDING',
        amountCents: 1000,
        creatorId: 'user-123',
        createdAt: new Date(),
      });
      mockGetCreatorBalance.mockResolvedValue({
        availableCents: 5000,
        pendingCents: 0,
      });

      mockCreateTransfer.mockRejectedValue(new Error('Stripe API error'));

      await expect(
        stripePSP.createPayout({
          userId: 'user-123',
          amountCents: 1000,
          withdrawalRequestId: 'withdrawal-123',
        })
      ).rejects.toThrow('Stripe API error');

      expect(mockDb.withdrawalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'withdrawal-123' },
          data: expect.objectContaining({
            failureReason: 'Stripe API error',
            status: 'FAILED',
          }),
        })
      );
    });
  });
});
