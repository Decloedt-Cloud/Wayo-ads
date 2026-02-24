import { CreatorTier, BusinessType, SocialPlatform } from '@prisma/client';

export type CreatorTierType = CreatorTier;
export type BusinessTypeType = BusinessType;
export type SocialPlatformType = SocialPlatform;

export interface CreatorBusinessProfile {
  id: string;
  userId: string;
  businessType: BusinessTypeType;
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
  thumbnailUrl?: string;
  subscriberCount: number;
  verified: boolean;
  connected: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorTrafficMetrics {
  id: string;
  creatorId: string;
  date: Date;
  totalViews: number;
  uniqueVisitors: number;
  botTraffic: number;
  suspiciousVisits: number;
  validVisits: number;
  conversions: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorTrustScore {
  creatorId: string;
  overallScore: number;
  velocityScore: number;
  qualityScore: number;
  payoutReliability: number;
  lastCalculatedAt: Date;
}

export interface CreatorListParams {
  tier?: CreatorTierType;
  platform?: SocialPlatformType;
  search?: string;
  minSubscribers?: number;
  maxSubscribers?: number;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedCreators {
  creators: CreatorProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  tier: CreatorTierType;
  trustScore?: CreatorTrustScore;
  channels: CreatorChannel[];
  businessProfile?: CreatorBusinessProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorApplication {
  id: string;
  campaignId: string;
  creatorId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  proposedRate?: number;
  appliedAt: Date;
  reviewedAt?: Date;
}

export interface CreateCreatorBusinessProfileInput {
  businessType: BusinessTypeType;
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

export interface UpdateCreatorBusinessProfileInput {
  companyName?: string;
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

export interface CreatorVelocityData {
  creatorId: string;
  viewsLast24h: number;
  viewsLast7d: number;
  viewsLast30d: number;
  conversionRate: number;
  avgViewsPerCampaign: number;
  payoutReliability: number;
}

export interface CreatorRiskAssessment {
  creatorId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  velocityAnomaly: boolean;
  qualityAnomaly: boolean;
  suspiciousPatterns: string[];
  recommendations: string[];
  lastAssessedAt: Date;
}
