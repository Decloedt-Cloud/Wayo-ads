import { NextRequest, NextResponse } from 'next/server';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { callLLM } from '@/lib/llm';
import { fetchYouTubeVideoData, validateVideoId } from '@/lib/youtube';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.TITLE_THUMBNAIL;

interface InspirationData {
  title: string;
  description: string;
  tags: string[];
  category: string;
  channelName: string;
  viewCount: number;
  likeCount: number;
  publishDate: string;
  transcript: string;
}

interface UserTargetData {
  contentType: string;
  creatorNiche: string;
  targetAudience: string;
  coreVideoIdea: string;
  toneStyle: string;
}

function buildDeepSeekPrompt(inspirationData: InspirationData | null, userData: UserTargetData): { systemPrompt: string; userPrompt: string } {
  const categoryMap: Record<string, string> = {
    '1': 'Film & Animation',
    '2': 'Autos & Vehicles',
    '10': 'Music',
    '15': 'Pets & Animals',
    '17': 'Sports',
    '18': 'Short Movies',
    '19': 'Travel & Events',
    '20': 'Gaming',
    '21': 'Videoblogging',
    '22': 'People & Blogs',
    '23': 'Comedy',
    '24': 'Entertainment',
    '25': 'News & Politics',
    '26': 'Howto & Style',
    '27': 'Education',
    '28': 'Science & Technology',
    '29': 'Nonprofits & Activism',
    '30': 'Movies',
    '31': 'Anime/Animation',
    '32': 'Action/Adventure',
    '33': 'Classics',
    '34': 'Comedy',
    '35': 'Documentary',
    '36': 'Drama',
    '37': 'Family',
    '38': 'Foreign',
    '39': 'Horror',
    '40': 'Sci-Fi/Fantasy',
    '41': 'Thriller',
    '42': 'Shorts',
    '43': 'Shows',
    '44': 'Trailers',
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const systemPrompt = `You are an expert YouTube viral title and thumbnail strategist. Your task is to analyze an inspiration video and generate optimized titles and thumbnail concepts for a target video.

RESPONSIBILITIES:
1. Extract viral patterns from the inspiration video - focus on psychological triggers, emotional hooks, curiosity gaps, and structural elements.
2. Abstract psychological mechanics - do NOT copy any wording from the inspiration video.
3. Reapply patterns to the target video while respecting creator niche, target audience, and core video idea.
4. Prevent hallucination - only use information provided in the data.
5. Prevent copying inspiration wording directly.
6. Prevent misleading clickbait that does not match video content.
7. Ensure deterministic structured output.
8. Thumbnail text must be 1-4 words maximum.
9. Forbid emojis and hashtags in all outputs.
10. Handle missing transcript safely - if transcript is empty, rely only on metadata.

OUTPUT STRUCTURE (STRICT - follow exactly):

[PATTERN_EXTRACTED]
1.
2.
3.
4.

[TITLES]
1.
2.
3.
4.
5.
6.
7.
8.
9.
10.

[THUMBNAIL_TEXT]
1.
2.
3.
4.
5.

[THUMBNAIL_CONCEPTS]
1.
2.
3.
4.
5.`;

  let inspirationSection = '';
  if (inspirationData) {
    const category = categoryMap[inspirationData.category] || 'Unknown';
    const engagementRate = inspirationData.viewCount > 0 
      ? ((inspirationData.likeCount / inspirationData.viewCount) * 100).toFixed(2)
      : 'N/A';

    inspirationSection = `
INSPIRATION VIDEO (YouTube API Data):
Title: ${inspirationData.title}
Description: ${inspirationData.description || 'No description'}
Tags: ${inspirationData.tags?.join(', ') || 'No tags'}
Category: ${category}
Channel Name: ${inspirationData.channelName}
View Count: ${formatNumber(inspirationData.viewCount)}
Like Count: ${formatNumber(inspirationData.likeCount)}
Engagement Rate: ${engagementRate}%
Publish Date: ${inspirationData.publishDate}
Transcript: ${inspirationData.transcript || 'No transcript available - rely only on metadata'}

STEP 1 – PATTERN EXTRACTION:
Analyze the inspiration video and extract 4 viral patterns that made it successful. Focus on:
- Psychological triggers used
- Curiosity gap mechanisms
- Emotional hooks
- View-to-like engagement indicators
- What makes viewers click

STEP 2 – PATTERN REAPPLICATION:
Apply the extracted viral patterns to the target video below. Ensure titles match the specified tone style. Create compelling titles that create curiosity gaps without misleading.`;
  }

  const userPrompt = `USER TARGET VIDEO:
Content Type: ${userData.contentType}
Creator Niche: ${userData.creatorNiche}
Target Audience: ${userData.targetAudience || 'General audience'}
Core Video Idea: ${userData.coreVideoIdea}
Tone Style: ${userData.toneStyle || 'bold'}

${inspirationSection}

REQUIREMENTS:
- Generate exactly 10 titles in [TITLES] section
- Generate exactly 5 thumbnail text ideas in [THUMBNAIL_TEXT] section (1-4 words each)
- Generate exactly 5 thumbnail visual concepts in [THUMBNAIL_CONCEPTS] section
- Do NOT copy wording from the inspiration video
- Do NOT create misleading clickbait
- Do NOT use emojis or hashtags`;

  return { systemPrompt, userPrompt };
}

function parseStructuredResponse(response: string): {
  patternExtracted: string[];
  titles: string[];
  thumbnailText: string[];
  thumbnailConcepts: string[];
} {
  const result = {
    patternExtracted: [] as string[],
    titles: [] as string[],
    thumbnailText: [] as string[],
    thumbnailConcepts: [] as string[],
  };

  const sections = {
    patternExtracted: false,
    titles: false,
    thumbnailText: false,
    thumbnailConcepts: false,
  };

  let currentSection = '';
  const lines = response.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('[PATTERN_EXTRACTED]')) {
      currentSection = 'patternExtracted';
      sections.patternExtracted = true;
      continue;
    } else if (trimmedLine.startsWith('[TITLES]')) {
      currentSection = 'titles';
      sections.titles = true;
      continue;
    } else if (trimmedLine.startsWith('[THUMBNAIL_TEXT]')) {
      currentSection = 'thumbnailText';
      sections.thumbnailText = true;
      continue;
    } else if (trimmedLine.startsWith('[THUMBNAIL_CONCEPTS]')) {
      currentSection = 'thumbnailConcepts';
      sections.thumbnailConcepts = true;
      continue;
    }

    if (!currentSection) continue;

    const contentMatch = trimmedLine.match(/^\d+[\.\)]\s*(.+)$/);
    if (contentMatch && contentMatch[1]) {
      const content = contentMatch[1].trim();
      if (currentSection === 'patternExtracted') {
        result.patternExtracted.push(content);
      } else if (currentSection === 'titles') {
        result.titles.push(content);
      } else if (currentSection === 'thumbnailText') {
        result.thumbnailText.push(content);
      } else if (currentSection === 'thumbnailConcepts') {
        result.thumbnailConcepts.push(content);
      }
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const {
      contentType,
      creatorNiche,
      targetAudience,
      coreVideoIdea,
      toneStyle,
      videoId,
    } = body;

    if (!contentType || !creatorNiche || !coreVideoIdea) {
      return NextResponse.json(
        { error: 'Missing required fields: contentType, creatorNiche, coreVideoIdea' },
        { status: 400 }
      );
    }

    let inspirationData: InspirationData | null = null;

    if (videoId) {
      if (!validateVideoId(videoId)) {
        return NextResponse.json(
          { error: 'Invalid YouTube video ID' },
          { status: 400 }
        );
      }

      const youtubeData = await fetchYouTubeVideoData(videoId);
      
      if (youtubeData) {
        inspirationData = {
          title: youtubeData.title,
          description: youtubeData.description,
          tags: youtubeData.tags,
          category: youtubeData.categoryId,
          channelName: youtubeData.channelName,
          viewCount: youtubeData.viewCount,
          likeCount: youtubeData.likeCount,
          publishDate: youtubeData.publishDate,
          transcript: youtubeData.transcript,
        };
      }
    }

    const balance = await getTokenBalance(user.id);
    const availableTokens = balance?.balanceTokens || 0;

    if (availableTokens < COST_PER_REQUEST) {
      return NextResponse.json(
        { 
          error: 'Insufficient tokens', 
          available: availableTokens,
          required: COST_PER_REQUEST,
        },
        { status: 402 }
      );
    }

    const tokenResult = await consumeTokens(user.id, COST_PER_REQUEST, 'TITLE_THUMBNAIL');

    if (!tokenResult.success) {
      return NextResponse.json(
        { 
          error: tokenResult.error || 'Failed to consume tokens', 
          available: availableTokens,
          required: COST_PER_REQUEST,
        },
        { status: 402 }
      );
    }

    const userData: UserTargetData = {
      contentType,
      creatorNiche,
      targetAudience: targetAudience || '',
      coreVideoIdea,
      toneStyle: toneStyle || 'bold',
    };

    const { systemPrompt, userPrompt } = buildDeepSeekPrompt(inspirationData, userData);

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      model: 'deepseek-chat',
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 600,
      feature: 'title-thumbnail',
      creatorId: user.id,
      metadata: {
        creatorId: user.id,
        niche: creatorNiche,
        contentType,
        targetAudience,
        videoId: videoId || null,
      },
    });

    const structuredResult = parseStructuredResponse(response);

    return NextResponse.json({
      success: true,
      patternExtracted: structuredResult.patternExtracted,
      titles: structuredResult.titles,
      thumbnailText: structuredResult.thumbnailText,
      thumbnailConcepts: structuredResult.thumbnailConcepts,
      rawResponse: response,
      inspirationData: inspirationData ? {
        title: inspirationData.title,
        channelName: inspirationData.channelName,
        viewCount: inspirationData.viewCount,
        likeCount: inspirationData.likeCount,
      } : null,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: tokenResult.newBalance,
    });
  } catch (error) {
    console.error('Title & Thumbnail Engine error:', error);
    return NextResponse.json(
      { error: 'Failed to generate title and thumbnail concepts' },
      { status: 500 }
    );
  }
}
