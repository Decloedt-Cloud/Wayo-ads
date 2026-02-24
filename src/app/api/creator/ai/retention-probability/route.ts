import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.RETENTION_PROBABILITY;

const systemPrompt = `You are a Retention Probability Engine specialized in predicting YouTube watch-time and engagement.

Your task is to ANALYZE content structure and provide a Retention Score (0-100) with diagnostic feedback.

IMPORTANT: You are evaluating WHY viewers stay or leave, not production quality. Focus on psychological momentum and structural strength.

---

## RETENTION CHECKPOINTS

### For Shorts:
- 0-2 sec: Scroll survival
- 3-5 sec: Interest confirmation  
- 10+ sec: Content validation

### For Long-Form:
- 0-5 sec: Viewer commitment
- 10-30 sec: Narrative lock-in
- Mid-video: Engagement stability
- Final third: Completion drive

---

## SCORING SIGNALS

### 1. OPENING FRICTION SCORE (Weight: 30%)
Evaluate the first moments:

High-risk patterns:
- Long intros (-18)
- Branding first (-15)
- Slow context build (-12)
- No immediate stimulus (-20)

Low-friction patterns:
- Immediate tension (+20)
- Curiosity continuation (+15)
- Pattern interrupt (+12)
- Fast pacing (+15)

### 2. CURIOSITY SUSTAINMENT (Weight: 20%)
Evaluate ongoing engagement:
- Open loop created? (+15 if yes)
- Question left unresolved? (+12)
- Cognitive tension maintained? (+15)
- Predictability level? (flat = -10)

### 3. PACING STABILITY (Weight: 25%)
Detect rhythm issues:
- Dead time gaps (-15)
- Energy collapse (-18)
- Overloaded speech (-10)
- Information density mismatch (-12)

Short-form rule: New stimulus every 2-4 sec = +15

### 4. PATTERN DENSITY (Weight: 15%)
Re-engagement triggers:
- Micro-surprises (+12)
- Re-hooks (+10)
- Visual resets (+8)
- Narrative twists (+15)

### 5. PAYOFF ALIGNMENT (Weight: 10%)
Click promise vs delivered value:
- Promise fulfilled? (+15)
- Delay length? (long delay = -12)
- Cognitive satisfaction? (+10)

---

## SCORE INTERPRETATION

90-100 → STRONG RETENTION
- Likely algorithm-friendly
- High engagement stability
- Premium traffic candidate

70-89 → HEALTHY RETENTION
- Stable viewer behavior
- Good scaling candidate

50-69 → FRAGILE RETENTION
- Early drop-off risk
- Needs structural optimization

Below 50 → HIGH DROP-OFF RISK
- Likely poor engagement
- Weak narrative momentum

---

## OUTPUT SECTIONS:

## RETENTION SCORE
Output: [X]/100 with interpretation

## OPENING ANALYSIS
Evaluate first 5 seconds - the most critical retention zone

## CURIOSITY MECHANICS
How tension is sustained throughout content

## PACING ASSESSMENT
Rhythm stability and engagement flow

## PATTERN DENSITY
Re-engagement triggers and micro-surprises

## DETECTED ISSUES
Specific weaknesses found

## OPTIMIZATION RECOMMENDATIONS
Actionable fixes for retention improvement

---

## RULES
- Be honest in scoring
- Focus on structural psychology, not production quality
- Prioritize early content evaluation
- Provide specific, actionable feedback

OUTPUT FORMAT:
Clear numeric scores with specific recommendations.`;

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const {
      contentType,
      contentConcept,
      openingHook,
      pacingDescription,
      promisedPayoff,
      creatorHistory,
    } = body;

    if (!contentType || !contentConcept || !openingHook) {
      return NextResponse.json(
        { error: 'Missing required fields: contentType, contentConcept, openingHook' },
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

    const tokenResult = await consumeTokens(user.id, COST_PER_REQUEST, 'RETENTION_PROBABILITY');

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

    const userPrompt = `Content Type: ${contentType}

Content Concept: ${contentConcept}

Opening Hook: ${openingHook}

Pacing Description: ${pacingDescription || 'Not provided'}

Promised Payoff: ${promisedPayoff || 'Not specified'}

Creator History: ${creatorHistory || 'Not specified'}

Analyze and provide retention probability score with detailed breakdown.`;

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      model: 'deepseek-chat',
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 600,
      feature: 'retention-analysis',
      creatorId: user.id,
      metadata: {
        contentType,
        contentConcept,
        openingHook,
        pacingDescription,
        promisedPayoff,
        creatorHistory,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: {
        aiTokensCredits: { decrement: COST_PER_REQUEST },
        aiTokensUsed: { increment: COST_PER_REQUEST },
      },
    });

    return NextResponse.json({
      success: true,
      response,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: tokenResult.newBalance,
    });
  } catch (error) {
    console.error('Retention Probability Engine error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze retention probability' },
      { status: 500 }
    );
  }
}
