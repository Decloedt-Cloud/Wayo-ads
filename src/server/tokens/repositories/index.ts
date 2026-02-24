import { Prisma, UserTokenWallet, TokenTransaction, TokenTransactionType } from '@prisma/client';
import { db } from '@/lib/db';

export interface ITokenWalletRepository {
  findByUserId(userId: string): Promise<UserTokenWallet | null>;
  findByUserIdWithTx(tx: Prisma.TransactionClient, userId: string): Promise<UserTokenWallet | null>;
  create(data: { userId: string; balanceTokens?: number; lifetimeGrantedTokens?: number }): Promise<UserTokenWallet>;
  updateBalance(userId: string, data: { balanceTokens: { increment?: number; decrement?: number }; lifetimeConsumedTokens?: { increment?: number }; lifetimePurchasedTokens?: { increment?: number } }): Promise<UserTokenWallet>;
  updateBalanceWithTx(tx: Prisma.TransactionClient, userId: string, data: { balanceTokens: { increment?: number; decrement?: number }; lifetimeConsumedTokens?: { increment?: number }; lifetimePurchasedTokens?: { increment?: number } }): Promise<UserTokenWallet>;
  exists(userId: string): Promise<boolean>;
}

export class TokenWalletRepository implements ITokenWalletRepository {
  async findByUserId(userId: string): Promise<UserTokenWallet | null> {
    return db.userTokenWallet.findUnique({ where: { userId } });
  }

  async findByUserIdWithTx(tx: Prisma.TransactionClient, userId: string): Promise<UserTokenWallet | null> {
    return tx.userTokenWallet.findUnique({ where: { userId } });
  }

  async create(data: { userId: string; balanceTokens?: number; lifetimeGrantedTokens?: number }): Promise<UserTokenWallet> {
    return db.userTokenWallet.create({
      data: {
        userId: data.userId,
        balanceTokens: data.balanceTokens ?? 0,
        lifetimePurchasedTokens: 0,
        lifetimeConsumedTokens: 0,
        lifetimeGrantedTokens: data.lifetimeGrantedTokens ?? 0,
      },
    });
  }

  async updateBalance(userId: string, data: { balanceTokens: { increment?: number; decrement?: number }; lifetimeConsumedTokens?: { increment?: number }; lifetimePurchasedTokens?: { increment?: number } }): Promise<UserTokenWallet> {
    return db.userTokenWallet.update({
      where: { userId },
      data: {
        balanceTokens: data.balanceTokens,
        lifetimeConsumedTokens: data.lifetimeConsumedTokens,
        lifetimePurchasedTokens: data.lifetimePurchasedTokens,
      },
    });
  }

  async updateBalanceWithTx(tx: Prisma.TransactionClient, userId: string, data: { balanceTokens: { increment?: number; decrement?: number }; lifetimeConsumedTokens?: { increment?: number }; lifetimePurchasedTokens?: { increment?: number } }): Promise<UserTokenWallet> {
    return tx.userTokenWallet.update({
      where: { userId },
      data: {
        balanceTokens: data.balanceTokens,
        lifetimeConsumedTokens: data.lifetimeConsumedTokens,
        lifetimePurchasedTokens: data.lifetimePurchasedTokens,
      },
    });
  }

  async exists(userId: string): Promise<boolean> {
    const wallet = await db.userTokenWallet.findUnique({ where: { userId }, select: { id: true } });
    return wallet !== null;
  }
}

export interface ITokenTransactionRepository {
  create(data: { userId: string; type: TokenTransactionType; tokens: number; description?: string }): Promise<TokenTransaction>;
  findByUserId(userId: string, limit?: number): Promise<TokenTransaction[]>;
  findByType(userId: string, type: TokenTransactionType): Promise<TokenTransaction[]>;
}

export class TokenTransactionRepository implements ITokenTransactionRepository {
  async create(data: { userId: string; type: TokenTransactionType; tokens: number; description?: string }): Promise<TokenTransaction> {
    return db.tokenTransaction.create({ data });
  }

  async findByUserId(userId: string, limit: number = 50): Promise<TokenTransaction[]> {
    return db.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByType(userId: string, type: TokenTransactionType): Promise<TokenTransaction[]> {
    return db.tokenTransaction.findMany({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const tokenWalletRepository = new TokenWalletRepository();
export const tokenTransactionRepository = new TokenTransactionRepository();
