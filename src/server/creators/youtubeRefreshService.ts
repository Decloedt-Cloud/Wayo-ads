import { decrypt } from '@/lib/security/crypto';
import { creatorChannelRepository } from './repositories';

export async function getYouTubeChannelForRefresh(userId: string) {
  const channel = await creatorChannelRepository.findByUserIdAndPlatform(userId, 'YOUTUBE');

  if (!channel) {
    return { error: 'No YouTube channel connected' };
  }

  if (!channel.refreshTokenEncrypted) {
    return { error: 'No refresh token available' };
  }

  return { channel, refreshToken: decrypt(channel.refreshTokenEncrypted) };
}

export async function updateYouTubeChannel(channelId: string, data: {
  channelName: string;
  channelHandle: string;
  channelAvatarUrl: string;
  videoCount: number;
  subscriberCount: number;
  lifetimeViews: number;
  averageViewsPerVideo?: number;
  topVideos?: Array<{ videoId: string; title: string; thumbnailUrl: string; viewCount: number }>;
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
}) {
  return creatorChannelRepository.update(channelId, data);
}
