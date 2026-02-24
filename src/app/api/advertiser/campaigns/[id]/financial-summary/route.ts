import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { computeCampaignFinancials } from '@/server/pricing/campaignFinancialService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;

    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { advertiserId: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const userRoles = (session.user as any).roles || [];
    const isOwner = campaign.advertiserId === session.user.id;
    const isAdmin = userRoles.includes('SUPERADMIN');

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const summary = await computeCampaignFinancials(campaignId);
    
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[CAMPAIGN_FINANCIAL_SUMMARY] Error', error);
    return NextResponse.json({ error: 'Failed to fetch financial summary' }, { status: 500 });
  }
}
