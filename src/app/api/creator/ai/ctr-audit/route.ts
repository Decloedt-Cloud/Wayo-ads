import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.CTR_AUDIT;

interface CTRAuditRequest {
  videoId: string;
}

interface DerivedMetrics {
  viewsPerDay: number;
  engagementRate: number;
  commentRate: number;
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
  const engagementRate = metadata.views > 0 ? (metadata.likes / metadata.views) * 100 : 0;
  const commentRate = metadata.views > 0 ? (metadata.comments / metadata.views) * 100 : 0;
  const subscriberPerformanceRatio = metadata.subscriberCount > 0 
    ? (metadata.views / metadata.subscriberCount) * 100 
    : 0;

  return {
    viewsPerDay: Math.round(viewsPerDay * 10) / 10,
    engagementRate: Math.round(engagementRate * 100) / 100,
    commentRate: Math.round(commentRate * 100) / 100,
    subscriberPerformanceRatio: Math.round(subscriberPerformanceRatio * 100) / 100,
  };
}

const systemPrompt = `You are a senior YouTube CTR strategist specializing in packaging strength analysis.

Your task is to analyze the provided video metadata and provide a CTR Packaging Strength Score (0-100).

IMPORTANT: 
- This is PACKAGING STRENGTH estimation, NOT actual CTR prediction
- Do NOT fabricate actual CTR percentages
- Do NOT hallucinate retention data
- Only analyze the provided metadata and derived metrics
- If transcript is empty, rely only on metadata

---

## SCORING COMPONENTS

### 1. HOOK SCORE (0-100, Weight: 25%)
Analyze the title for hook strength:
- Curiosity gap / intrigue elements
- Specificity vs generic wording
- Emotional trigger presence
- Claim strength and specificity

### 2. THUMBNAIL SCORE (0-100, Weight: 35%)
Analyze thumbnail elements:
- Visual appeal indicators from title/context
- Text clarity potential
- Emotional resonance
- Contrast and clarity potential

### 3. TITLE SCORE (0-100, Weight: 25%)
Analyze title quality:
- Length optimization (50-60 chars ideal)
- Power words presence
- Search intent alignment
- Emotional trigger words

### 4. AUTHORITY SCORE (0-100, Weight: 15%)
Analyze creator/channel signals:
- Subscriber count relevance
- View-to-subscriber ratio
- Engagement rate health
- Content consistency indicators

---

## OUTPUT STRUCTURE

Return a JSON object with:

{
  "hookScore": number (0-100),
  "thumbnailScore": number (0-100),
  "titleScore": number (0-100),
  "authorityScore": number (0-100),
  "overallScore": number (0-100),
  "strengths": string[] (3-5 items),
  "weaknesses": string[] (3-5 items),
  "risks": string[] (2-4 items),
  "improvements": string[] (3-5 items)
}

Provide brief, actionable insights for each category.`;

function buildUserPrompt(metadata: VideoMetadata, metrics: DerivedMetrics): string {
  const isShorts = metadata.durationSeconds <= 60;
  const contentType = isShorts ? 'YouTube Shorts' : 'YouTube Video';

  return `Analyze this YouTube video's CTR packaging strength:

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
- Comment Rate: ${metrics.commentRate}%
- Subscriber Performance Ratio: ${metrics.subscriberPerformanceRatio}%

## TAGS
${metadata.tags.slice(0, 10).join(', ') || 'None'}

## DESCRIPTION PREVIEW
${metadata.description.slice(0, 500) || 'No description'}

Provide a comprehensive CTR packaging strength analysis.`;
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
    const body: CTRAuditRequest = await req.json();
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
      feature: 'ctr-prediction',
    });

    let parsedResponse: {
      hookScore: number;
      thumbnailScore: number;
      titleScore: number;
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

    await consumeTokens(user.id, COST_PER_REQUEST, 'CTR_PROBABILITY');
    const newBalance = await getTokenBalance(user.id);

    return NextResponse.json({
      metadata,
      derivedMetrics,
      analysis: parsedResponse,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: newBalance?.balanceTokens || 0,
    });
  } catch (error) {
    console.error('CTR audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
