import { describe, it, expect } from 'vitest';

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  durationSeconds: number | null;
  videoType: 'VIDEO' | 'SHORT';
  publishedAt: string;
  viewCount: string | null;
  likeCount: string | null;
  commentCount: string | null;
  tags: string[];
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViewCount(count: string | null): string {
  if (!count) return 'N/A';
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return count;
}

function formatLikeCount(count: string | null): string {
  if (!count) return 'N/A';
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return count;
}

function formatCommentCount(count: string | null): string {
  if (!count) return 'N/A';
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return count;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function generatePatternTags(video: YouTubeVideo): string[] {
  const tags: string[] = [];
  const title = video.title.toLowerCase();
  const viewCount = parseInt(video.viewCount || '0');
  const likeCount = parseInt(video.likeCount || '0');
  
  if (viewCount > 1000000) tags.push('viral');
  else if (viewCount > 100000) tags.push('trending');
  
  if (likeCount > 0 && viewCount > 0) {
    const likeRatio = likeCount / viewCount;
    if (likeRatio > 0.1) tags.push('highEngagement');
  }
  
  if (title.includes('how to') || title.includes('tutorial') || title.includes('learn')) {
    tags.push('educational');
  }
  if (title.includes('secret') || title.includes('hidden') || title.includes('never')) {
    tags.push('curiosityHook');
  }
  if (title.includes('worst') || title.includes('never') || title.includes('stop')) {
    tags.push('painPoint');
  }
  if (title.includes('!') || title.includes('??') || title.includes('wait')) {
    tags.push('strongHook');
  }
  if (title.includes('story') || title.includes('my') || title.includes('i ')) {
    tags.push('storyFormat');
  }
  if (video.videoType === 'SHORT') {
    tags.push('Shorts');
  }
  
  return tags.slice(0, 3);
}

function generateInsights(video: YouTubeVideo): string[] {
  const insights: string[] = [];
  const title = video.title.toLowerCase();
  const viewCount = parseInt(video.viewCount || '0');
  const likeCount = parseInt(video.likeCount || '0');
  
  if (viewCount > 1000000) {
    insights.push('Viral content with over 1M views');
  } else if (viewCount > 100000) {
    insights.push('Trending content with significant reach');
  }
  
  if (likeCount > 0 && viewCount > 0) {
    const likeRatio = likeCount / viewCount;
    if (likeRatio > 0.1) {
      insights.push('High engagement rate');
    }
  }
  
  if (title.includes('how to') || title.includes('tutorial')) {
    insights.push('Educational content format');
  }
  if (title.includes('secret') || title.includes('hidden')) {
    insights.push('Curiosity-driven title');
  }
  
  return insights;
}

describe('Video Research Utility Functions', () => {
  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(0)).toBe('N/A');
      expect(formatDuration(null)).toBe('N/A');
      expect(formatDuration(0 as unknown as null)).toBe('N/A');
    });

    it('should pad seconds with zero', () => {
      expect(formatDuration(61)).toBe('1:01');
      expect(formatDuration(120)).toBe('2:00');
    });
  });

  describe('formatViewCount', () => {
    it('should format millions', () => {
      expect(formatViewCount('1500000')).toBe('1.5M');
      expect(formatViewCount('1000000')).toBe('1.0M');
    });

    it('should format thousands', () => {
      expect(formatViewCount('1500')).toBe('1.5K');
      expect(formatViewCount('10000')).toBe('10.0K');
    });

    it('should return N/A for null/undefined', () => {
      expect(formatViewCount(null)).toBe('N/A');
      expect(formatViewCount('' as unknown as null)).toBe('N/A');
    });

    it('should return original for small numbers', () => {
      expect(formatViewCount('500')).toBe('500');
      expect(formatViewCount('999')).toBe('999');
    });
  });

  describe('formatLikeCount', () => {
    it('should format millions', () => {
      expect(formatLikeCount('2000000')).toBe('2.0M');
    });

    it('should format thousands', () => {
      expect(formatLikeCount('5500')).toBe('5.5K');
    });

    it('should return N/A for null/undefined', () => {
      expect(formatLikeCount(null)).toBe('N/A');
      expect(formatLikeCount('' as unknown as null)).toBe('N/A');
    });
  });

  describe('formatCommentCount', () => {
    it('should format millions', () => {
      expect(formatCommentCount('1200000')).toBe('1.2M');
    });

    it('should format thousands', () => {
      expect(formatCommentCount('8500')).toBe('8.5K');
    });

    it('should return N/A for null/undefined', () => {
      expect(formatCommentCount(null)).toBe('N/A');
      expect(formatCommentCount('' as unknown as null)).toBe('N/A');
    });
  });

  describe('formatDate', () => {
    it('should return Today for current date', () => {
      const today = new Date().toISOString();
      expect(formatDate(today)).toBe('Today');
    });

    it('should return Yesterday for previous day', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      expect(formatDate(yesterday)).toBe('Yesterday');
    });

    it('should return days ago for less than a week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      expect(formatDate(threeDaysAgo)).toBe('3 days ago');
    });

    it('should return weeks ago for less than a month', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      expect(formatDate(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('should return months ago for less than a year', () => {
      const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString();
      expect(formatDate(twoMonthsAgo)).toBe('2 months ago');
    });

    it('should return years ago for more than a year', () => {
      const twoYearsAgo = new Date(Date.now() - 730 * 86400000).toISOString();
      expect(formatDate(twoYearsAgo)).toBe('2 years ago');
    });
  });

  describe('generatePatternTags', () => {
    const createVideo = (overrides: Partial<YouTubeVideo> = {}): YouTubeVideo => ({
      videoId: 'test123',
      title: 'Test Video',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      channelName: 'Test Channel',
      durationSeconds: 300,
      videoType: 'VIDEO',
      publishedAt: new Date().toISOString(),
      viewCount: '50000',
      likeCount: '5000',
      commentCount: '100',
      tags: [],
      ...overrides,
    });

    it('should return viral tag for videos with >1M views', () => {
      const video = createVideo({ viewCount: '1500000' });
      expect(generatePatternTags(video)).toContain('viral');
    });

    it('should return trending tag for videos with >100K views', () => {
      const video = createVideo({ viewCount: '150000' });
      expect(generatePatternTags(video)).toContain('trending');
    });

    it('should return highEngagement tag for high like ratio', () => {
      const video = createVideo({ viewCount: '1000', likeCount: '200' });
      expect(generatePatternTags(video)).toContain('highEngagement');
    });

    it('should return educational tag for tutorial content', () => {
      const video = createVideo({ title: 'How to learn React' });
      expect(generatePatternTags(video)).toContain('educational');
    });

    it('should return curiosityHook tag for curiosity-based titles', () => {
      const video = createVideo({ title: 'Hidden secrets of success' });
      expect(generatePatternTags(video)).toContain('curiosityHook');
    });

    it('should return painPoint tag for problem-focused titles', () => {
      const video = createVideo({ title: 'Things you should never do' });
      expect(generatePatternTags(video)).toContain('painPoint');
    });

    it('should return strongHook tag for attention-grabbing titles', () => {
      const video = createVideo({ title: 'Wait until you see this!' });
      expect(generatePatternTags(video)).toContain('strongHook');
    });

    it('should return storyFormat tag for personal story titles', () => {
      const video = createVideo({ title: 'My journey to success' });
      expect(generatePatternTags(video)).toContain('storyFormat');
    });

    it('should return Shorts tag for SHORT video type', () => {
      const video = createVideo({ videoType: 'SHORT' });
      expect(generatePatternTags(video)).toContain('Shorts');
    });

    it('should limit tags to maximum of 3', () => {
      const video = createVideo({
        viewCount: '2000000',
        likeCount: '500000',
        title: 'How to learn my hidden secrets!',
        videoType: 'SHORT',
      });
      const tags = generatePatternTags(video);
      expect(tags.length).toBeLessThanOrEqual(3);
    });

    it('should handle missing viewCount gracefully', () => {
      const video = createVideo({ viewCount: null });
      expect(generatePatternTags(video)).toEqual([]);
    });

    it('should handle missing likeCount gracefully', () => {
      const video = createVideo({ likeCount: null });
      expect(generatePatternTags(video)).toEqual([]);
    });
  });

  describe('generateInsights', () => {
    const createVideo = (overrides: Partial<YouTubeVideo> = {}): YouTubeVideo => ({
      videoId: 'test123',
      title: 'Test Video',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      channelName: 'Test Channel',
      durationSeconds: 300,
      videoType: 'VIDEO',
      publishedAt: new Date().toISOString(),
      viewCount: '50000',
      likeCount: '5000',
      commentCount: '100',
      tags: [],
      ...overrides,
    });

    it('should generate viral insight for high view count', () => {
      const video = createVideo({ viewCount: '1500000' });
      expect(generateInsights(video)).toContain('Viral content with over 1M views');
    });

    it('should generate trending insight for moderate view count', () => {
      const video = createVideo({ viewCount: '150000' });
      expect(generateInsights(video)).toContain('Trending content with significant reach');
    });

    it('should generate high engagement insight for high like ratio', () => {
      const video = createVideo({ viewCount: '1000', likeCount: '200' });
      expect(generateInsights(video)).toContain('High engagement rate');
    });

    it('should generate educational insight for tutorial content', () => {
      const video = createVideo({ title: 'How to learn React' });
      expect(generateInsights(video)).toContain('Educational content format');
    });

    it('should generate curiosity insight for curiosity-based titles', () => {
      const video = createVideo({ title: 'Hidden secrets revealed' });
      expect(generateInsights(video)).toContain('Curiosity-driven title');
    });

    it('should return empty array for generic videos', () => {
      const video = createVideo({ title: 'Random Video', viewCount: '1000', likeCount: '50' });
      expect(generateInsights(video)).toEqual([]);
    });
  });
});
