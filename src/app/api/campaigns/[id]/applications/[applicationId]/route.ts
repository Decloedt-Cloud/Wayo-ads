import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/campaigns/[id]/applications/[applicationId]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const { id: campaignId, applicationId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Verify campaign ownership
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { advertiserId: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.advertiserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update application status
    const application = await db.campaignApplication.update({
      where: { id: applicationId },
      data: { status: 'APPROVED' },
      include: {
        creator: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error approving application:', error);
    return NextResponse.json({ error: 'Failed to approve application' }, { status: 500 });
  }
}
