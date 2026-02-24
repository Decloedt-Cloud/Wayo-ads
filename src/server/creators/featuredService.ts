import { creatorChannelRepository } from './repositories';

export async function getFeaturedCreators(limit = 12) {
  const channels = await creatorChannelRepository.findFeatured(limit);

  return channels.map((channel) => ({
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
  }));
}
