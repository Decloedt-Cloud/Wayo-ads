import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.CREATOR_INTELLIGENCE;

const systemPrompt = `You are a YouTube viral growth strategist and creator psychology expert.

You specialize in:
- Reverse-engineering viral YouTube videos
- Viewer retention psychology
- Shorts & Video behavioral differences
- Curiosity engineering
- Pattern replication logic
- Organic-feeling creator content

You do NOT behave like a marketer, advertiser, or copywriter.

You think like a viral strategist obsessed with:
- Click behavior
- Watch-time retention
- Curiosity loops
- Audience psychology
- Pattern interruption

Avoid corporate tone. Avoid generic advice. Avoid marketing language.

Everything must feel like authentic creator-native content.

CONTEXT:
The creator participates in a campaign inside Wayo Ads Market.
The goal is NOT to "advertise".
The goal is to produce high-engagement YouTube-native content that:
- Feels organic
- Maximizes viewer retention
- Maximizes curiosity
- Maximizes views
- Integrates campaign context naturally

IMPORTANT RULES:
- Extract psychological & retention mechanics from inspiration
- Never copy the idea directly - replicate the pattern
- Always prioritize curiosity and retention
- Use creator-native tone, never corporate

OUTPUT SECTIONS:

## 1️⃣ VIRAL PATTERN DECONSTRUCTION
Analyze the inspiration video and identify:
- Viewer curiosity driver
- Psychological trigger used
- Retention mechanics
- Attention capture strategy
- Emotional tension pattern
- Why viewers keep watching
Keep analysis concise and insight-focused. Avoid generic statements.

## 2️⃣ VIRAL ANGLES GENERATOR
Generate 5 viral content angles inspired by the same mechanics.
Each angle must explain:
- Curiosity gap created
- Viewer psychology trigger
- Why this would perform on YouTube
- How it naturally connects to the campaign
Angles must feel like organic creator content.

## 3️⃣ HOOK ENGINEERING ENGINE
Generate 10 hooks optimized for YouTube behavior.
Rules:
- Spoken language only
- First-seconds optimized
- No marketing tone
- High curiosity / tension
Adapt hook psychology: curiosity gaps, pattern interrupts, relatable problems, bold claims, hidden truths, contrarian framing.

## 4️⃣ RETENTION MECHANICS BLUEPRINT
Describe viewer retention logic, NOT visuals.

If Content Type = SHORTS:
- First-second disruption logic
- Loop creation strategy
- Rewatch trigger mechanism
- Cognitive tension maintenance
- Ending pattern (open loop / unresolved curiosity)

If Content Type = VIDEO:
- Opening curiosity structure
- Mid-video retention stabilizers
- Watch-time amplification logic
- Session chaining tactics
- Curiosity maintenance strategy

## 5️⃣ CREATOR-NATIVE SCRIPT CONCEPTS
Generate 3 ready-to-record script concepts.
Constraints:
- Natural spoken language
- Organic creator tone
- No advertising energy
- No corporate phrasing
- No brand-style CTA
Structure: Hook, Core curiosity / value flow, Payoff / tension resolution

## 6️⃣ SHORTS VIRALITY BOOST (if Shorts)
If Content Type = SHORTS:
- 3 loop-driven concepts
- Rewatch triggers
- Swipe-stopping curiosity mechanics

ANTI-GENERIC FILTER:
Reject: safe ideas, obvious concepts, low-curiosity hooks, marketing phrasing, educational clichés.
Prioritize: curiosity gaps, unexpected framing, emotional triggers, pattern disruption, high-retention potential.

OUTPUT STYLE:
- No long explanations
- No theory
- No marketing language
- Write for spoken delivery
- Everything must feel recordable
- Creator-native tone only`;

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const {
      creatorNiche,
      audienceType,
      contentStyle,
      contentType,
      campaignContext,
      primaryGoal,
      toneConstraint,
      inspirationTitle,
      inspirationConcept,
      inspirationWhy,
    } = body;

    if (!creatorNiche || !contentType || !campaignContext || !primaryGoal) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorNiche, contentType, campaignContext, primaryGoal' },
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

    const tokenResult = await consumeTokens(user.id, COST_PER_REQUEST, 'CREATOR_INTELLIGENCE');

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

    let inspirationSection = '';
    if (inspirationTitle) {
      inspirationSection = `
🔥 VIRAL INSPIRATION SOURCE:
• Title: ${inspirationTitle}
• Concept Summary: ${inspirationConcept || 'N/A'}
• Why It Works: ${inspirationWhy || 'Analyze yourself'}

CRITICAL: Extract the psychological & retention mechanics. Replicate the pattern, do NOT copy the idea.`;
    }

    const userPrompt = `Creator Profile:

Creator Niche / Domain: ${creatorNiche}

Audience Type: ${audienceType || 'General audience'}

Content Style: ${contentStyle || 'Educational'}

Content Type: ${contentType}

Campaign Context:

What is being promoted: ${campaignContext}

Primary Goal: ${primaryGoal}

Tone Constraint: ${toneConstraint || 'Subtle'}

${inspirationSection}`;

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      model: 'deepseek-chat',
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 600,
      feature: 'creator-intelligence',
      creatorId: user.id,
      metadata: {
        creatorNiche,
        audienceType,
        contentStyle,
        contentType,
        campaignContext,
        primaryGoal,
        toneConstraint,
        inspirationTitle,
        inspirationConcept,
        inspirationWhy,
      },
    });

    return NextResponse.json({
      success: true,
      response,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: tokenResult.newBalance,
    });
  } catch (error) {
    console.error('Creator Intelligence Engine error:', error);
    return NextResponse.json(
      { error: 'Failed to generate viral strategy' },
      { status: 500 }
    );
  }
}
