import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server-auth';
import { getAdvertiserVideos } from '@/server/creators';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');

    const videos = await getAdvertiserVideos(user.id, {
      campaignId: campaignId || undefined,
      status: status || undefined,
    });

    return NextResponse.json({
      success: true,
      videos,
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
