import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.RETENTION_AUDIT;

interface RetentionAuditRequest {
  videoId: string;
}

interface DerivedMetrics {
  viewsPerDay: number;
  engagementRate: number;
  commentToViewRatio: number;
  likeToViewRatio: number;
  subscriberPerformanceRatio: number;
  titleLength: number;
  durationClassification: 'Short-form' | 'Long-form';
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
  const commentToViewRatio = metadata.views > 0 ? (metadata.comments / metadata.views) * 100 : 0;
  const likeToViewRatio = metadata.views > 0 ? (metadata.likes / metadata.views) * 100 : 0;
  const subscriberPerformanceRatio = metadata.subscriberCount > 0 
    ? (metadata.views / metadata.subscriberCount) * 100 
    : 0;

  const durationClassification = metadata.durationSeconds <= 180 ? 'Short-form' : 'Long-form';

  return {
    viewsPerDay: Math.round(viewsPerDay * 10) / 10,
    engagementRate: Math.round(engagementRate * 100) / 100,
    commentToViewRatio: Math.round(commentToViewRatio * 100) / 100,
    likeToViewRatio: Math.round(likeToViewRatio * 100) / 100,
    subscriberPerformanceRatio: Math.round(subscriberPerformanceRatio * 100) / 100,
    titleLength: metadata.title.length,
    durationClassification,
  };
}

const systemPrompt = `You are a YouTube Retention Strategist specializing in analyzing video content retention potential.

Your task is to analyze the provided video metadata and estimate retention strength (0-100).

IMPORTANT:
- This is RETENTION STRENGTH estimation, NOT actual retention percentage
- Do NOT fabricate actual retention curves
- YouTube API does not provide retention data - do not claim it does
- Only analyze the provided metadata and derived metrics
- If description is empty, rely only on available metadata

---

## SCORING COMPONENTS

### 1. OPENING SCORE (0-100, Weight: 20%)
Analyze implied opening strength from title:
- Curiosity gap in title
- Hook potential indicators
- Promise of value/interest
- Intrigue elements

### 2. PACING SCORE (0-100, Weight: 20%)
Analyze pacing indicators:
- Duration classification relevance
- Title structure suggesting pacing
- Content type alignment
- Format optimization

### 3. CURIOSITY STRUCTURE SCORE (0-100, Weight: 20%)
Analyze curiosity elements:
- "How", "Why", "What" structures
- Problem/solution indicators
- Mystery elements
- Tease potential

### 4. PAYOFF CLARITY SCORE (0-100, Weight: 20%)
Analyze payoff clarity:
- Promise alignment indicators
- Outcome clarity in title
- Value proposition strength
- Satisfaction potential

### 5. AUTHORITY SCORE (0-100, Weight: 20%)
Analyze creator/channel signals:
- Subscriber base relevance
- View engagement health
- Performance consistency indicators
- Content consistency

---

## OUTPUT STRUCTURE

Return a JSON object with:

{
  "openingScore": number (0-100),
  "pacingScore": number (0-100),
  "curiosityScore": number (0-100),
  "payoffScore": number (0-100),
  "authorityScore": number (0-100),
  "overallScore": number (0-100),
  "strengths": string[] (3-5 items),
  "weaknesses": string[] (3-5 items),
  "risks": string[] (2-4 items),
  "improvements": string[] (3-5 items)
}

Provide brief, actionable insights for each category.`;

function buildUserPrompt(metadata: VideoMetadata, metrics: DerivedMetrics): string {
  const contentType = metrics.durationClassification === 'Short-form' ? 'YouTube Shorts' : 'YouTube Video';

  return `Analyze this YouTube video's retention strength:

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
- Like-to-View Ratio: ${metrics.likeToViewRatio}%
- Comment-to-View Ratio: ${metrics.commentToViewRatio}%
- Subscriber Performance Ratio: ${metrics.subscriberPerformanceRatio}%
- Title Length: ${metrics.titleLength} characters
- Duration Classification: ${metrics.durationClassification}

## TAGS
${metadata.tags.slice(0, 10).join(', ') || 'None'}

## DESCRIPTION PREVIEW
${metadata.description.slice(0, 500) || 'No description'}

Provide a comprehensive retention strength analysis.`;
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
    const body: RetentionAuditRequest = await req.json();
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

    const userPrompt = buildUserPrompt(metadata, derivedMetrics);

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt,
      userId: user.id,
      feature: 'retention-analysis',
    });

    let parsedResponse: {
      openingScore: number;
      pacingScore: number;
      curiosityScore: number;
      payoffScore: number;
      authorityScore: number;
      overallScore: number;
      strengths: string[];
      weaknesses: string[];
      risks: string[];
      improvements: string[];
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

    await consumeTokens(user.id, COST_PER_REQUEST, 'RETENTION_PROBABILITY');
    const newBalance = await getTokenBalance(user.id);

    return NextResponse.json({
      metadata,
      derivedMetrics,
      analysis: parsedResponse,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: newBalance?.balanceTokens || 0,
    });
  } catch (error) {
    console.error('Retention audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
