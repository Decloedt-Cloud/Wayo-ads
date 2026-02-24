import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCreators, getCreatorById, getCreatorByUserId, getCreatorChannels, getBusinessProfile, getCreatorTrustScore, updateCreatorTier, getCreatorTrafficMetrics, connectChannel, disconnectChannel, createOrUpdateBusinessProfile, updateBusinessProfile } from '../creators/creatorService';
import { db } from '@/lib/db';
import { CreatorTier } from '@prisma/client';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    creatorChannel: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    creatorBusinessProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    creatorTrafficMetrics: {
      findMany: vi.fn(),
    },
  },
}));

describe('CreatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCreators', () => {
    it('should return paginated creators', async () => {
      const mockCreators = [
        {
          id: 'user-1',
          email: 'creator@test.com',
          name: 'Test Creator',
          roles: 'CREATOR',
          tier: CreatorTier.BRONZE,
          qualityMultiplier: 1.0,
          trustScore: 75,
          _count: { applications: 5 },
        },
      ];

      (db as any).user.findMany.mockResolvedValue(mockCreators as any);
      (db as any).user.count.mockResolvedValue(1);

      const result = await getCreators({ page: 1, limit: 10 });

      expect(result.creators).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by tier', async () => {
      (db as any).user.findMany.mockResolvedValue([]);
      (db as any).user.count.mockResolvedValue(0);

      await getCreators({ tier: CreatorTier.GOLD, page: 1, limit: 10 });

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tier: CreatorTier.GOLD,
          }),
        })
      );
    });
  });

  describe('getCreatorById', () => {
    it('should return creator with details', async () => {
      const mockCreator = {
        id: 'user-1',
        email: 'creator@test.com',
        name: 'Test Creator',
        role: 'CREATOR',
        roles: 'CREATOR',
        tier: CreatorTier.SILVER,
        qualityMultiplier: 1.5,
        trustScore: 85,
      };

      (db as any).user.findUnique.mockResolvedValue(mockCreator as any);

      const result = await getCreatorById('user-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
    });

    it('should return null for non-existent creator', async () => {
      (db as any).user.findUnique.mockResolvedValue(null);

      const result = await getCreatorById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getCreatorChannels', () => {
    it('should return creator channels', async () => {
      const mockChannels = [
        {
          id: 'channel-1',
          creatorId: 'user-1',
          platform: 'YOUTUBE',
          channelId: 'UC123',
          channelName: 'Test Channel',
          subscriberCount: 10000,
        },
      ];

      (db as any).creatorChannel.findMany.mockResolvedValue(mockChannels as any);

      const result = await getCreatorChannels('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('YOUTUBE');
    });
  });

  describe('getBusinessProfile', () => {
    it('should return business profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        businessType: 'PERSONAL',
        companyName: null,
        vatNumber: null,
      };

      (db as any).creatorBusinessProfile.findUnique.mockResolvedValue(mockProfile as any);

      const result = await getBusinessProfile('user-1');

      expect(result).not.toBeNull();
      expect(result?.businessType).toBe('PERSONAL');
    });

    it('should return null when no profile', async () => {
      (db as any).creatorBusinessProfile.findUnique.mockResolvedValue(null);

      const result = await getBusinessProfile('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getCreatorTrustScore', () => {
    it('should return trust score from user', async () => {
      const mockUser = {
        id: 'user-1',
        trustScore: 85,
        tier: CreatorTier.GOLD,
        qualityMultiplier: 2.0,
      };

      (db as any).user.findUnique.mockResolvedValue(mockUser as any);

      const result = await getCreatorTrustScore('user-1');

      expect(result).not.toBeNull();
      expect(result?.overallScore).toBe(85);
    });

    it('should return null for non-existent creator', async () => {
      (db as any).user.findUnique.mockResolvedValue(null);

      const result = await getCreatorTrustScore('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getCreatorByUserId', () => {
    it('should return creator by user id', async () => {
      const mockCreator = {
        id: 'user-1',
        email: 'creator@test.com',
        name: 'Test Creator',
        role: 'CREATOR',
        tier: CreatorTier.SILVER,
      };

      (db as any).user.findUnique.mockResolvedValue(mockCreator as any);

      const result = await getCreatorByUserId('user-1');

      expect(result).toBeDefined();
    });

    it('should return null for non-existent user', async () => {
      (db as any).user.findUnique.mockResolvedValue(null);

      const result = await getCreatorByUserId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateCreatorTier', () => {
    it('should update creator tier', async () => {
      const mockCreator = {
        id: 'user-1',
        email: 'creator@test.com',
        name: 'Test Creator',
        tier: CreatorTier.GOLD,
      };

      (db as any).user.update.mockResolvedValue(mockCreator as any);

      const result = await updateCreatorTier('user-1', CreatorTier.GOLD);

      expect(result).toBeDefined();
      expect(result.tier).toBe(CreatorTier.GOLD);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tier: CreatorTier.GOLD },
        select: expect.any(Object),
      });
    });
  });

  describe('getCreatorTrafficMetrics', () => {
    it('should return traffic metrics for creator', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          creatorId: 'user-1',
          date: new Date('2024-01-01'),
          totalViews: 1000,
          uniqueVisitors: 100,
          botTraffic: 10,
          suspiciousVisits: 5,
          validVisits: 85,
          conversions: 10,
          revenue: 5000,
        },
        {
          id: 'metric-2',
          creatorId: 'user-1',
          date: new Date('2024-01-02'),
          totalViews: 1200,
          uniqueVisitors: 120,
          botTraffic: 12,
          suspiciousVisits: 6,
          validVisits: 102,
          conversions: 12,
          revenue: 6000,
        },
      ];

      (db as any).creatorTrafficMetrics.findMany.mockResolvedValue(mockMetrics as any);

      const result = await getCreatorTrafficMetrics('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].totalViews).toBe(1000);
      expect(result[1].totalViews).toBe(1200);
    });

    it('should filter traffic metrics by date range', async () => {
      (db as any).creatorTrafficMetrics.findMany.mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await getCreatorTrafficMetrics('user-1', startDate, endDate);

      expect(db.creatorTrafficMetrics.findMany).toHaveBeenCalledWith({
        where: {
          creatorId: 'user-1',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'desc' },
      });
    });
  });

  describe('connectChannel', () => {
    it('should connect a new channel', async () => {
      const mockChannel = {
        id: 'channel-1',
        creatorId: 'user-1',
        platform: 'YOUTUBE',
        channelId: 'UC123',
        channelName: 'Test Channel',
        channelUrl: 'https://youtube.com/channel/UC123',
        subscriberCount: 10000,
        verified: true,
        connected: true,
      };

      (db as any).creatorChannel.findFirst.mockResolvedValue(null);
      (db as any).creatorChannel.create.mockResolvedValue(mockChannel as any);

      const result = await connectChannel('user-1', 'YOUTUBE', {
        channelId: 'UC123',
        channelName: 'Test Channel',
        channelUrl: 'https://youtube.com/channel/UC123',
        subscriberCount: 10000,
        verified: true,
      });

      expect(result).toBeDefined();
      expect(result.channelId).toBe('UC123');
      expect(result.connected).toBe(true);
    });

    it('should update existing channel if already connected', async () => {
      const existingChannel = {
        id: 'channel-1',
        creatorId: 'user-1',
        platform: 'YOUTUBE',
        channelId: 'UC123',
        connected: false,
      };

      const updatedChannel = {
        ...existingChannel,
        connected: true,
        subscriberCount: 20000,
      };

      (db as any).creatorChannel.findFirst.mockResolvedValue(existingChannel);
      (db as any).creatorChannel.update.mockResolvedValue(updatedChannel as any);

      const result = await connectChannel('user-1', 'YOUTUBE', {
        channelId: 'UC123',
        channelName: 'Updated Channel',
        channelUrl: 'https://youtube.com/channel/UC123',
        subscriberCount: 20000,
        verified: true,
      });

      expect(db.creatorChannel.update).toHaveBeenCalled();
      expect(result.connected).toBe(true);
    });
  });

  describe('disconnectChannel', () => {
    it('should disconnect a channel', async () => {
      (db as any).creatorChannel.update.mockResolvedValue({ id: 'channel-1', connected: false });

      await disconnectChannel('channel-1');

      expect(db.creatorChannel.update).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
        data: { connected: false },
      });
    });
  });

  describe('createOrUpdateBusinessProfile', () => {
    it('should create a new business profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        businessType: 'PERSONAL',
        companyName: 'Test Business',
        firstName: 'John',
        lastName: 'Doe',
      };

      (db as any).creatorBusinessProfile.findUnique.mockResolvedValue(null);
      (db as any).creatorBusinessProfile.create.mockResolvedValue(mockProfile as any);

      const result = await createOrUpdateBusinessProfile('user-1', {
        businessType: 'PERSONAL',
        companyName: 'Test Business',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result).toBeDefined();
      expect(result.companyName).toBe('Test Business');
      expect(db.creatorBusinessProfile.create).toHaveBeenCalled();
    });

    it('should update existing business profile', async () => {
      const existingProfile = {
        id: 'profile-1',
        userId: 'user-1',
        businessType: 'PERSONAL',
        companyName: 'Old Name',
        firstName: 'John',
        lastName: 'Doe',
      };

      const updatedProfile = {
        ...existingProfile,
        companyName: 'New Name',
      };

      (db as any).creatorBusinessProfile.findUnique.mockResolvedValue(existingProfile);
      (db as any).creatorBusinessProfile.update.mockResolvedValue(updatedProfile as any);

      const result = await createOrUpdateBusinessProfile('user-1', {
        businessType: 'PERSONAL',
        companyName: 'New Name',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(db.creatorBusinessProfile.update).toHaveBeenCalled();
      expect(result.companyName).toBe('New Name');
    });
  });

  describe('updateBusinessProfile', () => {
    it('should update business profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        businessType: 'COMPANY',
        companyName: 'Updated Business',
        firstName: 'John',
        lastName: 'Doe',
      };

      (db as any).creatorBusinessProfile.update.mockResolvedValue(mockProfile as any);

      const result = await updateBusinessProfile('user-1', {
        companyName: 'Updated Business',
      });

      expect(result).toBeDefined();
      expect(result.companyName).toBe('Updated Business');
      expect(db.creatorBusinessProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          companyName: 'Updated Business',
        },
      });
    });
  });
});
