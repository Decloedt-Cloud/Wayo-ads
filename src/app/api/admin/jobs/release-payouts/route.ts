import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { releaseEligiblePayouts, releaseExpiredReserves, getCreatorPayoutSummary } from '@/server/payouts/payoutService';
import { notifyUnusualPayoutCluster } from '@/server/notifications/notificationTriggers';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Superadmin only' }, { status: 403 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'release';

    switch (action) {
      case 'release': {
        const result = await releaseEligiblePayouts();
        
        if (result.released >= 10) {
          try {
            const totalAmount = await db.payoutQueue.aggregate({
              where: { status: 'RELEASED', releasedAt: { gte: new Date(Date.now() - 3600000) } },
              _sum: { amountCents: true },
            });
            await notifyUnusualPayoutCluster({
              count: result.released,
              totalAmount: (totalAmount._sum.amountCents || 0) / 100,
            });
          } catch (notifyError) {
            console.error('[PAYOUT_CLUSTER] Failed to send notification:', notifyError);
          }
        }
        
        return NextResponse.json({
          success: true,
          message: `Released ${result.released} payouts`,
          released: result.released,
          failed: result.failed,
          errors: result.errors,
        });
      }

      case 'release-reserves': {
        const result = await releaseExpiredReserves();
        
        return NextResponse.json({
          success: true,
          message: `Released ${result.released} reserves`,
          released: result.released,
          amountReleased: result.amountReleased,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[RELEASE_PAYOUTS] Error', error);
    return NextResponse.json({ error: 'Failed to process payout release' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Superadmin only' }, { status: 403 });
    }

    const url = new URL(request.url);
    const creatorId = url.searchParams.get('creatorId');

    if (creatorId) {
      const summary = await getCreatorPayoutSummary(creatorId);
      return NextResponse.json(summary);
    }

    const pendingPayouts = await db.payoutQueue.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        campaign: {
          select: { id: true, title: true },
        },
      },
      orderBy: { eligibleAt: 'asc' },
      take: 50,
    });

    const stats = {
      totalPending: await db.payoutQueue.count({ where: { status: 'PENDING' } }),
      totalFrozen: await db.payoutQueue.count({ where: { status: 'FROZEN' } }),
      totalReleased: await db.payoutQueue.count({ where: { status: 'RELEASED' } }),
      eligibleNow: await db.payoutQueue.count({
        where: {
          status: 'PENDING',
          eligibleAt: { lte: new Date() },
        },
      }),
    };

    return NextResponse.json({
      stats,
      pendingPayouts,
    });
  } catch (error) {
    console.error('[RELEASE_PAYOUTS] Error', error);
    return NextResponse.json({ error: 'Failed to fetch payout data' }, { status: 500 });
  }
}
