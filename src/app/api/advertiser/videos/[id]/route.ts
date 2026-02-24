import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server-auth';
import { updateVideoStatus } from '@/server/advertisers/videoService';

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const body = await request.json();

    const { videoId, action, rejectionReason } = body;

    if (!videoId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, action' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

    const result = await updateVideoStatus(videoId, user.id, action, rejectionReason);

    if ('error' in result) {
      if (result.error === 'Video not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      if (result.error === 'Not authorized to modify this video') {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Video update error:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}
