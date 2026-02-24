import { YouTubeProvider } from '@/server/social/providers/youtubeProvider';
import { creatorChannelRepository } from './repositories';

export async function checkYouTubeConnection(userId: string) {
  const existingChannel = await creatorChannelRepository.findByUserIdAndPlatform(userId, 'YOUTUBE');

  if (existingChannel) {
    return { error: 'YouTube channel already connected' };
  }

  const state = Buffer.from(
    JSON.stringify({
      userId,
      timestamp: Date.now(),
    })
  ).toString('base64');

  const provider = new YouTubeProvider();
  const authUrl = provider.getAuthorizationUrl(state);

  return { authUrl };
}

export async function disconnectYouTubeChannel(userId: string) {
  const channel = await creatorChannelRepository.findByUserIdAndPlatform(userId, 'YOUTUBE');

  if (!channel) {
    return { error: 'No YouTube channel connected' };
  }

  await creatorChannelRepository.delete(channel.id);

  return { success: true };
}

export async function updateChannelVisibility(userId: string, isPublic: boolean) {
  const channel = await creatorChannelRepository.findByUserIdAndPlatform(userId, 'YOUTUBE');

  if (!channel) {
    return { error: 'No YouTube channel connected' };
  }

  await creatorChannelRepository.update(channel.id, {
    isPublic,
    updatedAt: new Date(),
  });

  return { success: true, isPublic };
}

export async function getCreatorChannel(userId: string) {
  const channel = await creatorChannelRepository.findByUserIdAndPlatform(userId, 'YOUTUBE');

  if (!channel) {
    return { channel: null };
  }

  return {
    channel: {
      id: channel.id,
      channelName: channel.channelName,
      channelHandle: channel.channelHandle,
      channelAvatarUrl: channel.channelAvatarUrl,
      videoCount: channel.videoCount,
      subscriberCount: channel.subscriberCount,
      lifetimeViews: channel.lifetimeViews,
      averageViewsPerVideo: channel.averageViewsPerVideo,
      topVideos: channel.topVideos as Array<{ videoId: string; title: string; thumbnailUrl: string; viewCount: number }> | null,
      isPublic: channel.isPublic,
      platform: channel.platform,
    },
  };
}
