import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createUserNotification,
  createRoleBroadcast,
  createGlobalBroadcast,
  listUserNotifications,
  getUnreadCount,
  markAsRead,
  markAsArchived,
  dismissNotification,
  markAllAsRead,
  getImportantNotifications,
} from '../notifications/notificationService';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    notification: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    notificationDelivery: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserNotification', () => {
    it('should create a notification successfully', async () => {
      const mockNotification = {
        id: 'notif-1',
        scope: 'USER',
        toUserId: 'user-1',
        type: 'PAYMENT_FAILED',
        priority: 'P0_CRITICAL',
        title: 'Payment Failed',
        message: 'Test message',
      };
      (db.notification.findFirst as any).mockResolvedValue(null);
      (db.notification.create as any).mockResolvedValue(mockNotification);
      (db.notificationDelivery.create as any).mockResolvedValue({ id: 'delivery-1' });

      const result = await createUserNotification({
        toUserId: 'user-1',
        type: 'PAYMENT_FAILED',
        priority: 'P0_CRITICAL',
        title: 'Payment Failed',
        message: 'Test message',
      });

      expect(result).toEqual(mockNotification);
      expect(db.notification.create).toHaveBeenCalled();
    });

    it('should skip creation when dedupeKey matches existing notification', async () => {
      (db.notification.findFirst as any).mockResolvedValue({ id: 'existing-notif' });

      const result = await createUserNotification({
        toUserId: 'user-1',
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: 'Test message',
        dedupeKey: 'payment_failed_user-1',
      });

      expect(db.notification.create).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'existing-notif' });
    });

    it('should use default priority when not provided', async () => {
      const mockNotification = {
        id: 'notif-1',
        scope: 'USER',
        toUserId: 'user-1',
        type: 'EARNINGS_AVAILABLE',
        priority: 'P2_NORMAL',
        title: 'Earnings Available',
        message: 'Test message',
      };
      (db.notification.findFirst as any).mockResolvedValue(null);
      (db.notification.create as any).mockResolvedValue(mockNotification);
      (db.notificationDelivery.create as any).mockResolvedValue({ id: 'delivery-1' });

      const result = await createUserNotification({
        toUserId: 'user-1',
        type: 'EARNINGS_AVAILABLE',
        title: 'Earnings Available',
        message: 'Test message',
      });

      expect(db.notification.create).toHaveBeenCalled();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.priority).toBe('P2_NORMAL');
    });
  });

  describe('createRoleBroadcast', () => {
    it('should create a role broadcast notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        scope: 'ROLE',
        toRole: 'ADMIN',
        type: 'FRAUD_DETECTED',
        priority: 'P0_CRITICAL',
        title: 'Fraud Detected',
        message: 'Test message',
      };
      (db.notification.findFirst as any).mockResolvedValue(null);
      (db.notification.create as any).mockResolvedValue(mockNotification);
      (db.user.findMany as any).mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
      (db.notificationDelivery.create as any).mockResolvedValue({ id: 'delivery-1' });

      const result = await createRoleBroadcast({
        toRole: 'ADMIN',
        type: 'FRAUD_DETECTED',
        priority: 'P0_CRITICAL',
        title: 'Fraud Detected',
        message: 'Test message',
      });

      expect(result).toEqual(mockNotification);
      expect(db.notification.create).toHaveBeenCalled();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.scope).toBe('ROLE');
      expect(createCall.data.toRole).toBe('ADMIN');
    });
  });

  describe('createGlobalBroadcast', () => {
    it('should create a global broadcast notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        scope: 'GLOBAL',
        type: 'SYSTEM_ANNOUNCEMENT',
        priority: 'P2_NORMAL',
        title: 'System Maintenance',
        message: 'Test message',
      };
      (db.notification.findFirst as any).mockResolvedValue(null);
      (db.notification.create as any).mockResolvedValue(mockNotification);
      (db.user.findMany as any).mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
      (db.notificationDelivery.create as any).mockResolvedValue({ id: 'delivery-1' });

      const result = await createGlobalBroadcast({
        createdByUserId: 'admin-1',
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'System Maintenance',
        message: 'Test message',
      });

      expect(result).toEqual(mockNotification);
      expect(db.notification.create).toHaveBeenCalled();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.scope).toBe('GLOBAL');
    });
  });

  describe('listUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Notification 1', priority: 'P2_NORMAL', type: 'EARNINGS_AVAILABLE', message: 'test', actionUrl: null, metadata: null, createdAt: new Date(), expiresAt: null, deliveries: [{ id: 'd1', status: 'UNREAD', readAt: null, archivedAt: null, dismissedAt: null }] },
        { id: 'notif-2', title: 'Notification 2', priority: 'P2_NORMAL', type: 'EARNINGS_AVAILABLE', message: 'test', actionUrl: null, metadata: null, createdAt: new Date(), expiresAt: null, deliveries: [{ id: 'd2', status: 'READ', readAt: new Date(), archivedAt: null, dismissedAt: null }] },
      ];
      (db.notification.findMany as any).mockResolvedValue(mockNotifications);

      const result = await listUserNotifications({
        userId: 'user-1',
        limit: 10,
      });

      expect(result.notifications).toHaveLength(2);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should filter by status', async () => {
      (db.notification.findMany as any).mockResolvedValue([]);

      await listUserNotifications({
        userId: 'user-1',
        status: 'UNREAD',
        limit: 10,
      });

      expect(db.notification.findMany).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      (db.notification.findMany as any).mockResolvedValue([]);

      await listUserNotifications({
        userId: 'user-1',
        type: 'PAYMENT_FAILED',
        limit: 10,
      });

      const findManyCall = (db.notification.findMany as any).mock.calls[0][0];
      expect(findManyCall.where.type).toBe('PAYMENT_FAILED');
    });

    it('should filter by priority', async () => {
      (db.notification.findMany as any).mockResolvedValue([]);

      await listUserNotifications({
        userId: 'user-1',
        priority: 'P0_CRITICAL',
        limit: 10,
      });

      const findManyCall = (db.notification.findMany as any).mock.calls[0][0];
      expect(findManyCall.where.priority).toBe('P0_CRITICAL');
    });

    it('should search by title and message', async () => {
      (db.notification.findMany as any).mockResolvedValue([]);

      await listUserNotifications({
        userId: 'user-1',
        search: 'payment',
        limit: 10,
      });

      const findManyCall = (db.notification.findMany as any).mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      (db.notificationDelivery.count as any).mockResolvedValue(5);

      const result = await getUnreadCount('user-1');

      expect(result.total).toBe(5);
      expect(db.notificationDelivery.count).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      (db.notificationDelivery.updateMany as any).mockResolvedValue({ count: 1 });

      const result = await markAsRead({
        userId: 'user-1',
        notificationId: 'notif-1',
      });

      expect(result.count).toBe(1);
      expect(db.notificationDelivery.updateMany).toHaveBeenCalled();
    });
  });

  describe('markAsArchived', () => {
    it('should mark notification as archived', async () => {
      (db.notificationDelivery.updateMany as any).mockResolvedValue({ count: 1 });

      const result = await markAsArchived({
        userId: 'user-1',
        notificationId: 'notif-1',
      });

      expect(result.count).toBe(1);
    });
  });

  describe('dismissNotification', () => {
    it('should dismiss notification', async () => {
      (db.notificationDelivery.updateMany as any).mockResolvedValue({ count: 1 });

      const result = await dismissNotification({
        userId: 'user-1',
        notificationId: 'notif-1',
      });

      expect(result.count).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      (db.notificationDelivery.updateMany as any).mockResolvedValue({ count: 5 });

      const result = await markAllAsRead('user-1');

      expect(result.count).toBe(5);
      expect(db.notificationDelivery.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'UNREAD',
        },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('getImportantNotifications', () => {
    it('should return only P0 and P1 priority notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', priority: 'P0_CRITICAL', title: 'Critical', type: 'FRAUD_DETECTED', message: 'test', actionUrl: null, metadata: null, createdAt: new Date(), expiresAt: null, deliveries: [{ id: 'd1', status: 'UNREAD', readAt: null, archivedAt: null, dismissedAt: null }] },
        { id: 'notif-2', priority: 'P1_HIGH', title: 'High', type: 'BUDGET_LOW', message: 'test', actionUrl: null, metadata: null, createdAt: new Date(), expiresAt: null, deliveries: [{ id: 'd2', status: 'UNREAD', readAt: null, archivedAt: null, dismissedAt: null }] },
      ];
      (db.notification.findMany as any).mockResolvedValue(mockNotifications);

      const result = await getImportantNotifications('user-1', 3);

      expect(result).toHaveLength(2);
    });
  });
});
