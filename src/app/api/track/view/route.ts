import { NextRequest, NextResponse } from 'next/server';
import { trackView, type TrackViewInput } from '@/server/tracking/trackingService';

async function getClientIp(request: NextRequest): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body: TrackViewInput = await request.json();
    const { campaignId, creatorId, linkId, visitorId, deviceFingerprint } = body;

    if (!campaignId || !creatorId || !linkId || !visitorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ip = await getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || null;

    const result = await trackView({
      campaignId,
      creatorId,
      linkId,
      visitorId,
      ip,
      userAgent,
      referrer,
      deviceFingerprint,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error tracking view:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}
