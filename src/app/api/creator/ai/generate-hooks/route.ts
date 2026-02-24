import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';

const COST_PER_REQUEST = 3;

const systemPrompt = `You are an elite YouTube hook strategist.

Generate high-performing hooks inspired by the provided video intelligence.

Rules:
- Be concise.
- No explanations.
- No emojis unless contextually relevant.
- Maintain the same psychological trigger.
- Preserve energy level.
- Adapt wording — do NOT copy.
- Each hook max 14 words.
- Output ONLY JSON.
- Total response under 150 tokens.`;

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const {
      videoTitle,
      hookType,
      energyLevel,
      structureType,
      detectedNiche,
      language,
    } = body;

    if (!videoTitle) {
      return NextResponse.json(
        { error: 'Missing required field: videoTitle' },
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

    const tokenResult = await consumeTokens(user.id, COST_PER_REQUEST, 'TITLE_ENGINE' as any);

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

    const userPrompt = `Video Title: ${videoTitle}

Hook Type: ${hookType || 'curiosity'}
Energy Level: ${energyLevel || 'high'}
Structure: ${structureType || 'story'}
Niche Context: ${detectedNiche || 'general'}
Language: ${language || 'en'}

Generate 3 similar hooks.
Keep the same psychological mechanism.
Vary angle and framing.`;

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      model: 'deepseek-chat',
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 180,
      feature: 'hook-generation' as any,
      creatorId: user.id,
      metadata: {
        videoTitle,
        hookType,
        energyLevel,
        structureType,
        detectedNiche,
        language,
      },
    });

    let parsedResponse = { hooks: [response] };
    try {
      let cleanResponse = response.replace(/^```json\s*/,'').replace(/```$/,'').trim();
      const json = JSON.parse(cleanResponse);
      if (json.hooks) {
        parsedResponse = json;
      }
    } catch {
      const lines = response.split('\n').filter((h: string) => h.trim() && !h.startsWith('```'));
      parsedResponse = { hooks: lines };
    }

    return NextResponse.json({
      success: true,
      response: parsedResponse,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: tokenResult.newBalance,
    });
  } catch (error) {
    console.error('Generate Hooks error:', error);
    return NextResponse.json(
      { error: 'Failed to generate hooks' },
      { status: 500 }
    );
  }
}
