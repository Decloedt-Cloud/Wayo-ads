import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface IInvoiceRepository {
  findById(id: string): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs> | null>;
  findByInvoiceNumber(invoiceNumber: string): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs> | null>;
  findByUserId(userId: string, limit?: number): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>[]>;
  findByReferenceId(referenceId: string): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs> | null>;
  create(data: Prisma.InvoiceUncheckedCreateInput): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>>;
  createWithTx(tx: Prisma.TransactionClient, data: Prisma.InvoiceUncheckedCreateInput): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>>;
  update(id: string, data: Prisma.InvoiceUncheckedUpdateInput): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>>;
  updateStatus(id: string, status: string): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>>;
  findAll(params: { userId?: string; status?: string; invoiceType?: string; page?: number; limit?: number }): Promise<{ invoices: Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>[]; total: number }>;
}

export class InvoiceRepository implements IInvoiceRepository {
  async findById(id: string): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs> | null> {
    return db.invoice.findUnique({ where: { id } });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs> | null> {
    return db.invoice.findUnique({ where: { invoiceNumber } });
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>[]> {
    return db.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByReferenceId(referenceId: string): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs> | null> {
    return db.invoice.findFirst({
      where: { referenceId },
    });
  }

  async create(data: Prisma.InvoiceUncheckedCreateInput): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>> {
    return db.invoice.create({ data });
  }

  async createWithTx(tx: Prisma.TransactionClient, data: Prisma.InvoiceUncheckedCreateInput): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>> {
    return tx.invoice.create({ data });
  }

  async update(id: string, data: Prisma.InvoiceUncheckedUpdateInput): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>> {
    return db.invoice.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: string): Promise<Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>> {
    const updateData: Prisma.InvoiceUncheckedUpdateInput = { status };
    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }
    return db.invoice.update({ where: { id }, data: updateData });
  }

  async findAll(params: { userId?: string; status?: string; invoiceType?: string; page?: number; limit?: number }): Promise<{ invoices: Prisma.InvoiceGetPayload<Prisma.InvoiceDefaultArgs>[]; total: number }> {
    const { userId, status, invoiceType, page = 1, limit = 20 } = params;
    const where: Prisma.InvoiceWhereInput = {};
    
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (invoiceType) where.invoiceType = invoiceType;

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    return { invoices, total };
  }
}

export const invoiceRepository = new InvoiceRepository();
