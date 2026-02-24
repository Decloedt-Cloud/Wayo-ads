import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.VIDEO_ANALYSIS;

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const { prompt, systemPrompt, feature, videoData } = body;

    if (!prompt || !systemPrompt || !feature) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, systemPrompt, feature' },
        { status: 400 }
      );
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

    const tokenResult = await consumeTokens(user.id, COST_PER_REQUEST, 'AI_ANALYSIS');

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

    const response = await callLLM({
      prompt,
      systemPrompt,
      model: 'deepseek-chat',
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 600,
      feature: feature,
      creatorId: user.id,
      metadata: {
        videoData,
        feature
      },
    });

    return NextResponse.json({
      success: true,
      result: response,
      tokensUsed: COST_PER_REQUEST,
      available: availableTokens - COST_PER_REQUEST,
    });
  } catch (error) {
    console.error('Video analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    );
  }
}
