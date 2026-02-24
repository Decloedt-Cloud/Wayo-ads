import { db } from '@/lib/db';
import { Prisma, NotificationScope, NotificationPriority, NotificationStatus, NotificationDeliveryType } from '@prisma/client';

export interface INotificationRepository {
  findById(id: string): Promise<any | null>;
  findByDedupeKey(dedupeKey: string, scope: NotificationScope, userId?: string, role?: string): Promise<any | null>;
  findFirst(where: any): Promise<any | null>;
  findByUserId(userId: string, options?: { limit?: number; offset?: number; status?: NotificationStatus }): Promise<any[]>;
  countByUserId(userId: string, status?: NotificationStatus): Promise<number>;
  countImportantByUserId(userId: string): Promise<number>;
  create(data: any): Promise<any>;
  updateMany(where: any, data: any): Promise<{ count: number }>;
}

export class NotificationRepository implements INotificationRepository {
  async findById(id: string): Promise<any | null> {
    return db.notification.findUnique({ where: { id } });
  }

  async findByDedupeKey(dedupeKey: string, scope: NotificationScope, userId?: string, role?: string): Promise<any | null> {
    return db.notification.findFirst({
      where: {
        dedupeKey,
        scope,
        ...(userId && { toUserId: userId }),
        ...(role && { toRole: role }),
      },
    });
  }

  async findFirst(where: any): Promise<any | null> {
    return db.notification.findFirst({ where });
  }

  async findByUserId(userId: string, options?: { limit?: number; offset?: number; status?: NotificationStatus }): Promise<any[]> {
    const { limit = 20, offset = 0, status } = options || {};
    
    return db.notification.findMany({
      where: {
        deliveries: {
          some: {
            userId,
            ...(status && { status }),
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async countByUserId(userId: string, status?: NotificationStatus): Promise<number> {
    return db.notificationDelivery.count({
      where: {
        userId,
        ...(status && { status }),
      },
    });
  }

  async countImportantByUserId(userId: string): Promise<number> {
    return db.notificationDelivery.count({
      where: {
        userId,
        status: 'UNREAD',
        notification: {
          priority: { in: ['P0_CRITICAL', 'P1_HIGH'] },
        },
      },
    });
  }

  async create(data: any): Promise<any> {
    return db.notification.create({ data });
  }

  async updateMany(where: any, data: any): Promise<{ count: number }> {
    return db.notificationDelivery.updateMany({ where, data });
  }
}

export interface INotificationDeliveryRepository {
  create(data: any): Promise<any>;
  createMany(data: any[]): Promise<{ count: number }>;
  findByUserId(userId: string, status?: NotificationStatus): Promise<any[]>;
  updateStatus(userId: string, notificationIds: string[], status: NotificationStatus): Promise<{ count: number }>;
}

export class NotificationDeliveryRepository implements INotificationDeliveryRepository {
  async create(data: any): Promise<any> {
    return db.notificationDelivery.create({ data });
  }

  async createMany(data: any[]): Promise<{ count: number }> {
    return db.notificationDelivery.createMany({ data });
  }

  async findByUserId(userId: string, status?: NotificationStatus): Promise<any[]> {
    return db.notificationDelivery.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
    });
  }

  async updateStatus(userId: string, notificationIds: string[], status: NotificationStatus): Promise<{ count: number }> {
    return db.notificationDelivery.updateMany({
      where: {
        userId,
        notificationId: { in: notificationIds },
      },
      data: { status },
    });
  }
}

export interface INotificationPreferenceRepository {
  findByUserId(userId: string): Promise<any | null>;
  upsert(userId: string, data: any): Promise<any>;
}

export class NotificationPreferenceRepository implements INotificationPreferenceRepository {
  async findByUserId(userId: string): Promise<any | null> {
    return db.notificationPreference.findUnique({ where: { userId } });
  }

  async upsert(userId: string, data: any): Promise<any> {
    return db.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}

export const notificationRepository = new NotificationRepository();
export const notificationDeliveryRepository = new NotificationDeliveryRepository();
export const notificationPreferenceRepository = new NotificationPreferenceRepository();
