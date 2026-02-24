import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { youtubeService } from '@/server/integrations/youtubeService';

vi.mock('@/lib/db', () => ({
  db: {
    socialPost: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/server/integrations/youtubeService', () => ({
  youtubeService: {
    getQuotaUsage: vi.fn(),
    fetchBatchVideoStatus: vi.fn(),
  },
}));

const mockDb = db as any;
const mockYoutubeService = youtubeService as any;

import { POST, GET } from '@/app/api/admin/jobs/refresh-youtube-status/route';

describe('POST /api/admin/jobs/refresh-youtube-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_JOB_SECRET = 'test-admin-secret';
  });

  it('should return 401 if unauthorized', async () => {
    const request = new Request('http://localhost:3000/api/admin/jobs/refresh-youtube-status', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    
    expect(response.status).toBe(401);
  });

  it('should return 503 if quota exceeded', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 9000, limit: 10000, percentUsed: 90 });

    const request = new Request('http://localhost:3000/api/admin/jobs/refresh-youtube-status', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('quota exceeded');
  });

  it('should return empty message when no videos need refresh', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 });
    mockDb.socialPost.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost:3000/api/admin/jobs/refresh-youtube-status', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('No YouTube videos');
    expect(data.processed).toBe(0);
  });

  it('should update video privacy status for valid videos', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 });
    
    mockDb.socialPost.findMany.mockResolvedValue([
      {
        id: 'post-1',
        externalPostId: 'dQw4w9WgXcQ',
        platform: 'YOUTUBE',
        status: 'PENDING',
        youtubePrivacyStatus: null,
        title: 'Old Title',
        thumbnailUrl: null,
      },
    ]);

    mockYoutubeService.fetchBatchVideoStatus.mockResolvedValue(
      new Map([
        ['dQw4w9WgXcQ', {
          privacyStatus: 'unlisted',
          viewCount: 1500,
          title: 'New Title',
          thumbnail: 'https://example.com/thumb.jpg',
        }],
      ])
    );

    mockDb.socialPost.update.mockResolvedValue({});

    const request = new Request('http://localhost:3000/api/admin/jobs/refresh-youtube-status', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processed).toBe(1);
    expect(data.updated).toBe(1);
    expect(data.failed).toBe(0);

    expect(mockDb.socialPost.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: {
        youtubePrivacyStatus: 'unlisted',
        title: 'New Title',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      },
    });
  });

  it('should handle missing video data gracefully', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 });
    
    mockDb.socialPost.findMany.mockResolvedValue([
      {
        id: 'post-1',
        externalPostId: 'dQw4w9WgXcQ',
        platform: 'YOUTUBE',
        status: 'PENDING',
        youtubePrivacyStatus: null,
        title: 'My Video',
        thumbnailUrl: 'https://example.com/old-thumb.jpg',
      },
    ]);

    mockYoutubeService.fetchBatchVideoStatus.mockResolvedValue(new Map());

    const request = new Request('http://localhost:3000/api/admin/jobs/refresh-youtube-status', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processed).toBe(1);
    expect(data.updated).toBe(0);
    expect(data.failed).toBe(1);
  });

  it('should batch process multiple videos', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 });
    
    mockDb.socialPost.findMany.mockResolvedValue([
      {
        id: 'post-1',
        externalPostId: 'video1',
        platform: 'YOUTUBE',
        status: 'PENDING',
        youtubePrivacyStatus: null,
        title: 'Video 1',
        thumbnailUrl: null,
      },
      {
        id: 'post-2',
        externalPostId: 'video2',
        platform: 'YOUTUBE',
        status: 'ACTIVE',
        youtubePrivacyStatus: null,
        title: 'Video 2',
        thumbnailUrl: null,
      },
    ]);

    mockYoutubeService.fetchBatchVideoStatus.mockResolvedValue(
      new Map([
        ['video1', { privacyStatus: 'public', viewCount: 100, title: 'Title 1', thumbnail: 'thumb1.jpg' }],
        ['video2', { privacyStatus: 'unlisted', viewCount: 200, title: 'Title 2', thumbnail: 'thumb2.jpg' }],
      ])
    );

    mockDb.socialPost.update.mockResolvedValue({});

    const request = new Request('http://localhost:3000/api/admin/jobs/refresh-youtube-status', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processed).toBe(2);
    expect(data.updated).toBe(2);
  });
});

describe('GET /api/admin/jobs/refresh-youtube-status', () => {
  it('should return usage information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('YouTube Video Status Cron Job');
    expect(data.batchSize).toBe(50);
  });
});
