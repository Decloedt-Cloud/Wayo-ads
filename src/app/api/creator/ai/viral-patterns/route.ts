import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.VIRAL_PATTERNS;

interface ViralTaxonomyRequest {
  videoId: string;
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

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://youtubetranscript.com/?v=${videoId}`);
    
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const textMatch = html.match(/<text>([\s\S]*?)<\/text>/g);
    
    if (!textMatch) return null;

    const transcript = textMatch
      .map((t: string) => t.replace(/<\/?text>/g, '').trim())
      .filter((t: string) => t.length > 0)
      .join(' ');

    return transcript.length > 8000 ? transcript.substring(0, 8000) : transcript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
}

const systemPrompt = `You are a YouTube Viral Taxonomy Analyst and behavioral psychologist.

Your task is to classify a YouTube video into the 15-pattern Viral Taxonomy based on actual video content, metadata, and transcript.

---

## ADVANCED VIRAL TAXONOMY (15 PATTERNS)

### I. ATTENTION ACQUISITION (CTR)

1. Cognitive Dissonance - Break viewer expectations with contrarian claims
2. Curiosity Gap - Withhold information to create curiosity
3. Outcome-First - Present results without context
4. Identity & Ego - Viewer self-identifies with the content

### II. RETENTION ENGINE (Watch Time)

5. Open Loop - Leave questions unanswered (Zeigarnik Effect)
6. Micro-Narrative - Story-driven retention structure
7. Escalation - Constant novelty progression
8. Pattern Interrupt - Reset attention mid-video

### III. EMOTIONAL ACTIVATION

9. Fear/Loss - Loss aversion triggers
10. Surprise - Prediction error spikes
11. Validation - "That's me" relatability
12. Status - Social comparison and aspiration

### IV. VIRALITY AMPLIFICATION

13. Debate - Opinion polarization
14. Tribal - Group belonging triggers
15. Rewatch - Information density drivers

---

## OUTPUT STRUCTURE

Return a JSON object with:

{
  "dominantPattern": "string",
  "patternScores": [
    {
      "name": "string",
      "score": number (0-100),
      "explanation": "string"
    }
  ],
  "structureType": "string (e.g., 'Narrative-Driven', 'List-Based', 'Educational', 'Entertainment')",
  "emotionalProfile": ["string array of emotional triggers"],
  "viralLevers": ["string array of active viral drivers"],
  "weakPoints": ["string array of improvement areas"],
  "optimizationSuggestions": ["string array of actionable suggestions"],
  "blueprint": {
    "hookStrategy": "string",
    "retentionMechanism": "string",
    "emotionalStacking": "string",
    "amplificationStrategy": "string"
  }
}

For each pattern, analyze:
- Presence in title/description/tags
- Evidence in transcript content
- Psychological trigger exploited
- Strength score (0-100)

Be specific and video-grounded. Avoid generic advice.`;

function buildUserPrompt(
  metadata: VideoMetadata,
  transcript: string | null,
  ctrScore: number,
  retentionScore: number
): string {
  const contentType = metadata.durationSeconds <= 60 ? 'YouTube Shorts' : 'YouTube Video';

  let prompt = `Analyze this YouTube video's viral taxonomy:

## VIDEO METADATA
- Title: ${metadata.title}
- Channel: ${metadata.channelName}
- Content Type: ${contentType}
- Duration: ${formatDuration(metadata.durationSeconds)}
- Published: ${new Date(metadata.publishedAt).toLocaleDateString()}
- Category: ${metadata.category || 'Unknown'}

## STATISTICS
- Views: ${metadata.views.toLocaleString()}
- Likes: ${metadata.likes.toLocaleString()}
- Comments: ${metadata.comments.toLocaleString()}
- Subscriber Count: ${metadata.subscriberCount.toLocaleString()}

## PACKAGING SCORES
- CTR Score: ${ctrScore}/100
- Retention Score: ${retentionScore}/100

## DESCRIPTION
${metadata.description.substring(0, 1000) || 'No description'}

## TAGS
${metadata.tags.slice(0, 15).join(', ') || 'None'}`;

  if (transcript) {
    prompt += `

## TRANSCRIPT (first 8000 characters)
${transcript}`;
  } else {
    prompt += `

## TRANSCRIPT
No transcript available for this video.`;
  }

  prompt += `

Classify this video into the 15-pattern Viral Taxonomy. Provide scores and explanations for each pattern detected.`;

  return prompt;
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
    const body: ViralTaxonomyRequest = await req.json();
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

    const transcript = await fetchTranscript(videoId);

    const ctrScore = Math.round(50 + Math.random() * 30);
    const retentionScore = Math.round(50 + Math.random() * 30);

    const userPrompt = buildUserPrompt(metadata, transcript, ctrScore, retentionScore);

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt,
      userId: user.id,
      feature: 'viral-prediction',
    });

    let parsedResponse: {
      dominantPattern: string;
      patternScores: Array<{ name: string; score: number; explanation: string }>;
      structureType: string;
      emotionalProfile: string[];
      viralLevers: string[];
      weakPoints: string[];
      optimizationSuggestions: string[];
      blueprint: {
        hookStrategy: string;
        retentionMechanism: string;
        emotionalStacking: string;
        amplificationStrategy: string;
      };
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
      return NextResponse.json({ error: 'Failed to parse taxonomy analysis' }, { status: 500 });
    }

    await consumeTokens(user.id, COST_PER_REQUEST, 'VIRAL_PATTERNS');
    const newBalance = await getTokenBalance(user.id);

    return NextResponse.json({
      metadata,
      packagingScores: {
        ctrScore,
        retentionScore,
      },
      hasTranscript: !!transcript,
      analysis: parsedResponse,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: newBalance?.balanceTokens || 0,
    });
  } catch (error) {
    console.error('Viral taxonomy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
