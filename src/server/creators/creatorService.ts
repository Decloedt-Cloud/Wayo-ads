import { CreatorTier, BusinessType, SocialPlatform } from '@prisma/client';
import { creatorRepository, creatorChannelRepository, creatorBusinessProfileRepository, creatorTrafficMetricsRepository } from './repositories';

export type CreatorTierType = CreatorTier;
export type BusinessTypeType = BusinessType;
export type SocialPlatformType = SocialPlatform;

export interface CreatorProfile {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  tier: CreatorTierType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorBusinessProfile {
  id: string;
  userId: string;
  businessType: BusinessTypeType;
  companyName: string | null;
  firstName: string;
  lastName: string;
  vatNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  taxId: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  paypalEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorChannel {
  id: string;
  creatorId: string;
  platform: SocialPlatformType;
  channelId: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
  verified: boolean;
  connected: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorTrafficMetrics {
  id: string;
  creatorId: string;
  date: Date;
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface CreatorWithDetails {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  tier: CreatorTier;
  trustScore: number | null;
  qualityMultiplier: number | null;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  businessProfile: CreatorBusinessProfile | null;
  channels: CreatorChannel[];
}

export interface PaginatedCreators {
  creators: CreatorProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatorListParams {
  tier?: CreatorTier;
  platform?: SocialPlatform;
  search?: string;
  minSubscribers?: number;
  maxSubscribers?: number;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateCreatorBusinessProfileInput {
  businessType: BusinessType;
  companyName?: string;
  firstName: string;
  lastName: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  paypalEmail?: string;
}

export async function getCreators(params: CreatorListParams): Promise<PaginatedCreators> {
  const { tier, search, page = 1, limit = 20 } = params;

  const result = await creatorRepository.findAll({ tier, search, page, limit });

  return {
    creators: result.creators as unknown as CreatorProfile[],
    total: result.total,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit),
  };
}

export async function getCreatorById(id: string): Promise<CreatorWithDetails | null> {
  const user = await creatorRepository.findByIdWithDetails(id);

  if (!user || user.roles !== 'CREATOR') return null;

  return user as unknown as CreatorWithDetails;
}

export async function getCreatorByUserId(userId: string): Promise<CreatorWithDetails | null> {
  return getCreatorById(userId);
}

export async function getCreatorChannels(creatorId: string): Promise<CreatorChannel[]> {
  const channels = await creatorChannelRepository.findByCreatorId(creatorId);
  return channels as unknown as CreatorChannel[];
}

export async function createOrUpdateBusinessProfile(
  userId: string,
  input: CreateCreatorBusinessProfileInput
): Promise<CreatorBusinessProfile> {
  const existing = await creatorBusinessProfileRepository.findByUserId(userId);

  if (existing) {
    const updated = await creatorBusinessProfileRepository.update(userId, input);
    return updated as unknown as CreatorBusinessProfile;
  }

  const created = await creatorBusinessProfileRepository.create({
    userId,
    ...input,
  });

  return created as unknown as CreatorBusinessProfile;
}

export async function getCreatorBusinessProfile(userId: string): Promise<CreatorBusinessProfile | null> {
  return creatorBusinessProfileRepository.findByUserId(userId) as Promise<CreatorBusinessProfile | null>;
}

export async function updateCreatorProfile(
  userId: string,
  data: { name?: string; bio?: string; image?: string }
): Promise<CreatorWithDetails | null> {
  await creatorRepository.update(userId, data);
  return getCreatorById(userId);
}

export async function getCreatorTrafficMetrics(
  creatorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CreatorTrafficMetrics[]> {
  return creatorTrafficMetricsRepository.findByCreatorId(creatorId, startDate, endDate) as unknown as Promise<CreatorTrafficMetrics[]>;
}

export async function getLatestTrafficMetrics(creatorId: string): Promise<CreatorTrafficMetrics | null> {
  return creatorTrafficMetricsRepository.findLatestByCreatorId(creatorId) as unknown as Promise<CreatorTrafficMetrics | null>;
}

export async function createTrafficMetrics(
  data: Omit<CreatorTrafficMetrics, 'id'>
): Promise<CreatorTrafficMetrics> {
  return creatorTrafficMetricsRepository.create(data as any) as unknown as Promise<CreatorTrafficMetrics>;
}
