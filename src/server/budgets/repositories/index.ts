import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface ICampaignBudgetLockRepository {
  findByCampaignId(campaignId: string): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs> | null>;
  findByCampaignIdWithTx(tx: Prisma.TransactionClient, campaignId: string): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs> | null>;
  create(data: Prisma.CampaignBudgetLockUncheckedCreateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>>;
  createWithTx(tx: Prisma.TransactionClient, data: Prisma.CampaignBudgetLockUncheckedCreateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>>;
  update(campaignId: string, data: Prisma.CampaignBudgetLockUncheckedUpdateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>>;
  updateWithTx(tx: Prisma.TransactionClient, campaignId: string, data: Prisma.CampaignBudgetLockUncheckedUpdateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>>;
  updateById(id: string, data: Prisma.CampaignBudgetLockUncheckedUpdateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>>;
  updateByIdWithTx(tx: Prisma.TransactionClient, id: string, data: Prisma.CampaignBudgetLockUncheckedUpdateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>>;
  delete(campaignId: string): Promise<void>;
}

export class CampaignBudgetLockRepository implements ICampaignBudgetLockRepository {
  async findByCampaignId(campaignId: string): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs> | null> {
    return db.campaignBudgetLock.findUnique({
      where: { campaignId },
    });
  }

  async findByCampaignIdWithTx(tx: Prisma.TransactionClient, campaignId: string): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs> | null> {
    return tx.campaignBudgetLock.findUnique({
      where: { campaignId },
    });
  }

  async create(data: Prisma.CampaignBudgetLockUncheckedCreateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>> {
    return db.campaignBudgetLock.create({
      data,
    });
  }

  async createWithTx(tx: Prisma.TransactionClient, data: Prisma.CampaignBudgetLockUncheckedCreateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>> {
    return tx.campaignBudgetLock.create({
      data,
    });
  }

  async update(campaignId: string, data: Prisma.CampaignBudgetLockUncheckedUpdateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>> {
    return db.campaignBudgetLock.update({
      where: { campaignId },
      data,
    });
  }

  async updateWithTx(tx: Prisma.TransactionClient, campaignId: string, data: Prisma.CampaignBudgetLockUncheckedUpdateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>> {
    return tx.campaignBudgetLock.update({
      where: { campaignId },
      data,
    });
  }

  async updateById(id: string, data: Prisma.CampaignBudgetLockUncheckedUpdateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>> {
    return db.campaignBudgetLock.update({
      where: { id },
      data,
    });
  }

  async updateByIdWithTx(tx: Prisma.TransactionClient, id: string, data: Prisma.CampaignBudgetLockUncheckedUpdateInput): Promise<Prisma.CampaignBudgetLockGetPayload<Prisma.CampaignBudgetLockDefaultArgs>> {
    return tx.campaignBudgetLock.update({
      where: { id },
      data,
    });
  }

  async delete(campaignId: string): Promise<void> {
    await db.campaignBudgetLock.delete({
      where: { campaignId },
    });
  }
}

export const campaignBudgetLockRepository = new CampaignBudgetLockRepository();
