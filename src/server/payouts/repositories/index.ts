import { db } from '@/lib/db';
import { Prisma, PayoutQueueStatus, PayoutQueue, RiskLevel } from '@prisma/client';

export interface IPayoutQueueRepository {
  findById(id: string): Promise<PayoutQueue | null>;
  findEligibleForRelease(): Promise<(PayoutQueue & { campaign: { status: string } })[]>;
  findByCreatorId(creatorId: string, status?: PayoutQueueStatus): Promise<PayoutQueue[]>;
  findByCampaignId(campaignId: string): Promise<PayoutQueue[]>;
  findWithExpiredReserves(): Promise<PayoutQueue[]>;
  create(data: Prisma.PayoutQueueUncheckedCreateInput): Promise<PayoutQueue>;
  update(id: string, data: Prisma.PayoutQueueUncheckedUpdateInput): Promise<PayoutQueue>;
  updateWithTx(tx: Prisma.TransactionClient, id: string, data: Prisma.PayoutQueueUncheckedUpdateInput): Promise<PayoutQueue>;
  updateStatus(id: string, status: PayoutQueueStatus): Promise<PayoutQueue>;
}

export class PayoutQueueRepository implements IPayoutQueueRepository {
  async findById(id: string): Promise<PayoutQueue | null> {
    return db.payoutQueue.findUnique({ where: { id } });
  }

  async findEligibleForRelease(): Promise<(PayoutQueue & { campaign: { status: string } })[]> {
    return db.payoutQueue.findMany({
      where: {
        status: 'PENDING',
        eligibleAt: { lte: new Date() },
      },
      include: {
        campaign: {
          select: { status: true },
        },
      },
      orderBy: { eligibleAt: 'asc' },
    }) as Promise<(PayoutQueue & { campaign: { status: string } })[]>;
  }

  async findByCreatorId(creatorId: string, status?: PayoutQueueStatus): Promise<PayoutQueue[]> {
    return db.payoutQueue.findMany({
      where: {
        creatorId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCampaignId(campaignId: string): Promise<PayoutQueue[]> {
    return db.payoutQueue.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMany(where?: any, select?: any): Promise<any[]> {
    return db.payoutQueue.findMany({ where, select });
  }

  async findWithExpiredReserves(): Promise<PayoutQueue[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return db.payoutQueue.findMany({
      where: {
        status: 'PENDING',
        reserveAmountCents: { gt: 0 },
        eligibleAt: { lte: thirtyDaysAgo },
      },
    });
  }

  async create(data: Prisma.PayoutQueueUncheckedCreateInput): Promise<PayoutQueue> {
    return db.payoutQueue.create({ data });
  }

  async update(id: string, data: Prisma.PayoutQueueUncheckedUpdateInput): Promise<PayoutQueue> {
    return db.payoutQueue.update({ where: { id }, data });
  }

  async updateWithTx(tx: Prisma.TransactionClient, id: string, data: Prisma.PayoutQueueUncheckedUpdateInput): Promise<PayoutQueue> {
    return tx.payoutQueue.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: PayoutQueueStatus): Promise<PayoutQueue> {
    return db.payoutQueue.update({ where: { id }, data: { status } });
  }
}

export interface ICreatorBalanceRepository {
  findByCreatorId(creatorId: string): Promise<{
    id: string;
    creatorId: string;
    riskLevel: RiskLevel;
    payoutDelayDays: number;
    pendingBalanceCents: number;
    availableBalanceCents: number;
    lockedReserveCents: number;
  } | null>;
  update(creatorId: string, data: {
    pendingBalanceCents?: number;
    availableBalanceCents?: number;
    lockedReserveCents?: number;
    riskLevel?: RiskLevel;
    payoutDelayDays?: number;
  }): Promise<void>;
  updateWithTx(tx: Prisma.TransactionClient, creatorId: string, data: {
    pendingBalanceCents?: number;
    availableBalanceCents?: number;
    lockedReserveCents?: number;
    riskLevel?: RiskLevel;
    payoutDelayDays?: number;
  }): Promise<void>;
}

export class CreatorBalanceRepository implements ICreatorBalanceRepository {
  async findByCreatorId(creatorId: string): Promise<{
    id: string;
    creatorId: string;
    riskLevel: RiskLevel;
    payoutDelayDays: number;
    pendingBalanceCents: number;
    availableBalanceCents: number;
    lockedReserveCents: number;
  } | null> {
    return db.creatorBalance.findUnique({
      where: { creatorId },
      select: {
        id: true,
        creatorId: true,
        riskLevel: true,
        payoutDelayDays: true,
        pendingBalanceCents: true,
        availableBalanceCents: true,
        lockedReserveCents: true,
      },
    });
  }

  async update(creatorId: string, data: {
    pendingBalanceCents?: number;
    availableBalanceCents?: number;
    lockedReserveCents?: number;
    riskLevel?: RiskLevel;
    payoutDelayDays?: number;
  }): Promise<void> {
    await db.creatorBalance.update({
      where: { creatorId },
      data,
    });
  }

  async updateWithTx(tx: Prisma.TransactionClient, creatorId: string, data: {
    pendingBalanceCents?: number;
    availableBalanceCents?: number;
    lockedReserveCents?: number;
    riskLevel?: RiskLevel;
    payoutDelayDays?: number;
  }): Promise<void> {
    await tx.creatorBalance.update({
      where: { creatorId },
      data,
    });
  }
}

export const payoutQueueRepository = new PayoutQueueRepository();
export const creatorBalanceRepository = new CreatorBalanceRepository();
