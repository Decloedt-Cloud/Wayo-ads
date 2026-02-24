import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  notifyPaymentFailed,
  notifyDepositFailed,
  notifyBudgetExhausted,
  notifyBudgetLow,
  notifyCampaignPaused,
  notifyCampaignApproved,
  notifyCampaignRejected,
  notifyCreatorApplicationPending,
  notifyCreatorApplicationApproved,
  notifyCreatorApplicationRejected,
  notifyWithdrawalFailed,
  notifyWithdrawalRequested,
  notifyWithdrawalApproved,
  notifyEarningsAvailable,
  notifyTrackingDisabled,
  notifyFraudDetected,
  notifySuspiciousActivity,
  notifyAccountPendingApproval,
  notifyRoleRequestPending,
  notifyCredentialsInvalid,
  notifyWebhookFailure,
  notifyCreatorWithdrawalStuck,
  notifyCreatorApplied,
  notifyVideoSubmitted,
  notifyVideoUpdated,
  notifyCampaignUnderReview,
  notifyDynamicCpmChanged,
  notifyYouTubeDisconnected,
  notifyTrustScoreDowngraded,
  notifyCreatorTierChanged,
  notifyReserveLocked,
  notifyReserveReleased,
  notifyCampaignConfidenceLow,
  notifyCreatorFlagged,
  notifyVelocitySpikeDetected,
  notifyFraudScoreExceeded,
  notifyCampaignAutoPaused,
  notifyExcessiveFraudPattern,
  notifyUnusualPayoutCluster,
  notifyStripePayoutFailure,
} from '../notifications/notificationTriggers';
import { sendNotificationEmailIfEnabled } from './notificationEmailService';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    notification: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notificationDelivery: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('NotificationTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn({ sendNotificationEmailIfEnabled }, 'sendNotificationEmailIfEnabled').mockResolvedValue(undefined);
    (db.notification.create as any).mockResolvedValue({ id: 'notif-1' });
    (db.notification.findFirst as any).mockResolvedValue(null);
    (db.user.findUnique as any).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
    (db.user.findMany as any).mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);
    (db.notificationDelivery.create as any).mockResolvedValue({ id: 'delivery-1' });
    (db.notificationDelivery.createMany as any).mockResolvedValue({ count: 2 });
  });

  describe('Financial Notifications', () => {
    it('should send payment failed notification', async () => {
      const result = await notifyPaymentFailed({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      expect(db.notification.create).toHaveBeenCalled();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('PAYMENT_FAILED');
      expect(createCall.data.toUserId).toBe('user-1');
    });

    it('should send deposit failed notification', async () => {
      const result = await notifyDepositFailed({
        userId: 'user-1',
        amount: 1000,
        currency: 'EUR',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('DEPOSIT_FAILED');
    });

    it('should send budget exhausted notification', async () => {
      const result = await notifyBudgetExhausted({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('BUDGET_EXHAUSTED');
    });

    it('should send budget low notification with percent remaining', async () => {
      const result = await notifyBudgetLow({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        percentRemaining: 15,
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('BUDGET_LOW');
      expect(createCall.data.message).toContain('15%');
    });

    it('should send withdrawal requested notification', async () => {
      const result = await notifyWithdrawalRequested({
        userId: 'user-1',
        withdrawalId: 'withdrawal-1',
        amount: 500,
        currency: 'EUR',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('WITHDRAWAL_REQUESTED');
      expect(createCall.data.title).toBe('Withdrawal Requested');
    });

    it('should send withdrawal approved notification', async () => {
      const result = await notifyWithdrawalApproved({
        userId: 'user-1',
        withdrawalId: 'withdrawal-1',
        amount: 500,
        currency: 'EUR',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('WITHDRAWAL_APPROVED');
      expect(createCall.data.priority).toBe('P1_HIGH');
    });

    it('should send withdrawal failed notification', async () => {
      const result = await notifyWithdrawalFailed({
        userId: 'user-1',
        withdrawalId: 'withdrawal-1',
        reason: 'Bank account invalid',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('WITHDRAWAL_FAILED');
    });

    it('should send earnings available notification', async () => {
      const result = await notifyEarningsAvailable({
        userId: 'user-1',
        amount: 2500,
        currency: 'EUR',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('EARNINGS_AVAILABLE');
    });

    it('should send reserve locked notification', async () => {
      const result = await notifyReserveLocked({
        userId: 'user-1',
        amount: 1000,
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('RESERVE_LOCKED');
    });

    it('should send reserve released notification', async () => {
      const result = await notifyReserveReleased({
        userId: 'user-1',
        amount: 1000,
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('RESERVE_RELEASED');
    });
  });

  describe('Campaign Notifications', () => {
    it('should send campaign paused notification', async () => {
      const result = await notifyCampaignPaused({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        reason: 'Budget depleted',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CAMPAIGN_PAUSED');
    });

    it('should send campaign approved notification', async () => {
      const result = await notifyCampaignApproved({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CAMPAIGN_APPROVED');
    });

    it('should send campaign rejected notification', async () => {
      const result = await notifyCampaignRejected({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        reason: 'Violates ad policy',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CAMPAIGN_REJECTED');
    });

    it('should send campaign under review notification', async () => {
      const result = await notifyCampaignUnderReview({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CAMPAIGN_UNDER_REVIEW');
    });

    it('should send campaign confidence low notification', async () => {
      const result = await notifyCampaignConfidenceLow({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        confidence: 35,
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CAMPAIGN_CONFIDENCE_LOW');
    });

    it('should send campaign auto-paused notification', async () => {
      const result = await notifyCampaignAutoPaused({
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        reason: 'High fraud rate detected',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CAMPAIGN_AUTO_PAUSED');
    });

    it('should send dynamic CPM changed notification', async () => {
      const result = await notifyDynamicCpmChanged({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        oldCpm: 500,
        newCpm: 750,
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('DYNAMIC_CPM_CHANGED');
    });
  });

  describe('Creator Application Notifications', () => {
    it('should send creator application pending notification', async () => {
      const result = await notifyCreatorApplicationPending({
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CREATOR_APPLICATION_PENDING');
    });

    it('should send creator application approved notification', async () => {
      const result = await notifyCreatorApplicationApproved({
        userId: 'user-1',
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CREATOR_APPLICATION_APPROVED');
    });

    it('should send creator application rejected notification', async () => {
      const result = await notifyCreatorApplicationRejected({
        userId: 'user-1',
        campaignName: 'Test Campaign',
        reason: 'Incomplete profile',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CREATOR_APPLICATION_REJECTED');
    });

    it('should send creator applied notification', async () => {
      const result = await notifyCreatorApplied({
        userId: 'advertiser-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        creatorId: 'creator-1',
        creatorName: 'Test Creator',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CREATOR_APPLIED');
    });
  });

  describe('Video Notifications', () => {
    it('should send video submitted notification', async () => {
      const result = await notifyVideoSubmitted({
        userId: 'advertiser-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        creatorId: 'creator-1',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('VIDEO_SUBMITTED');
    });

    it('should send video updated notification', async () => {
      const result = await notifyVideoUpdated({
        userId: 'advertiser-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
        creatorId: 'creator-1',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('VIDEO_UPDATED');
    });
  });

  describe('Trust & Risk Notifications', () => {
    it('should send trust score downgraded notification', async () => {
      const result = await notifyTrustScoreDowngraded({
        userId: 'user-1',
        oldScore: 85,
        newScore: 65,
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('TRUST_SCORE_DOWNGRADED');
      expect(createCall.data.priority).toBe('P1_HIGH');
    });

    it('should send creator tier changed notification', async () => {
      const result = await notifyCreatorTierChanged({
        userId: 'user-1',
        oldTier: 'BRONZE',
        newTier: 'SILVER',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CREATOR_TIER_CHANGED');
    });

    it('should send creator flagged notification', async () => {
      const result = await notifyCreatorFlagged({
        reason: 'Suspicious activity detected',
        creatorId: 'creator-1',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CREATOR_FLAGGED');
    });

    it('should send fraud detected notification', async () => {
      const result = await notifyFraudDetected({
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('FRAUD_DETECTED');
      expect(createCall.data.priority).toBe('P1_HIGH');
    });

    it('should send suspicious activity notification', async () => {
      const result = await notifySuspiciousActivity({
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('SUSPICIOUS_ACTIVITY');
    });

    it('should send velocity spike detected notification', async () => {
      const result = await notifyVelocitySpikeDetected({
        velocity: 500,
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('VELOCITY_SPIKE_DETECTED');
    });

    it('should send fraud score exceeded notification', async () => {
      const result = await notifyFraudScoreExceeded({
        userId: 'user-1',
        score: 85,
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('FRAUD_SCORE_EXCEEDED');
    });

    it('should send excessive fraud pattern notification', async () => {
      const result = await notifyExcessiveFraudPattern({
        pattern: 'Same IP, multiple accounts',
        count: 10,
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('EXCESSIVE_FRAUD_PATTERN');
    });
  });

  describe('Channel & Integration Notifications', () => {
    it('should send tracking disabled notification', async () => {
      const result = await notifyTrackingDisabled({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('TRACKING_DISABLED');
    });

    it('should send YouTube disconnected notification', async () => {
      const result = await notifyYouTubeDisconnected({
        userId: 'user-1',
        platform: 'YouTube',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('YOUTUBE_DISCONNECTED');
    });

    it('should send webhook failure notification', async () => {
      const result = await notifyWebhookFailure({
        campaignId: 'campaign-1',
        reason: 'Timeout',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('WEBHOOK_FAILURE');
    });

    it('should send stripe payout failure notification', async () => {
      const result = await notifyStripePayoutFailure({
        withdrawalId: 'payout-1',
        reason: 'Account closed',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('STRIPE_PAYOUT_FAILURE');
    });
  });

  describe('Admin Notifications', () => {
    it('should send account pending approval notification', async () => {
      const result = await notifyAccountPendingApproval({
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('ACCOUNT_PENDING_APPROVAL');
    });

    it('should send role request pending notification', async () => {
      const result = await notifyRoleRequestPending({
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('ROLE_REQUEST_PENDING');
    });

    it('should send credentials invalid notification', async () => {
      const result = await notifyCredentialsInvalid({
        reason: 'Expired token',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('CREDENTIALS_INVALID');
    });

    it('should send creator withdrawal stuck notification', async () => {
      const result = await notifyCreatorWithdrawalStuck({
        withdrawalId: 'withdrawal-1',
        amount: 500,
        creatorId: 'creator-1',
        creatorName: 'Test Creator',
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('WITHDRAWAL_FAILED');
    });

    it('should send unusual payout cluster notification', async () => {
      const result = await notifyUnusualPayoutCluster({
        count: 15,
        totalAmount: 50000,
      });

      expect(result).toBeDefined();
      const createCall = (db.notification.create as any).mock.calls[0][0];
      expect(createCall.data.type).toBe('UNUSUAL_PAYOUT_CLUSTER');
    });
  });

  describe('Deduplication', () => {
    it('should not create duplicate notifications when dedupeKey matches', async () => {
      (db.notification.findFirst as any).mockResolvedValue({ id: 'existing-notif' });

      const result = await notifyPaymentFailed({
        userId: 'user-1',
        campaignId: 'campaign-1',
        campaignName: 'Test Campaign',
      });

      expect(db.notification.create).not.toHaveBeenCalled();
    });
  });
});
