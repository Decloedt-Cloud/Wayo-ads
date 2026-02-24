import { SocialPlatform } from '@prisma/client';
import { campaignApplicationRepository } from '@/server/campaigns/repositories';

export interface YouTubeVideoDetails {
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  privacyStatus: 'public' | 'private' | 'unlisted';
  embeddable: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: Date;
  thumbnailUrl: string;
  durationSeconds?: number;
}

export interface YouTubeVideoStatistics {
  videoId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
}

export interface YouTubeQuotaUsage {
  used: number;
  limit: number;
  percentUsed: number;
}

export interface YouTubeVideoStatus {
  privacyStatus: 'public' | 'unlisted' | 'private';
  viewCount: number;
  title: string;
  thumbnail: string;
}

export interface ShortsValidationResult {
  isValid: boolean;
  isShort: boolean;
  durationSeconds?: number;
  isVertical?: boolean;
  error?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
}

class YouTubeService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly dailyQuotaLimit: number;
  private quotaUsed: number = 0;
  private lastQuotaReset: Date = new Date();

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    this.dailyQuotaLimit = parseInt(process.env.YOUTUBE_API_DAILY_QUOTA_LIMIT || '10000', 10);
  }

  private async checkAndResetQuota(): Promise<void> {
    const now = new Date();
    const hoursSinceReset = (now.getTime() - this.lastQuotaReset.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24) {
      this.quotaUsed = 0;
      this.lastQuotaReset = now;
    }
  }

  private calculateQuotaCost(part: string): number {
    const costs: Record<string, number> = {
      snippet: 1,
      statistics: 1,
      status: 1,
      contentDetails: 2,
    };
    return costs[part] || 1;
  }

  private async fetchWithQuota<T>(url: string, parts: string[]): Promise<T> {
    await this.checkAndResetQuota();

    const cost = parts.reduce((sum, part) => sum + this.calculateQuotaCost(part), 0);
    
    if (this.quotaUsed + cost > this.dailyQuotaLimit * 0.8) {
      throw new Error('YouTube API quota exceeded 80% threshold');
    }

    const fullUrl = `${url}&key=${this.apiKey}`;
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      const error = await response.text();
      
      if (response.status === 403 && error.includes('quotaExceeded')) {
        this.quotaUsed = this.dailyQuotaLimit;
        throw new Error('YouTube API quota exceeded');
      }
      
      throw new Error(`YouTube API error: ${response.status} - ${error}`);
    }

    this.quotaUsed += cost;
    return response.json();
  }

  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  isYoutubeShort(videoUrl: string, campaign: { shortsMaxDurationSeconds?: number; shortsRequireVertical?: boolean }): ShortsValidationResult {
    const maxDuration = campaign.shortsMaxDurationSeconds ?? 20;
    const requireVertical = campaign.shortsRequireVertical ?? true;

    if (videoUrl.includes('/shorts/')) {
      return {
        isValid: true,
        isShort: true,
      };
    }

    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) {
      return {
        isValid: false,
        isShort: false,
        error: 'Invalid YouTube URL',
      };
    }

    return {
      isValid: true,
      isShort: true,
    };
  }

  async validateYoutubeShort(videoUrl: string, campaign: { shortsMaxDurationSeconds?: number; shortsRequireVertical?: boolean }): Promise<ShortsValidationResult> {
    const maxDuration = campaign.shortsMaxDurationSeconds ?? 20;
    const requireVertical = campaign.shortsRequireVertical ?? true;

    if (videoUrl.includes('/shorts/')) {
      return {
        isValid: true,
        isShort: true,
      };
    }

    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) {
      return {
        isValid: false,
        isShort: false,
        error: 'Invalid YouTube URL',
      };
    }

    try {
      const details = await this.getVideoDetails(videoId);

      if (!details.durationSeconds) {
        return {
          isValid: false,
          isShort: false,
          error: 'Could not determine video duration',
        };
      }

      if (details.durationSeconds > maxDuration) {
        return {
          isValid: false,
          isShort: false,
          durationSeconds: details.durationSeconds,
          error: `Video duration (${details.durationSeconds}s) exceeds maximum allowed (${maxDuration}s)`,
        };
      }

      if (details.privacyStatus !== 'public' && details.privacyStatus !== 'unlisted') {
        return {
          isValid: false,
          isShort: true,
          durationSeconds: details.durationSeconds,
          privacyStatus: details.privacyStatus,
          error: `Video is ${details.privacyStatus}`,
        };
      }

      return {
        isValid: true,
        isShort: details.durationSeconds <= maxDuration,
        durationSeconds: details.durationSeconds,
        privacyStatus: details.privacyStatus,
      };
    } catch (error) {
      return {
        isValid: false,
        isShort: false,
        error: error instanceof Error ? error.message : 'Failed to validate video',
      };
    }
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  async getVideoDetails(videoId: string): Promise<YouTubeVideoDetails> {
    const url = `${this.baseUrl}/videos?part=snippet,statistics,status,contentDetails&id=${videoId}`;
    
    const data = await this.fetchWithQuota<YouTubeVideoResponse>(url, ['snippet', 'statistics', 'status', 'contentDetails']);

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found or has been removed');
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics || {};
    const status = video.status;
    const contentDetails = video.contentDetails;

    if (status.privacyStatus !== 'unlisted') {
      throw new Error(`Video must be unlisted. Current status: ${status.privacyStatus}`);
    }

    return {
      videoId: video.id,
      channelId: snippet.channelId,
      title: snippet.title,
      description: snippet.description,
      privacyStatus: status.privacyStatus as 'public' | 'private' | 'unlisted',
      embeddable: status.embeddable ?? false,
      viewCount: parseInt(statistics.viewCount || '0', 10),
      likeCount: parseInt(statistics.likeCount || '0', 10),
      commentCount: parseInt(statistics.commentCount || '0', 10),
      publishedAt: new Date(snippet.publishedAt),
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      durationSeconds: contentDetails?.duration ? this.parseDuration(contentDetails.duration) : undefined,
    };
  }

  async getVideoStatistics(videoId: string): Promise<YouTubeVideoStatistics> {
    const url = `${this.baseUrl}/videos?part=statistics&id=${videoId}`;
    
    const data = await this.fetchWithQuota<YouTubeVideoStatisticsResponse>(url, ['statistics']);

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const statistics = data.items[0].statistics;

    return {
      videoId: data.items[0].id,
      viewCount: parseInt(statistics.viewCount || '0', 10),
      likeCount: parseInt(statistics.likeCount || '0', 10),
      commentCount: parseInt(statistics.commentCount || '0', 10),
      favoriteCount: parseInt(statistics.favoriteCount || '0', 10),
    };
  }

  async fetchYoutubeVideoStatus(videoId: string): Promise<YouTubeVideoStatus> {
    const url = `${this.baseUrl}/videos?part=status,snippet,statistics&id=${videoId}`;
    
    const data = await this.fetchWithQuota<YouTubeVideoResponse>(url, ['status', 'snippet', 'statistics']);

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found or has been deleted');
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics || {};
    const status = video.status;

    return {
      privacyStatus: status.privacyStatus as 'public' | 'unlisted' | 'private',
      viewCount: parseInt(statistics.viewCount || '0', 10),
      title: snippet.title,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
    };
  }

  async validateVideoForCampaign(videoId: string): Promise<{
    valid: boolean;
    details?: YouTubeVideoDetails;
    error?: string;
  }> {
    if (!this.apiKey) {
      return {
        valid: true,
        details: {
          videoId,
          channelId: 'unknown',
          title: 'Video validation skipped (no API key)',
          description: '',
          privacyStatus: 'public',
          embeddable: true,
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          publishedAt: new Date(),
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        },
      };
    }

    try {
      const details = await this.getVideoDetails(videoId);

      if (!details.embeddable) {
        return { valid: false, error: 'Video is not embeddable' };
      }

      if (details.viewCount === 0) {
        return { valid: false, error: 'Video has no views' };
      }

      return { valid: true, details };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  getQuotaUsage(): YouTubeQuotaUsage {
    return {
      used: this.quotaUsed,
      limit: this.dailyQuotaLimit,
      percentUsed: Math.round((this.quotaUsed / this.dailyQuotaLimit) * 100),
    };
  }

  async checkVideosForCampaign(
    campaignId: string,
    maxVideos: number = 50
  ): Promise<{
    totalVideos: number;
    processed: number;
    quotaUsage: YouTubeQuotaUsage;
  }> {
    const posts = await campaignApplicationRepository.findApprovedByCampaignIdWithYouTubePosts(campaignId);

    let processed = 0;
    
    for (const application of posts) {
      for (const post of application.socialPosts) {
        if (processed >= maxVideos) break;
        
        try {
          await this.getVideoStatistics(post.externalPostId);
          processed++;
        } catch (error) {
          console.error(`Failed to check video ${post.externalPostId}:`, error);
        }
      }
    }

    return {
      totalVideos: posts.reduce((sum, app) => sum + app.socialPosts.length, 0),
      processed,
      quotaUsage: this.getQuotaUsage(),
    };
  }

  async fetchBatchVideoStatus(videoIds: string[]): Promise<Map<string, YouTubeVideoStatus>> {
    const results = new Map<string, YouTubeVideoStatus>();
    
    if (videoIds.length === 0) return results;

    const idsParam = videoIds.join(',');
    const url = `${this.baseUrl}/videos?part=status,snippet,statistics&id=${idsParam}`;
    
    try {
      const data = await this.fetchWithQuota<YouTubeVideoResponse>(url, ['status', 'snippet', 'statistics']);

      if (!data.items || data.items.length === 0) {
        return results;
      }

      for (const video of data.items) {
        const snippet = video.snippet;
        const statistics = video.statistics || {};
        const status = video.status;

        results.set(video.id, {
          privacyStatus: status.privacyStatus as 'public' | 'unlisted' | 'private',
          viewCount: parseInt(statistics.viewCount || '0', 10),
          title: snippet.title,
          thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching batch video status:', error);
    }

    return results;
  }
}

interface YouTubeVideoResponse {
  items: Array<{
    id: string;
    snippet: {
      channelId: string;
      title: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
    statistics: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    status: {
      privacyStatus: string;
      embeddable?: boolean;
    };
    contentDetails?: {
      duration: string;
    };
  }>;
}

interface YouTubeVideoStatisticsResponse {
  items: Array<{
    id: string;
    statistics: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
      favoriteCount?: string;
    };
  }>;
}

export const youtubeService = new YouTubeService();
