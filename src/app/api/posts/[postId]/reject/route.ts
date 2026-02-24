import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/server-auth';
import { createUserNotification } from '@/server/notifications/notificationService';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500, 'Reason must be less than 500 characters'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await requireRole('ADVERTISER');
    
    const body = await request.json();
    const validated = rejectSchema.parse(body);

    const socialPost = await db.socialPost.findUnique({
      where: { id: postId },
      include: {
        campaignApplication: {
          include: {
            campaign: {
              select: {
                id: true,
                advertiserId: true,
                title: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!socialPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (socialPost.campaignApplication.campaign.advertiserId !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to reject this post' },
        { status: 403 }
      );
    }

    if (socialPost.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot reject post with status ${socialPost.status}. Only PENDING posts can be rejected.` },
        { status: 400 }
      );
    }

    const updatedPost = await db.socialPost.update({
      where: { id: postId },
      data: {
        status: 'REJECTED',
        rejectionReason: validated.reason,
      },
    });

    if (socialPost.campaignApplication?.creator?.id) {
      await createUserNotification({
        toUserId: socialPost.campaignApplication.creator.id,
        senderId: user.id,
        type: 'VIDEO_REJECTED',
        priority: 'P2_NORMAL',
        title: 'Video Rejected',
        message: `Your video for "${socialPost.campaignApplication.campaign.title}" was rejected. Reason: ${validated.reason}`,
        actionUrl: `/dashboard/creator/campaigns/${socialPost.campaignApplication.campaign.id}`,
      } as any);
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Video rejected. The creator has been notified.',
    });
  } catch (error) {
    console.error('Error rejecting post:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to reject post' }, { status: 500 });
  }
}
