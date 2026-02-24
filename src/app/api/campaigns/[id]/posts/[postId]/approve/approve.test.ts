import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCampaignFindUnique = vi.fn();
const mockSocialPostUpdate = vi.fn();
const mockGetServerSession = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    campaign: {
      findUnique: mockCampaignFindUnique,
    },
    socialPost: {
      update: mockSocialPostUpdate,
    },
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

const { POST: approvePost } = await import('@/app/api/campaigns/[id]/posts/[postId]/approve/route');
const { POST: rejectPost } = await import('@/app/api/campaigns/[id]/posts/[postId]/reject/route');
import { NextRequest } from 'next/server';

describe('Content Approval API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Approve Post', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/approve', {
        method: 'POST',
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await approvePost(request, { params });
      expect(response.status).toBe(401);
    });

    it('should return 404 if campaign not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'advertiser-1' } } as any);
      mockCampaignFindUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/approve', {
        method: 'POST',
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await approvePost(request, { params });
      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not the campaign owner', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'other-advertiser' } } as any);
      mockCampaignFindUnique.mockResolvedValue({ advertiserId: 'advertiser-1' });

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/approve', {
        method: 'POST',
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await approvePost(request, { params });
      expect(response.status).toBe(403);
    });

    it('should approve post successfully', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'advertiser-1' } } as any);
      mockCampaignFindUnique.mockResolvedValue({ advertiserId: 'advertiser-1' });
      mockSocialPostUpdate.mockResolvedValue({ id: 'post-1', status: 'ACTIVE' });

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/approve', {
        method: 'POST',
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await approvePost(request, { params });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.post.status).toBe('ACTIVE');
    });
  });

  describe('Reject Post', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/reject', {
        method: 'POST',
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await rejectPost(request, { params });
      expect(response.status).toBe(401);
    });

    it('should return 404 if campaign not found', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'advertiser-1' } } as any);
      mockCampaignFindUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'test reason' }),
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await rejectPost(request, { params });
      expect(response.status).toBe(404);
    });

    it('should return 403 if user is not the campaign owner', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'other-advertiser' } } as any);
      mockCampaignFindUnique.mockResolvedValue({ advertiserId: 'advertiser-1' });

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'test reason' }),
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await rejectPost(request, { params });
      expect(response.status).toBe(403);
    });

    it('should reject post successfully with reason', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'advertiser-1' } } as any);
      mockCampaignFindUnique.mockResolvedValue({ advertiserId: 'advertiser-1' });
      mockSocialPostUpdate.mockResolvedValue({ 
        id: 'post-1', 
        status: 'REJECTED', 
        rejectionReason: 'Content does not meet guidelines' 
      });

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/reject', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Content does not meet guidelines' }),
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await rejectPost(request, { params });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.post.status).toBe('REJECTED');
      expect(data.post.rejectionReason).toBe('Content does not meet guidelines');
    });

    it('should reject post with default reason if none provided', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'advertiser-1' } } as any);
      mockCampaignFindUnique.mockResolvedValue({ advertiserId: 'advertiser-1' });
      mockSocialPostUpdate.mockResolvedValue({ 
        id: 'post-1', 
        status: 'REJECTED', 
        rejectionReason: 'Content does not meet campaign requirements' 
      });

      const request = new NextRequest('http://localhost:3000/api/campaigns/campaign-1/posts/post-1/reject', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ id: 'campaign-1', postId: 'post-1' });
      
      const response = await rejectPost(request, { params });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.post.status).toBe('REJECTED');
      expect(data.post.rejectionReason).toBe('Content does not meet campaign requirements');
    });
  });
});
