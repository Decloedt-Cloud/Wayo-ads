import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, requireRole } from '@/lib/server-auth';
import {
  requestWithdrawal,
  getCreatorBalance,
  getWithdrawalRequests,
  cancelWithdrawal,
} from '@/server/finance/financeService';
import { getPSP, canSimulate } from '@/server/payments/psp';
import { notifyWithdrawalRequested } from '@/server/notifications/notificationTriggers';

const requestWithdrawalSchema = z.object({
  amountCents: z.number().int().positive(),
});

// GET /api/creator/withdrawal - Get withdrawal history
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;

    // Get creator balance
    const balance = await getCreatorBalance(user.id);

    // Get withdrawal requests
    const { requests, total } = await getWithdrawalRequests(user.id, {
      limit,
      offset,
      status,
    });

    return NextResponse.json({
      balance: {
        availableCents: balance.availableCents,
        pendingCents: balance.pendingCents,
        totalEarnedCents: balance.totalEarnedCents,
        currency: balance.currency,
      },
      withdrawals: requests.map((w) => ({
        id: w.id,
        amountCents: w.amountCents,
        platformFeeCents: w.platformFeeCents,
        currency: w.currency,
        status: w.status,
        psReference: w.psReference,
        failureReason: w.failureReason,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
      })),
      total,
      canSimulate: canSimulate(),
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

// POST /api/creator/withdrawal - Request a new withdrawal
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();
    const validated = requestWithdrawalSchema.parse(body);

    // Get current balance to check available funds
    const balance = await getCreatorBalance(user.id);

    if (balance.availableCents < validated.amountCents) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          errorCode: 'INSUFFICIENT_FUNDS',
          details: {
            requested: validated.amountCents,
            available: balance.availableCents,
          },
        },
        { status: 400 }
      );
    }

    // Request the withdrawal
    const result = await requestWithdrawal({
      creatorId: user.id,
      amountCents: validated.amountCents,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to create withdrawal request',
          errorCode: result.error,
        },
        { status: 400 }
      );
    }

    // Send notification to creator
    try {
      await notifyWithdrawalRequested({
        userId: user.id,
        withdrawalId: result.withdrawalId,
        amount: validated.amountCents / 100,
        currency: 'EUR',
      });
    } catch (notifyError) {
      console.error('Failed to send withdrawal notification:', notifyError);
    }

    // In mock mode, automatically process the payout
    let psReference: string | null = null;
    if (canSimulate()) {
      const psp = getPSP();
      const payoutResult = await psp.createPayout({
        userId: user.id,
        amountCents: validated.amountCents,
        withdrawalRequestId: result.withdrawalId,
      });
      psReference = payoutResult.payoutId;

      // The mock PSP auto-succeeds, so the withdrawal is now "processing" or "succeeded"
    }

    return NextResponse.json(
      {
        withdrawal: {
          id: result.withdrawalId,
          amountCents: result.amountCents, // Net amount after platform fee
          platformFeeCents: result.platformFeeCents,
          grossAmountCents: validated.amountCents,
          status: psReference ? 'PROCESSING' : 'PENDING',
          psReference,
          createdAt: new Date(),
        },
        newAvailableCents: result.newAvailableCents,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
  }
}

// DELETE /api/creator/withdrawal - Cancel a pending withdrawal
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const { searchParams } = new URL(request.url);
    const withdrawalId = searchParams.get('id');

    if (!withdrawalId) {
      return NextResponse.json({ error: 'Withdrawal ID is required' }, { status: 400 });
    }

    const result = await cancelWithdrawal({
      withdrawalId,
      creatorId: user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to cancel withdrawal',
          errorCode: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: result.withdrawalId,
        status: 'CANCELLED',
      },
      newAvailableCents: result.newAvailableCents,
    });
  } catch (error) {
    console.error('Error cancelling withdrawal:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to cancel withdrawal' }, { status: 500 });
  }
}
