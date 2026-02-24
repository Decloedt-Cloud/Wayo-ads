import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server-auth';
import { getPSP } from '@/server/payments/psp';
import { depositToWallet } from '@/server/finance/financeService';

const confirmSchema = z.object({
  intentId: z.string().min(1, 'Intent ID is required'),
});

// POST /api/wallet/confirm-deposit - Confirm deposit after payment
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const body = await request.json();
    const validated = confirmSchema.parse(body);

    const psp = getPSP();

    // Get the payment intent to verify it's succeeded
    const paymentIntent = await psp.getIntent(validated.intentId);

    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Payment intent not found' },
        { status: 404 }
      );
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed', status: paymentIntent.status },
        { status: 400 }
      );
    }

    // Deposit to wallet
    const depositResult = await depositToWallet({
      userId: user.id,
      amountCents: paymentIntent.amountCents,
      currency: paymentIntent.currency,
      referenceType: 'PSP_DEPOSIT',
      referenceId: validated.intentId,
      description: `Wallet deposit - Intent: ${validated.intentId}`,
    });

    if (!depositResult.success) {
      return NextResponse.json(
        { error: 'Failed to credit wallet', details: depositResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: depositResult.transactionId,
      newBalance: depositResult.newAvailableCents,
    });
  } catch (error) {
    console.error('Confirm deposit error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm deposit' },
      { status: 500 }
    );
  }
}
