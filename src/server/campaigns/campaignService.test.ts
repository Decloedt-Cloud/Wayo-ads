import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignStatus } from '@prisma/client';

vi.mock('@/lib/db', async () => {
  const mockCampaign = {
    id: 'campaign-1',
    advertiserId: 'advertiser-1',
    title: 'Test Campaign',
    description: 'Test Campaign Description',
    landingUrl: 'https://example.com',
    platforms: 'YOUTUBE,INSTAGRAM',
    status: CampaignStatus.ACTIVE,
    totalBudgetCents: 1000000,
    spentBudgetCents: 0,
    dailyBudgetCents: undefined,
    cpmCents: 5000,
    payoutPerViewCents: 100,
    payoutPerConversionCents: undefined,
    conversionType: undefined,
    attributionModel: 'LAST_CLICK',
    isGeoTargeted: false,
    targetCountryCode: null,
    targetCity: null,
    targetLatitude: undefined,
    targetLongitude: undefined,
    targetRadiusKm: undefined,
    dynamicCpmEnabled: false,
    dynamicCpmMode: undefined,
    baseCpmCents: undefined,
    minCpmCents: undefined,
    maxCpmCents: undefined,
    pacingEnabled: false,
    pacingMode: undefined,
    payoutMode: 'CPM',
    fraudScoreThreshold: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdvertiser = {
    id: 'advertiser-1',
    name: 'Test Advertiser',
    email: 'advertiser@example.com',
    image: null,
  };

  return {
    db: {
      campaign: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(mockCampaign),
        update: vi.fn().mockResolvedValue(mockCampaign),
        delete: vi.fn().mockResolvedValue(mockCampaign),
        count: vi.fn().mockResolvedValue(0),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      visitEvent: {
        count: vi.fn().mockResolvedValue(0),
      },
      conversionEvent: {
        count: vi.fn().mockResolvedValue(0),
      },
      ledgerEntry: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: null } }),
      },
    },
  };
});

import { getCampaigns, getCampaignById, getCampaignWithStats, createCampaign, updateCampaign, deleteCampaign, getCampaignPacingInfo, getAllCampaignsPacingInfo } from '../campaigns/campaignService';
import { db } from '@/lib/db';

describe('CampaignService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCampaigns', () => {
    it('should return paginated campaigns', async () => {
      const mockCampaignsWithRelations = [
        {
          id: 'campaign-1',
          advertiserId: 'advertiser-1',
          title: 'Test Campaign',
          description: 'Test Campaign Description',
          landingUrl: 'https://example.com',
          platforms: 'YOUTUBE,INSTAGRAM',
          status: CampaignStatus.ACTIVE,
          totalBudgetCents: 1000000,
          spentBudgetCents: 0,
          dailyBudgetCents: undefined,
          cpmCents: 5000,
          payoutPerViewCents: 100,
          payoutPerConversionCents: undefined,
          conversionType: undefined,
          attributionModel: 'LAST_CLICK',
          isGeoTargeted: false,
          targetCountryCode: null,
          targetCity: null,
          targetLatitude: undefined,
          targetLongitude: undefined,
          targetRadiusKm: undefined,
          dynamicCpmEnabled: false,
          dynamicCpmMode: undefined,
          baseCpmCents: undefined,
          minCpmCents: undefined,
          maxCpmCents: undefined,
          pacingEnabled: false,
          pacingMode: undefined,
          payoutMode: 'CPM',
          fraudScoreThreshold: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
          advertiser: {
            id: 'advertiser-1',
            name: 'Test Advertiser',
            email: 'advertiser@example.com',
            image: null,
          },
          _count: {
            applications: 5,
            assets: 2,
          },
        },
      ];

      (db as any).campaign.findMany.mockResolvedValue(mockCampaignsWithRelations as any);
      (db as any).campaign.count.mockResolvedValue(3);

      const result = await getCampaigns({ status: CampaignStatus.ACTIVE, page: 1, limit: 10 });

      expect(result.campaigns).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(db.campaign.findMany).toHaveBeenCalled();
    });

    it('should filter by advertiserId when provided', async () => {
      (db as any).campaign.findMany.mockResolvedValue([]);
      (db as any).campaign.count.mockResolvedValue(0);

      await getCampaigns({ advertiserId: 'advertiser-1' });

      expect(db.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            advertiserId: 'advertiser-1',
          }),
        })
      );
    });

    it('should apply pagination correctly', async () => {
      (db as any).campaign.findMany.mockResolvedValue([]);
      (db as any).campaign.count.mockResolvedValue(50);

      await getCampaigns({ page: 2, limit: 10 });

      expect(db.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('getCampaignById', () => {
    it('should return campaign by id', async () => {
      const mockCampaignWithRelations = {
        id: 'campaign-1',
        advertiserId: 'advertiser-1',
        title: 'Test Campaign',
        description: 'Test Campaign Description',
        landingUrl: 'https://example.com',
        platforms: 'YOUTUBE,INSTAGRAM',
        status: CampaignStatus.ACTIVE,
        totalBudgetCents: 1000000,
        spentBudgetCents: 0,
        dailyBudgetCents: undefined,
        cpmCents: 5000,
        payoutPerViewCents: 100,
        payoutPerConversionCents: undefined,
        conversionType: undefined,
        attributionModel: 'LAST_CLICK',
        isGeoTargeted: false,
        targetCountryCode: null,
        targetCity: null,
        targetLatitude: undefined,
        targetLongitude: undefined,
        targetRadiusKm: undefined,
        dynamicCpmEnabled: false,
        dynamicCpmMode: undefined,
        baseCpmCents: undefined,
        minCpmCents: undefined,
        maxCpmCents: undefined,
        pacingEnabled: false,
        pacingMode: undefined,
        payoutMode: 'CPM',
        fraudScoreThreshold: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        advertiser: {
          id: 'advertiser-1',
          name: 'Test Advertiser',
          email: 'advertiser@example.com',
        },
        assets: [],
        applications: [],
        _count: {
          applications: 0,
          assets: 0,
        },
      };

      (db as any).campaign.findUnique.mockResolvedValue(mockCampaignWithRelations as any);

      const result = await getCampaignById('campaign-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('campaign-1');
      expect(db.campaign.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'campaign-1' },
        })
      );
    });

    it('should return null for non-existent campaign', async () => {
      (db as any).campaign.findUnique.mockResolvedValue(null);

      const result = await getCampaignById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      const createInput = {
        title: 'New Campaign',
        landingUrl: 'https://new-campaign.com',
        totalBudgetCents: 500000,
        cpmCents: 5000,
        advertiserId: 'advertiser-1',
      };

      const createdCampaign = {
        id: 'campaign-new',
        ...createInput,
        description: null,
        platforms: 'YOUTUBE,INSTAGRAM,TIKTOK,FACEBOOK',
        status: 'DRAFT' as const,
        spentBudgetCents: 0,
        dailyBudgetCents: undefined,
        payoutPerViewCents: 0,
        payoutPerConversionCents: undefined,
        conversionType: undefined,
        attributionModel: 'LAST_CLICK' as const,
        isGeoTargeted: false,
        targetCountryCode: null,
        targetCity: null,
        targetLatitude: undefined,
        targetLongitude: undefined,
        targetRadiusKm: undefined,
        dynamicCpmEnabled: false,
        dynamicCpmMode: undefined,
        baseCpmCents: undefined,
        minCpmCents: undefined,
        maxCpmCents: undefined,
        pacingEnabled: false,
        pacingMode: undefined,
        payoutMode: 'CPM' as const,
        fraudScoreThreshold: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(result.title).toBe('New Campaign');
      expect(db.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Campaign',
            advertiserId: 'advertiser-1',
          }),
        })
      );
    });
  });

  describe('updateCampaign', () => {
    it('should update an existing campaign', async () => {
      const updateInput = {
        title: 'Updated Title',
        status: CampaignStatus.PAUSED,
      };

      const updatedCampaign = {
        id: 'campaign-1',
        advertiserId: 'advertiser-1',
        title: 'Updated Title',
        description: 'Test Campaign Description',
        landingUrl: 'https://example.com',
        platforms: 'YOUTUBE,INSTAGRAM',
        status: CampaignStatus.PAUSED,
        totalBudgetCents: 1000000,
        spentBudgetCents: 0,
        dailyBudgetCents: undefined,
        cpmCents: 5000,
        payoutPerViewCents: 100,
        payoutPerConversionCents: undefined,
        conversionType: undefined,
        attributionModel: 'LAST_CLICK' as const,
        isGeoTargeted: false,
        targetCountryCode: null,
        targetCity: null,
        targetLatitude: undefined,
        targetLongitude: undefined,
        targetRadiusKm: undefined,
        dynamicCpmEnabled: false,
        dynamicCpmMode: undefined,
        baseCpmCents: undefined,
        minCpmCents: undefined,
        maxCpmCents: undefined,
        pacingEnabled: false,
        pacingMode: undefined,
        payoutMode: 'CPM' as const,
        fraudScoreThreshold: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (db as any).campaign.update.mockResolvedValue(updatedCampaign as any);

      const result = await updateCampaign('campaign-1', updateInput);

      expect(result.title).toBe('Updated Title');
      expect(result.status).toBe(CampaignStatus.PAUSED);
      expect(db.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'campaign-1' },
          data: updateInput,
        })
      );
    });
  });

  describe('getCampaignWithStats', () => {
    it('should return campaign with stats', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        advertiserId: 'advertiser-1',
        title: 'Test Campaign',
        description: 'Test Campaign Description',
        landingUrl: 'https://example.com',
        platforms: 'YOUTUBE,INSTAGRAM',
        status: CampaignStatus.ACTIVE,
        totalBudgetCents: 1000000,
        spentBudgetCents: 0,
        cpmCents: 5000,
        attributionModel: 'LAST_CLICK',
        isGeoTargeted: false,
        pacingEnabled: false,
        dailyBudgetCents: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        assets: [],
        applications: [
          { id: 'app-1', creatorId: 'creator-1', status: 'APPROVED' },
          { id: 'app-2', creatorId: 'creator-2', status: 'PENDING' },
        ],
      };

      (db as any).campaign.findUnique.mockResolvedValue(mockCampaign);
      (db as any).visitEvent.count.mockResolvedValue(100);
      (db as any).conversionEvent.count.mockResolvedValue(10);
      (db as any).ledgerEntry.aggregate.mockResolvedValue({ _sum: { amountCents: 50000 } });

      const result = await getCampaignWithStats('campaign-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('campaign-1');
      expect(result?.totalViews).toBe(100);
      expect(result?.totalConversions).toBe(10);
      expect(result?.totalSpent).toBe(50000);
      expect(result?.applicationsCount).toBe(2);
      expect(result?.approvedCreators).toBe(1);
    });

    it('should return null for non-existent campaign', async () => {
      (db as any).campaign.findUnique.mockResolvedValue(null);

      const result = await getCampaignWithStats('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a campaign', async () => {
      (db as any).campaign.delete.mockResolvedValue({ id: 'campaign-1' });

      await deleteCampaign('campaign-1');

      expect(db.campaign.delete).toHaveBeenCalledWith({ where: { id: 'campaign-1' } });
    });
  });

  describe('getCampaignPacingInfo', () => {
    it('should return pacing info for active campaign', async () => {
      const mockCampaignPacing = {
        id: 'campaign-1',
        pacingEnabled: true,
        pacingMode: 'EVEN',
        dailyBudgetCents: 10000,
        totalBudgetCents: 100000,
        spentBudgetCents: 50000,
        deliveryProgressPercent: 50,
        campaignStartDate: new Date('2024-01-01'),
        campaignEndDate: new Date('2024-02-01'),
        status: CampaignStatus.ACTIVE,
      };

      (db as any).campaign.findUnique.mockResolvedValue(mockCampaignPacing);

      const result = await getCampaignPacingInfo('campaign-1');

      expect(result).toBeDefined();
      expect(result?.campaignId).toBe('campaign-1');
      expect(result?.pacingEnabled).toBe(true);
      expect(result?.totalBudgetCents).toBe(100000);
      expect(result?.spentTotalCents).toBe(50000);
    });

    it('should return null for non-existent campaign', async () => {
      (db as any).campaign.findUnique.mockResolvedValue(null);

      const result = await getCampaignPacingInfo('non-existent');

      expect(result).toBeNull();
    });

    it('should return PAUSED status when campaign is paused', async () => {
      const mockCampaignPacing = {
        id: 'campaign-1',
        pacingEnabled: true,
        pacingMode: 'EVEN',
        dailyBudgetCents: 10000,
        totalBudgetCents: 100000,
        spentBudgetCents: 30000,
        deliveryProgressPercent: 30,
        campaignStartDate: new Date('2024-01-01'),
        campaignEndDate: new Date('2024-02-01'),
        status: CampaignStatus.PAUSED,
      };

      (db as any).campaign.findUnique.mockResolvedValue(mockCampaignPacing);

      const result = await getCampaignPacingInfo('campaign-1');

      expect(result?.status).toBe('PAUSED');
    });
  });

  describe('getAllCampaignsPacingInfo', () => {
    it('should return pacing info for all advertiser campaigns', async () => {
      const mockCampaigns = [
        { id: 'campaign-1' },
        { id: 'campaign-2' },
      ];

      const mockCampaignPacing1 = {
        campaignId: 'campaign-1',
        pacingEnabled: true,
        pacingMode: 'EVEN',
        dailyBudgetCents: 10000,
        totalBudgetCents: 100000,
        spentTotalCents: 50000,
        deliveryProgressPercent: 50,
        projectedEndDate: null,
        status: 'ON_TRACK' as const,
      };

      const mockCampaignPacing2 = {
        campaignId: 'campaign-2',
        pacingEnabled: true,
        pacingMode: 'EVEN',
        dailyBudgetCents: 20000,
        totalBudgetCents: 200000,
        spentTotalCents: 100000,
        deliveryProgressPercent: 50,
        projectedEndDate: null,
        status: 'ON_TRACK' as const,
      };

      (db as any).campaign.findMany.mockResolvedValue(mockCampaigns);
      (db as any).campaign.findUnique
        .mockResolvedValueOnce({
          id: 'campaign-1',
          pacingEnabled: true,
          pacingMode: 'EVEN',
          dailyBudgetCents: 10000,
          totalBudgetCents: 100000,
          spentBudgetCents: 50000,
          deliveryProgressPercent: 50,
          campaignStartDate: new Date('2024-01-01'),
          campaignEndDate: new Date('2024-02-01'),
          status: CampaignStatus.ACTIVE,
        })
        .mockResolvedValueOnce({
          id: 'campaign-2',
          pacingEnabled: true,
          pacingMode: 'EVEN',
          dailyBudgetCents: 20000,
          totalBudgetCents: 200000,
          spentBudgetCents: 100000,
          deliveryProgressPercent: 50,
          campaignStartDate: new Date('2024-01-01'),
          campaignEndDate: new Date('2024-02-01'),
          status: CampaignStatus.ACTIVE,
        });

      const result = await getAllCampaignsPacingInfo('advertiser-1');

      expect(result).toHaveLength(2);
      expect(result[0].campaignId).toBe('campaign-1');
      expect(result[1].campaignId).toBe('campaign-2');
    });

    it('should return empty array when no campaigns found', async () => {
      (db as any).campaign.findMany.mockResolvedValue([]);

      const result = await getAllCampaignsPacingInfo('advertiser-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('Campaign Type - LINK', () => {
    it('should create a LINK campaign with default type', async () => {
      const createInput = {
        title: 'Link Campaign',
        landingUrl: 'https://example.com',
        totalBudgetCents: 500000,
        cpmCents: 5000,
      };

      const createdCampaign = {
        id: 'campaign-link',
        ...createInput,
        type: 'LINK' as const,
        description: null,
        assetsUrl: null,
        videoRequirements: null,
        platforms: 'YOUTUBE,INSTAGRAM,TIKTOK,FACEBOOK',
        status: 'DRAFT' as const,
        spentBudgetCents: 0,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(result.type).toBe('LINK');
      expect(db.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Link Campaign',
            type: 'LINK',
            landingUrl: 'https://example.com',
          }),
        })
      );
    });

    it('should create a LINK campaign with explicit type', async () => {
      const createInput = {
        title: 'Explicit Link Campaign',
        type: 'LINK' as const,
        landingUrl: 'https://mysite.com',
        totalBudgetCents: 300000,
        cpmCents: 4000,
      };

      const createdCampaign = {
        id: 'campaign-link-2',
        ...createInput,
        description: null,
        assetsUrl: null,
        videoRequirements: null,
        platforms: 'YOUTUBE,INSTAGRAM,TIKTOK,FACEBOOK',
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(result.type).toBe('LINK');
    });
  });

  describe('Campaign Type - VIDEO', () => {
    it('should create a VIDEO campaign with assets URL', async () => {
      const createInput = {
        title: 'Video Campaign',
        type: 'VIDEO' as const,
        assetsUrl: 'https://drive.google.com/drive/folders/abc123',
        totalBudgetCents: 1000000,
        cpmCents: 10000,
        videoRequirements: {
          minDurationSeconds: 30,
          requiredPlatform: 'YOUTUBE' as const,
          allowMultiplePosts: false,
          dailyViewCap: 5000,
        },
      };

      const createdCampaign = {
        id: 'campaign-video-1',
        title: 'Video Campaign',
        type: 'VIDEO' as const,
        landingUrl: null,
        assetsUrl: 'https://drive.google.com/drive/folders/abc123',
        videoRequirements: {
          minDurationSeconds: 30,
          requiredPlatform: 'YOUTUBE',
          allowMultiplePosts: false,
          dailyViewCap: 5000,
        },
        platforms: 'YOUTUBE,INSTAGRAM,TIKTOK,FACEBOOK',
        status: 'DRAFT' as const,
        totalBudgetCents: 1000000,
        cpmCents: 10000,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(result.type).toBe('VIDEO');
      expect(result.assetsUrl).toBe('https://drive.google.com/drive/folders/abc123');
      expect(db.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'VIDEO',
            assetsUrl: 'https://drive.google.com/drive/folders/abc123',
          }),
        })
      );
    });

    it('should create a VIDEO campaign with OneDrive URL', async () => {
      const createInput = {
        title: 'Video Campaign OneDrive',
        type: 'VIDEO' as const,
        assetsUrl: 'https://onedrive.live.com/share/xyz',
        totalBudgetCents: 800000,
        cpmCents: 8000,
        videoRequirements: {
          requiredPlatform: 'TIKTOK' as const,
          minDurationSeconds: 15,
        },
      };

      const createdCampaign = {
        id: 'campaign-video-2',
        title: 'Video Campaign OneDrive',
        type: 'VIDEO' as const,
        assetsUrl: 'https://onedrive.live.com/share/xyz',
        videoRequirements: {
          requiredPlatform: 'TIKTOK',
          minDurationSeconds: 15,
        },
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(result.type).toBe('VIDEO');
      expect(result.assetsUrl).toBe('https://onedrive.live.com/share/xyz');
    });

    it('should create a VIDEO campaign with SharePoint URL', async () => {
      const createInput = {
        title: 'Video Campaign SharePoint',
        type: 'VIDEO' as const,
        assetsUrl: 'https://company.sharepoint.com/sites/Marketing/VideoAssets',
        totalBudgetCents: 1200000,
        cpmCents: 12000,
        videoRequirements: {
          requiredPlatform: 'INSTAGRAM' as const,
          allowMultiplePosts: true,
          dailyViewCap: 10000,
        },
      };

      const createdCampaign = {
        id: 'campaign-video-3',
        title: 'Video Campaign SharePoint',
        type: 'VIDEO' as const,
        assetsUrl: 'https://company.sharepoint.com/sites/Marketing/VideoAssets',
        videoRequirements: {
          requiredPlatform: 'INSTAGRAM',
          allowMultiplePosts: true,
          dailyViewCap: 10000,
        },
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(result.type).toBe('VIDEO');
      expect(result.assetsUrl).toBe('https://company.sharepoint.com/sites/Marketing/VideoAssets');
    });

    it('should create a VIDEO campaign with all video requirements', async () => {
      const createInput = {
        title: 'Full Video Campaign',
        type: 'VIDEO' as const,
        assetsUrl: 'https://docs.google.com/presentationvault/123',
        totalBudgetCents: 2000000,
        cpmCents: 15000,
        videoRequirements: {
          minDurationSeconds: 60,
          requiredPlatform: 'YOUTUBE' as const,
          allowMultiplePosts: true,
          dailyViewCap: 20000,
          dailyBudget: 300000,
        },
      };

      const createdCampaign = {
        id: 'campaign-video-4',
        ...createInput,
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(result.type).toBe('VIDEO');
      expect((result as any).videoRequirements).toEqual({
        minDurationSeconds: 60,
        requiredPlatform: 'YOUTUBE',
        allowMultiplePosts: true,
        dailyViewCap: 20000,
        dailyBudget: 300000,
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should default to LINK type when type is not specified', async () => {
      const createInput = {
        title: 'Legacy Campaign',
        landingUrl: 'https://legacy.com',
        totalBudgetCents: 100000,
        cpmCents: 3000,
      };

      const createdCampaign = {
        id: 'campaign-legacy',
        title: 'Legacy Campaign',
        type: 'LINK',
        landingUrl: 'https://legacy.com',
        assetsUrl: null,
        videoRequirements: null,
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(db.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'LINK',
          }),
        })
      );
    });
  });

  describe('SHORTS Campaign Type', () => {
    it('should create a SHORTS campaign with all required fields', async () => {
      const createInput: any = {
        title: 'YouTube Shorts Campaign',
        type: 'SHORTS' as const,
        shortsPlatform: 'YOUTUBE' as const,
        shortsMaxDurationSeconds: 30,
        shortsRequireVertical: true,
        shortsRequireHashtag: '#shorts',
        shortsRequireLinkInBio: true,
        totalBudgetCents: 500000,
        cpmCents: 4000,
        assetsUrl: 'https://example.com/shorts-assets',
      };

      const createdCampaign = {
        id: 'campaign-shorts-1',
        title: 'YouTube Shorts Campaign',
        type: 'SHORTS',
        shortsPlatform: 'YOUTUBE',
        shortsMaxDurationSeconds: 30,
        shortsRequireVertical: true,
        shortsRequireHashtag: '#shorts',
        shortsRequireLinkInBio: true,
        assetsUrl: 'https://example.com/shorts-assets',
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect(result.type).toBe('SHORTS');
      expect((result as any).shortsPlatform).toBe('YOUTUBE');
      expect((result as any).shortsMaxDurationSeconds).toBe(30);
      expect((result as any).shortsRequireVertical).toBe(true);
      expect((result as any).shortsRequireHashtag).toBe('#shorts');
      expect((result as any).shortsRequireLinkInBio).toBe(true);
    });

    it('should default shortsMaxDurationSeconds to 20 when not provided', async () => {
      const createInput: any = {
        title: 'Shorts Campaign Default Duration',
        type: 'SHORTS' as const,
        shortsPlatform: 'TIKTOK' as const,
        totalBudgetCents: 300000,
        cpmCents: 3500,
      };

      const createdCampaign = {
        id: 'campaign-shorts-2',
        title: 'Shorts Campaign Default Duration',
        type: 'SHORTS',
        shortsPlatform: 'TIKTOK',
        shortsMaxDurationSeconds: 20,
        shortsRequireVertical: true,
        shortsRequireLinkInBio: false,
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect((result as any).shortsMaxDurationSeconds).toBe(20);
    });

    it('should default shortsRequireVertical to true when not provided', async () => {
      const createInput: any = {
        title: 'Shorts Campaign Default Vertical',
        type: 'SHORTS' as const,
        shortsPlatform: 'INSTAGRAM' as const,
        shortsMaxDurationSeconds: 45,
        totalBudgetCents: 300000,
        cpmCents: 3500,
      };

      const createdCampaign = {
        id: 'campaign-shorts-3',
        title: 'Shorts Campaign Default Vertical',
        type: 'SHORTS',
        shortsPlatform: 'INSTAGRAM',
        shortsMaxDurationSeconds: 45,
        shortsRequireVertical: true,
        shortsRequireLinkInBio: false,
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect((result as any).shortsRequireVertical).toBe(true);
    });

    it('should allow max duration up to 60 seconds', async () => {
      const createInput: any = {
        title: 'Shorts Max Duration',
        type: 'SHORTS' as const,
        shortsPlatform: 'YOUTUBE' as const,
        shortsMaxDurationSeconds: 60,
        totalBudgetCents: 500000,
        cpmCents: 4000,
      };

      const createdCampaign = {
        id: 'campaign-shorts-4',
        title: 'Shorts Max Duration',
        type: 'SHORTS',
        shortsPlatform: 'YOUTUBE',
        shortsMaxDurationSeconds: 60,
        shortsRequireVertical: true,
        shortsRequireLinkInBio: false,
        status: 'DRAFT' as const,
      };

      (db as any).campaign.create.mockResolvedValue(createdCampaign as any);

      const result = await createCampaign('advertiser-1', createInput);

      expect((result as any).shortsMaxDurationSeconds).toBe(60);
    });

    it('should reject SHORTS campaign without platform', async () => {
      const createInput: any = {
        title: 'Shorts Without Platform',
        type: 'SHORTS' as const,
        shortsMaxDurationSeconds: 20,
        totalBudgetCents: 300000,
        cpmCents: 3500,
      };

      (db as any).campaign.create.mockResolvedValue({});

      await expect(createCampaign('advertiser-1', createInput)).rejects.toThrow(
        'Shorts platform is required for SHORTS campaign type'
      );
    });

    it('should update SHORTS campaign fields', async () => {
      const updateInput: any = {
        shortsPlatform: 'TIKTOK' as const,
        shortsMaxDurationSeconds: 40,
        shortsRequireVertical: false,
        shortsRequireHashtag: '#fyp',
        shortsRequireLinkInBio: true,
      };

      const updatedCampaign = {
        id: 'campaign-shorts-update',
        title: 'Updated Shorts Campaign',
        type: 'SHORTS',
        shortsPlatform: 'TIKTOK',
        shortsMaxDurationSeconds: 40,
        shortsRequireVertical: false,
        shortsRequireHashtag: '#fyp',
        shortsRequireLinkInBio: true,
        status: 'DRAFT' as const,
      };

      (db as any).campaign.update.mockResolvedValue(updatedCampaign as any);

      const result = await updateCampaign('campaign-shorts-update', updateInput);

      expect((result as any).shortsPlatform).toBe('TIKTOK');
      expect((result as any).shortsMaxDurationSeconds).toBe(40);
      expect((result as any).shortsRequireVertical).toBe(false);
      expect((result as any).shortsRequireHashtag).toBe('#fyp');
      expect((result as any).shortsRequireLinkInBio).toBe(true);
    });
  });
});
