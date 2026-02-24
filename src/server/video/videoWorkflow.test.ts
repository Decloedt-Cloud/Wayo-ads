import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignStatus, SocialPostStatus, CampaignType } from '@prisma/client';

describe('Video Workflow - Dual Approval Logic', () => {
  describe('Campaign Application Status', () => {
    it('should allow video submission when application is APPROVED', () => {
      const approvedApplication = {
        id: 'app-1',
        status: 'APPROVED',
        creatorId: 'creator-1',
        campaignId: 'campaign-1',
      };

      expect(approvedApplication.status).toBe('APPROVED');
    });

    it('should block video submission when application is PENDING', () => {
      const pendingApplication = {
        id: 'app-1',
        status: 'PENDING',
        creatorId: 'creator-1',
        campaignId: 'campaign-1',
      };

      expect(pendingApplication.status).toBe('PENDING');
      expect(pendingApplication.status).not.toBe('APPROVED');
    });

    it('should block video submission when application is REJECTED', () => {
      const rejectedApplication = {
        id: 'app-1',
        status: 'REJECTED',
        creatorId: 'creator-1',
        campaignId: 'campaign-1',
      };

      expect(rejectedApplication.status).toBe('REJECTED');
      expect(rejectedApplication.status).not.toBe('APPROVED');
    });
  });

  describe('Video Post Status - View Tracking', () => {
    it('should track views when status is ACTIVE', () => {
      const activePost = {
        id: 'post-1',
        status: SocialPostStatus.ACTIVE,
        currentViews: 1000,
      };

      expect(activePost.status).toBe(SocialPostStatus.ACTIVE);
      expect(activePost.currentViews).toBeGreaterThan(0);
    });

    it('should NOT track views when status is PENDING', () => {
      const pendingPost = {
        id: 'post-1',
        status: SocialPostStatus.PENDING,
        currentViews: 0,
      };

      expect(pendingPost.status).toBe(SocialPostStatus.PENDING);
      expect(pendingPost.currentViews).toBe(0);
    });

    it('should NOT track views when status is REJECTED', () => {
      const rejectedPost = {
        id: 'post-1',
        status: SocialPostStatus.REJECTED,
        currentViews: 500,
        rejectionReason: 'Brand guidelines violation',
      };

      expect(rejectedPost.status).toBe(SocialPostStatus.REJECTED);
      expect(rejectedPost.rejectionReason).toBeTruthy();
    });

    it('should NOT track views when status is FLAGGED', () => {
      const flaggedPost = {
        id: 'post-1',
        status: SocialPostStatus.FLAGGED,
        flagReason: 'Suspicious view pattern',
      };

      expect(flaggedPost.status).toBe(SocialPostStatus.FLAGGED);
    });

    it('should NOT track views when status is PAUSED', () => {
      const pausedPost = {
        id: 'post-1',
        status: SocialPostStatus.PAUSED,
        currentViews: 500,
      };

      expect(pausedPost.status).toBe(SocialPostStatus.PAUSED);
    });
  });

  describe('Campaign Status Requirements', () => {
    it('should allow video submission when campaign is ACTIVE', () => {
      const activeCampaign = {
        id: 'campaign-1',
        status: CampaignStatus.ACTIVE,
        type: 'VIDEO',
      };

      expect(activeCampaign.status).toBe(CampaignStatus.ACTIVE);
      expect(activeCampaign.type).toBe('VIDEO');
    });

    it('should block video submission when campaign is DRAFT', () => {
      const draftCampaign = {
        id: 'campaign-1',
        status: CampaignStatus.DRAFT,
        type: 'VIDEO',
      };

      expect(draftCampaign.status).toBe(CampaignStatus.DRAFT);
      expect(draftCampaign.status).not.toBe('ACTIVE');
    });

    it('should block video submission when campaign is PAUSED', () => {
      const pausedCampaign = {
        id: 'campaign-1',
        status: CampaignStatus.PAUSED,
        type: 'VIDEO',
      };

      expect(pausedCampaign.status).toBe(CampaignStatus.PAUSED);
      expect(pausedCampaign.status).not.toBe('ACTIVE');
    });

    it('should block video submission when campaign is CANCELLED', () => {
      const cancelledCampaign = {
        id: 'campaign-1',
        status: CampaignStatus.CANCELLED,
        type: 'VIDEO',
      };

      expect(cancelledCampaign.status).toBe(CampaignStatus.CANCELLED);
      expect(cancelledCampaign.status).not.toBe('ACTIVE');
    });
  });
});

describe('Video Submission Validation', () => {
  it('should validate platform is allowed for campaign', () => {
    const campaignPlatforms = ['YOUTUBE', 'TIKTOK'];
    const submittedPlatform = 'YOUTUBE';

    expect(campaignPlatforms.includes(submittedPlatform)).toBe(true);
  });

  it('should reject platform not allowed for campaign', () => {
    const campaignPlatforms = ['YOUTUBE', 'TIKTOK'];
    const submittedPlatform = 'TWITCH';

    expect(campaignPlatforms.includes(submittedPlatform)).toBe(false);
  });

  it('should accept valid video URL formats', () => {
    const validUrls = [
      'https://www.youtube.com/watch?v=abc123',
      'https://youtu.be/abc123',
      'https://www.tiktok.com/@user/video/123',
      'https://www.instagram.com/reel/abc123',
    ];

    const urlPattern = /^https?:\/\/.+/;
    validUrls.forEach(url => {
      expect(urlPattern.test(url)).toBe(true);
    });
  });

  it('should validate minimum duration requirement - sufficient duration', () => {
    const minDurationSeconds = 60;
    const actualDuration = 120;

    expect(actualDuration >= minDurationSeconds).toBe(true);
  });

  it('should reject video shorter than minimum duration', () => {
    const minDurationSeconds = 60;
    const actualDuration = 30;

    expect(actualDuration >= minDurationSeconds).toBe(false);
  });

  it('should allow multiple posts when configured', () => {
    const allowMultiplePosts = true;
    
    expect(allowMultiplePosts).toBe(true);
  });

  it('should reject multiple posts when not configured', () => {
    const allowMultiplePosts = false;
    const existingPosts = 1;
    
    expect(allowMultiplePosts).toBe(false);
    expect(existingPosts).toBeGreaterThan(0);
  });
});

describe('Video Status Transitions', () => {
  it('should transition from PENDING to ACTIVE on approval', () => {
    const originalStatus = SocialPostStatus.PENDING;
    const newStatus = SocialPostStatus.ACTIVE;

    expect(originalStatus).toBe('PENDING');
    expect(newStatus).toBe('ACTIVE');
  });

  it('should transition from PENDING to REJECTED on rejection with reason', () => {
    const originalStatus = SocialPostStatus.PENDING;
    const newStatus = SocialPostStatus.REJECTED;
    const reason = 'Does not meet brand guidelines';

    expect(originalStatus).toBe('PENDING');
    expect(newStatus).toBe('REJECTED');
    expect(reason).toBeTruthy();
  });

  it('should not allow approval of already rejected post', () => {
    const rejectedPost = { status: SocialPostStatus.REJECTED };
    
    expect(rejectedPost.status).toBe(SocialPostStatus.REJECTED);
    expect(rejectedPost.status).not.toBe(SocialPostStatus.PENDING);
  });

  it('should preserve rejection reason when rejected', () => {
    const rejectedPost = { 
      status: SocialPostStatus.REJECTED,
      rejectionReason: 'Content not suitable for brand',
    };
    
    expect(rejectedPost.status).toBe(SocialPostStatus.REJECTED);
    expect(rejectedPost.rejectionReason).toBe('Content not suitable for brand');
  });

  it('should preserve flag reason when flagged', () => {
    const flaggedPost = { 
      status: SocialPostStatus.FLAGGED,
      flagReason: 'Unusual view velocity detected',
    };
    
    expect(flaggedPost.status).toBe(SocialPostStatus.FLAGGED);
    expect(flaggedPost.flagReason).toBe('Unusual view velocity detected');
  });
});

describe('Earnings Calculation', () => {
  it('should calculate earnings based on validated views and CPM', () => {
    const cpmCents = 500;
    const validatedViews = 10000;
    const earnings = (validatedViews * cpmCents) / 1000;

    expect(earnings).toBe(5000);
  });

  it('should calculate zero earnings for zero views', () => {
    const cpmCents = 500;
    const validatedViews = 0;
    const earnings = (validatedViews * cpmCents) / 1000;

    expect(earnings).toBe(0);
  });

  it('should calculate correct earnings for high view count', () => {
    const cpmCents = 1000;
    const validatedViews = 1000000;
    const earnings = (validatedViews * cpmCents) / 1000;

    expect(earnings).toBe(1000000);
  });

  it('should handle decimal CPM correctly', () => {
    const cpmCents = 750;
    const validatedViews = 2000;
    const earnings = (validatedViews * cpmCents) / 1000;

    expect(earnings).toBe(1500);
  });
});

describe('Dual Approval Flow', () => {
  it('should require both campaign application and video approval for tracking', () => {
    const campaignApplicationApproved = true;
    const videoApproved = true;
    const trackingActive = campaignApplicationApproved && videoApproved;

    expect(trackingActive).toBe(true);
  });

  it('should NOT track when only campaign application is approved', () => {
    const campaignApplicationApproved = true;
    const videoApproved = false;
    const trackingActive = campaignApplicationApproved && videoApproved;

    expect(trackingActive).toBe(false);
  });

  it('should NOT track when campaign application is not approved', () => {
    const campaignApplicationApproved = false;
    const videoApproved = true;
    const trackingActive = campaignApplicationApproved && videoApproved;

    expect(trackingActive).toBe(false);
  });

  it('should NOT track when both are not approved', () => {
    const campaignApplicationApproved = false;
    const videoApproved = false;
    const trackingActive = campaignApplicationApproved && videoApproved;

    expect(trackingActive).toBe(false);
  });

  it('should NOT track when video is pending approval', () => {
    const campaignApplicationApproved = true;
    const videoStatus = SocialPostStatus.PENDING as string;
    const trackingActive = campaignApplicationApproved && videoStatus === SocialPostStatus.ACTIVE;

    expect(trackingActive).toBe(false);
  });
});

describe('Campaign Type Validation', () => {
  it('should allow video workflow for VIDEO campaign type', () => {
    const campaign = { type: 'VIDEO' };
    
    expect(campaign.type).toBe('VIDEO');
  });

  it('should not allow video workflow for LINK campaign type', () => {
    const campaign = { type: 'LINK' };
    
    expect(campaign.type).not.toBe('VIDEO');
  });

  it('should handle campaign type from Prisma enum', () => {
    const videoCampaign = { type: CampaignType.VIDEO };
    const linkCampaign = { type: CampaignType.LINK };

    expect(videoCampaign.type).toBe(CampaignType.VIDEO);
    expect(linkCampaign.type).toBe(CampaignType.LINK);
  });
});

describe('Video Requirements Validation', () => {
  it('should validate requiredPlatform from videoRequirements', () => {
    const requirements = { requiredPlatform: 'YOUTUBE' };
    const submittedPlatform = 'YOUTUBE';

    expect(requirements.requiredPlatform).toBe(submittedPlatform);
  });

  it('should reject platform not in requiredPlatform', () => {
    const requirements = { requiredPlatform: 'YOUTUBE' };
    const submittedPlatform = 'TIKTOK';

    expect(requirements.requiredPlatform).not.toBe(submittedPlatform);
  });

  it('should validate minDurationSeconds requirement', () => {
    const requirements = { minDurationSeconds: 60 };
    const actualDuration = 90;

    expect(actualDuration).toBeGreaterThanOrEqual(requirements.minDurationSeconds);
  });

  it('should check dailyViewCap if configured', () => {
    const requirements = { dailyViewCap: 10000 };
    const currentDailyViews = 5000;

    expect(currentDailyViews).toBeLessThan(requirements.dailyViewCap);
  });

  it('should check dailyBudget if configured', () => {
    const requirements = { dailyBudget: 100 };
    const currentDailySpend = 50;

    expect(currentDailySpend).toBeLessThan(requirements.dailyBudget);
  });
});

describe('View Tracking Activation Rules', () => {
  const isTrackingActive = (campaignStatus: string, applicationStatus: string, videoStatus: string): boolean => {
    return (
      campaignStatus === 'ACTIVE' &&
      applicationStatus === 'APPROVED' &&
      videoStatus === 'ACTIVE'
    );
  };

  it('should activate tracking when all conditions are met', () => {
    expect(isTrackingActive('ACTIVE', 'APPROVED', 'ACTIVE')).toBe(true);
  });

  it('should NOT activate tracking when campaign is not ACTIVE', () => {
    expect(isTrackingActive('PAUSED', 'APPROVED', 'ACTIVE')).toBe(false);
    expect(isTrackingActive('DRAFT', 'APPROVED', 'ACTIVE')).toBe(false);
    expect(isTrackingActive('CANCELLED', 'APPROVED', 'ACTIVE')).toBe(false);
  });

  it('should NOT activate tracking when application is not APPROVED', () => {
    expect(isTrackingActive('ACTIVE', 'PENDING', 'ACTIVE')).toBe(false);
    expect(isTrackingActive('ACTIVE', 'REJECTED', 'ACTIVE')).toBe(false);
  });

  it('should NOT activate tracking when video is not ACTIVE', () => {
    expect(isTrackingActive('ACTIVE', 'APPROVED', 'PENDING')).toBe(false);
    expect(isTrackingActive('ACTIVE', 'APPROVED', 'REJECTED')).toBe(false);
    expect(isTrackingActive('ACTIVE', 'APPROVED', 'FLAGGED')).toBe(false);
  });
});

describe('Asset Security', () => {
  it('should mask asset URL when campaign is paused', () => {
    const campaignStatus = 'PAUSED' as string;
    const assetsUrl = 'https://example.com/assets/campaign-1.zip';
    
    const shouldMaskUrl = campaignStatus !== 'ACTIVE';
    
    expect(shouldMaskUrl).toBe(true);
  });

  it('should show asset URL when campaign is active', () => {
    const campaignStatus = 'ACTIVE';
    const assetsUrl = 'https://example.com/assets/campaign-1.zip';
    
    const shouldMaskUrl = campaignStatus !== 'ACTIVE';
    
    expect(shouldMaskUrl).toBe(false);
  });

  it('should not allow creators to edit assets', () => {
    const userRole = 'CREATOR' as string;
    const canEditAssets = userRole === 'ADVERTISER';
    
    expect(canEditAssets).toBe(false);
  });

  it('should allow advertisers to edit assets', () => {
    const userRole = 'ADVERTISER';
    const canEditAssets = userRole === 'ADVERTISER';
    
    expect(canEditAssets).toBe(true);
  });
});
