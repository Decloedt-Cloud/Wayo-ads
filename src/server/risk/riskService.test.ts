import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTierColor, getTierLabel } from './riskService';
import { CreatorTier } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  db: {
    creatorBalance: {
      findUnique: vi.fn(),
    },
    payoutQueue: {
      aggregate: vi.fn(),
    },
    creatorTrafficMetrics: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/server/notifications/notificationTriggers', () => ({
  notifyTrustScoreDowngraded: vi.fn(),
  notifyCreatorTierChanged: vi.fn(),
}));

import { db } from '@/lib/db';

describe('riskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTierLabel', () => {
    it('should return correct label for BRONZE', () => {
      expect(getTierLabel('BRONZE')).toBe('Bronze');
    });

    it('should return correct label for SILVER', () => {
      expect(getTierLabel('SILVER')).toBe('Silver');
    });

    it('should return correct label for GOLD', () => {
      expect(getTierLabel('GOLD')).toBe('Gold');
    });
  });

  describe('getTierColor', () => {
    it('should return correct color for BRONZE', () => {
      expect(getTierColor('BRONZE')).toBe('text-amber-700 bg-amber-100 border-amber-200');
    });

    it('should return correct color for SILVER', () => {
      expect(getTierColor('SILVER')).toBe('text-gray-600 bg-gray-100 border-gray-200');
    });

    it('should return correct color for GOLD', () => {
      expect(getTierColor('GOLD')).toBe('text-yellow-600 bg-yellow-100 border-yellow-200');
    });
  });

  describe('computeCreatorTrustScore', () => {
    it('should compute trust score for creator with good metrics', async () => {
      (db.creatorTrafficMetrics.aggregate as any).mockResolvedValue({
        _avg: {
          validationRate: 95,
          conversionRate: 10,
          avgFraudScore: 5,
          anomalyScore: 1,
        },
        _count: { id: 30 },
        _sum: {
          totalValidated: 9500,
          totalConversions: 1000,
        },
      });

      (db.user.findUnique as any)
        .mockResolvedValueOnce({
          verificationLevel: 'YOUTUBE_VERIFIED',
        })
        .mockResolvedValueOnce({
          trustScore: 80,
          tier: 'GOLD' as CreatorTier,
        });

      (db.creatorTrafficMetrics.count as any).mockResolvedValue(0);
      (db.user.update as any).mockResolvedValue({});

      const { computeCreatorTrustScore } = await import('./riskService');
      const result = await computeCreatorTrustScore('creator-123');

      expect(result.trustScore).toBeGreaterThanOrEqual(80);
      expect(result.isVerified).toBe(true);
    });
  });
});
