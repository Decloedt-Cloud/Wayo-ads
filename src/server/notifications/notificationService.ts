import { db } from '@/lib/db';
import { z } from 'zod';
import { notificationRepository, notificationDeliveryRepository, notificationPreferenceRepository } from './repositories';
import { userRepository } from '@/server/admin/repositories';

const NotificationScopeEnum = z.enum(['USER', 'ROLE', 'GLOBAL']);
const NotificationPriorityEnum = z.enum(['P0_CRITICAL', 'P1_HIGH', 'P2_NORMAL', 'P3_LOW']);
const NotificationStatusEnum = z.enum(['UNREAD', 'READ', 'ARCHIVED', 'DISMISSED']);
const NotificationDeliveryTypeEnum = z.enum(['IN_APP', 'EMAIL', 'BOTH']);

const notificationTypes = [
  'TOKENS_LOW',
  'TOKENS_EXHAUSTED',
  'TOKENS_PURCHASED',
  'PAYMENT_FAILED',
  'DEPOSIT_FAILED',
  'WALLET_CREDITED',
  'WITHDRAWAL_FAILED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REQUESTED',
  'PAYOUT_COMPLETED',
  'BUDGET_EXHAUSTED',
  'BUDGET_LOW',
  'CAMPAIGN_PAUSED',
  'CAMPAIGN_APPROVED',
  'CAMPAIGN_REJECTED',
  'CAMPAIGN_UNDER_REVIEW',
  'CAMPAIGN_AUTO_PAUSED',
  'CREATOR_APPLICATION_PENDING',
  'CREATOR_APPLICATION_APPROVED',
  'CREATOR_APPLICATION_REJECTED',
  'CREATOR_APPLIED',
  'VIDEO_SUBMITTED',
  'VIDEO_UPDATED',
  'VIDEO_APPROVED',
  'VIDEO_REJECTED',
  'EARNINGS_AVAILABLE',
  'TRACKING_DISABLED',
  'FRAUD_DETECTED',
  'SUSPICIOUS_ACTIVITY',
  'ACCOUNT_PENDING_APPROVAL',
  'ROLE_REQUEST_PENDING',
  'SYSTEM_ANNOUNCEMENT',
  'CREDENTIALS_INVALID',
  'WEBHOOK_FAILURE',
  'YOUTUBE_DISCONNECTED',
  'TRUST_SCORE_DOWNGRADED',
  'CREATOR_TIER_CHANGED',
  'CREATOR_FLAGGED',
  'VELOCITY_SPIKE_DETECTED',
  'FRAUD_SCORE_EXCEEDED',
  'CAMPAIGN_CONFIDENCE_LOW',
  'RESERVE_LOCKED',
  'RESERVE_RELEASED',
  'DYNAMIC_CPM_CHANGED',
  'EXCESSIVE_FRAUD_PATTERN',
  'UNUSUAL_PAYOUT_CLUSTER',
  'STRIPE_PAYOUT_FAILURE',
] as const;

export type NotificationType = typeof notificationTypes[number];

const NotificationTypeEnum = z.enum([
  'TOKENS_LOW',
  'TOKENS_EXHAUSTED',
  'TOKENS_PURCHASED',
  'PAYMENT_FAILED',
  'DEPOSIT_FAILED',
  'WALLET_CREDITED',
  'WITHDRAWAL_FAILED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REQUESTED',
  'PAYOUT_COMPLETED',
  'BUDGET_EXHAUSTED',
  'BUDGET_LOW',
  'CAMPAIGN_PAUSED',
  'CAMPAIGN_APPROVED',
  'CAMPAIGN_REJECTED',
  'CAMPAIGN_UNDER_REVIEW',
  'CAMPAIGN_AUTO_PAUSED',
  'CREATOR_APPLICATION_PENDING',
  'CREATOR_APPLICATION_APPROVED',
  'CREATOR_APPLICATION_REJECTED',
  'CREATOR_APPLIED',
  'VIDEO_SUBMITTED',
  'VIDEO_UPDATED',
  'VIDEO_APPROVED',
  'VIDEO_REJECTED',
  'EARNINGS_AVAILABLE',
  'TRACKING_DISABLED',
  'FRAUD_DETECTED',
  'SUSPICIOUS_ACTIVITY',
  'ACCOUNT_PENDING_APPROVAL',
  'ROLE_REQUEST_PENDING',
  'SYSTEM_ANNOUNCEMENT',
  'CREDENTIALS_INVALID',
  'WEBHOOK_FAILURE',
  'YOUTUBE_DISCONNECTED',
  'TRUST_SCORE_DOWNGRADED',
  'CREATOR_TIER_CHANGED',
  'CREATOR_FLAGGED',
  'VELOCITY_SPIKE_DETECTED',
  'FRAUD_SCORE_EXCEEDED',
  'CAMPAIGN_CONFIDENCE_LOW',
  'RESERVE_LOCKED',
  'RESERVE_RELEASED',
  'DYNAMIC_CPM_CHANGED',
  'EXCESSIVE_FRAUD_PATTERN',
  'UNUSUAL_PAYOUT_CLUSTER',
  'STRIPE_PAYOUT_FAILURE',
]);

export const notificationTypeSchema = NotificationTypeEnum;

const createNotificationSchema = z.object({
  scope: NotificationScopeEnum.optional(),
  toUserId: z.string().optional(),
  toRole: z.string().optional(),
  senderId: z.string().optional(),
  type: notificationTypeSchema,
  priority: NotificationPriorityEnum.optional(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  actionUrl: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  deliveryType: NotificationDeliveryTypeEnum.optional(),
  dedupeKey: z.string().optional(),
  expiresAt: z.string().optional(),
}).transform((data) => ({
  ...data,
  scope: (data.scope ?? 'USER') as 'USER' | 'ROLE' | 'GLOBAL',
  priority: (data.priority ?? 'P2_NORMAL') as 'P0_CRITICAL' | 'P1_HIGH' | 'P2_NORMAL' | 'P3_LOW',
  deliveryType: (data.deliveryType ?? 'IN_APP') as 'IN_APP' | 'EMAIL' | 'BOTH',
  expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
}));

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

const listNotificationsSchema = z.object({
  userId: z.string(),
  status: NotificationStatusEnum.optional(),
  importantOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  type: NotificationTypeEnum.optional(),
  priority: z.enum(['P0_CRITICAL', 'P1_HIGH', 'P2_NORMAL', 'P3_LOW']).optional(),
  search: z.string().optional(),
}).transform((data) => ({
  ...data,
  limit: data.limit ?? 20,
}));

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;

const markActionSchema = z.object({
  userId: z.string(),
  notificationId: z.string(),
});

export type MarkActionInput = z.infer<typeof markActionSchema>;

const batchActionSchema = z.object({
  userId: z.string(),
  notificationIds: z.array(z.string()),
});

export type BatchActionInput = z.infer<typeof batchActionSchema>;

function isImportantPriority(priority: string): boolean {
  return priority === 'P0_CRITICAL' || priority === 'P1_HIGH';
}

export async function createUserNotification(input: CreateNotificationInput) {
  const baseSchema = z.object({
    scope: NotificationScopeEnum.optional(),
    toUserId: z.string().optional(),
    toRole: z.string().optional(),
    senderId: z.string().optional(),
    type: notificationTypeSchema,
    priority: NotificationPriorityEnum.optional(),
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    actionUrl: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    deliveryType: NotificationDeliveryTypeEnum.optional(),
    dedupeKey: z.string().optional(),
    expiresAt: z.string().optional(),
  });
  
  const parsed = baseSchema.parse(input);
  const data: any = {
    ...parsed,
    scope: (parsed.scope ?? 'USER') as 'USER' | 'ROLE' | 'GLOBAL',
    priority: (parsed.priority ?? 'P2_NORMAL') as 'P0_CRITICAL' | 'P1_HIGH' | 'P2_NORMAL' | 'P3_LOW',
    deliveryType: (parsed.deliveryType ?? 'IN_APP') as 'IN_APP' | 'EMAIL' | 'BOTH',
    expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
  };

  if (data.dedupeKey) {
    const existing = await notificationRepository.findByDedupeKey(
      data.dedupeKey,
      data.scope as 'USER' | 'ROLE' | 'GLOBAL',
      data.toUserId,
      data.toRole
    );
    if (existing) {
      return existing;
    }
  }

  const notificationData: any = {
    ...data,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  };
  
  if (data.senderId) {
    notificationData.senderId = data.senderId;
  }

  const notification = await notificationRepository.create(notificationData);

  if (data.scope === 'USER' && data.toUserId) {
    await notificationDeliveryRepository.create({
      notificationId: notification.id,
      userId: data.toUserId,
      status: 'UNREAD',
    });
  }

  return notification;
}

export async function createRoleBroadcast(input: CreateNotificationInput & { toRole: string }) {
  const data = createNotificationSchema.parse({ ...input, scope: 'ROLE' });

  if (data.dedupeKey) {
    const existing = await notificationRepository.findByDedupeKey(data.dedupeKey, 'ROLE', undefined, data.toRole);
    if (existing) {
      return existing;
    }
  }

  const notification = await notificationRepository.create({
    toUserId: undefined,
    scope: 'ROLE',
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    priority: data.priority,
    title: data.title,
    message: data.message,
    actionUrl: data.actionUrl,
    deliveryType: data.deliveryType,
    dedupeKey: data.dedupeKey,
    expiresAt: data.expiresAt,
  });

  const users = await userRepository.findByRole(data.toRole!);

  if (users.length > 0) {
    await notificationDeliveryRepository.createMany(
      users.map((user) => ({
        notificationId: notification.id,
        userId: user.id,
        status: 'UNREAD',
      }))
    );
  }

  return notification;
}

export async function createGlobalBroadcast(input: CreateNotificationInput & { createdByUserId: string }) {
  const data = createNotificationSchema.parse({ ...input, scope: 'GLOBAL' });

  const notification = await notificationRepository.create({
    toUserId: undefined,
    scope: 'GLOBAL',
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    priority: data.priority,
    title: data.title,
    message: data.message,
    actionUrl: data.actionUrl,
    deliveryType: data.deliveryType,
    dedupeKey: data.dedupeKey,
    expiresAt: data.expiresAt,
    senderId: data.senderId,
  });

  const users = await userRepository.findAllUsers();

  if (users.length > 0) {
    await notificationDeliveryRepository.createMany(
      users.map((user) => ({
        notificationId: notification.id,
        userId: user.id,
        status: 'UNREAD',
      }))
    );
  }

  return notification;
}

export async function listUserNotifications(input: ListNotificationsInput) {
  const data = listNotificationsSchema.parse(input);

  const where: Record<string, unknown> = {
    deliveries: {
      some: {
        userId: data.userId,
      },
    },
  };

  if (data.status) {
    where.AND = [
      {
        deliveries: {
          some: {
            userId: data.userId,
            status: data.status as 'UNREAD' | 'READ' | 'ARCHIVED' | 'DISMISSED',
          },
        },
      },
    ];
  }

  if (data.importantOnly) {
    where.priority = { in: ['P0_CRITICAL', 'P1_HIGH'] };
  }

  if (data.type) {
    where.type = data.type;
  }

  if (data.priority) {
    where.priority = data.priority;
  }

  if (data.search) {
    where.OR = [
      { title: { contains: data.search, mode: 'insensitive' } },
      { message: { contains: data.search, mode: 'insensitive' } },
    ];
  }

  const notifications = await db.notification.findMany({
    where,
    include: {
      deliveries: {
        where: { userId: data.userId },
        select: {
          id: true,
          status: true,
          readAt: true,
          archivedAt: true,
          dismissedAt: true,
        },
      },
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'desc' },
    ],
    take: data.limit + 1,
    cursor: data.cursor ? { id: data.cursor } : undefined,
    skip: data.cursor ? 1 : 0,
  });

  let nextCursor: string | undefined;
  if (notifications.length > data.limit) {
    const nextItem = notifications.pop();
    nextCursor = nextItem?.id;
  }

  const formattedNotifications = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    priority: n.priority,
    title: n.title,
    message: n.message,
    actionUrl: n.actionUrl,
    metadata: n.metadata ? JSON.parse(n.metadata) : null,
    isImportant: isImportantPriority(n.priority),
    createdAt: n.createdAt,
    expiresAt: n.expiresAt,
    delivery: n.deliveries[0] ? {
      id: n.deliveries[0].id,
      status: n.deliveries[0].status,
      readAt: n.deliveries[0].readAt,
      archivedAt: n.deliveries[0].archivedAt,
      dismissedAt: n.deliveries[0].dismissedAt,
    } : null,
  }));

  return {
    notifications: formattedNotifications,
    nextCursor,
  };
}

export async function getUnreadCount(userId: string) {
  const count = await db.notificationDelivery.count({
    where: {
      userId,
      status: 'UNREAD',
      notification: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    },
  });

  const importantCount = await db.notificationDelivery.count({
    where: {
      userId,
      status: 'UNREAD',
      notification: {
        priority: { in: ['P0_CRITICAL', 'P1_HIGH'] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    },
  });

  return { total: count, important: importantCount };
}

export async function markAsRead(input: MarkActionInput) {
  const data = markActionSchema.parse(input);

  return notificationDeliveryRepository.updateStatus(data.userId, [data.notificationId], 'READ');
}

export async function markAsArchived(input: MarkActionInput) {
  const data = markActionSchema.parse(input);

  return notificationDeliveryRepository.updateStatus(data.userId, [data.notificationId], 'ARCHIVED');
}

export async function dismissNotification(input: MarkActionInput) {
  const data = markActionSchema.parse(input);

  return notificationDeliveryRepository.updateStatus(data.userId, [data.notificationId], 'DISMISSED');
}

export async function markAllAsRead(userId: string) {
  return notificationDeliveryRepository.updateStatus(userId, [], 'READ');
}

export async function getImportantNotifications(userId: string, limit = 3) {
  const notifications = await db.notification.findMany({
    where: {
      deliveries: {
        some: {
          userId,
          status: 'UNREAD',
        },
      },
      priority: { in: ['P0_CRITICAL', 'P1_HIGH'] },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id: true,
      type: true,
      priority: true,
      title: true,
      message: true,
      actionUrl: true,
      createdAt: true,
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  });

  return notifications;
}

export async function getNotificationPreferences(userId: string) {
  let prefs = await notificationPreferenceRepository.findByUserId(userId);

  if (!prefs) {
    prefs = await notificationPreferenceRepository.upsert(userId, { userId });
  }

  return {
    allowInApp: prefs.allowInApp,
    allowEmail: prefs.allowEmail,
    mutedTypes: prefs.mutedTypes?.split(',').filter(Boolean) || [],
    toastMaxPerSession: prefs.toastMaxPerSession,
    lowBudgetPercent: prefs.lowBudgetPercent,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  data: {
    allowInApp?: boolean;
    allowEmail?: boolean;
    mutedTypes?: string[];
    toastMaxPerSession?: number;
    lowBudgetPercent?: number;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.mutedTypes) {
    updateData.mutedTypes = data.mutedTypes.join(',');
  }

  return notificationPreferenceRepository.upsert(userId, updateData);
}
