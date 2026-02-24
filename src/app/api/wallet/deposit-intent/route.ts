import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/server-auth';
import { getPSP, canSimulate } from '@/server/payments/psp';

const depositSchema = z.object({
  amountCents: z.number().int().min(50, 'Minimum deposit is €0.50'),
  currency: z.string().length(3).optional().default('EUR'),
});

// POST /api/wallet/deposit-intent - Create a deposit payment intent
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');
    const body = await request.json();
    const validated = depositSchema.parse(body);

    const psp = getPSP();

    // Create deposit intent with PSP
    const intent = await psp.createDepositIntent({
      userId: user.id,
      amountCents: validated.amountCents,
      currency: validated.currency,
      metadata: {
        userEmail: user.email || '',
        userName: user.name || '',
      },
    });

    return NextResponse.json({
      success: true,
      intent: {
        intentId: intent.intentId,
        clientSecret: intent.clientSecret,
        amountCents: intent.amountCents,
        currency: intent.currency,
        status: intent.status,
        createdAt: intent.createdAt,
      },
      // In development, allow simulation
      canSimulate: canSimulate(),
    });
  } catch (error) {
    console.error('Error creating deposit intent:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to create deposit intent' },
      { status: 500 }
    );
  }
}
