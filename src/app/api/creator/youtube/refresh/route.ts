import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { encrypt } from '@/lib/security/crypto';
import { YouTubeProvider } from '@/server/social/providers/youtubeProvider';
import { getYouTubeChannelForRefresh, updateYouTubeChannel } from '@/server/creators/youtubeRefreshService';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const channelResult = await getYouTubeChannelForRefresh(session.user.id);
    if ('error' in channelResult) {
      if (channelResult.error === 'No YouTube channel connected') {
        return NextResponse.json({ error: channelResult.error }, { status: 404 });
      }
      return NextResponse.json({ error: channelResult.error }, { status: 400 });
    }
    
    const { channel, refreshToken } = channelResult;
    
    const provider = new YouTubeProvider();
    
    let tokens;
    try {
      tokens = await provider.refreshAccessToken(refreshToken);
    } catch (refreshError) {
      console.error('[YouTube Refresh] Token refresh error:', refreshError);
      return NextResponse.json(
        { error: 'Failed to refresh token. Please reconnect your channel.' },
        { status: 401 }
      );
    }
    
    let channelStats;
    try {
      channelStats = await provider.getChannelStats(tokens.accessToken);
    } catch (statsError) {
      console.error('[YouTube Refresh] Stats fetch error:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch channel stats' },
        { status: 500 }
      );
    }
    
    let topVideos: Array<{ videoId: string; title: string; thumbnailUrl: string; viewCount: number }> = [];
    try {
      topVideos = await provider.getTopVideos(tokens.accessToken, 6);
    } catch (videosError) {
      console.error('[YouTube Refresh] Videos fetch error:', videosError);
    }
    
    await updateYouTubeChannel(channel.id, {
      channelName: channelStats.channelName,
      channelHandle: channelStats.channelHandle,
      channelAvatarUrl: channelStats.channelAvatarUrl,
      videoCount: channelStats.videoCount,
      subscriberCount: channelStats.subscriberCount,
      lifetimeViews: channelStats.lifetimeViews,
      averageViewsPerVideo: channelStats.averageViewsPerVideo,
      topVideos: topVideos,
      accessTokenEncrypted: encrypt(tokens.accessToken),
      refreshTokenEncrypted: encrypt(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
    } as any);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[YouTube Refresh] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh channel data' },
      { status: 500 }
    );
  }
}
