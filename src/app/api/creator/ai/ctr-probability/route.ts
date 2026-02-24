import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { consumeTokens, getTokenBalance } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { AI_FEATURE_COSTS } from '@/server/ai/aiFeatureCosts';

const COST_PER_REQUEST = AI_FEATURE_COSTS.CTR_PROBABILITY;

const systemPrompt = `You are a CTR Probability Engine specialized in predicting YouTube click performance.

Your task is to ANALYZE content and provide a CTR Strength Score (0-100) with actionable feedback.

IMPORTANT: You are predicting RELATIVE strength, not exact CTR %. Focus on scroll-stopping potential and click psychology.

---

## SCORING SIGNALS

### 1. HOOK STRENGTH SIGNALS (Weight: 35%)
Evaluate the content hook/concept:
- Curiosity Gap Present (+15 if strong)
- Surprise Element (+12)
- Contrarian Structure (+12)
- Outcome Claim (+20)
- Emotional Trigger Intensity (+10)
- Weak Generic Hook (-15 if detected)

### 2. TITLE PSYCHOLOGY SIGNALS (Weight: 20%)
Evaluate the title:
- Specificity: numbers, concrete claims (+8)
- Cognitive tension: "nobody tells you", "secret" (+12)
- Emotional charge (+10)
- Clear benefit promise (+12)
- Generic phrasing (-10)
- SEO-only language (-8)

### 3. THUMBNAIL CONCEPT SIGNALS (Weight: 30%)
Evaluate thumbnail description (if provided):
- Facial emotion present (+18)
- High contrast framing (+10)
- Tension/curiosity framing (+15)
- Minimal text optimization (+8)
- Overloaded/busy (-12)
- Generic stock feel (-10)

### 4. PLATFORM BEHAVIOR (Weight: 5%)
- Shorts: reward shock/curiosity/speed (+10 if detected)
- Long-form: reward narrative promise/outcome (+10 if detected)

### 5. HISTORICAL CREATOR PERFORMANCE (Weight: 10%)
Consider creator track record if mentioned.

---

## SCORE INTERPRETATION

90-100 → HIGH CTR PROBABILITY
- Strong scroll-stopping potential
- Likely outperform baseline

70-89 → HEALTHY / TESTABLE
- Viable content
- Good for testing

50-69 → WEAK / RISKY
- May underperform
- Needs optimization

Below 50 → LOW CTR PROBABILITY
- High failure risk
- Requires fixes

---

## OUTPUT SECTIONS:

## CTR SCORE
Output: [X]/100 with interpretation

## STRENGTH ANALYSIS
Break down each signal category with points awarded/penalized

## DETECTED ISSUES
List specific weaknesses found (e.g., "Hook lacks curiosity trigger", "Title too generic")

## OPTIMIZATION RECOMMENDATIONS
Specific actionable fixes:
- How to improve the hook
- Title optimization suggestions
- Thumbnail improvements (if applicable)

## PLATFORM FIT
Assess if content fits Shorts or Video format optimally

---

## RULES
- Be honest in scoring - don't inflate scores
- Focus on actionable feedback
- Use specific language, not generic advice
- Prioritize psychological triggers in evaluation

OUTPUT FORMAT:
Provide clear numeric scores and specific recommendations.`;

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const {
      contentType,
      hookConcept,
      title,
      thumbnailDescription,
      creatorHistory,
    } = body;

    if (!contentType || !hookConcept || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: contentType, hookConcept, title' },
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

    const tokenResult = await consumeTokens(user.id, COST_PER_REQUEST, 'CTR_PROBABILITY');

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

Hook/Concept: ${hookConcept}

Title: ${title}

Thumbnail Description: ${thumbnailDescription || 'Not provided'}

Creator History: ${creatorHistory || 'Not specified'}

Analyze and provide CTR probability score with detailed breakdown.`;

    const response = await callLLM({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      model: 'deepseek-chat',
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 600,
      feature: 'ctr-prediction',
      creatorId: user.id,
      metadata: {
        contentType,
        hookConcept,
        title,
        thumbnailDescription,
        creatorHistory,
      },
    });

    return NextResponse.json({
      success: true,
      response,
      tokensUsed: COST_PER_REQUEST,
      tokensRemaining: tokenResult.newBalance,
    });
  } catch (error) {
    console.error('CTR Probability Engine error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze CTR probability' },
      { status: 500 }
    );
  }
}
