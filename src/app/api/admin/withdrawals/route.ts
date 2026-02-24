'use strict';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { completeWithdrawal } from '@/server/finance/financeService';
import { getPSP } from '@/server/payments/psp';
import { notifyWithdrawalApproved } from '@/server/notifications/notificationTriggers';

export async function GET(request: NextRequest) {
  try {
    await requireRole('SUPERADMIN');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      db.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          creator: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      db.withdrawalRequest.count({ where }),
    ]);

    const summary = await db.withdrawalRequest.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        amountCents: true,
      },
    });

    return NextResponse.json({
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amountCents: w.amountCents,
        platformFeeCents: w.platformFeeCents,
        grossAmountCents: w.amountCents + (w.platformFeeCents || 0),
        currency: w.currency,
        status: w.status,
        psReference: w.psReference,
        failureReason: w.failureReason,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
        creator: w.creator?.creator ? {
          id: w.creator.creator.id,
          name: w.creator.creator.name,
          email: w.creator.creator.email,
        } : null,
      })),
      total,
      summary: summary.reduce((acc, s) => {
        acc[s.status] = {
          count: s._count,
          amountCents: s._sum.amountCents || 0,
        };
        return acc;
      }, {} as Record<string, { count: number; amountCents: number }>),
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole('SUPERADMIN');
    
    const body = await request.json();
    const { withdrawalId, action } = body;

    if (!withdrawalId) {
      return NextResponse.json({ error: 'Withdrawal ID required' }, { status: 400 });
    }

    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    if (action === 'approve' || action === 'mark_paid') {
      if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'PROCESSING') {
        return NextResponse.json(
          { error: `Cannot approve withdrawal with status: ${withdrawal.status}` },
          { status: 400 }
        );
      }

      let psReference = withdrawal.psReference;
      const psp = getPSP();
      
      if (!psReference) {
        try {
          const payoutResult = await psp.createPayout({
            userId: withdrawal.creatorId,
            amountCents: withdrawal.amountCents,
            withdrawalRequestId: withdrawal.id,
          });
          psReference = payoutResult.payoutId;
        } catch (error: any) {
          console.error('Payout creation failed:', error);
          return NextResponse.json(
            { error: error.message || 'Failed to create payout' },
            { status: 400 }
          );
        }
      }

      const result = await completeWithdrawal({
        withdrawalId,
        psReference: psReference || `manual-${Date.now()}`,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Send notification to creator
      try {
        await notifyWithdrawalApproved({
          userId: withdrawal.creatorId,
          withdrawalId: withdrawalId,
          amount: withdrawal.amountCents / 100,
          currency: withdrawal.currency,
        });
      } catch (notifyError) {
        console.error('Failed to send withdrawal approved notification:', notifyError);
      }

      return NextResponse.json({
        success: true,
        withdrawal: {
          id: result.withdrawalId,
          status: result.status,
        },
      });
    }

    if (action === 'cancel') {
      if (withdrawal.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Only pending withdrawals can be cancelled' },
          { status: 400 }
        );
      }

      await db.$transaction(async (tx) => {
        await tx.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: { status: 'CANCELLED' },
        });

        await tx.creatorBalance.update({
          where: { creatorId: withdrawal.creatorId },
          data: {
            availableCents: {
              increment: withdrawal.amountCents,
            },
          },
        });
      });

      return NextResponse.json({
        success: true,
        withdrawal: {
          id: withdrawalId,
          status: 'CANCELLED',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json({ error: 'Failed to process withdrawal' }, { status: 500 });
  }
}
