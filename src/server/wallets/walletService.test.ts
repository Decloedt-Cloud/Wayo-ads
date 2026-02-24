import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOrCreateWallet,
  getWallet,
  getWalletBalance,
  getWalletTransactions,
  addFunds,
  lockFunds,
  releaseFunds,
  createWithdrawal,
  getWithdrawalRequests,
  processWithdrawal,
} from '../wallets/walletService';
import { db } from '@/lib/db';
import { WalletTransactionType, WithdrawalStatus } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(vi.fn());
      }
      return Promise.all(callback);
    }),
    wallet: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    walletTransaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    withdrawalRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('WalletService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateWallet', () => {
    it('should return existing wallet', async () => {
      const mockWallet = {
        id: 'wallet-1',
        ownerUserId: 'user-1',
        currency: 'EUR',
        availableCents: 10000,
        pendingCents: 0,
      };

      (db as any).wallet.findUnique.mockResolvedValue(mockWallet as any);

      const result = await getOrCreateWallet('user-1');

      expect(result.id).toBe('wallet-1');
      expect(db.wallet.create).not.toHaveBeenCalled();
    });

    it('should create wallet if not exists', async () => {
      (db as any).wallet.findUnique.mockResolvedValue(null);
      (db as any).wallet.create.mockResolvedValue({
        id: 'wallet-new',
        ownerUserId: 'user-1',
        currency: 'EUR',
        availableCents: 0,
        pendingCents: 0,
      } as any);

      const result = await getOrCreateWallet('user-1');

      expect(result.id).toBe('wallet-new');
      expect(db.wallet.create).toHaveBeenCalled();
    });
  });

  describe('getWallet', () => {
    it('should return wallet by userId', async () => {
      const mockWallet = {
        id: 'wallet-1',
        ownerUserId: 'user-1',
        currency: 'EUR',
        availableCents: 5000,
        pendingCents: 1000,
      };

      (db as any).wallet.findUnique.mockResolvedValue(mockWallet as any);

      const result = await getWallet('user-1');

      expect(result?.availableCents).toBe(5000);
      expect(result?.pendingCents).toBe(1000);
    });

    it('should return null for non-existent wallet', async () => {
      (db as any).wallet.findUnique.mockResolvedValue(null);

      const result = await getWallet('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getWalletBalance', () => {
    it('should return balance object', async () => {
      (db as any).wallet.findUnique.mockResolvedValue({
        availableCents: 8000,
        pendingCents: 2000,
      } as any);

      const result = await getWalletBalance('user-1');

      expect(result.available).toBe(8000);
      expect(result.pending).toBe(2000);
    });

    it('should return zeros for non-existent wallet', async () => {
      (db as any).wallet.findUnique.mockResolvedValue(null);

      const result = await getWalletBalance('non-existent');

      expect(result.available).toBe(0);
      expect(result.pending).toBe(0);
    });
  });

  describe('getWalletTransactions', () => {
    it('should return transactions', async () => {
      (db as any).wallet.findUnique.mockResolvedValue({ id: 'wallet-1' } as any);
      (db as any).walletTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          walletId: 'wallet-1',
          type: WalletTransactionType.DEPOSIT,
          amountCents: 10000,
          currency: 'EUR',
        },
      ] as any);

      const result = await getWalletTransactions('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].amountCents).toBe(10000);
    });

    it('should return empty array if no wallet', async () => {
      (db as any).wallet.findUnique.mockResolvedValue(null);

      const result = await getWalletTransactions('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('addFunds', () => {
    it('should add funds to wallet', async () => {
      (db as any).wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        ownerUserId: 'user-1',
        availableCents: 10000,
      } as any);
      (db as any).walletTransaction.create.mockResolvedValue({
        id: 'tx-1',
        type: WalletTransactionType.DEPOSIT,
        amountCents: 5000,
      } as any);
      (db as any).wallet.update.mockResolvedValue({} as any);

      const result = await addFunds('user-1', 5000);

      expect(result.amountCents).toBe(5000);
      expect(db.wallet.update).toHaveBeenCalled();
    });
  });

  describe('lockFunds', () => {
    it('should lock funds when sufficient balance', async () => {
      (db as any).wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        ownerUserId: 'user-1',
        availableCents: 10000,
      } as any);
      (db as any).walletTransaction.create.mockResolvedValue({
        id: 'tx-1',
        type: WalletTransactionType.HOLD,
        amountCents: 5000,
      } as any);
      (db as any).wallet.update.mockResolvedValue({} as any);

      const result = await lockFunds('user-1', 5000, 'CAMPAIGN', 'campaign-1');

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(5000);
    });

    it('should return null when insufficient balance', async () => {
      (db as any).wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        availableCents: 1000,
      } as any);

      const result = await lockFunds('user-1', 5000, 'CAMPAIGN', 'campaign-1');

      expect(result).toBeNull();
    });
  });

  describe('releaseFunds', () => {
    it('should release funds', async () => {
      (db as any).wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        ownerUserId: 'user-1',
        pendingCents: 5000,
      } as any);
      (db as any).walletTransaction.create.mockResolvedValue({
        id: 'tx-1',
        type: WalletTransactionType.RELEASE,
        amountCents: 5000,
      } as any);
      (db as any).wallet.update.mockResolvedValue({} as any);

      const result = await releaseFunds('user-1', 5000, 'campaign-1');

      expect(result).not.toBeNull();
      expect(result?.amountCents).toBe(5000);
    });

    it('should return null when no wallet', async () => {
      (db as any).wallet.findUnique.mockResolvedValue(null);

      const result = await releaseFunds('user-1', 5000, 'campaign-1');

      expect(result).toBeNull();
    });
  });

  describe('createWithdrawal', () => {
    it('should create withdrawal request', async () => {
      (db as any).wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        ownerUserId: 'user-1',
        availableCents: 10000,
      } as any);
      (db as any).withdrawalRequest.create.mockResolvedValue({
        id: 'withdrawal-1',
        creatorId: 'user-1',
        amountCents: 5000,
        platformFeeCents: null,
        currency: 'EUR',
        status: WithdrawalStatus.PENDING,
        psReference: null,
        failureReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        processedAt: null,
      } as any);
      (db as any).wallet.update.mockResolvedValue({} as any);

      const result = await createWithdrawal('user-1', 5000);

      expect(result.amountCents).toBe(5000);
      expect(result.status).toBe(WithdrawalStatus.PENDING);
    });

    it('should throw when insufficient funds', async () => {
      (db as any).wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        availableCents: 1000,
      } as any);

      await expect(createWithdrawal('user-1', 5000)).rejects.toThrow('Insufficient funds');
    });
  });

  describe('getWithdrawalRequests', () => {
    it('should return withdrawal requests for creator', async () => {
      const mockRequests = [
        {
          id: 'withdrawal-1',
          creatorId: 'user-1',
          amountCents: 5000,
          platformFeeCents: 500,
          currency: 'EUR',
          status: WithdrawalStatus.PENDING,
          psReference: null,
          failureReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          processedAt: null,
        },
        {
          id: 'withdrawal-2',
          creatorId: 'user-1',
          amountCents: 3000,
          platformFeeCents: 300,
          currency: 'EUR',
          status: WithdrawalStatus.PAID,
          psReference: 'payout_123',
          failureReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          processedAt: new Date(),
        },
      ];

      (db as any).withdrawalRequest.findMany.mockResolvedValue(mockRequests as any);

      const result = await getWithdrawalRequests('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(WithdrawalStatus.PENDING);
      expect(result[1].status).toBe(WithdrawalStatus.PAID);
    });

    it('should return empty array when no requests', async () => {
      (db as any).withdrawalRequest.findMany.mockResolvedValue([]);

      const result = await getWithdrawalRequests('user-1');

      expect(result).toHaveLength(0);
    });

    it('should apply limit and offset correctly', async () => {
      (db as any).withdrawalRequest.findMany.mockResolvedValue([]);

      await getWithdrawalRequests('user-1', 10, 5);

      expect(db.withdrawalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { creatorId: 'user-1' },
          take: 10,
          skip: 5,
        })
      );
    });
  });

  describe('processWithdrawal', () => {
    it('should process withdrawal as PAID', async () => {
      const mockWithdrawal = {
        id: 'withdrawal-1',
        creatorId: 'user-1',
        amountCents: 5000,
        status: WithdrawalStatus.PENDING,
      };

      const updatedWithdrawal = {
        ...mockWithdrawal,
        status: WithdrawalStatus.PAID,
        processedAt: new Date(),
      };

      (db as any).withdrawalRequest.findUnique.mockResolvedValue(mockWithdrawal as any);
      (db as any).wallet.findUnique.mockResolvedValue({ id: 'wallet-1' } as any);
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          withdrawalRequest: {
            update: vi.fn().mockResolvedValue(updatedWithdrawal),
          },
          wallet: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const result = await processWithdrawal('withdrawal-1', WithdrawalStatus.PAID);

      expect(result.status).toBe(WithdrawalStatus.PAID);
      expect(result.processedAt).toBeDefined();
    });

    it('should process withdrawal as FAILED and refund funds', async () => {
      const mockWithdrawal = {
        id: 'withdrawal-1',
        creatorId: 'user-1',
        amountCents: 5000,
        status: WithdrawalStatus.PENDING,
      };

      const failedWithdrawal = {
        ...mockWithdrawal,
        status: WithdrawalStatus.FAILED,
        processedAt: new Date(),
      };

      (db as any).withdrawalRequest.findUnique.mockResolvedValue(mockWithdrawal as any);
      (db as any).wallet.findUnique.mockResolvedValue({ id: 'wallet-1' } as any);
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          withdrawalRequest: {
            update: vi.fn().mockResolvedValue(failedWithdrawal),
          },
          wallet: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const result = await processWithdrawal('withdrawal-1', WithdrawalStatus.FAILED);

      expect(result.status).toBe(WithdrawalStatus.FAILED);
    });

    it('should throw when withdrawal not found', async () => {
      (db as any).withdrawalRequest.findUnique.mockResolvedValue(null);

      await expect(processWithdrawal('non-existent', WithdrawalStatus.PAID)).rejects.toThrow(
        'Withdrawal not found'
      );
    });

    it('should throw when wallet not found', async () => {
      const mockWithdrawal = {
        id: 'withdrawal-1',
        creatorId: 'user-1',
        amountCents: 5000,
      };

      (db as any).withdrawalRequest.findUnique.mockResolvedValue(mockWithdrawal as any);
      (db as any).wallet.findUnique.mockResolvedValue(null);

      await expect(processWithdrawal('withdrawal-1', WithdrawalStatus.PAID)).rejects.toThrow(
        'Wallet not found'
      );
    });
  });
});
