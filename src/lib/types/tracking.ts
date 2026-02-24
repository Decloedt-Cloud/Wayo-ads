export interface TrackingLink {
  id: string;
  campaignId: string;
  creatorId: string;
  slug: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitEvent {
  id: string;
  campaignId: string;
  creatorId: string;
  trackingLinkId: string;
  visitorId: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
  isRecorded: boolean;
  isValidated: boolean;
  isFraudulent: boolean;
  fraudScore?: number;
  createdAt: Date;
}

export interface ConversionEvent {
  id: string;
  visitId: string;
  campaignId: string;
  creatorId: string;
  conversionType: string;
  conversionValue?: number;
  currency: string;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitData {
  campaignId: string;
  creatorId: string;
  trackingLinkId: string;
  visitorId: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
}

export interface TrackingStats {
  campaignId: string;
  totalVisits: number;
  validViews: number;
  conversions: number;
  spendCents: number;
}

export interface TrackingListParams {
  campaignId?: string;
  creatorId?: string;
  visitorId?: string;
  isValidated?: boolean;
  isFraudulent?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface ConversionListParams {
  campaignId?: string;
  creatorId?: string;
  status?: 'PENDING' | 'VALIDATED' | 'REJECTED';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedVisits {
  visits: VisitEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedConversions {
  conversions: ConversionEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TrackingPixelResponse {
  visitId: string;
  pixelUrl: string;
}
