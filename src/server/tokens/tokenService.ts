import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import type { ITokenService, TokenTransactionResult } from './ITokenService';

export const FREE_TOKENS_ON_SIGNUP = 100;
export const LOW_TOKEN_THRESHOLD = 20;

export const TOKEN_COSTS = {
  SCRIPT_GENERATION: 5,
  PATTERN_ANALYSIS: 10,
  TITLE_ENGINE: 3,
  THUMBNAIL_PSYCHOLOGY: 5,
  VIRAL_PATTERN_LIBRARY: 15,
  CREATOR_INTELLIGENCE: 8,
  CONTENT_ANALYSIS: 5,
  TREND_ANALYSIS: 10,
  EXPECTED_VALUE: 8,
  CTR_PROBABILITY: 6,
  RETENTION_PROBABILITY: 6,
  PATTERN_BLENDING: 10,
  TITLE_THUMBNAIL: 5,
  VIRAL_PATTERNS: 15,
  AI_ANALYSIS: 8,
} as const;

export type TokenFeature = keyof typeof TOKEN_COSTS;

export interface TokenBalance {
  balanceTokens: number;
  lifetimePurchasedTokens: number;
  lifetimeConsumedTokens: number;
  lifetimeGrantedTokens: number;
}

export async function getOrCreateTokenWallet(userId: string): Promise<{
  wallet: Awaited<ReturnType<typeof db.userTokenWallet.findUnique>>;
  created: boolean;
}> {
  let wallet = await db.userTokenWallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await db.userTokenWallet.create({
      data: {
        userId,
        balanceTokens: FREE_TOKENS_ON_SIGNUP,
        lifetimeGrantedTokens: FREE_TOKENS_ON_SIGNUP,
      },
    });

    await db.tokenTransaction.create({
      data: {
        userId,
        type: 'FREE_GRANT',
        tokens: FREE_TOKENS_ON_SIGNUP,
        description: 'Welcome bonus on signup',
      },
    });

    return { wallet, created: true };
  }

  return { wallet, created: false };
}

export async function getTokenBalance(userId: string): Promise<TokenBalance | null> {
  const wallet = await db.userTokenWallet.findUnique({
    where: { userId },
  });

  if (!wallet) return null;

  return {
    balanceTokens: wallet.balanceTokens,
    lifetimePurchasedTokens: wallet.lifetimePurchasedTokens,
    lifetimeConsumedTokens: wallet.lifetimeConsumedTokens,
    lifetimeGrantedTokens: wallet.lifetimeGrantedTokens,
  };
}

export async function checkTokenBalance(userId: string): Promise<{
  hasEnough: boolean;
  balance: number;
  threshold: number;
}> {
  const balance = await getTokenBalance(userId);
  
  if (!balance) {
    return { hasEnough: false, balance: 0, threshold: LOW_TOKEN_THRESHOLD };
  }

  return {
    hasEnough: balance.balanceTokens > 0,
    balance: balance.balanceTokens,
    threshold: LOW_TOKEN_THRESHOLD,
  };
}

export async function consumeTokens(
  userId: string,
  tokens: number,
  feature: TokenFeature,
  referenceId?: string
): Promise<TokenTransactionResult> {
  if (tokens <= 0) {
    return { success: false, error: 'Token amount must be positive', errorCode: 'TRANSACTION_FAILED' };
  }

  const wallet = await db.userTokenWallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    return { success: false, error: 'Wallet not found', errorCode: 'WALLET_NOT_FOUND' };
  }

  if (wallet.balanceTokens < tokens) {
    return {
      success: false,
      error: `Insufficient tokens. Required: ${tokens}, Available: ${wallet.balanceTokens}`,
      errorCode: 'INSUFFICIENT_TOKENS',
    };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const updatedWallet = await tx.userTokenWallet.update({
        where: { userId },
        data: {
          balanceTokens: { decrement: tokens },
          lifetimeConsumedTokens: { increment: tokens },
        },
      });

      const transaction = await tx.tokenTransaction.create({
        data: {
          userId,
          type: 'CONSUMPTION',
          tokens: -tokens,
          referenceId: referenceId || feature,
          description: `Used ${feature}`,
        },
      });

      return { updatedWallet, transaction };
    });

    return {
      success: true,
      newBalance: result.updatedWallet.balanceTokens,
      transactionId: result.transaction.id,
    };
  } catch (error) {
    console.error('[TokenService] Failed to consume tokens:', error);
    return { success: false, error: 'Transaction failed', errorCode: 'TRANSACTION_FAILED' };
  }
}

export async function addTokens(
  userId: string,
  tokens: number,
  type: 'PURCHASE' | 'FREE_GRANT' | 'BONUS' | 'REFUND' | 'ADJUSTMENT',
  referenceId?: string,
  description?: string
): Promise<TokenTransactionResult> {
  if (tokens <= 0) {
    return { success: false, error: 'Token amount must be positive', errorCode: 'TRANSACTION_FAILED' };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const updateData: Prisma.UserTokenWalletUpdateInput = {
        balanceTokens: { increment: tokens },
      };

      if (type === 'PURCHASE') {
        updateData.lifetimePurchasedTokens = { increment: tokens };
        updateData.lastTopUpAt = new Date();
      } else if (type === 'FREE_GRANT' || type === 'BONUS') {
        updateData.lifetimeGrantedTokens = { increment: tokens };
      }

      const updatedWallet = await tx.userTokenWallet.upsert({
        where: { userId },
        create: {
          userId,
          balanceTokens: tokens,
          lifetimePurchasedTokens: type === 'PURCHASE' ? tokens : 0,
          lifetimeConsumedTokens: 0,
          lifetimeGrantedTokens: type === 'FREE_GRANT' || type === 'BONUS' ? tokens : 0,
          lastTopUpAt: type === 'PURCHASE' ? new Date() : null,
        },
        update: updateData,
      });

      const transaction = await tx.tokenTransaction.create({
        data: {
          userId,
          type,
          tokens,
          referenceId,
          description: description || `${type} - ${tokens} tokens`,
        },
      });

      return { updatedWallet, transaction };
    });

    return {
      success: true,
      newBalance: result.updatedWallet.balanceTokens,
      transactionId: result.transaction.id,
    };
  } catch (error) {
    console.error('[TokenService] Failed to add tokens:', error);
    return { success: false, error: 'Transaction failed', errorCode: 'TRANSACTION_FAILED' };
  }
}

export async function createPendingPurchase(
  userId: string,
  tokens: number,
  paymentIntentId: string
): Promise<TokenTransactionResult> {
  try {
    const transaction = await db.tokenTransaction.create({
      data: {
        userId,
        type: 'PURCHASE_PENDING',
        tokens,
        referenceId: paymentIntentId,
        description: `Pending purchase - ${tokens} tokens`,
      },
    });

    return {
      success: true,
      transactionId: transaction.id,
    };
  } catch (error) {
    console.error('[TokenService] Failed to create pending purchase:', error);
    return { success: false, error: 'Failed to create pending purchase', errorCode: 'TRANSACTION_FAILED' };
  }
}

export async function confirmPurchase(
  userId: string,
  paymentIntentId: string,
  tokens: number
): Promise<TokenTransactionResult> {
  try {
    const result = await db.$transaction(async (tx) => {
      const pendingTx = await tx.tokenTransaction.findFirst({
        where: {
          userId,
          type: 'PURCHASE_PENDING',
          referenceId: paymentIntentId,
        },
      });

      if (pendingTx) {
        await tx.tokenTransaction.update({
          where: { id: pendingTx.id },
          data: {
            type: 'PURCHASE',
            description: `Confirmed purchase - ${tokens} tokens`,
          },
        });
      }

      const updatedWallet = await tx.userTokenWallet.update({
        where: { userId },
        data: {
          balanceTokens: { increment: tokens },
          lifetimePurchasedTokens: { increment: tokens },
          lastTopUpAt: new Date(),
        },
      });

      const transaction = await tx.tokenTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          tokens,
          referenceId: paymentIntentId,
          description: `Purchase confirmed - ${tokens} tokens`,
        },
      });

      return { updatedWallet, transaction };
    });

    return {
      success: true,
      newBalance: result.updatedWallet.balanceTokens,
      transactionId: result.transaction.id,
    };
  } catch (error) {
    console.error('[TokenService] Failed to confirm purchase:', error);
    return { success: false, error: 'Failed to confirm purchase', errorCode: 'TRANSACTION_FAILED' };
  }
}

export async function cancelPendingPurchase(
  userId: string,
  paymentIntentId: string
): Promise<TokenTransactionResult> {
  try {
    await db.tokenTransaction.updateMany({
      where: {
        userId,
        type: 'PURCHASE_PENDING',
        referenceId: paymentIntentId,
      },
      data: {
        type: 'REFUND',
        description: 'Purchase cancelled',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[TokenService] Failed to cancel pending purchase:', error);
    return { success: false, error: 'Failed to cancel purchase', errorCode: 'TRANSACTION_FAILED' };
  }
}

export async function getTokenTransactions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: string;
  }
) {
  const { limit = 20, offset = 0, type } = options || {};

  const where: Prisma.TokenTransactionWhereInput = { userId };
  if (type) {
    where.type = type as any;
  }

  const [transactions, total] = await Promise.all([
    db.tokenTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.tokenTransaction.count({ where }),
  ]);

  return { transactions, total };
}

export function getTokenCost(feature: TokenFeature): number {
  return TOKEN_COSTS[feature] || 0;
}

export class TokenService implements ITokenService {
  async consumeTokens(
    userId: string,
    amount: number,
    feature: TokenFeature
  ): Promise<TokenTransactionResult> {
    return consumeTokens(userId, amount, feature);
  }

  async checkTokenBalance(userId: string): Promise<{ hasEnough: boolean; balance: number }> {
    const result = await checkTokenBalance(userId);
    return { hasEnough: result.hasEnough, balance: result.balance };
  }

  getTokenCost(feature: TokenFeature): number {
    return TOKEN_COSTS[feature] || 0;
  }
}

export const tokenService = new TokenService();
