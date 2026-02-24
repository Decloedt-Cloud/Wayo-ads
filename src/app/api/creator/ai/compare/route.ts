import { NextRequest, NextResponse } from 'next/server';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { callLLM } from '@/lib/llm';
import { fetchYouTubeVideoData, validateVideoId } from '@/lib/youtube';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_FEATURE_VIDEO = AI_FEATURE_COSTS.COMPARE;

export const maxDuration = 120;

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

interface CompareRequestBody {
  videos: SpyVideo[];
  features: string[];
}

const FEATURE_PROMPTS: Record<string, (video: SpyVideo) => { systemPrompt: string; userPrompt: string }> = {
  'title-thumbnail': buildTitleThumbnailPrompt,
  'ctr-prediction': buildCTRPrompt,
  'retention-analysis': buildRetentionPrompt,
  'expected-value': buildExpectedValuePrompt,
  'viral-mechanics': buildViralMechanicsPrompt,
  'pattern-fusion': buildPatternFusionPrompt,
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function buildTitleThumbnailPrompt(video: SpyVideo): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert YouTube title and thumbnail strategist. Analyze the given video and provide structured insights about its title and thumbnail strategy.
  
  RESPONSE REQUIREMENTS:
  1. Output ONLY valid JSON
  2. Do not include any markdown formatting or code blocks
  3. Include all fields specified in the output schema
  4. If transcript is unavailable, rely only on metadata provided
  5. Be precise and analytical - no fluff`;

  const userPrompt = `Analyze this YouTube video's title and thumbnail strategy:

VIDEO METADATA:
- Title: ${video.title}
- Description: ${video.description}
- Tags: ${video.tags.join(', ')}
- Views: ${formatNumber(video.views)}
- Likes: ${formatNumber(video.likes)}
- Publish Date: ${video.publishDate}
${video.transcript ? `- Transcript available (first 2000 chars): ${video.transcript.substring(0, 2000)}` : '- No transcript available'}

Provide a JSON response with this exact structure:
{
  "hookType": "question | curiosity_gap | emotion | promise | controversy | how_to | list | story",
  "titleFormula": "The structural pattern used in the title",
  "emotionalTrigger": "Primary emotion targeted (curiosity, fear, joy, anger, surprise, etc.)",
  "thumbnailStyle": "Visual approach (face emotion, text overlay, contrast, color scheme)",
  "curiosityGap": "How the title/thumbnail creates curiosity",
  "powerWords": ["list", "of", "power", "words", "used"],
  "ctrPotential": "high | medium | low",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;

  return { systemPrompt, userPrompt };
}

function buildCTRPrompt(video: SpyVideo): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert at predicting YouTube click-through rates. Analyze the given video and predict its CTR potential.

  RESPONSE REQUIREMENTS:
  1. Output ONLY valid JSON
  2. Do not include any markdown formatting or code blocks
  3. Include all fields specified in the output schema
  4. Use data-driven analysis`;

  const userPrompt = `Predict the CTR potential for this YouTube video:

VIDEO METADATA:
- Title: ${video.title}
- Description: ${video.description}
- Tags: ${video.tags.join(', ')}
- Views: ${formatNumber(video.views)}
- Likes: ${formatNumber(video.likes)}
- Publish Date: ${video.publishDate}
${video.transcript ? `- Transcript available (first 2000 chars): ${video.transcript.substring(0, 2000)}` : '- No transcript available'}

Provide a JSON response with this exact structure:
{
  "predictedCTR": "Number between 0-20 (e.g., 8.5 for 8.5%)",
  "confidenceScore": "Number between 0-100",
  "ctrFactors": {
    "titleQuality": "high | medium | low",
    "thumbnailQuality": "high | medium | low",
    "nicheCompetition": "high | medium | low",
    "timing": "high | medium | low"
  },
  "optimizationTips": ["tip1", "tip2", "tip3"]
}`;
  
  return { systemPrompt, userPrompt };
}

function buildRetentionPrompt(video: SpyVideo): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert at analyzing YouTube video retention patterns. Analyze the given video and predict viewer retention.

  RESPONSE REQUIREMENTS:
  1. Output ONLY valid JSON
  2. Do not include any markdown formatting or code blocks
  3. Include all fields specified in the output schema
  4. If transcript is unavailable, analyze based on metadata`;

  const userPrompt = `Analyze retention potential for this YouTube video:

VIDEO METADATA:
- Title: ${video.title}
- Description: ${video.description}
- Tags: ${video.tags.join(', ')}
- Views: ${formatNumber(video.views)}
- Likes: ${formatNumber(video.likes)}
- Publish Date: ${video.publishDate}
${video.transcript ? `- Transcript available (first 2000 chars): ${video.transcript.substring(0, 2000)}` : '- No transcript available'}

Provide a JSON response with this exact structure:
{
  "hookStrength": "strong | moderate | weak",
  "hookTimestamp": "number (seconds into video where hook peaks)",
  "dropOffRisk": "low | medium | high",
  "retentionCurve": "early_drop | steady | u_shaped | late_retention",
  "engagementMarkers": ["pattern1", "pattern2", "pattern3"],
  "pacingAssessment": "fast | moderate | slow",
  "retentionTips": ["tip1", "tip2"]
}`;
  
  return { systemPrompt, userPrompt };
}

function buildExpectedValuePrompt(video: SpyVideo): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert at calculating YouTube video expected value. Analyze the given video and estimate its revenue potential.

  RESPONSE REQUIREMENTS:
  1. Output ONLY valid JSON
  2. Do not include any markdown formatting or code blocks
  3. Include all fields specified in the output schema
  4. Consider multiple monetization factors`;

  const userPrompt = `Calculate expected value for this YouTube video:

VIDEO METADATA:
- Title: ${video.title}
- Description: ${video.description}
- Tags: ${video.tags.join(', ')}
- Views: ${formatNumber(video.views)}
- Likes: ${formatNumber(video.likes)}
- Publish Date: ${video.publishDate}

Provide a JSON response with this exact structure:
{
  "estimatedRPM": "Number (Revenue Per Mille in USD)",
  "confidenceScore": "Number between 0-100",
  "revenueFactors": {
    "nicheValue": "high | medium | low",
    "audienceBuyingPower": "high | medium | low",
    "adCompatibility": "high | medium | low",
    "sponsorshipPotential": "high | medium | low"
  },
  "monetizationChannels": ["ads", "sponsorships", "merchandise", "affiliates"],
  "valueOptimizations": ["optimization1", "optimization2"]
}`;
  
  return { systemPrompt, userPrompt };
}

function buildViralMechanicsPrompt(video: SpyVideo): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert at identifying viral patterns on YouTube. Analyze the given video and extract its viral mechanics.

  RESPONSE REQUIREMENTS:
  1. Output ONLY valid JSON
  2. Do not include any markdown formatting or code blocks
  3. Include all fields specified in the output schema
  4. Focus on psychological and structural viral triggers`;

  const userPrompt = `Analyze viral mechanics for this YouTube video:

VIDEO METADATA:
- Title: ${video.title}
- Description: ${video.description}
- Tags: ${video.tags.join(', ')}
- Views: ${formatNumber(video.views)}
- Likes: ${formatNumber(video.likes)}
- Publish Date: ${video.publishDate}
${video.transcript ? `- Transcript available (first 2000 chars): ${video.transcript.substring(0, 2000)}` : '- No transcript available'}

Provide a JSON response with this exact structure:
{
  "viralScore": "Number between 0-100",
  "viralTriggers": ["trigger1", "trigger2", "trigger3"],
  "shareabilityFactors": ["factor1", "factor2"],
  "rewatchPotential": "high | medium | low",
  "algorithmSignals": {
    "clickbaitLevel": "high | medium | low",
    "controversyLevel": "high | medium | low",
    "timeliness": "high | medium | low",
    "emotionalIntensity": "high | medium | low"
  },
  "viralRecommendations": ["rec1", "rec2"]
}`;
  
  return { systemPrompt, userPrompt };
}

function buildPatternFusionPrompt(video: SpyVideo): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert at blending viral patterns. Analyze the given video and identify its pattern composition.

  RESPONSE REQUIREMENTS:
  1. Output ONLY valid JSON
  2. Do not include any markdown formatting or code blocks
  3. Include all fields specified in the output schema
  4. Break down the video into viral pattern components`;

  const userPrompt = `Analyze pattern composition for this YouTube video:

VIDEO METADATA:
- Title: ${video.title}
- Description: ${video.description}
- Tags: ${video.tags.join(', ')}
- Views: ${formatNumber(video.views)}
- Likes: ${formatNumber(video.likes)}
- Publish Date: ${video.publishDate}
${video.transcript ? `- Transcript available (first 2000 chars): ${video.transcript.substring(0, 2000)}` : '- No transcript available'}

Provide a JSON response with this exact structure:
{
  "dominantPattern": "pattern_name",
  "secondaryPatterns": ["pattern1", "pattern2"],
  "patternWeights": {
    "curiosity": "number 0-100",
    "emotion": "number 0-100",
    "value": "number 0-100",
    "story": "number 0-100",
    "controversy": "number 0-100",
    "稀缺性": "number 0-100"
  },
  "patternSynergies": ["synergy1", "synergy2"],
  "fusionRecommendations": ["rec1", "rec2"]
}`;
  
  return { systemPrompt, userPrompt };
}

function buildWinningStrategyPrompt(
  videos: SpyVideo[],
  featureResults: Record<string, Record<string, unknown>>
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert YouTube strategist. Analyze multiple videos and their AI analysis results to generate a winning hybrid strategy.

  RESPONSE REQUIREMENTS:
  1. Output ONLY valid JSON
  2. Do not include any markdown formatting or code blocks
  3. Synthesize insights from all videos and features
  4. Provide actionable recommendations`;

  const videoSummaries = videos.map((v, i) => 
    `Video ${i + 1}: ${v.title}\nResults: ${JSON.stringify(featureResults, null, 2)}`
  ).join('\n\n');

  const userPrompt = `Generate a winning strategy by analyzing these videos and their AI analysis:

${videoSummaries}

Provide a JSON response with this exact structure:
{
  "winningTitle": "Optimal title combining best elements",
  "winningThumbnail": "Thumbnail strategy description",
  "winningHook": "Best hook approach",
  "optimalLength": "recommended video length",
  "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"],
  "riskMitigation": ["strategy1", "strategy2"],
  "nextSteps": ["step1", "step2", "step3"]
}`;

  return { systemPrompt, userPrompt };
}

async function parseJSONResponse(response: string): Promise<unknown> {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }
  return JSON.parse(jsonMatch[0]);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    
    const body: CompareRequestBody = await req.json();
    const { videos, features } = body;

    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        { error: 'At least one video is required' },
        { status: 400 }
      );
    }

    if (videos.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 videos allowed' },
        { status: 400 }
      );
    }

    if (!features || !Array.isArray(features) || features.length === 0) {
      return NextResponse.json(
        { error: 'At least one feature is required' },
        { status: 400 }
      );
    }

    const totalTokensNeeded = videos.length * features.length * COST_PER_FEATURE_VIDEO;
    const tokenBalance = await getTokenBalance(user.id);
    
    if (!tokenBalance || tokenBalance.balanceTokens < totalTokensNeeded) {
      return NextResponse.json(
        { error: `Insufficient tokens. Need ${totalTokensNeeded}, have ${tokenBalance?.balanceTokens || 0}` },
        { status: 402 }
      );
    }

    const featureResults: Record<string, Record<string, unknown>> = {};
    const analysisPromises: Promise<void>[] = [];

    for (const feature of features) {
      featureResults[feature] = {};
      const promptBuilder = FEATURE_PROMPTS[feature];
      
      if (!promptBuilder) {
        featureResults[feature] = { error: `Unknown feature: ${feature}` };
        continue;
      }

      for (const video of videos) {
        const promise = (async () => {
          try {
            const { systemPrompt, userPrompt } = promptBuilder(video);
            const response = await callLLM({
              prompt: userPrompt,
              systemPrompt,
              userId: user.id,
              feature: 'script-generation',
              temperature: 0.2,
              top_p: 0.9,
              max_tokens: 600,
            });
            
            const parsedResult = await parseJSONResponse(response);
            featureResults[feature][video.id] = parsedResult;
          } catch (error) {
            console.error(`Error analyzing ${feature} for video ${video.id}:`, error);
            featureResults[feature][video.id] = { error: 'Analysis failed' };
          }
        })();
        
        analysisPromises.push(promise);
      }
    }

    await Promise.all(analysisPromises);
    
    await consumeTokens(user.id, totalTokensNeeded, 'CONTENT_ANALYSIS');

    const videoSummaries = videos.map(v => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail,
    }));

    return NextResponse.json({
      videos: videoSummaries,
      features: featureResults,
      tokensUsed: totalTokensNeeded,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Compare error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    availableFeatures: Object.keys(FEATURE_PROMPTS),
    maxVideos: 3,
    costPerFeatureVideo: COST_PER_FEATURE_VIDEO,
  });
}
