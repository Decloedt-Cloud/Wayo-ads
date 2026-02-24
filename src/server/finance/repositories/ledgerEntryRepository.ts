import { db } from '@/lib/db';
import { Prisma, LedgerEntryType } from '@prisma/client';

export interface ILedgerEntryRepository {
  findById(id: string): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs> | null>;
  findByCampaignAndCreator(campaignId: string, creatorId: string, limit?: number): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs>[]>;
  findByRefEventId(campaignId: string, creatorId: string, refEventId: string): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs> | null>;
  aggregateByCampaign(campaignId: string, types: LedgerEntryType[]): Promise<{ _sum: { amountCents: number | null } }>;
  aggregateByCreator(creatorId: string, types: LedgerEntryType[]): Promise<{ _sum: { amountCents: number | null } }>;
  create(data: Prisma.LedgerEntryUncheckedCreateInput): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs>>;
  createWithTx(tx: Prisma.TransactionClient, data: Prisma.LedgerEntryUncheckedCreateInput): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs>>;
  findAll(params: { campaignId?: string; creatorId?: string; type?: LedgerEntryType; page?: number; limit?: number }): Promise<{ entries: Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs>[]; total: number }>;
}

export class LedgerEntryRepository implements ILedgerEntryRepository {
  async findById(id: string): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs> | null> {
    return db.ledgerEntry.findUnique({ where: { id } });
  }

  async findByCampaignAndCreator(campaignId: string, creatorId: string, limit: number = 50): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs>[]> {
    return db.ledgerEntry.findMany({
      where: { campaignId, creatorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByRefEventId(campaignId: string, creatorId: string, refEventId: string): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs> | null> {
    return db.ledgerEntry.findUnique({
      where: {
        unique_payout_per_event: { campaignId, creatorId, refEventId },
      },
    });
  }

  async aggregateByCampaign(campaignId: string, types: LedgerEntryType[]): Promise<{ _sum: { amountCents: number | null } }> {
    return db.ledgerEntry.aggregate({
      where: {
        campaignId,
        type: { in: types },
      },
      _sum: { amountCents: true },
    });
  }

  async aggregateByCreator(creatorId: string, types: LedgerEntryType[]): Promise<{ _sum: { amountCents: number | null } }> {
    return db.ledgerEntry.aggregate({
      where: {
        creatorId,
        type: { in: types },
      },
      _sum: { amountCents: true },
    });
  }

  async create(data: Prisma.LedgerEntryUncheckedCreateInput): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs>> {
    return db.ledgerEntry.create({ data });
  }

  async createWithTx(tx: Prisma.TransactionClient, data: Prisma.LedgerEntryUncheckedCreateInput): Promise<Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs>> {
    return tx.ledgerEntry.create({ data });
  }

  async findAll(params: { campaignId?: string; creatorId?: string; type?: LedgerEntryType; page?: number; limit?: number }): Promise<{ entries: Prisma.LedgerEntryGetPayload<Prisma.LedgerEntryDefaultArgs>[]; total: number }> {
    const { campaignId, creatorId, type, page = 1, limit = 20 } = params;
    const where: Prisma.LedgerEntryWhereInput = {};
    
    if (campaignId) where.campaignId = campaignId;
    if (creatorId) where.creatorId = creatorId;
    if (type) where.type = type;

    const [entries, total] = await Promise.all([
      db.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.ledgerEntry.count({ where }),
    ]);

    return { entries, total };
  }
}

export const ledgerEntryRepository = new LedgerEntryRepository();
