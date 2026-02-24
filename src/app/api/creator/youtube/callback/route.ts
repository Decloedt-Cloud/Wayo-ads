import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/security/crypto';
import { YouTubeProvider } from '@/server/social/providers/youtubeProvider';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('[YouTube Callback] OAuth error:', error);
      return NextResponse.redirect(new URL('/dashboard/creator?error=oauth_denied', request.url));
    }
    
    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/creator?error=missing_params', request.url));
    }
    
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.redirect(new URL('/dashboard/creator?error=invalid_state', request.url));
    }
    
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(new URL('/dashboard/creator?error=expired_state', request.url));
    }
    
    const provider = new YouTubeProvider();
    
    let tokens;
    try {
      tokens = await provider.exchangeCodeForTokens(code);
    } catch (tokenError) {
      console.error('[YouTube Callback] Token exchange error:', tokenError);
      return NextResponse.redirect(new URL('/dashboard/creator?error=token_exchange_failed', request.url));
    }
    
    let channelStats;
    try {
      channelStats = await provider.getChannelStats(tokens.accessToken);
    } catch (statsError) {
      console.error('[YouTube Callback] Stats fetch error:', statsError);
      return NextResponse.redirect(new URL('/dashboard/creator?error=stats_fetch_failed', request.url));
    }
    
    let topVideos: Array<{ videoId: string; title: string; thumbnailUrl: string; viewCount: number }> = [];
    try {
      topVideos = await provider.getTopVideos(tokens.accessToken, 6);
    } catch (videosError) {
      console.error('[YouTube Callback] Videos fetch error:', videosError);
    }
    
    const existingChannel = await db.creatorChannel.findFirst({
      where: {
        platform: 'YOUTUBE',
        channelId: channelStats.channelId,
      },
    });
    
    if (existingChannel) {
      return NextResponse.redirect(new URL('/dashboard/creator?error=channel_already_connected', request.url));
    }
    
    await db.creatorChannel.create({
      data: {
        userId: stateData.userId,
        platform: 'YOUTUBE',
        channelId: channelStats.channelId,
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
        isPublic: true,
      },
    });
    
    return NextResponse.redirect(new URL('/dashboard/creator?success=youtube_connected', request.url));
  } catch (error) {
    console.error('[YouTube Callback] Error:', error);
    return NextResponse.redirect(new URL('/dashboard/creator?error=connection_failed', request.url));
  }
}
