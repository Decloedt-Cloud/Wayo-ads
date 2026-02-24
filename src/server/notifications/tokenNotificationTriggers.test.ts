import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  notifyLowTokens,
  notifyTokensExhausted,
  notifyTokensPurchased,
} from '../notifications/tokenNotificationTriggers';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    notification: {
      create: vi.fn(() => Promise.resolve({ id: 'notif-1' })),
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
  },
}));

vi.mock('../notifications/notificationService', () => ({
  createUserNotification: vi.fn(() => Promise.resolve({ id: 'notif-1' })),
}));

describe('TokenNotificationTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifyLowTokens', () => {
    it('should create notification when tokens are low', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');
      (db.notification.findFirst as any).mockResolvedValue(null);

      const result = await notifyLowTokens('user-1', 15);

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          toUserId: 'user-1',
          type: 'TOKENS_LOW',
          title: 'Tokens Running Low',
        })
      );
      expect(result).toBeDefined();
    });

    it('should not create notification if one was sent in last 24 hours', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');
      (db.notification.findFirst as any).mockResolvedValue({
        id: 'existing-notif',
        type: 'TOKENS_LOW',
      });

      const result = await notifyLowTokens('user-1', 15);

      expect(createUserNotification).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should include threshold in metadata', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');
      (db.notification.findFirst as any).mockResolvedValue(null);

      await notifyLowTokens('user-1', 15);

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            balance: 15,
            threshold: 20,
          }),
        })
      );
    });

    it('should set correct action URL', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');
      (db.notification.findFirst as any).mockResolvedValue(null);

      await notifyLowTokens('user-1', 15);

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          actionUrl: '/dashboard/creator/tokens',
        })
      );
    });
  });

  describe('notifyTokensExhausted', () => {
    it('should create notification when tokens are exhausted', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');
      (db.notification.findFirst as any).mockResolvedValue(null);

      const result = await notifyTokensExhausted('user-1');

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          toUserId: 'user-1',
          type: 'TOKENS_EXHAUSTED',
          title: 'Tokens Exhausted',
        })
      );
      expect(result).toBeDefined();
    });

    it('should not create notification if one was sent in last 24 hours', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');
      (db.notification.findFirst as any).mockResolvedValue({
        id: 'existing-notif',
        type: 'TOKENS_EXHAUSTED',
      });

      const result = await notifyTokensExhausted('user-1');

      expect(createUserNotification).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should set high priority for exhausted tokens', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');
      (db.notification.findFirst as any).mockResolvedValue(null);

      await notifyTokensExhausted('user-1');

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'P1_HIGH',
        })
      );
    });
  });

  describe('notifyTokensPurchased', () => {
    it('should create notification when tokens are purchased', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');

      const result = await notifyTokensPurchased('user-1', 200, 250);

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          toUserId: 'user-1',
          type: 'TOKENS_PURCHASED',
          title: 'Tokens Added',
        })
      );
      const callArgs = (createUserNotification as any).mock.calls[0][0];
      expect(callArgs.message).toContain('200');
      expect(callArgs.message).toContain('250');
      expect(result).toBeDefined();
    });

    it('should include purchased tokens in metadata', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');

      await notifyTokensPurchased('user-1', 200, 250);

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            tokens: 200,
            newBalance: 250,
          }),
        })
      );
    });

    it('should include correct action URL', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');

      await notifyTokensPurchased('user-1', 200, 250);

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          actionUrl: '/dashboard/creator/tokens',
        })
      );
    });

    it('should set low priority for purchase notifications', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');

      await notifyTokensPurchased('user-1', 200, 250);

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'P3_LOW',
        })
      );
    });

    it('should include unique dedupe key with timestamp', async () => {
      const { createUserNotification } = await import('../notifications/notificationService');

      await notifyTokensPurchased('user-1', 200, 250);

      expect(createUserNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          dedupeKey: expect.stringMatching(/^tokens_purchased_user-1_\d+$/),
        })
      );
    });
  });
});
