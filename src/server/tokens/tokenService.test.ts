import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOrCreateTokenWallet,
  getTokenBalance,
  checkTokenBalance,
  consumeTokens,
  addTokens,
  createPendingPurchase,
  confirmPurchase,
  cancelPendingPurchase,
  getTokenTransactions,
  getTokenCost,
  TOKEN_COSTS,
  FREE_TOKENS_ON_SIGNUP,
  LOW_TOKEN_THRESHOLD,
} from '../tokens/tokenService';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(vi.fn());
      }
      return Promise.all(callback);
    }),
    userTokenWallet: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    tokenTransaction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('TokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTokenCost', () => {
    it('should return correct cost for SCRIPT_GENERATION', () => {
      expect(getTokenCost('SCRIPT_GENERATION')).toBe(5);
    });

    it('should return correct cost for PATTERN_ANALYSIS', () => {
      expect(getTokenCost('PATTERN_ANALYSIS')).toBe(10);
    });

    it('should return correct cost for TITLE_ENGINE', () => {
      expect(getTokenCost('TITLE_ENGINE')).toBe(3);
    });

    it('should return correct cost for THUMBNAIL_PSYCHOLOGY', () => {
      expect(getTokenCost('THUMBNAIL_PSYCHOLOGY')).toBe(5);
    });

    it('should return correct cost for VIRAL_PATTERN_LIBRARY', () => {
      expect(getTokenCost('VIRAL_PATTERN_LIBRARY')).toBe(15);
    });

    it('should return correct cost for CREATOR_INTELLIGENCE', () => {
      expect(getTokenCost('CREATOR_INTELLIGENCE')).toBe(8);
    });

    it('should return correct cost for CONTENT_ANALYSIS', () => {
      expect(getTokenCost('CONTENT_ANALYSIS')).toBe(5);
    });

    it('should return correct cost for TREND_ANALYSIS', () => {
      expect(getTokenCost('TREND_ANALYSIS')).toBe(10);
    });

    it('should return 0 for unknown feature', () => {
      expect(getTokenCost('UNKNOWN_FEATURE' as any)).toBe(0);
    });
  });

  describe('TOKEN_COSTS', () => {
    it('should have all required token features defined', () => {
      expect(TOKEN_COSTS.SCRIPT_GENERATION).toBe(5);
      expect(TOKEN_COSTS.PATTERN_ANALYSIS).toBe(10);
      expect(TOKEN_COSTS.TITLE_ENGINE).toBe(3);
      expect(TOKEN_COSTS.THUMBNAIL_PSYCHOLOGY).toBe(5);
      expect(TOKEN_COSTS.VIRAL_PATTERN_LIBRARY).toBe(15);
      expect(TOKEN_COSTS.CREATOR_INTELLIGENCE).toBe(8);
      expect(TOKEN_COSTS.CONTENT_ANALYSIS).toBe(5);
      expect(TOKEN_COSTS.TREND_ANALYSIS).toBe(10);
    });
  });

  describe('FREE_TOKENS_ON_SIGNUP', () => {
    it('should be 100', () => {
      expect(FREE_TOKENS_ON_SIGNUP).toBe(100);
    });
  });

  describe('LOW_TOKEN_THRESHOLD', () => {
    it('should be 20', () => {
      expect(LOW_TOKEN_THRESHOLD).toBe(20);
    });
  });

  describe('getOrCreateTokenWallet', () => {
    it('should return existing wallet without creating new one', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balanceTokens: 100,
        lifetimePurchasedTokens: 0,
        lifetimeConsumedTokens: 0,
        lifetimeGrantedTokens: 100,
        lastTopUpAt: null,
      };

      (db as any).userTokenWallet.findUnique.mockResolvedValue(mockWallet as any);

      const result = await getOrCreateTokenWallet('user-1');

      expect(result.wallet!.id).toBe('wallet-1');
      expect(result.created).toBe(false);
      expect(db.userTokenWallet.create).not.toHaveBeenCalled();
      expect(db.tokenTransaction.create).not.toHaveBeenCalled();
    });

    it('should create wallet with free tokens if not exists', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue(null);
      (db as any).userTokenWallet.create.mockResolvedValue({
        id: 'wallet-new',
        userId: 'user-1',
        balanceTokens: FREE_TOKENS_ON_SIGNUP,
        lifetimeGrantedTokens: FREE_TOKENS_ON_SIGNUP,
      } as any);
      (db as any).tokenTransaction.create.mockResolvedValue({
        id: 'tx-1',
        type: 'FREE_GRANT',
        tokens: FREE_TOKENS_ON_SIGNUP,
      } as any);

      const result = await getOrCreateTokenWallet('user-1');

      expect(result.wallet!.id).toBe('wallet-new');
      expect(result.created).toBe(true);
      expect(db.userTokenWallet.create).toHaveBeenCalled();
      expect(db.tokenTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'FREE_GRANT',
            tokens: FREE_TOKENS_ON_SIGNUP,
            description: 'Welcome bonus on signup',
          }),
        })
      );
    });
  });

  describe('getTokenBalance', () => {
    it('should return token balance for existing wallet', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balanceTokens: 50,
        lifetimePurchasedTokens: 200,
        lifetimeConsumedTokens: 150,
        lifetimeGrantedTokens: 100,
        lastTopUpAt: null,
      };

      (db as any).userTokenWallet.findUnique.mockResolvedValue(mockWallet as any);

      const result = await getTokenBalance('user-1');

      expect(result).not.toBeNull();
      expect(result?.balanceTokens).toBe(50);
      expect(result?.lifetimePurchasedTokens).toBe(200);
      expect(result?.lifetimeConsumedTokens).toBe(150);
      expect(result?.lifetimeGrantedTokens).toBe(100);
    });

    it('should return null for non-existent wallet', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue(null);

      const result = await getTokenBalance('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('checkTokenBalance', () => {
    it('should return hasEnough true when balance is positive', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue({
        balanceTokens: 50,
        lifetimePurchasedTokens: 200,
        lifetimeConsumedTokens: 150,
        lifetimeGrantedTokens: 100,
      } as any);

      const result = await checkTokenBalance('user-1');

      expect(result.hasEnough).toBe(true);
      expect(result.balance).toBe(50);
      expect(result.threshold).toBe(LOW_TOKEN_THRESHOLD);
    });

    it('should return hasEnough false when balance is zero', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue({
        balanceTokens: 0,
        lifetimePurchasedTokens: 200,
        lifetimeConsumedTokens: 200,
        lifetimeGrantedTokens: 100,
      } as any);

      const result = await checkTokenBalance('user-1');

      expect(result.hasEnough).toBe(false);
      expect(result.balance).toBe(0);
    });

    it('should return hasEnough false when wallet does not exist', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue(null);

      const result = await checkTokenBalance('non-existent');

      expect(result.hasEnough).toBe(false);
      expect(result.balance).toBe(0);
      expect(result.threshold).toBe(LOW_TOKEN_THRESHOLD);
    });
  });

  describe('consumeTokens', () => {
    it('should fail when token amount is negative', async () => {
      const result = await consumeTokens('user-1', -5, 'SCRIPT_GENERATION');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token amount must be positive');
      expect(result.errorCode).toBe('TRANSACTION_FAILED');
    });

    it('should fail when token amount is zero', async () => {
      const result = await consumeTokens('user-1', 0, 'SCRIPT_GENERATION');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token amount must be positive');
    });

    it('should fail when wallet does not exist', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue(null);

      const result = await consumeTokens('user-1', 5, 'SCRIPT_GENERATION');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet not found');
      expect(result.errorCode).toBe('WALLET_NOT_FOUND');
    });

    it('should fail when insufficient tokens', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        balanceTokens: 3,
      } as any);

      const result = await consumeTokens('user-1', 5, 'SCRIPT_GENERATION');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient tokens');
      expect(result.errorCode).toBe('INSUFFICIENT_TOKENS');
    });

    it('should successfully consume tokens when balance is sufficient', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        balanceTokens: 50,
      } as any);
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          userTokenWallet: {
            update: vi.fn().mockResolvedValue({
              id: 'wallet-1',
              balanceTokens: 45,
              lifetimeConsumedTokens: 5,
            }),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({
              id: 'tx-1',
              type: 'CONSUMPTION',
              tokens: -5,
            }),
          },
        };
        return callback(tx);
      });

      const result = await consumeTokens('user-1', 5, 'SCRIPT_GENERATION');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(45);
      expect(result.transactionId).toBe('tx-1');
    });

    it('should include referenceId in transaction', async () => {
      (db as any).userTokenWallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        balanceTokens: 50,
      } as any);
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          userTokenWallet: {
            update: vi.fn().mockResolvedValue({
              id: 'wallet-1',
              balanceTokens: 45,
            }),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({
              id: 'tx-1',
              referenceId: 'campaign-123',
            }),
          },
        };
        return callback(tx);
      });

      const result = await consumeTokens('user-1', 5, 'SCRIPT_GENERATION', 'campaign-123');

      expect(result.success).toBe(true);
    });
  });

  describe('addTokens', () => {
    it('should fail when token amount is negative', async () => {
      const result = await addTokens('user-1', -5, 'PURCHASE');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TRANSACTION_FAILED');
    });

    it('should fail when token amount is zero', async () => {
      const result = await addTokens('user-1', 0, 'PURCHASE');

      expect(result.success).toBe(false);
    });

    it('should successfully add tokens for purchase', async () => {
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          userTokenWallet: {
            upsert: vi.fn().mockResolvedValue({
              id: 'wallet-1',
              balanceTokens: 250,
              lifetimePurchasedTokens: 200,
            }),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({
              id: 'tx-1',
              type: 'PURCHASE',
              tokens: 200,
            }),
          },
        };
        return callback(tx);
      });

      const result = await addTokens('user-1', 200, 'PURCHASE', 'pi_123', 'Token purchase');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(250);
      expect(result.transactionId).toBe('tx-1');
    });

    it('should successfully add bonus tokens', async () => {
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          userTokenWallet: {
            upsert: vi.fn().mockResolvedValue({
              id: 'wallet-1',
              balanceTokens: 150,
              lifetimeGrantedTokens: 100,
            }),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({
              id: 'tx-1',
              type: 'BONUS',
              tokens: 50,
            }),
          },
        };
        return callback(tx);
      });

      const result = await addTokens('user-1', 50, 'BONUS');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(150);
    });

    it('should successfully add refund tokens', async () => {
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          userTokenWallet: {
            upsert: vi.fn().mockResolvedValue({
              id: 'wallet-1',
              balanceTokens: 100,
            }),
          },
          tokenTransaction: {
            create: vi.fn().mockResolvedValue({
              id: 'tx-1',
              type: 'REFUND',
              tokens: 50,
            }),
          },
        };
        return callback(tx);
      });

      const result = await addTokens('user-1', 50, 'REFUND');

      expect(result.success).toBe(true);
    });
  });

  describe('createPendingPurchase', () => {
    it('should create pending purchase transaction', async () => {
      (db as any).tokenTransaction.create.mockResolvedValue({
        id: 'tx-1',
        type: 'PURCHASE_PENDING',
        tokens: 200,
        referenceId: 'pi_123',
      } as any);

      const result = await createPendingPurchase('user-1', 200, 'pi_123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx-1');
    });

    it('should fail when database error occurs', async () => {
      (db as any).tokenTransaction.create.mockRejectedValue(new Error('DB error'));

      const result = await createPendingPurchase('user-1', 200, 'pi_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TRANSACTION_FAILED');
    });
  });

  describe('confirmPurchase', () => {
    it('should confirm purchase and add tokens', async () => {
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          tokenTransaction: {
            findFirst: vi.fn().mockResolvedValue({ id: 'pending-tx' }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({
              id: 'tx-1',
              type: 'PURCHASE',
              tokens: 200,
            }),
          },
          userTokenWallet: {
            update: vi.fn().mockResolvedValue({
              id: 'wallet-1',
              balanceTokens: 300,
              lifetimePurchasedTokens: 200,
            }),
          },
        };
        return callback(tx);
      });

      const result = await confirmPurchase('user-1', 'pi_123', 200);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(300);
      expect(result.transactionId).toBe('tx-1');
    });

    it('should handle missing pending transaction', async () => {
      (db as any).$transaction.mockImplementation(async (callback) => {
        const tx = {
          tokenTransaction: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: 'tx-1',
              type: 'PURCHASE',
              tokens: 200,
            }),
          },
          userTokenWallet: {
            update: vi.fn().mockResolvedValue({
              id: 'wallet-1',
              balanceTokens: 300,
              lifetimePurchasedTokens: 200,
            }),
          },
        };
        return callback(tx);
      });

      const result = await confirmPurchase('user-1', 'pi_123', 200);

      expect(result.success).toBe(true);
    });
  });

  describe('cancelPendingPurchase', () => {
    it('should cancel pending purchase', async () => {
      (db as any).tokenTransaction.updateMany.mockResolvedValue({ count: 1 });

      const result = await cancelPendingPurchase('user-1', 'pi_123');

      expect(result.success).toBe(true);
      expect(db.tokenTransaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            type: 'PURCHASE_PENDING',
            referenceId: 'pi_123',
          }),
          data: expect.objectContaining({
            type: 'REFUND',
            description: 'Purchase cancelled',
          }),
        })
      );
    });

    it('should fail on database error', async () => {
      (db as any).tokenTransaction.updateMany.mockRejectedValue(new Error('DB error'));

      const result = await cancelPendingPurchase('user-1', 'pi_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TRANSACTION_FAILED');
    });
  });

  describe('getTokenTransactions', () => {
    it('should return transactions with pagination', async () => {
      const mockTransactions = [
        { id: 'tx-1', type: 'CONSUMPTION', tokens: -5 },
        { id: 'tx-2', type: 'PURCHASE', tokens: 200 },
      ];

      (db as any).tokenTransaction.findMany.mockResolvedValue(mockTransactions as any);
      (db as any).tokenTransaction.count.mockResolvedValue(2);

      const result = await getTokenTransactions('user-1', { limit: 10, offset: 0 });

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by transaction type', async () => {
      (db as any).tokenTransaction.findMany.mockResolvedValue([] as any);
      (db as any).tokenTransaction.count.mockResolvedValue(0);

      await getTokenTransactions('user-1', { type: 'PURCHASE' });

      expect(db.tokenTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            type: 'PURCHASE',
          }),
        })
      );
    });

    it('should use default pagination values', async () => {
      (db as any).tokenTransaction.findMany.mockResolvedValue([] as any);
      (db as any).tokenTransaction.count.mockResolvedValue(0);

      await getTokenTransactions('user-1');

      expect(db.tokenTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      );
    });
  });
});
