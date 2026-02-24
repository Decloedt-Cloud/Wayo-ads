import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { youtubeService } from '@/server/integrations/youtubeService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: submissionId } = await params;

    const submission = await db.socialPost.findUnique({
      where: { id: submissionId },
      include: {
        campaignApplication: {
          include: {
            campaign: true,
            creator: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const isCreatorOwner = submission.campaignApplication.creatorId === userId;
    const isAdvertiser = submission.campaignApplication.campaign.advertiserId === userId;

    if (!isCreatorOwner && !isAdvertiser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!submission.youtubeVideoId) {
      return NextResponse.json(
        { error: 'No YouTube video ID associated with this submission' },
        { status: 400 }
      );
    }

    let youtubeStatus;
    try {
      youtubeStatus = await youtubeService.fetchYoutubeVideoStatus(submission.youtubeVideoId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch YouTube status';
      
      if (errorMessage.includes('quota exceeded')) {
        return NextResponse.json({ error: 'YouTube API quota exceeded. Please try again later.' }, { status: 503 });
      }
      
      if (errorMessage.includes('Video not found')) {
        await db.socialPost.update({
          where: { id: submissionId },
          data: {
            youtubePrivacyStatus: 'private',
            youtubeFetchedAt: new Date(),
          },
        });
        return NextResponse.json(
          { error: 'Video not found or has been deleted', privacyStatus: 'private' },
          { status: 200 }
        );
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const updatedSubmission = await db.socialPost.update({
      where: { id: submissionId },
      data: {
        youtubePrivacyStatus: youtubeStatus.privacyStatus,
        youtubeViewCount: youtubeStatus.viewCount,
        youtubeTitle: youtubeStatus.title,
        youtubeThumbnail: youtubeStatus.thumbnail,
        youtubeFetchedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      youtubeStatus,
    });
  } catch (error) {
    console.error('Error refreshing YouTube status:', error);
    return NextResponse.json({ error: 'Failed to refresh YouTube status' }, { status: 500 });
  }
}
