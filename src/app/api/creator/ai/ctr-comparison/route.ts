import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_COMPARISON = AI_FEATURE_COSTS.CTR_COMPARISON;

export const maxDuration = 60;

interface SpyVideo {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  tags: string[];
  views: number;
  likes: number;
  publishDate: string;
  transcript?: string;
}

interface CTRComparisonRequest {
  video: SpyVideo;
  userTitle: string;
  userThumbnailDescription: string;
  contentType: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body: CTRComparisonRequest = await req.json();
    const { video, userTitle, userThumbnailDescription, contentType } = body;

    if (!video || !userTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tokenBalance = await getTokenBalance(user.id);
    if (!tokenBalance || tokenBalance.balanceTokens < COST_PER_COMPARISON) {
      return NextResponse.json(
        { error: 'Insufficient tokens', required: COST_PER_COMPARISON, available: tokenBalance?.balanceTokens || 0 },
        { status: 402 }
      );
    }

    const systemPrompt = `You are an expert YouTube CTR comparison engine. Your task is to compare user's content (title & thumbnail) against a benchmark video and provide a detailed comparison score.

## COMPARISON METHODOLOGY

### Score Components (Total: 100 points)

1. **TITLE COMPARISON (40 points)**
   - Curiosity gap creation (+10 if better than benchmark)
   - Emotional trigger intensity (+10 if better)
   - Specificity and concrete claims (+10 if better)
   - Power word usage (+5 if better)
   - SEO optimization balance (+5 if better)

2. **THUMBNAIL COMPARISON (40 points)**
   - Facial emotion presence (+10 if better)
   - Contrast and visibility (+10 if better)
   - Tension/curiosity framing (+10 if better)
   - Text overlay effectiveness (+5 if better)
   - Color scheme impact (+5 if better)

3. **BENCHMARK GAP ANALYSIS (20 points)**
   - How much better/worse is user's content vs benchmark
   - Niche-specific optimization advantage
   - Platform fit (Shorts vs Video)

---

## OUTPUT FORMAT (JSON)

{
  "comparisonScore": number (0-100),
  "scoreBreakdown": {
    "titleScore": number (0-40),
    "thumbnailScore": number (0-40),
    "benchmarkGap": number (-20 to +20),
    "titleVsBenchmark": "better | worse | equal",
    "thumbnailVsBenchmark": "better | worse | equal"
  },
  "titleAnalysis": {
    "userStrengths": ["strength1", "strength2"],
    "userWeaknesses": ["weakness1", "weakness2"],
    "benchmarkStrengths": ["strength1", "strength2"],
    "recommendations": ["recommendation1", "recommendation2"]
  },
  "thumbnailAnalysis": {
    "userStrengths": ["strength1", "strength2"],
    "userWeaknesses": ["weakness1", "weakness2"],
    "benchmarkStrengths": ["strength1", "strength2"],
    "recommendations": ["recommendation1", "recommendation2"]
  },
  "overallVerdict": "Stronger | Weaker | Competitive",
  "quickWins": ["actionable tip 1", "actionable tip 2"]
}

---

## RULES
- Be objective and data-driven
- If user didn't provide thumbnail description, score thumbnail as "insufficient data"
- Compare fairly - acknowledge when benchmark is weak
- Provide actionable, specific recommendations
- Output ONLY valid JSON, no markdown`;

    const userPrompt = `Compare the user's content against this benchmark video:

BENCHMARK VIDEO:
- Title: ${video.title}
- Description: ${video.description || 'Not available'}
- Tags: ${video.tags?.join(', ') || 'Not available'}
- Views: ${video.views >= 1000 ? (video.views / 1000).toFixed(1) + 'K' : video.views}
- Likes: ${video.likes >= 1000 ? (video.likes / 1000).toFixed(1) + 'K' : video.likes}
- Content Type: ${contentType || 'YouTube Video'}

USER'S CONTENT:
- Title: ${userTitle}
- Thumbnail Description: ${userThumbnailDescription || 'Not provided'}

Analyze and provide the comparison in JSON format.`;

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt,
      userId: user.id,
    });

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse LLM response');
      }
    }

    await consumeTokens(user.id, COST_PER_COMPARISON, 'CTR_PROBABILITY');
    const newBalance = await getTokenBalance(user.id);

    return NextResponse.json({
      result: parsedResponse,
      tokensUsed: COST_PER_COMPARISON,
      tokensRemaining: newBalance?.balanceTokens || 0,
    });
  } catch (error) {
    console.error('CTR comparison error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
