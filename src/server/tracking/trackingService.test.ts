import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCampaignTrackingStats,
  getCreatorTrackingStats,
  getTrackingLinkBySlug,
  recordVisit,
  recordConversion,
  validateVisit,
  markVisitAsPaid,
} from '../tracking/trackingService';
import { db } from '@/lib/db';
import { ConversionType } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  db: {
    visitEvent: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    conversionEvent: {
      count: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    creatorTrackingLink: {
      findUnique: vi.fn(),
    },
  },
}));

describe('TrackingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as any).visitEvent.count.mockReset();
    (db as any).conversionEvent.count.mockReset();
    (db as any).conversionEvent.aggregate.mockReset();
  });

  describe('getCampaignTrackingStats', () => {
    it('should return campaign tracking stats', async () => {
      (db as any).visitEvent.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(10);
      (db as any).conversionEvent.count.mockResolvedValue(5);
      (db as any).conversionEvent.aggregate.mockResolvedValue({
        _sum: { revenueCents: 5000 },
      } as any);

      const result = await getCampaignTrackingStats('campaign-1');

      expect(result.totalViews).toBe(100);
      expect(result.validViews).toBe(80);
      expect(result.billableViews).toBe(60);
      expect(result.totalConversions).toBe(5);
      expect(result.totalRevenue).toBe(5000);
    });

    it('should return zero revenue when no conversions', async () => {
      (db as any).visitEvent.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);
      (db as any).conversionEvent.count.mockResolvedValue(0);
      (db as any).conversionEvent.aggregate.mockResolvedValue({
        _sum: { revenueCents: null },
      } as any);

      const result = await getCampaignTrackingStats('campaign-1');

      expect(result.totalViews).toBe(10);
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('getCreatorTrackingStats', () => {
    it('should return creator tracking stats', async () => {
      (db as any).visitEvent.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(5);
      (db as any).conversionEvent.count.mockResolvedValue(3);
      (db as any).conversionEvent.aggregate.mockResolvedValue({
        _sum: { revenueCents: 3000 },
      } as any);

      const result = await getCreatorTrackingStats('creator-1');

      expect(result.totalViews).toBe(50);
      expect(result.validViews).toBe(40);
      expect(result.billableViews).toBe(30);
      expect(result.totalConversions).toBe(3);
      expect(result.totalRevenue).toBe(3000);
    });
  });

  describe('getTrackingLinkBySlug', () => {
    it('should return tracking link with campaign and creator', async () => {
      const mockLink = {
        id: 'link-1',
        slug: 'test-slug',
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        campaign: { id: 'campaign-1', name: 'Test Campaign' },
        creator: { id: 'creator-1', name: 'Test Creator' },
      };

      (db as any).creatorTrackingLink.findUnique.mockResolvedValue(mockLink as any);

      const result = await getTrackingLinkBySlug('test-slug');

      expect(result).toEqual(mockLink);
      expect(result?.campaign).toBeDefined();
      expect(result?.creator).toBeDefined();
    });

    it('should return null when slug not found', async () => {
      (db as any).creatorTrackingLink.findUnique.mockResolvedValue(null);

      const result = await getTrackingLinkBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('recordVisit', () => {
    it('should create a visit event', async () => {
      const mockVisit = {
        id: 'visit-1',
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        linkId: 'link-1',
        visitorId: 'visitor-1',
        isRecorded: true,
        isValidated: false,
        isBillable: false,
        isPaid: false,
      };

      (db as any).visitEvent.create.mockResolvedValue(mockVisit as any);

      const result = await recordVisit({
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        linkId: 'link-1',
        visitorId: 'visitor-1',
      });

      expect(result).toEqual(mockVisit);
      expect(db.visitEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          campaignId: 'campaign-1',
          creatorId: 'creator-1',
          linkId: 'link-1',
          visitorId: 'visitor-1',
          isRecorded: true,
          isValidated: false,
          isBillable: false,
        }),
      });
    });

    it('should record visit with referrer and ip hash', async () => {
      (db as any).visitEvent.create.mockResolvedValue({ id: 'visit-1' } as any);

      await recordVisit({
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        linkId: 'link-1',
        visitorId: 'visitor-1',
        referrer: 'https://example.com',
        ipHash: 'abc123',
      });

      expect(db.visitEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referrer: 'https://example.com',
          ipHash: 'abc123',
        }),
      });
    });
  });

  describe('recordConversion', () => {
    it('should create a conversion event', async () => {
      const mockConversion = {
        id: 'conv-1',
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        visitorId: 'visitor-1',
        type: ConversionType.PURCHASE,
        revenueCents: 1000,
      };

      (db as any).conversionEvent.create.mockResolvedValue(mockConversion as any);

      const result = await recordConversion({
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        visitorId: 'visitor-1',
        type: ConversionType.PURCHASE,
        revenueCents: 1000,
      });

      expect(result).toEqual(mockConversion);
    });

    it('should default revenue to zero when not provided', async () => {
      (db as any).conversionEvent.create.mockResolvedValue({ id: 'conv-1' } as any);

      await recordConversion({
        campaignId: 'campaign-1',
        visitorId: 'visitor-1',
        type: ConversionType.SIGNUP,
      });

      expect(db.conversionEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          revenueCents: 0,
        }),
      });
    });
  });

  describe('validateVisit', () => {
    it('should validate visit with low fraud score as billable', async () => {
      const mockVisit = {
        id: 'visit-1',
        isValidated: true,
        fraudScore: 30,
        isSuspicious: false,
        isBillable: true,
      };

      (db as any).visitEvent.update.mockResolvedValue(mockVisit as any);

      const result = await validateVisit('visit-1', 30, 'US');

      expect(result.isValidated).toBe(true);
      expect(result.fraudScore).toBe(30);
      expect(result.isSuspicious).toBe(false);
      expect(result.isBillable).toBe(true);
    });

    it('should validate visit with high fraud score as suspicious', async () => {
      const mockVisit = {
        id: 'visit-1',
        isValidated: true,
        fraudScore: 70,
        isSuspicious: true,
        isBillable: false,
      };

      (db as any).visitEvent.update.mockResolvedValue(mockVisit as any);

      const result = await validateVisit('visit-1', 70, 'US');

      expect(result.isValidated).toBe(true);
      expect(result.isSuspicious).toBe(true);
      expect(result.isBillable).toBe(false);
    });

    it('should validate visit at exactly threshold as not billable', async () => {
      const mockVisit = {
        id: 'visit-1',
        isValidated: true,
        fraudScore: 50,
        isSuspicious: true,
        isBillable: false,
      };

      (db as any).visitEvent.update.mockResolvedValue(mockVisit as any);

      const result = await validateVisit('visit-1', 50, 'US');

      expect(result.isBillable).toBe(false);
      expect(result.isSuspicious).toBe(true);
    });
  });

  describe('markVisitAsPaid', () => {
    it('should mark visit as paid', async () => {
      const mockVisit = {
        id: 'visit-1',
        isPaid: true,
      };

      (db as any).visitEvent.update.mockResolvedValue(mockVisit as any);

      const result = await markVisitAsPaid('visit-1');

      expect(result.isPaid).toBe(true);
      expect(db.visitEvent.update).toHaveBeenCalledWith({
        where: { id: 'visit-1' },
        data: { isPaid: true },
      });
    });
  });

  describe('recordConversion with attributedTo', () => {
    it('should create conversion with attributedTo parameter', async () => {
      const mockConversion = {
        id: 'conv-1',
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        visitorId: 'visitor-1',
        type: ConversionType.PURCHASE,
        revenueCents: 2500,
        attributedTo: 'affiliate-123',
      };

      (db as any).conversionEvent.create.mockResolvedValue(mockConversion as any);

      const result = await recordConversion({
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        visitorId: 'visitor-1',
        type: ConversionType.PURCHASE,
        revenueCents: 2500,
        attributedTo: 'affiliate-123',
      });

      expect(result).toEqual(mockConversion);
      expect(db.conversionEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          attributedTo: 'affiliate-123',
        }),
      });
    });

    it('should handle optional creatorId in conversion', async () => {
      const mockConversion = {
        id: 'conv-1',
        campaignId: 'campaign-1',
        creatorId: null,
        visitorId: 'visitor-1',
        type: ConversionType.SIGNUP,
        revenueCents: 0,
      };

      (db as any).conversionEvent.create.mockResolvedValue(mockConversion as any);

      const result = await recordConversion({
        campaignId: 'campaign-1',
        visitorId: 'visitor-1',
        type: ConversionType.SIGNUP,
      });

      expect(result.creatorId).toBeNull();
    });
  });

  describe('recordVisit with userAgentHash', () => {
    it('should record visit with userAgentHash', async () => {
      (db as any).visitEvent.create.mockResolvedValue({ id: 'visit-1' } as any);

      await recordVisit({
        campaignId: 'campaign-1',
        creatorId: 'creator-1',
        linkId: 'link-1',
        visitorId: 'visitor-1',
        userAgentHash: 'useragent-hash-123',
      });

      expect(db.visitEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgentHash: 'useragent-hash-123',
        }),
      });
    });
  });

  describe('validateVisit without geoCountry', () => {
    it('should validate visit without geoCountry parameter', async () => {
      const mockVisit = {
        id: 'visit-1',
        isValidated: true,
        fraudScore: 25,
        isSuspicious: false,
        isBillable: true,
        geoCountry: undefined,
      };

      (db as any).visitEvent.update.mockResolvedValue(mockVisit as any);

      const result = await validateVisit('visit-1', 25);

      expect(result.isValidated).toBe(true);
      expect(result.geoCountry).toBeUndefined();
      expect(db.visitEvent.update).toHaveBeenCalledWith({
        where: { id: 'visit-1' },
        data: expect.objectContaining({
          fraudScore: 25,
          geoCountry: undefined,
        }),
      });
    });
  });

  describe('getCampaignTrackingStats with null revenue', () => {
    it('should handle null revenue from database', async () => {
      (db as any).visitEvent.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      (db as any).conversionEvent.count.mockResolvedValue(0);
      (db as any).conversionEvent.aggregate.mockResolvedValue({
        _sum: { revenueCents: null },
      } as any);

      const result = await getCampaignTrackingStats('campaign-1');

      expect(result.totalRevenue).toBe(0);
      expect(result.totalViews).toBe(0);
      expect(result.totalConversions).toBe(0);
    });
  });
});
