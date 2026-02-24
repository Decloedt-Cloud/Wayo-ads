import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { computeCampaignFinancials, getCampaignFinancialStats } from '@/server/pricing/campaignFinancialService';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Superadmin only' }, { status: 403 });
    }

    const body = await request.json();
    const { campaignIds } = body;

    let campaigns;
    if (campaignIds && campaignIds.length > 0) {
      campaigns = await db.campaign.findMany({
        where: {
          id: { in: campaignIds },
          status: 'ACTIVE',
        },
        select: { id: true },
      });
    } else {
      campaigns = await db.campaign.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const campaign of campaigns) {
      try {
        await computeCampaignFinancials(campaign.id);
        results.success.push(campaign.id);
      } catch (error: any) {
        results.failed.push({ id: campaign.id, error: error.message });
      }
    }

    return NextResponse.json({
      processed: campaigns.length,
      success: results.success.length,
      failed: results.failed.length,
      details: results,
    });
  } catch (error) {
    console.error('[COMPUTE_CAMPAIGN_FINANCIALS] Error', error);
    return NextResponse.json({ error: 'Failed to compute campaign financials' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Superadmin only' }, { status: 403 });
    }

    const stats = await getCampaignFinancialStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[CAMPAIGN_FINANCIALS_STATS] Error', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
