import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { youtubeService } from '@/server/integrations/youtubeService';

vi.mock('@/lib/db', () => ({
  db: {
    campaignApplication: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    socialPost: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    postViewSnapshot: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/server-auth', () => ({
  requireRole: vi.fn((role: string) => Promise.resolve({ id: 'creator-123', roles: [role] })),
}));

vi.mock('@/server/integrations/youtubeService', () => ({
  youtubeService: {
    extractVideoId: vi.fn((url: string) => {
      if (url.includes('invalid')) return null;
      return 'dQw4w9WgXcQ';
    }),
    validateVideoForCampaign: vi.fn(),
    getVideoDetails: vi.fn(),
    getVideoStatistics: vi.fn(),
    getQuotaUsage: vi.fn().mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 }),
  },
}));

vi.mock('@/server/payouts/payoutService', () => ({
  createPayoutQueueEntry: vi.fn(),
}));

const mockDb = db as any;
const mockYoutubeService = youtubeService as any;

import { POST, GET } from '@/app/api/creator/campaigns/[id]/submit-post/route';

describe('POST /api/creator/campaigns/[id]/submit-post', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 if no approved application found', async () => {
    mockDb.campaignApplication.findFirst.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'YOUTUBE',
        postUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
    });

    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await POST(request as unknown as NextRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('No approved application found');
  });

  it('should return 400 for invalid YouTube URL', async () => {
    mockDb.campaignApplication.findFirst.mockResolvedValue({
      id: 'app-123',
      campaignId: 'campaign-123',
      creatorId: 'creator-123',
      campaign: { id: 'campaign-123', title: 'Test Campaign', cpmCents: 500 },
    });

    mockYoutubeService.validateVideoForCampaign.mockResolvedValue({
      valid: false,
      error: 'Invalid YouTube video URL',
    });

    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'YOUTUBE',
        postUrl: 'https://invalid-url.com/video',
      }),
    });

    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await POST(request as unknown as NextRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid YouTube video URL');
  });

  it('should return 400 if video validation fails', async () => {
    mockDb.campaignApplication.findFirst.mockResolvedValue({
      id: 'app-123',
      campaignId: 'campaign-123',
      creatorId: 'creator-123',
      campaign: { id: 'campaign-123', title: 'Test Campaign', cpmCents: 500 },
    });

    mockYoutubeService.validateVideoForCampaign.mockResolvedValue({
      valid: false,
      error: 'Video is private',
    });

    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'YOUTUBE',
        postUrl: 'https://www.youtube.com/watch?v=privateVideo',
      }),
    });

    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await POST(request as unknown as NextRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Video is private');
  });

  it('should return 400 if video already submitted', async () => {
    mockDb.campaignApplication.findFirst.mockResolvedValue({
      id: 'app-123',
      campaignId: 'campaign-123',
      creatorId: 'creator-123',
      campaign: { id: 'campaign-123', title: 'Test Campaign', cpmCents: 500 },
    });

    mockYoutubeService.validateVideoForCampaign.mockResolvedValue({
      valid: true,
      details: {
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UC123',
        title: 'Test Video',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        viewCount: 1000,
        privacyStatus: 'public',
        embeddable: true,
      },
    });

    mockDb.socialPost.findFirst.mockResolvedValue({
      id: 'existing-post',
      externalPostId: 'dQw4w9WgXcQ',
    });

    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'YOUTUBE',
        postUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
    });

    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await POST(request as unknown as NextRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already been submitted');
  });

  it('should create social post for valid YouTube video', async () => {
    mockDb.campaignApplication.findFirst.mockResolvedValue({
      id: 'app-123',
      campaignId: 'campaign-123',
      creatorId: 'creator-123',
      campaign: { id: 'campaign-123', title: 'Test Campaign', cpmCents: 500 },
    });

    mockYoutubeService.validateVideoForCampaign.mockResolvedValue({
      valid: true,
      details: {
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UC123',
        title: 'Test Video',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        viewCount: 1000,
        privacyStatus: 'public',
        embeddable: true,
      },
    });

    mockDb.socialPost.findFirst.mockResolvedValue(null);
    mockDb.socialPost.create.mockResolvedValue({
      id: 'new-post-123',
      campaignApplicationId: 'app-123',
      platform: 'YOUTUBE',
      externalPostId: 'dQw4w9WgXcQ',
      channelId: 'UC123',
      title: 'Test Video',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      initialViews: 1000,
      currentViews: 1000,
      status: 'ACTIVE',
    });

    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'YOUTUBE',
        postUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
    });

    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await POST(request as unknown as NextRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.post.externalPostId).toBe('dQw4w9WgXcQ');
    expect(mockDb.socialPost.create).toHaveBeenCalled();
  });

  it('should return 501 for unsupported platform', async () => {
    mockDb.campaignApplication.findFirst.mockResolvedValue({
      id: 'app-123',
      campaignId: 'campaign-123',
      creatorId: 'creator-123',
      campaign: { id: 'campaign-123', title: 'Test Campaign', cpmCents: 500 },
    });

    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'TIKTOK',
        postUrl: 'https://tiktok.com/@user/video/123',
      }),
    });

    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await POST(request as unknown as NextRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(501);
    expect(data.error).toContain('not implemented');
  });

  it('should return 400 for invalid request body', async () => {
    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'INVALID',
      }),
    });

    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await POST(request as unknown as NextRequest, { params });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/creator/campaigns/[id]/submit-post', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 404 if application not found', async () => {
    mockDb.campaignApplication.findFirst.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post');
    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await GET(request as unknown as NextRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('Application not found');
  });

  it('should return social posts for application', async () => {
    mockDb.campaignApplication.findFirst.mockResolvedValue({
      id: 'app-123',
      campaignId: 'campaign-123',
      creatorId: 'creator-123',
    });

    mockDb.socialPost.findMany = vi.fn().mockResolvedValue([
      { id: 'post-1', externalPostId: 'video1', status: 'ACTIVE' },
      { id: 'post-2', externalPostId: 'video2', status: 'PAUSED' },
    ]);

    const request = new Request('http://localhost:3000/api/creator/campaigns/campaign-123/submit-post');
    const params = Promise.resolve({ id: 'campaign-123' });
    const response = await GET(request as unknown as NextRequest, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(2);
  });
});
