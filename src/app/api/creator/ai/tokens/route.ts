import { NextRequest, NextResponse } from 'next/server';
import { getTokenBalance, consumeTokens, getOrCreateTokenWallet } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');

    let balance = await getTokenBalance(user.id);

    if (!balance) {
      await getOrCreateTokenWallet(user.id);
      balance = await getTokenBalance(user.id);
    }

    return NextResponse.json({
      tokensCredits: balance?.balanceTokens || 0,
      tokensUsed: balance?.lifetimeConsumedTokens || 0,
    });
  } catch (error) {
    console.error('[AITokens] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI tokens' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();
    const { tokens, feature } = body;

    if (!tokens || tokens <= 0) {
      return NextResponse.json(
        { error: 'Invalid token amount' },
        { status: 400 }
      );
    }

    const result = await consumeTokens(
      user.id,
      tokens,
      feature || 'AI_FEATURE'
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          errorCode: result.errorCode,
          available: result.newBalance || 0,
          required: tokens,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      success: true,
      tokensRemaining: result.newBalance,
    });
  } catch (error) {
    console.error('[AITokens] Error:', error);
    return NextResponse.json(
      { error: 'Failed to consume tokens' },
      { status: 500 }
    );
  }
}
