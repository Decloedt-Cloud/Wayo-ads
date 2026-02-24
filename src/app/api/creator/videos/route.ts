import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server-auth';
import { submitVideo } from '@/server/creators';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const { campaignId, youtubeUrl } = body;

    if (!campaignId || !youtubeUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, youtubeUrl' },
        { status: 400 }
      );
    }

    const result = await submitVideo({
      campaignId,
      creatorId: user.id,
      youtubeUrl,
    });

    if (!result.success) {
      if (result.error === 'Campaign not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      if (result.error === 'Video already submitted for this campaign') {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      video: result.video,
    });
  } catch (error) {
    console.error('Error submitting video:', error);
    return NextResponse.json(
      { error: 'Failed to submit video' },
      { status: 500 }
    );
  }
}
