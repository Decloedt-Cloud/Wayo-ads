import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { youtubeService } from '@/server/integrations/youtubeService';
import { createPayoutQueueEntry } from '@/server/payouts/payoutService';

vi.mock('@/lib/db', () => ({
  db: {
    socialPost: {
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

vi.mock('@/server/integrations/youtubeService', () => ({
  youtubeService: {
    getVideoStatistics: vi.fn(),
    getQuotaUsage: vi.fn().mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 }),
  },
}));

vi.mock('@/server/payouts/payoutService', () => ({
  createPayoutQueueEntry: vi.fn(),
}));

const mockDb = db as any;
const mockYoutubeService = youtubeService as any;
const mockCreatePayoutQueueEntry = createPayoutQueueEntry as any;

import { POST, GET } from '@/app/api/admin/jobs/check-post-views/route';

describe('POST /api/admin/jobs/check-post-views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_JOB_SECRET = 'test-admin-secret';
  });

  it('should return 401 if unauthorized', async () => {
    const request = new Request('http://localhost:3000/api/admin/jobs/check-post-views', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    
    expect(response.status).toBe(401);
  });

  it('should return 503 if quota exceeded', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 9000, limit: 10000, percentUsed: 90 });

    const request = new Request('http://localhost:3000/api/admin/jobs/check-post-views', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('quota exceeded');
  });

  it('should process active YouTube posts and create snapshots', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 });
    mockYoutubeService.getVideoStatistics.mockResolvedValue({
      viewCount: 1500,
      likeCount: 100,
      commentCount: 50,
    });

    mockDb.socialPost.findMany.mockResolvedValue([{
      id: 'post-1',
      externalPostId: 'dQw4w9WgXcQ',
      platform: 'YOUTUBE',
      status: 'ACTIVE',
      currentViews: 1000,
      lastCheckedViews: 1000,
      trustScore: 70,
      cpmCents: 500,
      dailyCap: null,
      campaignApplication: {
        campaign: { id: 'campaign-1', title: 'Test Campaign', dailyBudgetCents: null },
        creator: { id: 'creator-1' },
      },
    }]);

    mockDb.postViewSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
    mockDb.socialPost.update.mockResolvedValue({});
    mockCreatePayoutQueueEntry.mockResolvedValue({ success: true, payoutQueueId: 'pq-1' });
    mockDb.postViewSnapshot.update.mockResolvedValue({});

    const request = new Request('http://localhost:3000/api/admin/jobs/check-post-views', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processed).toBe(1);
    expect(data.validatedDeltas).toBe(1);
    expect(mockDb.postViewSnapshot.create).toHaveBeenCalled();
  });

  it('should flag post if delta exceeds 300%', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 });
    mockYoutubeService.getVideoStatistics.mockResolvedValue({
      viewCount: 5000,
      likeCount: 100,
      commentCount: 50,
    });

    mockDb.socialPost.findMany.mockResolvedValue([{
      id: 'post-1',
      externalPostId: 'dQw4w9WgXcQ',
      platform: 'YOUTUBE',
      status: 'ACTIVE',
      currentViews: 1000,
      lastCheckedViews: 1000,
      trustScore: 70,
      cpmCents: 500,
      dailyCap: null,
      campaignApplication: {
        campaign: { id: 'campaign-1', title: 'Test Campaign', dailyBudgetCents: null },
        creator: { id: 'creator-1' },
      },
    }]);

    mockDb.postViewSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
    mockDb.socialPost.update.mockResolvedValue({});

    const request = new Request('http://localhost:3000/api/admin/jobs/check-post-views', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.flaggedPosts).toBe(1);
    expect(mockDb.socialPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'post-1' },
        data: expect.objectContaining({ status: 'FLAGGED' }),
      })
    );
  });

  it('should skip posts with no view growth', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 });
    mockYoutubeService.getVideoStatistics.mockResolvedValue({
      viewCount: 1000,
      likeCount: 100,
      commentCount: 50,
    });

    mockDb.socialPost.findMany.mockResolvedValue([{
      id: 'post-1',
      externalPostId: 'dQw4w9WgXcQ',
      platform: 'YOUTUBE',
      status: 'ACTIVE',
      currentViews: 1000,
      lastCheckedViews: 1000,
      trustScore: 70,
      cpmCents: 500,
      dailyCap: null,
      campaignApplication: {
        campaign: { id: 'campaign-1', title: 'Test Campaign', dailyBudgetCents: null },
        creator: { id: 'creator-1' },
      },
    }]);

    mockDb.postViewSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
    mockDb.socialPost.update.mockResolvedValue({});

    const request = new Request('http://localhost:3000/api/admin/jobs/check-post-views', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.validatedDeltas).toBe(0);
    expect(mockCreatePayoutQueueEntry).not.toHaveBeenCalled();
  });

  it('should apply trust score multiplier to payout', async () => {
    mockYoutubeService.getQuotaUsage.mockReturnValue({ used: 1000, limit: 10000, percentUsed: 10 });
    mockYoutubeService.getVideoStatistics.mockResolvedValue({
      viewCount: 1200,
      likeCount: 100,
      commentCount: 50,
    });

    mockDb.socialPost.findMany.mockResolvedValue([{
      id: 'post-1',
      externalPostId: 'dQw4w9WgXcQ',
      platform: 'YOUTUBE',
      status: 'ACTIVE',
      currentViews: 1000,
      lastCheckedViews: 1000,
      trustScore: 50,
      cpmCents: 500,
      dailyCap: null,
      campaignApplication: {
        campaign: { id: 'campaign-1', title: 'Test Campaign', dailyBudgetCents: null },
        creator: { id: 'creator-1' },
      },
    }]);

    mockDb.postViewSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
    mockDb.socialPost.update.mockResolvedValue({});
    mockCreatePayoutQueueEntry.mockResolvedValue({ success: true, payoutQueueId: 'pq-1' });
    mockDb.postViewSnapshot.update.mockResolvedValue({});

    const request = new Request('http://localhost:3000/api/admin/jobs/check-post-views', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-admin-secret' },
    });

    const response = await POST(request as unknown as NextRequest);
    await response.json();

    expect(response.status).toBe(200);
    expect(mockCreatePayoutQueueEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        riskScore: 50,
      })
    );
  });
});

describe('GET /api/admin/jobs/check-post-views', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return posts by status and recent snapshots', async () => {
    mockDb.socialPost.groupBy.mockResolvedValue([
      { status: 'ACTIVE', _count: 5 },
      { status: 'PAUSED', _count: 2 },
      { status: 'FLAGGED', _count: 1 },
    ]);

    mockDb.postViewSnapshot.findMany.mockResolvedValue([
      { id: 'snapshot-1', viewCount: 1500, checkedAt: new Date(), socialPost: { id: 'post-1', title: 'Video 1', externalPostId: 'abc' } },
    ]);

    const request = new Request('http://localhost:3000/api/admin/jobs/check-post-views');
    const response = await GET(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.postsByStatus).toHaveLength(3);
    expect(data.recentSnapshots).toHaveLength(1);
  });
});
