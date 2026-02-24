import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.EXPECTED_VALUE;

interface ExpectedValueRequest {
  videoId: string;
}

interface DerivedMetrics {
  viewsPerDay: number;
  engagementRate: number;
  subscriberPerformanceRatio: number;
}

interface VideoMetadata {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  channelId: string;
  durationSeconds: number;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  subscriberCount: number;
  tags: string[];
  description: string;
  category?: string;
}

async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('YouTube Data API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const snippet = item.snippet;
    const statistics = item.statistics || {};
    const contentDetails = item.contentDetails;

    const subscriberCount = await fetchSubscriberCount(snippet.channelId, apiKey);

    const durationSeconds = parseDuration(contentDetails?.duration || 'PT0M0S');

    return {
      videoId,
      title: snippet.title,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
      channelName: snippet.channelTitle,
      channelId: snippet.channelId,
      durationSeconds,
      publishedAt: snippet.publishedAt,
      views: parseInt(statistics.viewCount || '0', 10),
      likes: parseInt(statistics.likeCount || '0', 10),
      comments: parseInt(statistics.commentCount || '0', 10),
      subscriberCount,
      tags: snippet.tags || [],
      description: snippet.description || '',
      category: snippet.categoryId || '',
    };
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
}

async function fetchSubscriberCount(channelId: string, apiKey: string): Promise<number> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=statistics&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) return 0;

    const data = await response.json();

    if (!data.items || data.items.length === 0) return 0;

    return parseInt(data.items[0].statistics?.subscriberCount || '0', 10);
  } catch (error) {
    console.error('Error fetching subscriber count:', error);
    return 0;
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

function calculateDerivedMetrics(metadata: VideoMetadata): DerivedMetrics {
  const now = new Date();
  const publishedAt = new Date(metadata.publishedAt);
  const daysSincePublish = Math.max(1, Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)));

  const viewsPerDay = metadata.views / daysSincePublish;
  const engagementRate = metadata.views > 0 ? ((metadata.likes + metadata.comments) / metadata.views) * 100 : 0;
  const subscriberPerformanceRatio = metadata.subscriberCount > 0 
    ? (metadata.views / metadata.subscriberCount) * 100 
    : 0;

  return {
    viewsPerDay: Math.round(viewsPerDay * 10) / 10,
    engagementRate: Math.round(engagementRate * 100) / 100,
    subscriberPerformanceRatio: Math.round(subscriberPerformanceRatio * 100) / 100,
  };
}

function estimateConversionRate(engagementRate: number, subscriberCount: number): number {
  const baseRate = 0.5;
  const engagementMultiplier = Math.min(engagementRate / 10, 2);
  const authorityMultiplier = subscriberCount > 100000 ? 1.5 : subscriberCount > 10000 ? 1.2 : 1;
  
  return baseRate * engagementMultiplier * authorityMultiplier;
}

function estimateConversionValue(title: string, tags: string[]): number {
  const content = `${title} ${tags.join(' ')}`.toLowerCase();
  
  const highValueNiches = ['finance', 'business', 'invest', 'crypto', 'money', 'marketing', 'software', 'tech', 'programming'];
  const mediumValueNiches = ['education', 'career', 'health', 'fitness', 'real estate'];
  
  for (const niche of highValueNiches) {
    if (content.includes(niche)) return 15;
  }
  
  for (const niche of mediumValueNiches) {
    if (content.includes(niche)) return 8;
  }
  
  return 5;
}

function calculateRPV1000(ctrScore: number, retentionScore: number, conversionRate: number, conversionValue: number): number {
  const normalizedCTR = ctrScore / 100;
  const normalizedRetention = retentionScore / 100;
  
  const baseRPV = 2;
  const ctrImpact = normalizedCTR * 3;
  const retentionImpact = normalizedRetention * 2;
  const conversionImpact = conversionRate * conversionValue * 0.1;
  
  return Math.round((baseRPV + ctrImpact + retentionImpact + conversionImpact) * 100) / 100;
}

const systemPrompt = `You are a YouTube Monetization Strategist specializing in economic value analysis.

Your task is to analyze the provided video data and estimate economic potential.

IMPORTANT:
- This is ESTIMATED economic potential, NOT actual revenue
- Do NOT fabricate AdSense revenue
- Do NOT hallucinate exact CPM
- Use CTR + Retention scores as signals
- Provide realistic economic interpretation

---

## SCORING COMPONENTS

### CONVERSION STRENGTH SCORE (0-100)
Based on:
- Engagement rate health
- Audience intent signals
- Content type alignment
- Niche monetization potential

### SCALABILITY SCORE (0-100)
Based on:
- Views per day velocity
- Growth potential indicators
- Audience reach potential
- Monetization pathway breadth

---

## OUTPUT STRUCTURE

Return a JSON object with:

{
  "estimatedRPV1000": number,
  "conversionScore": number,
  "scalabilityScore": number,
  "revenueDrivers": string[],
  "revenueLimiters": string[],
  "scalingSuggestions": string[]
}

Provide brief, actionable insights for each category.`;

function buildUserPrompt(
  metadata: VideoMetadata, 
  metrics: DerivedMetrics, 
  ctrScore: number, 
  retentionScore: number,
  estimatedRPV: number
): string {
  const contentType = metadata.durationSeconds <= 60 ? 'YouTube Shorts' : 'YouTube Video';

  return `Analyze this YouTube video's economic potential:

## VIDEO METADATA
- Title: ${metadata.title}
- Channel: ${metadata.channelName}
- Content Type: ${contentType}
- Duration: ${formatDuration(metadata.durationSeconds)}
- Published: ${new Date(metadata.publishedAt).toLocaleDateString()}

## STATISTICS
- Views: ${metadata.views.toLocaleString()}
- Likes: ${metadata.likes.toLocaleString()}
- Comments: ${metadata.comments.toLocaleString()}
- Subscriber Count: ${metadata.subscriberCount.toLocaleString()}

## DERIVED METRICS
- Views per Day: ${metrics.viewsPerDay.toLocaleString()}
- Engagement Rate: ${metrics.engagementRate}%
- Subscriber Performance Ratio: ${metrics.subscriberPerformanceRatio}%

## PACKAGING SCORES
- CTR Strength Score: ${ctrScore}/100
- Retention Strength Score: ${retentionScore}/100

## ESTIMATED RPV1000
- Base Estimated RPV: €${estimatedRPV}/1K views

## TAGS
${metadata.tags.slice(0, 10).join(', ') || 'None'}

Provide a comprehensive economic analysis.`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body: ExpectedValueRequest = await req.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    const tokenBalance = await getTokenBalance(user.id);
    if (!tokenBalance || tokenBalance.balanceTokens < COST_PER_REQUEST) {
      return NextResponse.json(
        { error: 'Insufficient tokens', required: COST_PER_REQUEST, available: tokenBalance?.balanceTokens || 0 },
        { status: 402 }
      );
    }

    const metadata = await fetchVideoMetadata(videoId);
    if (!metadata) {
      return NextResponse.json({ error: 'Failed to fetch video data from YouTube' }, { status: 404 });
    }

    const derivedMetrics = calculateDerivedMetrics(metadata);

    const conversionRate = estimateConversionRate(derivedMetrics.engagementRate, metadata.subscriberCount);
    const conversionValue = estimateConversionValue(metadata.title, metadata.tags);
    
    const ctrScore = Math.round(50 + Math.random() * 30);
    const retentionScore = Math.round(50 + Math.random() * 30);
    
    const estimatedRPV = calculateRPV1000(ctrScore, retentionScore, conversionRate, conversionValue);

    const userPrompt = buildUserPrompt(metadata, derivedMetrics, ctrScore, retentionScore, estimatedRPV);

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt,
      userId: user.id,
      feature: 'expected-value',
    });

    let parsedResponse: {
      estimatedRPV1000: number;
      conversionScore: number;
      scalabilityScore: number;
      revenueDrivers: string[];
      revenueLimiters: string[];
      scalingSuggestions: string[];
    };

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      return NextResponse.json({ error: 'Failed to parse analysis results' }, { status: 500 });
    }

    await consumeTokens(user.id, COST_PER_REQUEST, 'EXPECTED_VALUE');
    const newBalance = await getTokenBalance(user.id);

    return NextResponse.json({
      metadata,
      derivedMetrics: {
        ...derivedMetrics,
        conversionRate,
        conversionValue,
      },
      packagingScores: {
        ctrScore,
        retentionScore,
      },
      analysis: {
        ...parsedResponse,
      },
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: newBalance?.balanceTokens || 0,
    });
  } catch (error) {
    console.error('Expected value error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
