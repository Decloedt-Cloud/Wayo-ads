import { Prisma } from '@prisma/client';
import { campaignRepository } from './repositories';
import { getCampaignStats } from '@/lib/analytics';

export type CampaignStatusType = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface Campaign {
  id: string;
  title: string;
  description: string | null;
  advertiserId: string;
  status: CampaignStatusType;
  type: 'LINK' | 'VIDEO';
  landingUrl: string | null;
  assetsUrl: string | null;
  videoRequirements: Record<string, unknown> | null;
  platforms: string;
  totalBudgetCents: number;
  cpmCents: number;
  spentBudgetCents: number;
  attributionModel: string;
  payoutMode: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  pacingEnabled: boolean;
  dailyBudgetCents: number;
  pacingMode: string;
  deliveryProgressPercent: number;
  campaignStartDate: Date | null;
  campaignEndDate: Date | null;
  isOverDelivering: boolean;
  isUnderDelivering: boolean;
  dynamicCpmEnabled: boolean;
  minCpmCents: number;
  maxCpmCents: number;
  isGeoTargeted: boolean;
  targetCity: string | null;
  targetCountryCode: string | null;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetRadiusKm: number | null;
}

export interface CampaignAsset {
  id: string;
  campaignId: string;
  type: string;
  url: string;
  title: string | null;
  createdAt: Date;
}

export interface CampaignListParams {
  advertiserId?: string;
  status?: CampaignStatusType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'totalBudgetCents';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCampaigns {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CampaignWithStats extends Campaign {
  totalViews: number;
  totalConversions: number;
  totalSpent: number;
  applicationsCount: number;
  approvedCreators: number;
}

export interface CreateCampaignInput {
  title: string;
  description?: string;
  type?: 'LINK' | 'VIDEO' | 'SHORTS';
  landingUrl?: string | null | undefined;
  assetsUrl?: string | null | undefined;
  videoRequirements?: {
    minDurationSeconds?: number;
    requiredPlatform?: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM';
    allowMultiplePosts?: boolean;
    dailyViewCap?: number;
    dailyBudget?: number;
  } | null;
  shortsPlatform?: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  shortsMaxDurationSeconds?: number;
  shortsRequireVertical?: boolean;
  shortsRequireHashtag?: string;
  shortsRequireLinkInBio?: boolean;
  platforms?: string;
  totalBudgetCents: number;
  cpmCents: number;
  notes?: string;
  pacingEnabled?: boolean;
  pacingMode?: 'EVEN' | 'ACCELERATED' | 'CONSERVATIVE';
  dailyBudgetCents?: number;
  dynamicCpmEnabled?: boolean;
  dynamicCpmMode?: 'CONSERVATIVE' | 'AUTO' | 'AGGRESSIVE';
  minCpmCents?: number;
  maxCpmCents?: number;
  isGeoTargeted?: boolean;
  targetCity?: string;
  targetCountryCode?: string;
  targetLatitude?: number;
  targetLongitude?: number;
  targetRadiusKm?: number;
  assets?: CreateCampaignAssetInput[];
  status?: CampaignStatusType;
}

export interface CreateCampaignAssetInput {
  type: string;
  url: string;
  title?: string;
}

export interface UpdateCampaignInput {
  title?: string;
  description?: string;
  type?: 'LINK' | 'VIDEO' | 'SHORTS';
  landingUrl?: string;
  platforms?: string;
  totalBudgetCents?: number;
  cpmCents?: number;
  notes?: string;
  status?: CampaignStatusType;
  pacingEnabled?: boolean;
  pacingMode?: 'EVEN' | 'ACCELERATED' | 'CONSERVATIVE';
  dailyBudgetCents?: number;
  dynamicCpmEnabled?: boolean;
  minCpmCents?: number;
  maxCpmCents?: number;
  isGeoTargeted?: boolean;
  targetCity?: string;
  targetCountryCode?: string;
  targetLatitude?: number;
  targetLongitude?: number;
  targetRadiusKm?: number;
  shortsPlatform?: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  shortsMaxDurationSeconds?: number;
  shortsRequireVertical?: boolean;
  shortsRequireHashtag?: string;
  shortsRequireLinkInBio?: boolean;
}

export interface CampaignPacingInfo {
  campaignId: string;
  pacingEnabled: boolean;
  pacingMode: string;
  dailyBudgetCents: number;
  totalBudgetCents: number;
  spentTodayCents: number;
  spentTotalCents: number;
  deliveryProgressPercent: number;
  projectedEndDate: Date | null;
  status: 'ON_TRACK' | 'AHEAD' | 'BEHIND' | 'EXHAUSTED' | 'PAUSED';
}

const defaultSelect = {
  id: true,
  title: true,
  description: true,
  advertiserId: true,
  status: true,
  type: true,
  landingUrl: true,
  assetsUrl: true,
  videoRequirements: true,
  platforms: true,
  totalBudgetCents: true,
  cpmCents: true,
  spentBudgetCents: true,
  attributionModel: true,
  payoutMode: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  pacingEnabled: true,
  dailyBudgetCents: true,
  pacingMode: true,
  deliveryProgressPercent: true,
  campaignStartDate: true,
  campaignEndDate: true,
  isOverDelivering: true,
  isUnderDelivering: true,
  dynamicCpmEnabled: true,
  minCpmCents: true,
  maxCpmCents: true,
  isGeoTargeted: true,
  targetCity: true,
  targetCountryCode: true,
  targetLatitude: true,
  targetLongitude: true,
  targetRadiusKm: true,
};

export async function getCampaigns(params: CampaignListParams): Promise<PaginatedCampaigns> {
  const { advertiserId, status, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;

  const result = await campaignRepository.findAll({
    status,
    search,
    page,
    limit,
    advertiserId,
    sortBy,
    sortOrder,
  });

  const campaigns = await Promise.all(
    result.campaigns.map(async (campaign) => {
      return campaignRepository.findByIdSelect(campaign.id, { ...defaultSelect, assets: true });
    })
  );

  const validCampaigns = campaigns.filter((c): c is NonNullable<typeof c> => c !== null);

  return {
    campaigns: validCampaigns as unknown as Campaign[],
    total: result.total,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
}

export interface CampaignWithBudgetLock extends Campaign {
  validViews: number;
  spentBudget: number;
  remainingBudget: number;
  approvedCreators: number;
  pendingVideos: number;
  lockedBudget: number;
}

export async function getCampaignsWithStats(
  params: CampaignListParams & { includeBudgetLock?: boolean; userId?: string }
): Promise<{ campaigns: CampaignWithBudgetLock[]; total: number; page: number; totalPages: number }> {
  const result = await getCampaigns(params);
  
  const campaignsWithStats = await Promise.all(
    result.campaigns.map(async (campaign) => {
      const stats = await getCampaignStats(campaign.id);
      let budgetLock: { lockedCents: number } | null = null;
      
      if (params.includeBudgetLock && params.userId) {
        budgetLock = await campaignRepository.findBudgetLockByCampaignId(campaign.id);
      }
      
      return {
        ...campaign,
        validViews: stats.validViews,
        spentBudget: stats.spentBudget,
        remainingBudget: stats.remainingBudget,
        approvedCreators: stats.approvedCreators,
        pendingVideos: stats.pendingVideos || 0,
        lockedBudget: budgetLock?.lockedCents || 0,
      };
    })
  );

  return {
    campaigns: campaignsWithStats,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  };
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const campaign = await campaignRepository.findByIdWithAssets(id);
  return campaign as Campaign | null;
}

export async function getCampaignWithStats(id: string): Promise<CampaignWithStats | null> {
  const campaign = await campaignRepository.findByIdWithAssetsAndApplications(id) as (Campaign & { applications: Array<{ id: string; creatorId: string; status: string }> }) | null;

  if (!campaign) return null;

  const stats = await campaignRepository.getCampaignStats(id);

  return {
    ...campaign,
    totalViews: stats.views,
    totalConversions: stats.conversions,
    totalSpent: stats.spent,
    applicationsCount: campaign.applications.length,
    approvedCreators: campaign.applications.filter((a: any) => a.status === 'APPROVED').length,
  } as CampaignWithStats;
}

export async function getAdvertiserCampaigns(advertiserId: string, params?: Partial<CampaignListParams>): Promise<PaginatedCampaigns> {
  return getCampaigns({ ...params, advertiserId });
}

export async function createCampaign(advertiserId: string, input: CreateCampaignInput): Promise<Campaign> {
  if (input.type === 'SHORTS') {
    const maxDuration = input.shortsMaxDurationSeconds ?? 20;
    if (maxDuration < 5 || maxDuration > 60) {
      throw new Error('Shorts max duration must be between 5 and 60 seconds');
    }
    if (!input.shortsPlatform) {
      throw new Error('Shorts platform is required for SHORTS campaign type');
    }
  }

  const videoRequirements = input.videoRequirements === null 
    ? undefined 
    : input.videoRequirements 
      ? {
          minDurationSeconds: input.videoRequirements.minDurationSeconds,
          requiredPlatform: input.videoRequirements.requiredPlatform,
          allowMultiplePosts: input.videoRequirements.allowMultiplePosts,
          dailyViewCap: input.videoRequirements.dailyViewCap,
          dailyBudget: input.videoRequirements.dailyBudget,
        }
      : undefined;

  const campaign = await campaignRepository.create({
    title: input.title,
    description: input.description,
    type: input.type || 'LINK',
    landingUrl: input.landingUrl,
    assetsUrl: input.assetsUrl,
    videoRequirements,
    advertiserId,
    platforms: input.platforms || 'YOUTUBE,INSTAGRAM,TIKTOK,FACEBOOK',
    totalBudgetCents: input.totalBudgetCents,
    cpmCents: input.cpmCents,
    notes: input.notes,
    status: input.status || 'DRAFT',
    pacingEnabled: input.pacingEnabled || false,
    pacingMode: input.pacingMode || 'EVEN',
    dailyBudgetCents: input.dailyBudgetCents || 0,
    dynamicCpmEnabled: input.dynamicCpmEnabled || false,
    dynamicCpmMode: input.dynamicCpmMode === 'AUTO' ? 'AGGRESSIVE' : input.dynamicCpmMode,
    baseCpmCents: input.cpmCents,
    minCpmCents: input.minCpmCents || 0,
    maxCpmCents: input.maxCpmCents || 0,
    isGeoTargeted: input.isGeoTargeted || false,
    targetCity: input.targetCity,
    targetCountryCode: input.targetCountryCode,
    targetLatitude: input.targetLatitude,
    targetLongitude: input.targetLongitude,
    targetRadiusKm: input.targetRadiusKm,
    shortsPlatform: input.shortsPlatform,
    shortsMaxDurationSeconds: input.shortsMaxDurationSeconds ?? 20,
    shortsRequireVertical: input.shortsRequireVertical ?? true,
    shortsRequireHashtag: input.shortsRequireHashtag,
    shortsRequireLinkInBio: input.shortsRequireLinkInBio ?? false,
    assets: input.assets ? {
      create: input.assets.map(asset => ({
        type: asset.type as any,
        url: asset.url,
        title: asset.title,
      })),
    } : undefined,
  } as any);

  return campaign as unknown as Campaign & { assets: any[]; advertiser: { id: string; name: string | null; email: string } };
}

export async function updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
  const data: Prisma.CampaignUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.landingUrl !== undefined) data.landingUrl = input.landingUrl;
  if (input.platforms !== undefined) data.platforms = input.platforms;
  if (input.totalBudgetCents !== undefined) data.totalBudgetCents = input.totalBudgetCents;
  if (input.cpmCents !== undefined) data.cpmCents = input.cpmCents;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.status !== undefined) data.status = input.status;
  if (input.pacingEnabled !== undefined) data.pacingEnabled = input.pacingEnabled;
  if (input.pacingMode !== undefined) data.pacingMode = input.pacingMode;
  if (input.dailyBudgetCents !== undefined) data.dailyBudgetCents = input.dailyBudgetCents;
  if (input.dynamicCpmEnabled !== undefined) data.dynamicCpmEnabled = input.dynamicCpmEnabled;
  if (input.minCpmCents !== undefined) data.minCpmCents = input.minCpmCents;
  if (input.maxCpmCents !== undefined) data.maxCpmCents = input.maxCpmCents;
  if (input.isGeoTargeted !== undefined) data.isGeoTargeted = input.isGeoTargeted;
  if (input.targetCity !== undefined) data.targetCity = input.targetCity;
  if (input.targetCountryCode !== undefined) data.targetCountryCode = input.targetCountryCode;
  if (input.targetLatitude !== undefined) data.targetLatitude = input.targetLatitude;
  if (input.targetLongitude !== undefined) data.targetLongitude = input.targetLongitude;
  if (input.targetRadiusKm !== undefined) data.targetRadiusKm = input.targetRadiusKm;
  if (input.type !== undefined) data.type = input.type;
  if (input.shortsPlatform !== undefined) data.shortsPlatform = input.shortsPlatform;
  if (input.shortsMaxDurationSeconds !== undefined) data.shortsMaxDurationSeconds = input.shortsMaxDurationSeconds;
  if (input.shortsRequireVertical !== undefined) data.shortsRequireVertical = input.shortsRequireVertical;
  if (input.shortsRequireHashtag !== undefined) data.shortsRequireHashtag = input.shortsRequireHashtag;
  if (input.shortsRequireLinkInBio !== undefined) data.shortsRequireLinkInBio = input.shortsRequireLinkInBio;

  const campaign = await campaignRepository.update(id, data as any);

  return campaign as Campaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  await campaignRepository.delete(id);
}

export async function getCampaignPacingInfo(campaignId: string): Promise<CampaignPacingInfo | null> {
  const campaign = await campaignRepository.findByIdWithPacingInfo(campaignId);

  if (!campaign) return null;

  const now = new Date();
  const startDate = campaign.campaignStartDate;
  const endDate = campaign.campaignEndDate;
  
  const totalHours = endDate && startDate
    ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    : 24 * 30;
  const elapsedHours = startDate
    ? (now.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    : 0;
  
  const expectedSpend = totalHours > 0 ? (elapsedHours / totalHours) * campaign.totalBudgetCents : 0;
  const actualSpend = campaign.spentBudgetCents;
  
  let status: CampaignPacingInfo['status'] = 'ON_TRACK';
  if (campaign.status === 'PAUSED') {
    status = 'PAUSED';
  } else if (actualSpend > expectedSpend * 1.2) {
    status = 'AHEAD';
  } else if (actualSpend < expectedSpend * 0.8) {
    status = 'BEHIND';
  } else if (actualSpend >= campaign.totalBudgetCents) {
    status = 'EXHAUSTED';
  }

  const projectedEndDate = expectedSpend > 0 && startDate
    ? new Date(startDate.getTime() + (campaign.totalBudgetCents / expectedSpend) * ((endDate?.getTime() ?? startDate.getTime()) - startDate.getTime()))
    : null;

  const dailyBudgetCents = campaign.dailyBudgetCents || campaign.totalBudgetCents / 30;
  const spentTodayCents = 0;

  return {
    campaignId: campaign.id,
    pacingEnabled: campaign.pacingEnabled,
    pacingMode: campaign.pacingMode,
    dailyBudgetCents,
    totalBudgetCents: campaign.totalBudgetCents,
    spentTodayCents,
    spentTotalCents: actualSpend,
    deliveryProgressPercent: campaign.deliveryProgressPercent,
    projectedEndDate,
    status,
  };
}

export async function getAllCampaignsPacingInfo(advertiserId?: string): Promise<CampaignPacingInfo[]> {
  const campaigns = await campaignRepository.findPacingEnabled(advertiserId);

  const pacingInfos = await Promise.all(
    campaigns.map(c => getCampaignPacingInfo(c.id))
  );

  return pacingInfos.filter((p): p is CampaignPacingInfo => p !== null);
}
