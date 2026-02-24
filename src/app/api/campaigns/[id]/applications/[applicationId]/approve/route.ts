import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/server-auth';
import { createUserNotification } from '@/server/notifications/notificationService';

// POST /api/campaigns/[id]/applications/[applicationId]/approve - Approve an application
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const { id: campaignId, applicationId } = await params;
    const user = await requireAuth();

    // Check if user owns this campaign
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { advertiserId: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.advertiserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Not campaign owner' }, { status: 403 });
    }

    // Check if application exists
    const application = await db.campaignApplication.findUnique({
      where: { id: applicationId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.campaignId !== campaignId) {
      return NextResponse.json({ error: 'Application does not belong to this campaign' }, { status: 400 });
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Application already processed', application },
        { status: 400 }
      );
    }

    // Update application status
    const updatedApplication = await db.campaignApplication.update({
      where: { id: applicationId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
      include: {
        campaign: {
          select: { id: true, title: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await createUserNotification({
      toUserId: updatedApplication.creator.id,
      senderId: user.id,
      type: 'CREATOR_APPROVED',
      priority: 'P1_HIGH',
      title: 'Application Approved',
      message: `Your application for "${updatedApplication.campaign.title}" has been approved!`,
      actionUrl: `/dashboard/creator/campaigns/${campaignId}`,
    } as any);

    return NextResponse.json({ application: updatedApplication });
  } catch (error) {
    console.error('Error approving application:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to approve application' }, { status: 500 });
  }
}
