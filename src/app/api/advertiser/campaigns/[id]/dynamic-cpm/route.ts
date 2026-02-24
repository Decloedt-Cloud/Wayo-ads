import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DynamicCpmMode } from '@prisma/client';
import { 
  enableDynamicCpm, 
  disableDynamicCpm, 
  getCampaignDynamicCpmSettings,
  getCampaignCpmStats 
} from '@/server/pricing/dynamicCpmService';
import { verifyCampaignAccess, updateCpmBounds } from '@/server/advertisers/campaignAccessService';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const userRoles = (session.user as any).roles || [];

    const access = await verifyCampaignAccess(campaignId, session.user.id, userRoles);
    if ('error' in access) {
      if (access.error === 'Campaign not found') {
        return NextResponse.json({ error: access.error }, { status: 404 });
      }
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const settings = await getCampaignDynamicCpmSettings(campaignId);
    const stats = await getCampaignCpmStats(campaignId);
    
    return NextResponse.json({
      settings,
      stats,
    });
  } catch (error) {
    console.error('[DYNAMIC_CPM_SETTINGS] Error', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const userRoles = (session.user as any).roles || [];

    const access = await verifyCampaignAccess(campaignId, session.user.id, userRoles);
    if ('error' in access) {
      if (access.error === 'Campaign not found') {
        return NextResponse.json({ error: access.error }, { status: 404 });
      }
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const { action, minCpmCents, maxCpmCents, mode } = body;

    if (action === 'enable') {
      const result = await enableDynamicCpm(
        campaignId,
        minCpmCents,
        maxCpmCents,
        mode as DynamicCpmMode || DynamicCpmMode.AGGRESSIVE
      );
      return NextResponse.json(result);
    }

    if (action === 'disable') {
      const result = await disableDynamicCpm(campaignId);
      return NextResponse.json(result);
    }

    if (action === 'update-bounds') {
      const result = await updateCpmBounds(campaignId, minCpmCents, maxCpmCents);
      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[DYNAMIC_CPM_SETTINGS] Error', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
