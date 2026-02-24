import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createUserNotification, 
  createRoleBroadcast,
  listUserNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAsArchived,
  dismissNotification,
  markAllAsRead,
  getImportantNotifications,
} from './notificationService';

vi.mock('@/lib/db', () => ({
  db: {
    notification: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    notificationDelivery: {
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from '@/lib/db';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserNotification', () => {
    it('should create a notification with user scope', async () => {
      const mockNotification = {
        id: 'notif-1',
        scope: 'USER',
        toUserId: 'user-1',
        type: 'CAMPAIGN_APPROVED',
        priority: 'P1_HIGH',
        title: 'Video Approved',
        message: 'Your video has been approved!',
        actionUrl: '/dashboard/creator/posts/1',
        createdAt: new Date(),
      };

      (db.notification.create as any).mockResolvedValue(mockNotification);
      (db.notificationDelivery.create as any).mockResolvedValue({
        id: 'delivery-1',
        notificationId: 'notif-1',
        userId: 'user-1',
        status: 'UNREAD',
      });

      const result = await createUserNotification({
        toUserId: 'user-1',
        type: 'CAMPAIGN_APPROVED',
        priority: 'P1_HIGH',
        title: 'Video Approved',
        message: 'Your video has been approved!',
        actionUrl: '/dashboard/creator/posts/1',
      } as any);

      expect(result).toEqual(mockNotification);
      expect(db.notification.create).toHaveBeenCalled();
      expect(db.notificationDelivery.create).toHaveBeenCalled();
    });

    it('should create a notification with sender', async () => {
      const mockNotification = {
        id: 'notif-2',
        scope: 'USER',
        toUserId: 'user-1',
        senderId: 'sender-1',
        type: 'CREATOR_APPLICATION_APPROVED',
        priority: 'P1_HIGH',
        title: 'Application Approved',
        message: 'Your application has been approved!',
        createdAt: new Date(),
      };

      (db.notification.create as any).mockResolvedValue(mockNotification);
      (db.notificationDelivery.create as any).mockResolvedValue({
        id: 'delivery-2',
        notificationId: 'notif-2',
        userId: 'user-1',
        status: 'UNREAD',
      });

      const result = await createUserNotification({
        toUserId: 'user-1',
        senderId: 'sender-1',
        type: 'CREATOR_APPLICATION_APPROVED',
        priority: 'P1_HIGH',
        title: 'Application Approved',
        message: 'Your application has been approved!',
      } as any);

      expect(result).toEqual(mockNotification);
    });

    it('should handle dedupe key to prevent duplicates', async () => {
      const existingNotification = {
        id: 'existing-notif',
        scope: 'USER',
        toUserId: 'user-1',
        type: 'CAMPAIGN_APPROVED',
        title: 'Video Submitted',
        createdAt: new Date(),
      };

      (db.notification.findFirst as any).mockResolvedValue(existingNotification);

      const result = await createUserNotification({
        toUserId: 'user-1',
        type: 'CAMPAIGN_APPROVED',
        title: 'Video Submitted',
        message: 'Video submitted for campaign',
        dedupeKey: 'video-submitted-user-1-campaign-1',
      } as any);

      expect(result).toEqual(existingNotification);
      expect(db.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('createRoleBroadcast', () => {
    it('should create a notification with role scope', async () => {
      const mockNotification = {
        id: 'notif-3',
        scope: 'ROLE',
        toRole: 'ADVERTISER',
        type: 'SYSTEM_ANNOUNCEMENT',
        priority: 'P2_NORMAL',
        title: 'New Video Submission',
        message: 'New video submitted for review',
        createdAt: new Date(),
      };

      (db.notification.create as any).mockResolvedValue(mockNotification);
      (db.user.findMany as any).mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

      const result = await createRoleBroadcast({
        toRole: 'ADVERTISER',
        type: 'SYSTEM_ANNOUNCEMENT',
        priority: 'P2_NORMAL',
        title: 'New Video Submission',
        message: 'New video submitted for review',
      } as any);

      expect(result).toEqual(mockNotification);
      expect(db.notification.create).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return total and important unread counts', async () => {
      (db.notificationDelivery.count as any)
        .mockResolvedValueOnce(5)  
        .mockResolvedValueOnce(2); 

      const result = await getUnreadCount('user-1');

      expect(result).toEqual({ total: 5, important: 2 });
      expect(db.notificationDelivery.count).toHaveBeenCalledTimes(2);
    });

    it('should return zero counts when no notifications', async () => {
      (db.notificationDelivery.count as any)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await getUnreadCount('user-1');

      expect(result).toEqual({ total: 0, important: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      (db.notificationDelivery.updateMany as any).mockResolvedValue({ count: 1 });

      const result = await markAsRead({
        notificationId: 'notif-1',
        userId: 'user-1',
      });

      expect(result).toEqual({ count: 1 });
      expect(db.notificationDelivery.updateMany).toHaveBeenCalledWith({
        where: {
          notificationId: 'notif-1',
          userId: 'user-1',
        },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsArchived', () => {
    it('should mark notification as archived', async () => {
      (db.notificationDelivery.updateMany as any).mockResolvedValue({ count: 1 });

      const result = await markAsArchived({
        notificationId: 'notif-1',
        userId: 'user-1',
      });

      expect(result).toEqual({ count: 1 });
      expect(db.notificationDelivery.updateMany).toHaveBeenCalledWith({
        where: {
          notificationId: 'notif-1',
          userId: 'user-1',
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: expect.any(Date),
        },
      });
    });
  });

  describe('dismissNotification', () => {
    it('should dismiss notification', async () => {
      (db.notificationDelivery.updateMany as any).mockResolvedValue({ count: 1 });

      const result = await dismissNotification({
        notificationId: 'notif-1',
        userId: 'user-1',
      });

      expect(result).toEqual({ count: 1 });
      expect(db.notificationDelivery.updateMany).toHaveBeenCalledWith({
        where: {
          notificationId: 'notif-1',
          userId: 'user-1',
        },
        data: {
          status: 'DISMISSED',
          dismissedAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      (db.notificationDelivery.updateMany as any).mockResolvedValue({ count: 10 });

      const result = await markAllAsRead('user-1');

      expect(result).toEqual({ count: 10 });
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

  describe('listUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'CAMPAIGN_APPROVED',
          priority: 'P1_HIGH',
          title: 'Video Approved',
          message: 'Your video has been approved!',
          actionUrl: '/dashboard/creator/posts/1',
          metadata: null,
          createdAt: new Date(),
          expiresAt: null,
          deliveries: [{
            id: 'delivery-1',
            status: 'UNREAD',
            readAt: null,
            archivedAt: null,
            dismissedAt: null,
          }],
        },
        {
          id: 'notif-2',
          type: 'CAMPAIGN_REJECTED',
          priority: 'P2_NORMAL',
          title: 'Video Rejected',
          message: 'Your video was not selected',
          actionUrl: null,
          metadata: null,
          createdAt: new Date(),
          expiresAt: null,
          deliveries: [{
            id: 'delivery-2',
            status: 'READ',
            readAt: new Date(),
            archivedAt: null,
            dismissedAt: null,
          }],
        },
      ];

      (db.notification.findMany as any).mockResolvedValue(mockNotifications);

      const result = await listUserNotifications({
        userId: 'user-1',
        limit: 20,
      });

      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0].id).toBe('notif-1');
      expect(result.notifications[0].delivery?.status).toBe('UNREAD');
      expect(result.notifications[1].delivery?.status).toBe('READ');
    });

    it('should filter by status', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'CAMPAIGN_APPROVED',
          priority: 'P1_HIGH',
          title: 'Video Approved',
          message: 'Your video has been approved!',
          actionUrl: '/dashboard/creator/posts/1',
          metadata: null,
          createdAt: new Date(),
          expiresAt: null,
          deliveries: [{
            id: 'delivery-1',
            status: 'UNREAD',
            readAt: null,
            archivedAt: null,
            dismissedAt: null,
          }],
        },
      ];

      (db.notification.findMany as any).mockResolvedValue(mockNotifications);

      const result = await listUserNotifications({
        userId: 'user-1',
        status: 'UNREAD',
        limit: 20,
      });

      expect(result.notifications).toHaveLength(1);
      expect(db.notification.findMany).toHaveBeenCalled();
    });

    it('should return important notifications only', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'BUDGET_LOW',
          priority: 'P0_CRITICAL',
          title: 'Critical Alert',
          message: 'Important message',
          actionUrl: null,
          metadata: null,
          createdAt: new Date(),
          expiresAt: null,
          deliveries: [{
            id: 'delivery-1',
            status: 'UNREAD',
            readAt: null,
            archivedAt: null,
            dismissedAt: null,
          }],
        },
      ];

      (db.notification.findMany as any).mockResolvedValue(mockNotifications);

      const result = await listUserNotifications({
        userId: 'user-1',
        importantOnly: true,
        limit: 20,
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].isImportant).toBe(true);
    });
  });

  describe('getImportantNotifications', () => {
    it('should return only important unread notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'BUDGET_LOW',
          priority: 'P0_CRITICAL',
          title: 'Budget Low',
          message: 'Campaign budget is running low',
          actionUrl: '/dashboard/advertiser/campaigns/1',
          createdAt: new Date(),
        },
      ];

      (db.notification.findMany as any).mockResolvedValue(mockNotifications);

      const result = await getImportantNotifications('user-1', 3);

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('P0_CRITICAL');
    });
  });
});
