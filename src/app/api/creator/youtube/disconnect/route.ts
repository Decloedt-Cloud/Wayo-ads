import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { disconnectYouTubeChannel } from '@/server/creators/youtubeService';

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const result = await disconnectYouTubeChannel(session.user.id);
    
    if ('error' in result) {
      if (result.error === 'No YouTube channel connected') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[YouTube Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect channel' },
      { status: 500 }
    );
  }
}
