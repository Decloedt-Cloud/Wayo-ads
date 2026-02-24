import { describe, it, expect, vi, beforeEach } from 'vitest';
import { youtubeService, YouTubeVideoDetails } from './youtubeService';

const mockFetch = vi.fn();

global.fetch = mockFetch;

describe('YouTubeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YOUTUBE_API_KEY = 'test_api_key';
    process.env.YOUTUBE_API_DAILY_QUOTA_LIMIT = '10000';
  });

  describe('extractVideoId', () => {
    it('should extract video ID from standard watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(youtubeService.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from short youtu.be URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(youtubeService.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(youtubeService.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from URL with additional params', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120';
      expect(youtubeService.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/video';
      expect(youtubeService.extractVideoId(url)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(youtubeService.extractVideoId('')).toBeNull();
    });

    it('should return video ID if already in correct format', () => {
      const videoId = 'dQw4w9WgXcQ';
      expect(youtubeService.extractVideoId(videoId)).toBe('dQw4w9WgXcQ');
    });
  });

  describe('getVideoDetails', () => {
    it('should return video details for valid unlisted video', async () => {
      const mockResponse = {
        items: [{
          id: 'dQw4w9WgXcQ',
          snippet: {
            channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
            title: 'Test Video',
            description: 'Test description',
            publishedAt: '2024-01-01T00:00:00Z',
            thumbnails: {
              high: { url: 'https://example.com/thumb.jpg' }
            }
          },
          statistics: {
            viewCount: '1000',
            likeCount: '100',
            commentCount: '50'
          },
          status: {
            privacyStatus: 'unlisted',
            embeddable: true
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await youtubeService.getVideoDetails('dQw4w9WgXcQ');

      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.channelId).toBe('UC_x5XG1OV2P6uZZ5FSM9Ttw');
      expect(result.title).toBe('Test Video');
      expect(result.viewCount).toBe(1000);
      expect(result.likeCount).toBe(100);
      expect(result.commentCount).toBe(50);
      expect(result.privacyStatus).toBe('unlisted');
      expect(result.embeddable).toBe(true);
    });

    it('should throw error for non-existent video', async () => {
      const mockResponse = { items: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(youtubeService.getVideoDetails('invalid'))
        .rejects.toThrow('Video not found or has been removed');
    });

    it('should throw error for private video', async () => {
      const mockResponse = {
        items: [{
          id: 'dQw4w9WgXcQ',
          snippet: { channelId: 'UC123', title: 'Test', description: '', publishedAt: '2024-01-01', thumbnails: {} },
          statistics: {},
          status: { privacyStatus: 'private' }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(youtubeService.getVideoDetails('dQw4w9WgXcQ'))
        .rejects.toThrow('Video must be unlisted. Current status: private');
    });

    it('should throw error for public video', async () => {
      const mockResponse = {
        items: [{
          id: 'dQw4w9WgXcQ',
          snippet: { channelId: 'UC123', title: 'Test', description: '', publishedAt: '2024-01-01', thumbnails: {} },
          statistics: {},
          status: { privacyStatus: 'public' }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(youtubeService.getVideoDetails('dQw4w9WgXcQ'))
        .rejects.toThrow('Video must be unlisted. Current status: public');
    });

    it('should throw error when API returns error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Quota exceeded'
      });

      await expect(youtubeService.getVideoDetails('dQw4w9WgXcQ'))
        .rejects.toThrow('YouTube API error');
    });
  });

  describe('getVideoStatistics', () => {
    it('should return video statistics', async () => {
      const mockResponse = {
        items: [{
          id: 'dQw4w9WgXcQ',
          statistics: {
            viewCount: '5000',
            likeCount: '500',
            commentCount: '100',
            favoriteCount: '50'
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await youtubeService.getVideoStatistics('dQw4w9WgXcQ');

      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.viewCount).toBe(5000);
      expect(result.likeCount).toBe(500);
      expect(result.commentCount).toBe(100);
      expect(result.favoriteCount).toBe(50);
    });

    it('should throw error for non-existent video', async () => {
      const mockResponse = { items: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(youtubeService.getVideoStatistics('invalid'))
        .rejects.toThrow('Video not found');
    });
  });

  describe('validateVideoForCampaign', () => {
    it('should return valid for unlisted embeddable video with views', async () => {
      const mockResponse = {
        items: [{
          id: 'dQw4w9WgXcQ',
          snippet: {
            channelId: 'UC123',
            title: 'Test',
            description: '',
            publishedAt: '2024-01-01',
            thumbnails: { high: { url: 'https://example.com/thumb.jpg' } }
          },
          statistics: { viewCount: '100', likeCount: '10', commentCount: '5' },
          status: { privacyStatus: 'unlisted', embeddable: true }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await youtubeService.validateVideoForCampaign('dQw4w9WgXcQ');

      expect(result.valid).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details?.viewCount).toBe(100);
    });

    it('should return invalid for non-embeddable video', async () => {
      const mockResponse = {
        items: [{
          id: 'dQw4w9WgXcQ',
          snippet: { channelId: 'UC123', title: 'Test', description: '', publishedAt: '2024-01-01', thumbnails: {} },
          statistics: { viewCount: '100', likeCount: '10', commentCount: '5' },
          status: { privacyStatus: 'unlisted', embeddable: false }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await youtubeService.validateVideoForCampaign('dQw4w9WgXcQ');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Video is not embeddable');
    });

    it('should return invalid for video with no views', async () => {
      const mockResponse = {
        items: [{
          id: 'dQw4w9WgXcQ',
          snippet: { channelId: 'UC123', title: 'Test', description: '', publishedAt: '2024-01-01', thumbnails: {} },
          statistics: { viewCount: '0', likeCount: '0', commentCount: '0' },
          status: { privacyStatus: 'unlisted', embeddable: true }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await youtubeService.validateVideoForCampaign('dQw4w9WgXcQ');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Video has no views');
    });
  });

  describe('getQuotaUsage', () => {
    it('should return quota usage info', () => {
      const usage = youtubeService.getQuotaUsage();

      expect(usage.limit).toBe(10000);
      expect(usage.used).toBeDefined();
      expect(usage.percentUsed).toBeDefined();
    });
  });
});
