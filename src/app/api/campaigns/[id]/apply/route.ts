import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/server-auth';
import { notifyCreatorApplied } from '@/server/notifications/notificationTriggers';

const applySchema = z.object({
  message: z.string().max(1000).optional(),
});

// POST /api/campaigns/[id]/apply - Apply to a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const user = await requireRole('CREATOR');
    const body = await request.json();
    const validated = applySchema.parse(body);

    // Check if campaign exists and is active
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Campaign is not accepting applications' }, { status: 400 });
    }

    // Check if already applied
    const existingApplication = await db.campaignApplication.findUnique({
      where: {
        campaignId_creatorId: {
          campaignId,
          creatorId: user.id,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'Already applied to this campaign', application: existingApplication },
        { status: 400 }
      );
    }

    // Create application
    const application = await db.campaignApplication.create({
      data: {
        campaignId,
        creatorId: user.id,
        message: validated.message,
        status: 'PENDING',
      },
      include: {
        campaign: {
          select: { id: true, title: true, advertiserId: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify advertiser about new application
    try {
      await notifyCreatorApplied({
        userId: application.campaign.advertiserId,
        campaignId: campaignId,
        campaignName: application.campaign.title,
        creatorId: user.id,
      });
    } catch (notifyError) {
      console.error('Failed to send application notification:', notifyError);
    }

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error('Error applying to campaign:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to apply to campaign' }, { status: 500 });
  }
}
