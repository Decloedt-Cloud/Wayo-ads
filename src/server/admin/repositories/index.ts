import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const userRepository = {
  async findById(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
  },

  async findByIdFull(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
    });
  },

  async findByIdWithSelect(userId: string, select: any) {
    return db.user.findUnique({
      where: { id: userId },
      select,
    });
  },

  async updateUser(userId: string, data: Record<string, unknown>) {
    return db.user.update({
      where: { id: userId },
      data,
    });
  },

  async findByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
    });
  },

  async create(data: { email: string; name: string; password: string; roles: string }) {
    return db.user.create({ data });
  },

  async findByRole(role: string) {
    return db.user.findMany({
      where: { roles: { contains: role } },
      select: { id: true },
    });
  },

  async findAllUsers() {
    return db.user.findMany({
      select: { id: true },
    });
  },

  async findByIdWithDetails(userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        createdAt: true,
        trustScore: true,
        tier: true,
        verificationLevel: true,
        qualityMultiplier: true,
      },
    });
  },

  async findMany(params: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
  }) {
    return db.user.findMany({
      where: params.where,
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        createdAt: true,
        trustScore: true,
        tier: true,
        verificationLevel: true,
        qualityMultiplier: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  },

  async count(where?: Record<string, unknown>) {
    return db.user.count({ where });
  },

  async update(userId: string, data: { roles?: string }) {
    return db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        createdAt: true,
      },
    });
  },

  async delete(userId: string) {
    return db.user.delete({
      where: { id: userId },
    });
  },
};

export const adminSettingsRepository = {
  async findStripeSettings(where?: Record<string, unknown>) {
    return db.stripeSettings.findFirst({ where });
  },

  async findStripeSettingsWithUser(where?: Record<string, unknown>) {
    return db.stripeSettings.findFirst({
      where,
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async createStripeSettings(data: Record<string, unknown>) {
    return db.stripeSettings.create({ data });
  },

  async updateStripeSettings(
    id: string,
    data: Record<string, unknown>
  ) {
    return db.stripeSettings.update({ where: { id }, data });
  },

  async deactivateAllStripeSettings() {
    return db.stripeSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  },

  async createAuditLog(data: {
    userId: string;
    action: string;
    metadata?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return db.adminAuditLog.create({ data });
  },

  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return db.$transaction(fn);
  },

  async upsertCreatorBalance(creatorId: string, data: Record<string, unknown>) {
    return db.creatorBalance.upsert({
      where: { creatorId },
      update: data,
      create: { creatorId, ...data as any },
    });
  },

  async findEmailSettings() {
    return db.emailSettings.findFirst({
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async createEmailSettings(data: {
    host?: string;
    port?: number;
    secure?: boolean;
    usernameEncrypted?: string;
    passwordEncrypted?: string;
    fromEmail?: string;
    fromName?: string;
    replyToEmail?: string;
    isEnabled?: boolean;
  }) {
    return db.emailSettings.create({ data });
  },

  async updateEmailSettings(
    id: string,
    data: {
      host?: string;
      port?: number;
      secure?: boolean;
      usernameEncrypted?: string;
      passwordEncrypted?: string;
      fromEmail?: string;
      fromName?: string;
      replyToEmail?: string;
      isEnabled?: boolean;
    }
  ) {
    return db.emailSettings.update({ where: { id }, data });
  },

  async findPlatformSettings() {
    return db.platformSettings.findFirst({});
  },

  async createPlatformSettings(data: {
    platformFeeRate: number;
    platformFeeDescription?: string;
    defaultCurrency: string;
    minimumWithdrawalCents: number;
    pendingHoldDays: number;
  }) {
    return db.platformSettings.create({ data });
  },

  async findCompanyBusinessInfo() {
    return db.companyBusinessInfo.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  },

  async createCompanyBusinessInfo(data: Record<string, unknown>) {
    return db.companyBusinessInfo.create({ data });
  },

  async updateCompanyBusinessInfo(
    id: string,
    data: Record<string, unknown>
  ) {
    return db.companyBusinessInfo.update({ where: { id }, data });
  },

  async findEmailLogs(limit?: number) {
    return db.emailLog.findMany({
      take: limit,
      orderBy: { sentAt: 'desc' },
    });
  },
};
