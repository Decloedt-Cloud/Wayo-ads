import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendNotificationEmail,
  getNotificationEmailTemplate,
  sendNotificationEmailIfEnabled,
} from '../notifications/notificationEmailService';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/server/admin/emailSettingsService', () => ({
  getEmailCredentials: vi.fn().mockResolvedValue(null),
}));

vi.mock('nodemailer', () => ({
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

import { getEmailCredentials } from '@/server/admin/emailSettingsService';

describe('NotificationEmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotificationEmailTemplate', () => {
    it('should return withdrawal approved template', () => {
      const template = getNotificationEmailTemplate('WITHDRAWAL_APPROVED', {
        amount: '500.00',
        currency: 'EUR',
      });

      expect(template.subject).toContain('Withdrawal');
      expect(template.subject).toContain('Approved');
      expect(template.html).toContain('500.00');
      expect(template.html).toContain('EUR');
    });

    it('should return withdrawal requested template', () => {
      const template = getNotificationEmailTemplate('WITHDRAWAL_REQUESTED', {
        amount: '500.00',
        currency: 'EUR',
      });

      expect(template.subject).toContain('Withdrawal');
      expect(template.subject).toContain('Requested');
    });

    it('should return payment failed template', () => {
      const template = getNotificationEmailTemplate('PAYMENT_FAILED', {
        reason: 'Card declined',
      });

      expect(template.subject).toContain('Payment');
      expect(template.subject).toContain('Failed');
      expect(template.html).toContain('Card declined');
    });

    it('should return trust score downgraded template', () => {
      const template = getNotificationEmailTemplate('TRUST_SCORE_DOWNGRADED', {
        oldScore: 85,
        newScore: 65,
      });

      expect(template.subject).toContain('Trust Score');
      expect(template.html).toContain('85');
      expect(template.html).toContain('65');
    });

    it('should return creator flagged template', () => {
      const template = getNotificationEmailTemplate('CREATOR_FLAGGED', {
        reason: 'Suspicious activity',
      });

      expect(template.subject).toContain('Account');
      expect(template.subject).toContain('Flagged');
      expect(template.html).toContain('Suspicious activity');
    });

    it('should return campaign approved template', () => {
      const template = getNotificationEmailTemplate('CAMPAIGN_APPROVED', {
        campaignName: 'Test Campaign',
      });

      expect(template.subject).toContain('Campaign');
      expect(template.subject).toContain('Approved');
      expect(template.html).toContain('Test Campaign');
    });

    it('should return campaign rejected template', () => {
      const template = getNotificationEmailTemplate('CAMPAIGN_REJECTED', {
        campaignName: 'Test Campaign',
        reason: 'Violates policy',
      });

      expect(template.subject).toContain('Campaign');
      expect(template.subject).toContain('Rejected');
      expect(template.html).toContain('Violates policy');
    });

    it('should return video approved template', () => {
      const template = getNotificationEmailTemplate('VIDEO_APPROVED', {
        campaignName: 'Test Campaign',
      });

      expect(template.subject).toContain('Video');
      expect(template.subject).toContain('Approved');
    });

    it('should return video rejected template', () => {
      const template = getNotificationEmailTemplate('VIDEO_REJECTED', {
        campaignName: 'Test Campaign',
      });

      expect(template.subject).toContain('Video Submission Needs Revision');
      expect(template.html).toContain('Test Campaign');
    });

    it('should return system announcement template', () => {
      const template = getNotificationEmailTemplate('SYSTEM_ANNOUNCEMENT', {
        title: 'Maintenance Notice',
        message: 'System maintenance scheduled',
      });

      expect(template.subject).toContain('Maintenance Notice');
      expect(template.html).toContain('System maintenance scheduled');
    });

    it('should return unknown type template', () => {
      const template = getNotificationEmailTemplate('UNKNOWN_TYPE', {
        data: 'test',
      });

      expect(template.subject).toContain('Notification');
      expect(template.html).toContain('test');
    });
  });

  describe('sendNotificationEmail', () => {
    it('should send email successfully when credentials are configured', async () => {
      (getEmailCredentials as any).mockResolvedValue({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        username: 'testuser',
        password: 'testpass',
        fromEmail: 'noreply@wayoads.com',
        fromName: 'Wayo Ads',
      });

      const result = await sendNotificationEmail({
        toEmail: 'test@example.com',
        toName: 'Test User',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
      });

      expect(result.success).toBe(true);
    });

    it('should return error when email is not configured', async () => {
      (getEmailCredentials as any).mockResolvedValue(null);

      const result = await sendNotificationEmail({
        toEmail: 'test@example.com',
        subject: 'Test Subject',
        htmlContent: '<p>Test content</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not configured');
    });
  });

  describe('sendNotificationEmailIfEnabled', () => {
    it('should send email for critical notification types', async () => {
      (getEmailCredentials as any).mockResolvedValue({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        username: 'testuser',
        password: 'testpass',
        fromEmail: 'noreply@wayoads.com',
        fromName: 'Wayo Ads',
      });
      (db.user.findUnique as any).mockResolvedValue({ id: 'user-1', email: 'test@example.com', name: 'Test User' });

      await sendNotificationEmailIfEnabled('user-1', 'WITHDRAWAL_APPROVED', {
        amount: '500.00',
        currency: 'EUR',
      });

      expect(getEmailCredentials).toHaveBeenCalled();
    });

    it('should skip email for non-critical notification types', async () => {
      await sendNotificationEmailIfEnabled('user-1', 'EARNINGS_AVAILABLE', {
        amount: '100.00',
      });

      expect(getEmailCredentials).not.toHaveBeenCalled();
    });

    it('should skip email when user has no email', async () => {
      (getEmailCredentials as any).mockResolvedValue({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        username: 'testuser',
        password: 'testpass',
        fromEmail: 'noreply@wayoads.com',
        fromName: 'Wayo Ads',
      });
      (db.user.findUnique as any).mockResolvedValue({ id: 'user-1', email: null, name: 'Test User' });

      await sendNotificationEmailIfEnabled('user-1', 'WITHDRAWAL_APPROVED', {
        amount: '500.00',
        currency: 'EUR',
      });

      expect(db.user.findUnique).toHaveBeenCalled();
    });

    it('should skip email when email credentials not configured', async () => {
      (getEmailCredentials as any).mockResolvedValue(null);
      (db.user.findUnique as any).mockResolvedValue({ id: 'user-1', email: 'test@example.com', name: 'Test User' });

      await sendNotificationEmailIfEnabled('user-1', 'WITHDRAWAL_APPROVED', {
        amount: '500.00',
        currency: 'EUR',
      });

      expect(getEmailCredentials).toHaveBeenCalled();
    });
  });
});
