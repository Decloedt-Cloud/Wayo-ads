import { NextRequest, NextResponse } from 'next/server';
import { confirmPurchase } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const { paymentIntentId, tokens } = body;

    if (!paymentIntentId || !tokens) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentIntentId, tokens' },
        { status: 400 }
      );
    }

    const result = await confirmPurchase(user.id, paymentIntentId, tokens);

    if (result.success) {
      return NextResponse.json({
        success: true,
        tokens,
        newBalance: result.newBalance,
        transactionId: result.transactionId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to confirm purchase' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[TestPurchase] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process test purchase' },
      { status: 500 }
    );
  }
}
