import { CampaignStatus, PacingMode, AttributionModel, ConversionType } from '@prisma/client';

export type CampaignStatusType = CampaignStatus;
export type PacingModeType = PacingMode;
export type AttributionModelType = AttributionModel;
export type ConversionTypeType = ConversionType;

export interface GeoTargeting {
  countries: string[];
  cities?: string[];
  radiusKm?: number;
  excludeCountries?: boolean;
}

export interface CampaignListParams {
  advertiserId?: string;
  status?: CampaignStatusType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'totalBudgetCents';
  sortOrder?: 'asc' | 'desc';
}

export interface CampaignPacingInfo {
  campaignId: string;
  pacingEnabled: boolean;
  pacingMode: PacingModeType;
  dailyBudgetCents: number;
  totalBudgetCents: number;
  spentTodayCents: number;
  spentTotalCents: number;
  deliveryProgressPercent: number;
  projectedEndDate: Date | null;
  status: 'ON_TRACK' | 'AHEAD' | 'BEHIND' | 'EXHAUSTED' | 'PAUSED';
}
