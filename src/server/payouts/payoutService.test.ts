import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assessCreatorRisk, assessCreatorRiskByScore } from './payoutService';

vi.mock('@/lib/db', () => ({
  db: {
    creatorBalance: {
      findUnique: vi.fn(() => null),
    },
  },
}));

vi.mock('@/server/notifications/notificationTriggers', () => ({
  notifyCreatorFlagged: vi.fn(),
  notifyVelocitySpikeDetected: vi.fn(),
  notifyExcessiveFraudPattern: vi.fn(),
  notifyReserveLocked: vi.fn(),
  notifyReserveReleased: vi.fn(),
}));

import { db } from '@/lib/db';

describe('payoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assessCreatorRisk', () => {
    it('should return MEDIUM risk for non-existent creator', async () => {
      (db.creatorBalance.findUnique as any).mockResolvedValue(null);
      
      const result = await assessCreatorRisk('new-creator');
      
      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.payoutDelayDays).toBe(3);
    });

    it('should return risk level from database', async () => {
      (db.creatorBalance.findUnique as any).mockResolvedValue({
        id: 'balance-1',
        currency: 'USD',
        availableCents: 10000,
        pendingCents: 5000,
        updatedAt: new Date(),
        creatorId: 'creator-1',
        totalEarnedCents: 15000,
        availableBalanceCents: 10000,
        pendingBalanceCents: 5000,
        lockedReserveCents: 0,
        riskLevel: 'HIGH' as const,
        payoutDelayDays: 7,
      });
      
      const result = await assessCreatorRisk('existing-creator');
      
      expect(result.riskLevel).toBe('HIGH');
      expect(result.payoutDelayDays).toBe(7);
      expect(result.reservePercent).toBe(20);
    });
  });

  describe('assessCreatorRiskByScore', () => {
    it('should return LOW risk for anomaly score < 3', async () => {
      const result = await assessCreatorRiskByScore(2);
      
      expect(result.riskLevel).toBe('LOW');
      expect(result.payoutDelayDays).toBe(2);
    });

    it('should return MEDIUM risk for anomaly score 3-6', async () => {
      const result = await assessCreatorRiskByScore(5);
      
      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.payoutDelayDays).toBe(5);
    });

    it('should return HIGH risk for anomaly score >= 7', async () => {
      const result = await assessCreatorRiskByScore(8);
      
      expect(result.riskLevel).toBe('HIGH');
      expect(result.payoutDelayDays).toBe(14);
    });
  });
});
