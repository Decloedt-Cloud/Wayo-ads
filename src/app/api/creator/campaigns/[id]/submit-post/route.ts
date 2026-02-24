import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/server-auth';
import { youtubeService } from '@/server/integrations/youtubeService';
import { SocialPlatform } from '@prisma/client';
import { createRoleBroadcast } from '@/server/notifications/notificationService';
import { notifyVideoSubmitted } from '@/server/notifications/notificationTriggers';

const submitPostSchema = z.object({
  platform: z.enum(['YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'TWITCH']),
  postUrl: z.string().url().min(1),
  channelId: z.string().optional(),
});

interface VideoRequirements {
  minDurationSeconds?: number;
  requiredPlatform?: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM';
  allowMultiplePosts?: boolean;
  dailyViewCap?: number;
  dailyBudget?: number;
}

interface ShortsRequirements {
  shortsPlatform?: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK';
  shortsMaxDurationSeconds?: number;
  shortsRequireVertical?: boolean;
  shortsRequireHashtag?: string;
  shortsRequireLinkInBio?: boolean;
}

async function validateYouTubeVideo(videoUrl: string, videoRequirements?: VideoRequirements) {
  const videoId = youtubeService.extractVideoId(videoUrl);
  if (!videoId) {
    return { valid: false, error: 'Invalid YouTube video URL' };
  }

  const validation = await youtubeService.validateVideoForCampaign(videoId);
  
  if (!validation.valid) {
    return validation;
  }

  if (videoRequirements?.minDurationSeconds && validation.details) {
    const videoDuration = validation.details.durationSeconds || 0;
    if (videoDuration < videoRequirements.minDurationSeconds) {
      return { 
        valid: false, 
        error: `Video must be at least ${videoRequirements.minDurationSeconds} seconds long. Current duration: ${videoDuration} seconds.` 
      };
    }
  }

  return validation;
}

async function validateYouTubeShort(videoUrl: string, shortsRequirements: ShortsRequirements) {
  const maxDuration = shortsRequirements.shortsMaxDurationSeconds ?? 20;
  
  if (videoUrl.includes('/shorts/')) {
    return { isValid: true, isShort: true };
  }

  const videoId = youtubeService.extractVideoId(videoUrl);
  if (!videoId) {
    return { isValid: false, isShort: false, error: 'Invalid YouTube video URL' };
  }

  const validation = await youtubeService.validateYoutubeShort(videoUrl, {
    shortsMaxDurationSeconds: shortsRequirements.shortsMaxDurationSeconds,
    shortsRequireVertical: shortsRequirements.shortsRequireVertical,
  });
  
  if (!validation.isValid) {
    return validation;
  }

  if (validation.durationSeconds && validation.durationSeconds > maxDuration) {
    return {
      isValid: false,
      isShort: false,
      durationSeconds: validation.durationSeconds,
      error: `Video duration (${validation.durationSeconds}s) exceeds maximum allowed (${maxDuration}s)`,
    };
  }

  if (validation.privacyStatus !== 'public' && validation.privacyStatus !== 'unlisted') {
    return {
      isValid: false,
      isShort: true,
      durationSeconds: validation.durationSeconds,
      error: `Video is ${validation.privacyStatus}`,
    };
  }

  return validation;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const user = await requireRole('CREATOR');
    const body = await request.json();
    const validated = submitPostSchema.parse(body);

    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        cpmCents: true,
        assetsUrl: true,
        videoRequirements: true,
        shortsPlatform: true,
        shortsMaxDurationSeconds: true,
        shortsRequireVertical: true,
        shortsRequireHashtag: true,
        shortsRequireLinkInBio: true,
        advertiserId: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.type !== 'VIDEO' && campaign.type !== 'SHORTS') {
      return NextResponse.json(
        { error: 'This campaign does not accept video submissions. This is a LINK campaign.' },
        { status: 400 }
      );
    }

    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Campaign is not active. Video submissions are only allowed for ACTIVE campaigns.' },
        { status: 400 }
      );
    }

    const application = await db.campaignApplication.findFirst({
      where: {
        campaignId,
        creatorId: user.id,
        status: 'APPROVED',
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            cpmCents: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            verificationLevel: true,
            trustScore: true,
            tier: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'No approved application found for this campaign. You must be approved before submitting videos.' },
        { status: 404 }
      );
    }

    const videoRequirements = campaign.videoRequirements as VideoRequirements | null;
    
    if (videoRequirements?.requiredPlatform) {
      const requiredPlatform = videoRequirements.requiredPlatform;
      if (validated.platform !== requiredPlatform) {
        return NextResponse.json(
          { error: `This campaign requires videos to be submitted on ${requiredPlatform}. You are trying to submit to ${validated.platform}.` },
          { status: 400 }
        );
      }
    }

    if (!videoRequirements?.allowMultiplePosts) {
      const existingPost = await db.socialPost.findFirst({
        where: {
          campaignApplicationId: application.id,
          platform: validated.platform as SocialPlatform,
        },
      });

      if (existingPost) {
        return NextResponse.json(
          { error: 'You have already submitted a video for this campaign. Multiple submissions are not allowed.' },
          { status: 400 }
        );
      }
    }

    if (validated.platform === 'YOUTUBE') {
      let validation;
      let shortsDurationSeconds: number | undefined;

      if (campaign.type === 'SHORTS') {
        const shortsRequirements: ShortsRequirements = {
          shortsPlatform: campaign.shortsPlatform as 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | undefined,
          shortsMaxDurationSeconds: campaign.shortsMaxDurationSeconds || 20,
          shortsRequireVertical: campaign.shortsRequireVertical || true,
          shortsRequireHashtag: campaign.shortsRequireHashtag || undefined,
          shortsRequireLinkInBio: campaign.shortsRequireLinkInBio || false,
        };
        
        const shortsValidation = await validateYouTubeShort(validated.postUrl, shortsRequirements);
        
        if (!shortsValidation.isValid) {
          return NextResponse.json(
            { error: shortsValidation.error },
            { status: 400 }
          );
        }
        
        shortsDurationSeconds = shortsValidation.durationSeconds;
        validation = { valid: true, details: shortsValidation as any };
      } else {
        validation = await validateYouTubeVideo(validated.postUrl, videoRequirements || undefined);
        
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
      }
      
      const videoId = youtubeService.extractVideoId(validated.postUrl);
      
      let youtubePrivacyStatus: string | undefined;
      let youtubeTitle: string | undefined;
      let youtubeThumbnail: string | undefined;
      let youtubeViewCount: number | undefined;
      let youtubeFetchedAt: Date | undefined;

      try {
        const youtubeStatus = await youtubeService.fetchYoutubeVideoStatus(videoId!);
        youtubePrivacyStatus = youtubeStatus.privacyStatus;
        youtubeTitle = youtubeStatus.title;
        youtubeThumbnail = youtubeStatus.thumbnail;
        youtubeViewCount = youtubeStatus.viewCount;
        youtubeFetchedAt = new Date();
      } catch (error) {
        console.warn('Failed to fetch YouTube status on submission:', error);
      }
      
      const existingPost = await db.socialPost.findFirst({
        where: {
          campaignApplicationId: application.id,
          platform: 'YOUTUBE' as SocialPlatform,
          externalPostId: videoId || undefined,
        },
      });

      if (existingPost) {
        return NextResponse.json(
          { error: 'This video has already been submitted for this campaign' },
          { status: 400 }
        );
      }

      const socialPost = await db.socialPost.create({
        data: {
          campaignApplicationId: application.id,
          platform: 'YOUTUBE' as SocialPlatform,
          externalPostId: videoId!,
          channelId: validation.details!.channelId,
          title: validation.details!.title,
          thumbnailUrl: validation.details!.thumbnailUrl || '',
          videoUrl: validated.postUrl,
          initialViews: validation.details!.viewCount,
          currentViews: validation.details!.viewCount,
          lastCheckedViews: validation.details!.viewCount,
          status: 'PENDING',
          campaignId: campaignId,
          cpmCents: campaign.cpmCents,
          dailyCap: videoRequirements?.dailyViewCap || null,
          isVerifiedChannel: application.creator.verificationLevel === 'YOUTUBE_VERIFIED',
          trustScore: (() => {
            const baseTrust = application.creator.verificationLevel === 'UNVERIFIED' 
              ? Math.min(Math.round(application.creator.trustScore * 0.75), 70)
              : application.creator.trustScore;
            
            if (campaign.type === 'SHORTS' && validated.postUrl) {
              return Math.min(baseTrust + 5, 100);
            }
            return baseTrust;
          })(),
          youtubeVideoId: videoId!,
          youtubePrivacyStatus: youtubePrivacyStatus || undefined,
          youtubeTitle: youtubeTitle || undefined,
          youtubeThumbnail: youtubeThumbnail || undefined,
          youtubeViewCount: youtubeViewCount || undefined,
          youtubeFetchedAt: youtubeFetchedAt || undefined,
          shortsDurationSeconds: campaign.type === 'SHORTS' ? shortsDurationSeconds : undefined,
          shortsPlatform: campaign.type === 'SHORTS' ? campaign.shortsPlatform : undefined,
        },
      });

      await notifyVideoSubmitted({
        userId: campaign.advertiserId,
        campaignId: campaignId,
        campaignName: campaign.title,
        creatorId: user.id,
      });

      return NextResponse.json(
        { 
          success: true, 
          post: socialPost,
          videoDetails: validation.details,
          message: 'Video submitted successfully. Waiting for advertiser approval.'
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { error: `Platform ${validated.platform} validation not implemented` },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error submitting post:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to submit post' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const user = await requireRole('CREATOR');

    const application = await db.campaignApplication.findFirst({
      where: {
        campaignId,
        creatorId: user.id,
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            assetsUrl: true,
            videoRequirements: true,
            description: true,
            notes: true,
            cpmCents: true,
          },
        },
        socialPosts: {
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
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching application:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}
