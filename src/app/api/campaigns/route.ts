import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, requireAuth } from '@/lib/server-auth';
import { hasAnyRole } from '@/lib/roles';
import { getCampaignsWithStats, createCampaign, type CreateCampaignInput } from '@/server/campaigns';
import {
  getOrCreateWallet,
  lockCampaignBudget,
} from '@/server/finance/financeService';

const createCampaignSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(['LINK', 'VIDEO']).optional().default('LINK'),
  landingUrl: z.string().url().optional().nullable(),
  assetsUrl: z.string().max(500).optional().nullable(),
  platforms: z.string().optional().nullable(),
  totalBudgetCents: z.number().int().min(0),
  cpmCents: z.number().int().min(0),
  notes: z.string().max(5000).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  isGeoTargeted: z.boolean().optional(),
  targetCity: z.string().optional().nullable(),
  targetCountryCode: z.string().optional().nullable(),
  targetLatitude: z.number().optional().nullable(),
  targetLongitude: z.number().optional().nullable(),
  targetRadiusKm: z.number().int().min(1).max(500).optional().nullable(),
  dynamicCpmEnabled: z.boolean().optional(),
  dynamicCpmMode: z.enum(['CONSERVATIVE', 'AUTO', 'AGGRESSIVE']).optional().nullable(),
  minCpmCents: z.number().int().min(0).optional().nullable(),
  maxCpmCents: z.number().int().min(0).optional().nullable(),
  pacingEnabled: z.boolean().optional(),
  pacingMode: z.enum(['EVEN', 'ACCELERATED', 'CONSERVATIVE']).optional().nullable(),
  dailyBudgetCents: z.number().int().min(0).optional().nullable(),
  videoRequirements: z.object({
    minDurationSeconds: z.number().int().min(5).optional(),
    requiredPlatform: z.enum(['YOUTUBE', 'TIKTOK', 'INSTAGRAM']).optional(),
    allowMultiplePosts: z.boolean().optional(),
    dailyViewCap: z.number().int().min(100).optional(),
  }).optional().nullable(),
  assets: z
    .array(
      z.object({
        type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'BRAND_GUIDELINES', 'OTHER']),
        url: z.string().url(),
        title: z.string().max(200).optional(),
      })
    )
    .optional(),
}).refine((data) => {
  if (data.isGeoTargeted === true) {
    const hasCountry = !!data.targetCountryCode;
    const hasCity = !!(data.targetCity && data.targetLatitude && data.targetLongitude && data.targetRadiusKm);
    return hasCountry || hasCity;
  }
  return true;
}, {
  message: "When geographic targeting is enabled, you must provide either a country code or city with coordinates",
  path: ["isGeoTargeted"],
}).refine((data) => {
  const campaignType = data.type || 'LINK';
  
  if (campaignType === 'LINK') {
    if (data.landingUrl && data.landingUrl.length > 0) {
      return true;
    }
    return false;
  }
  
  if (campaignType === 'VIDEO') {
    return true;
  }
  
  return true;
}, {
  message: "Landing URL is required for LINK campaigns",
  path: ["landingUrl"],
}).refine((data) => {
  const campaignType = data.type || 'LINK';
  
  if (campaignType === 'VIDEO') {
    if (!data.assetsUrl || data.assetsUrl.length === 0) {
      return false;
    }
  }
  
  return true;
}, {
  message: "Assets URL is required for VIDEO campaigns",
  path: ["assetsUrl"],
}).refine((data) => {
  if (data.assetsUrl && data.assetsUrl.length > 0) {
    const url = data.assetsUrl;
    const allowedDomains = ['drive.google.com', 'docs.google.com', 'onedrive.live.com', 'sharepoint.com'];
    const isHttps = url.startsWith('https://');
    const hasAllowedDomain = allowedDomains.some(domain => url.includes(domain));
    return isHttps && hasAllowedDomain;
  }
  return true;
}, {
  message: "Assets URL must be a valid Google Drive, OneDrive, or SharePoint link (https required)",
  path: ["assetsUrl"],
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const advertiserId = searchParams.get('advertiserId');
    const advertiserOnly = searchParams.get('advertiserOnly') === 'true';
    const creatorOnly = searchParams.get('creatorOnly') === 'true';

    // Public listing: no auth required when just browsing campaigns (no advertiserOnly/creatorOnly)
    const isPublicRequest = !advertiserOnly && !creatorOnly && !advertiserId;
    const user = isPublicRequest ? await getCurrentUser() : await requireAuth();

    if (!isPublicRequest) {
      if (!user.roles || !hasAnyRole(user.roles.join(','), ['ADVERTISER', 'CREATOR', 'SUPERADMIN'])) {
        return NextResponse.json({ error: 'Forbidden: Requires ADVERTISER, CREATOR, or SUPERADMIN role' }, { status: 403 });
      }
    }

    const params: any = {};

    if (advertiserOnly && user) {
      params.advertiserId = user.id;
      params.includeBudgetLock = true;
      params.userId = user.id;
    } else if (advertiserId) {
      params.advertiserId = advertiserId;
    }

    if (!creatorOnly && !advertiserOnly) {
      if (!status) {
        params.status = 'ACTIVE';
      } else if (status !== 'all') {
        params.status = status;
      }
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    params.page = page;
    params.limit = limit;

    const result = await getCampaignsWithStats(params);

    return NextResponse.json({
      campaigns: result.campaigns,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden:')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.roles || !hasAnyRole(user.roles.join(','), ['ADVERTISER', 'CREATOR', 'SUPERADMIN'])) {
      return NextResponse.json({ error: 'Forbidden: Requires ADVERTISER, CREATOR, or SUPERADMIN role' }, { status: 403 });
    }
    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    const wallet = await getOrCreateWallet(user.id);
    const requestedStatus = validated.status || 'DRAFT';

    if (requestedStatus === 'ACTIVE' && validated.totalBudgetCents > 0) {
      if (wallet.availableCents < validated.totalBudgetCents) {
        return NextResponse.json(
          {
            error: 'Insufficient funds',
            errorCode: 'INSUFFICIENT_FUNDS',
            details: {
              required: validated.totalBudgetCents,
              available: wallet.availableCents,
              shortfall: validated.totalBudgetCents - wallet.availableCents,
            },
          },
          { status: 400 }
        );
      }
    }

    const campaignInput: CreateCampaignInput = {
      title: validated.title,
      description: validated.description ?? undefined,
      type: (validated.type as 'LINK' | 'VIDEO') || 'LINK',
      landingUrl: validated.landingUrl ?? undefined,
      assetsUrl: validated.assetsUrl ?? undefined,
      platforms: validated.platforms || 'YOUTUBE,INSTAGRAM,TIKTOK,FACEBOOK',
      totalBudgetCents: validated.totalBudgetCents,
      cpmCents: validated.cpmCents,
      notes: validated.notes ?? undefined,
      status: requestedStatus,
      isGeoTargeted: validated.isGeoTargeted || false,
      targetCity: validated.targetCity ?? undefined,
      targetCountryCode: validated.targetCountryCode ?? undefined,
      targetLatitude: validated.targetLatitude ?? undefined,
      targetLongitude: validated.targetLongitude ?? undefined,
      targetRadiusKm: validated.targetRadiusKm ?? undefined,
      videoRequirements: validated.videoRequirements ?? undefined,
      dynamicCpmEnabled: validated.dynamicCpmEnabled || false,
      dynamicCpmMode: validated.dynamicCpmMode ?? undefined,
      minCpmCents: validated.minCpmCents ?? undefined,
      maxCpmCents: validated.maxCpmCents ?? undefined,
      pacingEnabled: validated.pacingEnabled || false,
      pacingMode: validated.pacingMode ?? undefined,
      dailyBudgetCents: validated.dailyBudgetCents ?? undefined,
      assets: validated.assets?.map(asset => ({
        type: asset.type,
        url: asset.url,
        title: asset.title,
      })),
    };

    const campaign = await createCampaign(user.id, campaignInput);

    if (requestedStatus === 'ACTIVE' && validated.totalBudgetCents > 0) {
      const lockResult = await lockCampaignBudget({
        campaignId: campaign.id,
        advertiserId: user.id,
        amountCents: validated.totalBudgetCents,
      });

      if (!lockResult.success) {
        return NextResponse.json(
          {
            error: 'Failed to lock campaign budget',
            errorCode: lockResult.error,
            campaign: { ...campaign, status: 'DRAFT' },
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        campaign,
        walletBalance: wallet.availableCents,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating campaign:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
