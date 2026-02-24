import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';

const COST_PER_REQUEST = 10;

const systemPrompt = `You are an elite YouTube script writer.

Generate 3 original video scripts inspired by the provided reference video.

Rules:
- Write in natural, spoken language
- No corporate or marketing tone
- Each script should have: HOOK, BODY, CTA
- Keep scripts concise (30-60 seconds each for shorts, 60-90 seconds for videos)
- Use the same style, energy, and structure as the reference
- Vary the topic/angle but keep the pattern
- No emojis
- Output ONLY JSON
- Total response under 500 tokens.`;

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const {
      videoTitle,
      channelName,
      videoType,
      viewCount,
      durationSeconds,
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

    const tokenResult = await consumeTokens(user.id, COST_PER_REQUEST, 'SCRIPT_GENERATION' as any);

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

    const contentType = videoType === 'SHORT' ? 'YouTube Short (30-60 seconds)' : 'YouTube Video (60-90 seconds)';
    
    const userPrompt = `Reference Video:
- Title: ${videoTitle}
- Channel: ${channelName}
- Type: ${contentType}
- Views: ${viewCount || 'N/A'}
- Duration: ${durationSeconds ? `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')}` : 'N/A'}

Generate 3 original scripts inspired by this video.
Each script should have:
- HOOK: Attention-grabbing opening (first 3-5 seconds)
- BODY: Main content with storytelling/tension/value
- CTA: Call to action at the end

Make each script feel natural, conversational, and engaging like a real creator.`;

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      model: 'deepseek-chat',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 500,
      feature: 'script-generation' as any,
      creatorId: user.id,
      metadata: {
        videoTitle,
        channelName,
        videoType,
      },
    });

    let parsedResponse: { scripts: string[] | { hook: string; body: string; cta: string }[] } = { scripts: [] };
    try {
      let cleanResponse = response.replace(/^```json\s*/,'').replace(/```$/,'').trim();
      const json = JSON.parse(cleanResponse);
      if (json.scripts || json.length) {
        parsedResponse = { scripts: json.scripts || json };
      }
    } catch {
      const scriptBlocks = response.split(/\d+\.\s*Script|Script\s*\d+/i).filter((s: string) => s.trim());
      if (scriptBlocks.length > 0) {
        parsedResponse = { scripts: scriptBlocks };
      } else {
        parsedResponse = { scripts: [response] };
      }
    }

    return NextResponse.json({
      success: true,
      response: parsedResponse,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: tokenResult.newBalance,
    });
  } catch (error) {
    console.error('Generate Scripts error:', error);
    return NextResponse.json(
      { error: 'Failed to generate scripts' },
      { status: 500 }
    );
  }
}
