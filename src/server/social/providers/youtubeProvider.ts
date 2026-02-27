import { SocialPlatform } from '@prisma/client';

export interface ChannelStats {
  channelId: string;
  channelName: string;
  channelHandle: string | null;
  channelAvatarUrl: string | null;
  videoCount: number;
  subscriberCount: number;
  lifetimeViews: number;
  averageViewsPerVideo: number;
}

export interface TopVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  viewCount: number;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface OAuthProvider {
  platform: SocialPlatform;
  getAuthorizationUrl(state: string, pkce?: { codeChallenge: string; codeChallengeMethod: string }): string;
  exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<OAuthTokens>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  getChannelStats(accessToken: string): Promise<ChannelStats>;
  getTopVideos(accessToken: string, maxResults?: number): Promise<TopVideo[]>;
}

export interface YouTubeTokensResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      customUrl: string;
      thumbnails: {
        high: {
          url: string;
        };
        default: {
          url: string;
        };
      };
    };
    statistics: {
      videoCount: string;
      subscriberCount: string;
      viewCount: string;
    };
  }>;
}

export class YouTubeProvider implements OAuthProvider {
  platform: SocialPlatform = 'YOUTUBE';
  
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];
  
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.YOUTUBE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/creator/youtube/callback`;
    this.scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
    ];
  }
  
  getAuthorizationUrl(state: string, pkce?: { codeChallenge: string; codeChallengeMethod: string }): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    if (pkce) {
      params.set('code_challenge', pkce.codeChallenge);
      params.set('code_challenge_method', pkce.codeChallengeMethod);
    }
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  
  async exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const body: Record<string, string> = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
    
    const data: YouTubeTokensResponse = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
  
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }
  
  async getChannelStats(accessToken: string): Promise<ChannelStats> {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch channel stats: ${error}`);
    }
    
    const data: YouTubeChannelResponse = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('No YouTube channel found for this account');
    }
    
    const channel = data.items[0];
    const videoCount = parseInt(channel.statistics.videoCount, 10);
    const lifetimeViews = parseInt(channel.statistics.viewCount, 10);
    const averageViewsPerVideo = videoCount > 0 ? Math.round(lifetimeViews / videoCount) : 0;
    
    return {
      channelId: channel.id,
      channelName: channel.snippet.title,
      channelHandle: channel.snippet.customUrl || null,
      channelAvatarUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url || null,
      videoCount,
      subscriberCount: parseInt(channel.statistics.subscriberCount, 10),
      lifetimeViews,
      averageViewsPerVideo,
    };
  }
  
  async getTopVideos(accessToken: string, maxResults: number = 6): Promise<TopVideo[]> {
    const channelId = await this.getMyChannelId(accessToken);
    
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!channelResponse.ok) {
      throw new Error('Failed to get channel content details');
    }
    
    const channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      return [];
    }
    
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!playlistResponse.ok) {
      return [];
    }
    
    const playlistData = await playlistResponse.json();
    
    if (!playlistData.items || playlistData.items.length === 0) {
      return [];
    }
    
    return playlistData.items.map((item: any) => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
      viewCount: 0,
    }));
  }
  
  private async getMyChannelId(accessToken: string): Promise<string> {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to get channel ID');
    }
    
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('No channel found');
    }
    
    return data.items[0].id;
  }
}

export function createProvider(platform: SocialPlatform): OAuthProvider {
  switch (platform) {
    case 'YOUTUBE':
      return new YouTubeProvider();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
