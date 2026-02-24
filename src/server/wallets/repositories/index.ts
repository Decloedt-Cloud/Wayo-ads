import { db } from '@/lib/db';
import { Prisma, WalletTransactionType } from '@prisma/client';

export interface IWalletRepository {
  findByUserId(userId: string): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs> | null>;
  findById(id: string): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs> | null>;
  findByUserIdWithTx(tx: Prisma.TransactionClient, userId: string): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs> | null>;
  create(data: { ownerUserId: string; currency?: string; availableCents?: number; pendingCents?: number }): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>>;
  upsert(data: { ownerUserId: string; currency?: string; availableCents?: number; pendingCents?: number }): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>>;
  update(id: string, data: Prisma.WalletUncheckedUpdateInput): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>>;
  updateBalance(id: string, data: { availableCents?: { increment?: number; decrement?: number }; pendingCents?: { increment?: number; decrement?: number } }): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>>;
  updateBalanceWithTx(tx: Prisma.TransactionClient, id: string, data: { availableCents?: { increment?: number; decrement?: number }; pendingCents?: { increment?: number; decrement?: number } }): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>>;
}

export class WalletRepository implements IWalletRepository {
  async findByUserId(userId: string): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs> | null> {
    return db.wallet.findUnique({
      where: { ownerUserId: userId },
    });
  }

  async findById(id: string): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs> | null> {
    return db.wallet.findUnique({
      where: { id },
    });
  }

  async findByUserIdWithTx(tx: Prisma.TransactionClient, userId: string): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs> | null> {
    return tx.wallet.findUnique({
      where: { ownerUserId: userId },
    });
  }

  async create(data: { ownerUserId: string; currency?: string; availableCents?: number; pendingCents?: number }): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>> {
    return db.wallet.create({
      data: {
        ownerUserId: data.ownerUserId,
        currency: data.currency ?? 'EUR',
        availableCents: data.availableCents ?? 0,
        pendingCents: data.pendingCents ?? 0,
      },
    });
  }

  async upsert(data: { ownerUserId: string; currency?: string; availableCents?: number; pendingCents?: number }): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>> {
    return db.wallet.upsert({
      where: { ownerUserId: data.ownerUserId },
      create: {
        ownerUserId: data.ownerUserId,
        currency: data.currency ?? 'EUR',
        availableCents: data.availableCents ?? 0,
        pendingCents: data.pendingCents ?? 0,
      },
      update: {},
    });
  }

  async update(id: string, data: Prisma.WalletUncheckedUpdateInput): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>> {
    return db.wallet.update({
      where: { id },
      data,
    });
  }

  async updateBalance(id: string, data: { availableCents?: { increment?: number; decrement?: number }; pendingCents?: { increment?: number; decrement?: number } }): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>> {
    const updateData: Prisma.WalletUncheckedUpdateInput = {};
    
    if (data.availableCents) {
      if (data.availableCents.increment) {
        updateData.availableCents = { increment: data.availableCents.increment };
      } else if (data.availableCents.decrement) {
        updateData.availableCents = { decrement: data.availableCents.decrement };
      }
    }
    
    if (data.pendingCents) {
      if (data.pendingCents.increment) {
        updateData.pendingCents = { increment: data.pendingCents.increment };
      } else if (data.pendingCents.decrement) {
        updateData.pendingCents = { decrement: data.pendingCents.decrement };
      }
    }

    return db.wallet.update({
      where: { id },
      data: updateData,
    });
  }

  async updateBalanceWithTx(tx: Prisma.TransactionClient, id: string, data: { availableCents?: { increment?: number; decrement?: number }; pendingCents?: { increment?: number; decrement?: number } }): Promise<Prisma.WalletGetPayload<Prisma.WalletDefaultArgs>> {
    const updateData: Prisma.WalletUncheckedUpdateInput = {};
    
    if (data.availableCents) {
      if (data.availableCents.increment) {
        updateData.availableCents = { increment: data.availableCents.increment };
      } else if (data.availableCents.decrement) {
        updateData.availableCents = { decrement: data.availableCents.decrement };
      }
    }
    
    if (data.pendingCents) {
      if (data.pendingCents.increment) {
        updateData.pendingCents = { increment: data.pendingCents.increment };
      } else if (data.pendingCents.decrement) {
        updateData.pendingCents = { decrement: data.pendingCents.decrement };
      }
    }

    return tx.wallet.update({
      where: { id },
      data: updateData,
    });
  }
}

export interface IWalletTransactionRepository {
  findByWalletId(walletId: string, limit?: number): Promise<Prisma.WalletTransactionGetPayload<Prisma.WalletTransactionDefaultArgs>[]>;
  findById(id: string): Promise<Prisma.WalletTransactionGetPayload<Prisma.WalletTransactionDefaultArgs> | null>;
  create(data: Prisma.WalletTransactionUncheckedCreateInput): Promise<Prisma.WalletTransactionGetPayload<Prisma.WalletTransactionDefaultArgs>>;
  createWithTx(tx: Prisma.TransactionClient, data: Prisma.WalletTransactionUncheckedCreateInput): Promise<Prisma.WalletTransactionGetPayload<Prisma.WalletTransactionDefaultArgs>>;
}

export class WalletTransactionRepository implements IWalletTransactionRepository {
  async findByWalletId(walletId: string, limit: number = 50): Promise<Prisma.WalletTransactionGetPayload<Prisma.WalletTransactionDefaultArgs>[]> {
    return db.walletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findById(id: string): Promise<Prisma.WalletTransactionGetPayload<Prisma.WalletTransactionDefaultArgs> | null> {
    return db.walletTransaction.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.WalletTransactionUncheckedCreateInput): Promise<Prisma.WalletTransactionGetPayload<Prisma.WalletTransactionDefaultArgs>> {
    return db.walletTransaction.create({
      data,
    });
  }

  async createWithTx(tx: Prisma.TransactionClient, data: Prisma.WalletTransactionUncheckedCreateInput): Promise<Prisma.WalletTransactionGetPayload<Prisma.WalletTransactionDefaultArgs>> {
    return tx.walletTransaction.create({
      data,
    });
  }
}

export const walletRepository = new WalletRepository();
export const walletTransactionRepository = new WalletTransactionRepository();
