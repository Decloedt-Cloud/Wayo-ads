import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canSimulate, getPSP } from '@/server/payments/psp';
import { depositToWallet } from '@/server/finance/financeService';
import { db } from '@/lib/db';

const simulateSchema = z.object({
  intentId: z.string().min(1, 'Intent ID is required'),
});

// POST /api/webhooks/psp/simulate - Simulate successful payment (dev only)
export async function POST(request: NextRequest) {
  // Only allow in development/mock mode
  if (!canSimulate()) {
    return NextResponse.json(
      { error: 'Simulation not available in production mode' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validated = simulateSchema.parse(body);

    const psp = getPSP();

    // Simulate success
    const event = await psp.simulateSuccess!(validated.intentId);

    // Check if we've already processed this payment (idempotency)
    const existingTransaction = await db.walletTransaction.findFirst({
      where: {
        referenceType: 'PSP_DEPOSIT',
        referenceId: event.intentId,
      },
    });

    if (existingTransaction) {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        event,
      });
    }

    // Deposit to wallet
    const depositResult = await depositToWallet({
      userId: event.userId,
      amountCents: event.amountCents,
      currency: event.currency,
      referenceType: 'PSP_DEPOSIT',
      referenceId: event.intentId,
      description: `Simulated deposit - Intent: ${event.intentId}`,
    });

    if (!depositResult.success) {
      return NextResponse.json(
        { error: 'Failed to credit wallet', details: depositResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        eventId: event.eventId,
        type: event.type,
        intentId: event.intentId,
        amountCents: event.amountCents,
        currency: event.currency,
        userId: event.userId,
      },
      wallet: {
        transactionId: depositResult.transactionId,
        newAvailableCents: depositResult.newAvailableCents,
      },
    });
  } catch (error) {
    console.error('Simulation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Simulation failed' },
      { status: 500 }
    );
  }
}
