import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser, requireRole } from '@/lib/server-auth';
import { getCampaignStats, getTopCreators, getCreatorCampaignEarnings, getCreatorBalance, getAdvertiserWallet } from '@/lib/analytics';
import {
  getOrCreateWallet,
  lockCampaignBudget,
  releaseCampaignBudget,
  computeCampaignBudget,
} from '@/server/finance/financeService';

const updateCampaignSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  landingUrl: z.string().url().optional(),
  totalBudgetCents: z.number().int().min(0).optional(),
  cpmCents: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional(),
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
});

// GET /api/campaigns/[id] - Get campaign by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
        advertiser: {
          select: { id: true, name: true, email: true, image: true },
        },
        assets: true,
        applications: {
          include: {
            creator: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                image: true,
                trustScore: true,
                tier: true,
                qualityMultiplier: true,
                creatorChannels: {
                  where: { platform: 'YOUTUBE' },
                  select: {
                    channelName: true,
                    subscriberCount: true,
                    videoCount: true,
                    averageViewsPerVideo: true,
                    isPublic: true,
                  },
                },
              },
            },
            socialPosts: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        trackingLinks: user
          ? {
              where: { creatorId: user.id },
              include: {
                _count: {
                  select: { visitEvents: true },
                },
              },
            }
          : false,
        budgetLock: true,
        _count: {
          select: {
            trackingLinks: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const isOwner = user?.id === campaign.advertiserId;

    // Check if user has an application
    const userApplication = user
      ? await db.campaignApplication.findFirst({
          where: {
            campaignId: id,
            creatorId: user.id,
          },
        })
      : null;

    const isApproved = userApplication?.status === 'APPROVED';

    // Get stats using the new finance system
    const stats = await getCampaignStats(id);
    const topCreators = isOwner ? await getTopCreators(id) : [];

    // Build response with flattened stats
    const result: Record<string, unknown> = {
      ...campaign,
      // Finance summary
      finance: {
        totalBudgetCents: campaign.totalBudgetCents,
        lockedBudgetCents: campaign.budgetLock?.lockedCents || 0,
        spentBudgetCents: stats.spentBudget,
        remainingBudgetCents: stats.remainingBudget,
        validViews: stats.validViews,
        cpmCents: campaign.cpmCents,
        payoutPerViewCents: Math.floor(campaign.cpmCents / 1000),
      },
      // Flatten stats for backwards compatibility
      validViews: stats.validViews,
      spentBudget: stats.spentBudget,
      remainingBudget: stats.remainingBudget,
      approvedCreators: stats.approvedCreators,
      topCreators,
      isOwner,
      isApproved,
      userApplication: userApplication
        ? {
            id: userApplication.id,
            status: userApplication.status,
            message: userApplication.message,
          }
        : null,
    };

    // If user is an approved creator, get their earnings for this campaign
    if (isApproved && user) {
      const [campaignEarnings, creatorBalance, socialPosts] = await Promise.all([
        getCreatorCampaignEarnings(id, user.id),
        getCreatorBalance(user.id),
        db.socialPost.findMany({
          where: {
            campaignApplication: {
              campaignId: id,
              creatorId: user.id,
            },
          },
          select: {
            id: true,
            platform: true,
            status: true,
            title: true,
            thumbnailUrl: true,
            videoUrl: true,
            currentViews: true,
            totalValidatedViews: true,
            submittedAt: true,
            rejectionReason: true,
            flagReason: true,
            cpmCents: true,
            youtubeVideoId: true,
            youtubePrivacyStatus: true,
            youtubeFetchedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      result.myEarnings = {
        campaign: campaignEarnings,
        totalBalance: creatorBalance,
      };
      result.myVideos = socialPosts;
    }

    // If user is the owner (advertiser), get their wallet info and video submissions
    if (isOwner) {
      const wallet = await getAdvertiserWallet(user!.id);
      result.advertiserWallet = wallet;

      // Get all video submissions for this campaign
      const allVideoSubmissions = await db.socialPost.findMany({
        where: {
          campaignApplication: {
            campaignId: id,
          },
        },
        include: {
          campaignApplication: {
            include: {
              creator: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
      });
      result.videoSubmissions = allVideoSubmissions;
    }

    // Filter sensitive data based on permissions
    if (!isOwner && !isApproved) {
      result.assets = [];
      result.trackingLinks = [];
      result.applications = userApplication ? [userApplication] : [];
    }

    return NextResponse.json({ campaign: result });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

// PATCH /api/campaigns/[id] - Update campaign
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole('ADVERTISER');
    const body = await request.json();
    const validated = updateCampaignSchema.parse(body);

    // Get existing campaign with budget lock
    const existingCampaign = await db.campaign.findUnique({
      where: { id },
      include: { budgetLock: true },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (existingCampaign.advertiserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Not campaign owner' }, { status: 403 });
    }

    // Get current budget info
    const budgetInfo = await computeCampaignBudget(id);
    const wallet = await getOrCreateWallet(user.id);

    // Handle status changes
    if (validated.status) {
      const statusResult = await handleStatusChange(
        existingCampaign,
        validated.status,
        user.id,
        wallet.availableCents,
        budgetInfo
      );
      if (statusResult.error) {
        return NextResponse.json(
          { error: statusResult.error, errorCode: statusResult.errorCode },
          { status: 400 }
        );
      }
    }

    // Handle budget changes
    if (validated.totalBudgetCents !== undefined && validated.totalBudgetCents !== existingCampaign.totalBudgetCents) {
      const budgetResult = await handleBudgetChange(
        existingCampaign,
        validated.totalBudgetCents,
        user.id,
        wallet.availableCents,
        budgetInfo
      );
      if (budgetResult.error) {
        return NextResponse.json(
          {
            error: budgetResult.error,
            errorCode: budgetResult.errorCode,
            details: budgetResult.details,
          },
          { status: 400 }
        );
      }
    }

    // Update campaign
    const updateData: Record<string, any> = {};
    
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.landingUrl !== undefined) updateData.landingUrl = validated.landingUrl;
    if (validated.totalBudgetCents !== undefined) updateData.totalBudgetCents = validated.totalBudgetCents;
    if (validated.cpmCents !== undefined) updateData.cpmCents = validated.cpmCents;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.isGeoTargeted !== undefined) updateData.isGeoTargeted = validated.isGeoTargeted;
    if (validated.targetCity !== undefined) updateData.targetCity = validated.targetCity;
    if (validated.targetCountryCode !== undefined) updateData.targetCountryCode = validated.targetCountryCode;
    if (validated.targetLatitude !== undefined) updateData.targetLatitude = validated.targetLatitude;
    if (validated.targetLongitude !== undefined) updateData.targetLongitude = validated.targetLongitude;
    if (validated.targetRadiusKm !== undefined) updateData.targetRadiusKm = validated.targetRadiusKm;
    if (validated.dynamicCpmEnabled !== undefined) updateData.dynamicCpmEnabled = validated.dynamicCpmEnabled;
    if (validated.dynamicCpmMode !== undefined) updateData.dynamicCpmMode = validated.dynamicCpmMode;
    if (validated.minCpmCents !== undefined) updateData.minCpmCents = validated.minCpmCents;
    if (validated.maxCpmCents !== undefined) updateData.maxCpmCents = validated.maxCpmCents;

    const campaign = await db.campaign.update({
      where: { id },
      data: updateData,
      include: {
        advertiser: {
          select: { id: true, name: true, email: true },
        },
        assets: true,
        budgetLock: true,
      },
    });

    // Get updated wallet balance
    const updatedWallet = await getOrCreateWallet(user.id);

    return NextResponse.json({
      campaign,
      walletBalance: updatedWallet.availableCents,
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

/**
 * Handle status changes
 */
async function handleStatusChange(
  campaign: {
    id: string;
    status: string;
    advertiserId: string;
    totalBudgetCents: number;
    budgetLock: { lockedCents: number } | null;
  },
  newStatus: string,
  userId: string,
  availableCents: number,
  budgetInfo: { spentCents: number; remainingCents: number }
): Promise<{ error?: string; errorCode?: string }> {
  const currentStatus = campaign.status;

  // DRAFT → ACTIVE: Lock budget
  if (currentStatus === 'DRAFT' && newStatus === 'ACTIVE') {
    if (campaign.totalBudgetCents > 0) {
      if (availableCents < campaign.totalBudgetCents) {
        return {
          error: 'Insufficient funds to activate campaign',
          errorCode: 'INSUFFICIENT_FUNDS',
        };
      }

      const lockResult = await lockCampaignBudget({
        campaignId: campaign.id,
        advertiserId: userId,
        amountCents: campaign.totalBudgetCents,
      });

      if (!lockResult.success) {
        return {
          error: `Failed to lock budget: ${lockResult.error}`,
          errorCode: lockResult.error,
        };
      }
    }
  }

  // ACTIVE → CANCELLED: Release remaining budget
  if (currentStatus === 'ACTIVE' && newStatus === 'CANCELLED') {
    if (campaign.budgetLock && budgetInfo.remainingCents > 0) {
      const releaseResult = await releaseCampaignBudget({
        campaignId: campaign.id,
        advertiserId: userId,
        amountCents: budgetInfo.remainingCents,
        reason: 'CAMPAIGN_CANCELLED',
      });

      if (!releaseResult.success) {
        return {
          error: `Failed to release budget: ${releaseResult.error}`,
          errorCode: releaseResult.error,
        };
      }
    }
  }

  // ACTIVE → COMPLETED: Release remaining budget
  if (currentStatus === 'ACTIVE' && newStatus === 'COMPLETED') {
    if (campaign.budgetLock && budgetInfo.remainingCents > 0) {
      const releaseResult = await releaseCampaignBudget({
        campaignId: campaign.id,
        advertiserId: userId,
        amountCents: budgetInfo.remainingCents,
        reason: 'CAMPAIGN_COMPLETED',
      });

      if (!releaseResult.success) {
        return {
          error: `Failed to release budget: ${releaseResult.error}`,
          errorCode: releaseResult.error,
        };
      }
    }
  }

  return {};
}

/**
 * Handle budget changes
 */
async function handleBudgetChange(
  campaign: {
    id: string;
    status: string;
    advertiserId: string;
    totalBudgetCents: number;
    budgetLock: { lockedCents: number } | null;
  },
  newBudgetCents: number,
  userId: string,
  availableCents: number,
  budgetInfo: { spentCents: number; remainingCents: number }
): Promise<{
  error?: string;
  errorCode?: string;
  details?: Record<string, unknown>;
}> {
  const oldBudget = campaign.totalBudgetCents;
  const budgetDiff = newBudgetCents - oldBudget;

  // Cannot set budget below already spent
  if (newBudgetCents < budgetInfo.spentCents) {
    return {
      error: 'Cannot set budget below already spent amount',
      errorCode: 'BUDGET_BELOW_SPENT',
      details: {
        newBudget: newBudgetCents,
        spentBudget: budgetInfo.spentCents,
      },
    };
  }

  // Only handle budget changes for ACTIVE campaigns with budget lock
  if (campaign.status !== 'ACTIVE' || !campaign.budgetLock) {
    // For DRAFT campaigns, just update the budget (no lock yet)
    return {};
  }

  // Budget increased: Need to lock additional funds
  if (budgetDiff > 0) {
    if (availableCents < budgetDiff) {
      return {
        error: 'Insufficient funds to increase budget',
        errorCode: 'INSUFFICIENT_FUNDS',
        details: {
          additionalNeeded: budgetDiff,
          available: availableCents,
          shortfall: budgetDiff - availableCents,
        },
      };
    }

    // Lock additional funds
    const lockResult = await lockCampaignBudget({
      campaignId: campaign.id,
      advertiserId: userId,
      amountCents: budgetDiff,
    });

    if (!lockResult.success) {
      return {
        error: `Failed to lock additional budget: ${lockResult.error}`,
        errorCode: lockResult.error,
      };
    }
  }

  // Budget decreased: Release excess funds
  if (budgetDiff < 0) {
    const releaseAmount = Math.min(Math.abs(budgetDiff), budgetInfo.remainingCents);
    
    if (releaseAmount > 0) {
      const releaseResult = await releaseCampaignBudget({
        campaignId: campaign.id,
        advertiserId: userId,
        amountCents: releaseAmount,
        reason: 'BUDGET_ADJUSTMENT',
      });

      if (!releaseResult.success) {
        return {
          error: `Failed to release budget: ${releaseResult.error}`,
          errorCode: releaseResult.error,
        };
      }
    }
  }

  return {};
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireRole('ADVERTISER');

    // Check if user owns this campaign
    const existingCampaign = await db.campaign.findUnique({
      where: { id },
      select: { advertiserId: true, status: true },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (existingCampaign.advertiserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Not campaign owner' }, { status: 403 });
    }

    // Don't allow deleting active campaigns
    if (existingCampaign.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot delete active campaign. Cancel it first.' },
        { status: 400 }
      );
    }

    await db.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
