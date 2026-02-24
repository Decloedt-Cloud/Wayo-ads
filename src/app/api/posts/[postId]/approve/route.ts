import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/server-auth';
import { createUserNotification } from '@/server/notifications/notificationService';

const approveSchema = z.object({
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await requireRole('ADVERTISER');
    
    const body = await request.json();
    const validated = approveSchema.parse(body);

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
        { error: 'You are not authorized to approve this post' },
        { status: 403 }
      );
    }

    if (socialPost.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot approve post with status ${socialPost.status}. Only PENDING posts can be approved.` },
        { status: 400 }
      );
    }

    const updatedPost = await db.socialPost.update({
      where: { id: postId },
      data: {
        status: 'ACTIVE',
        approvedAt: new Date(),
      },
    });

    if (socialPost.campaignApplication?.creator?.id) {
      await createUserNotification({
        toUserId: socialPost.campaignApplication.creator.id,
        senderId: user.id,
        type: 'VIDEO_APPROVED',
        priority: 'P1_HIGH',
        title: 'Video Approved',
        message: `Your video for "${socialPost.campaignApplication.campaign.title}" has been approved!`,
        actionUrl: `/dashboard/creator/campaigns/${socialPost.campaignApplication.campaign.id}`,
      } as any);
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Video approved successfully. View tracking and payouts will now begin.',
    });
  } catch (error) {
    console.error('Error approving post:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to approve post' }, { status: 500 });
  }
}
