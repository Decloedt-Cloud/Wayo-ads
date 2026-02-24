import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { RiskLevel } from '@prisma/client';
import { 
  forceReleasePayout, 
  cancelPayout, 
  freezePayout, 
  updateCreatorRiskLevel,
  getCreatorPayoutSummary
} from '@/server/payouts/payoutService';

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

    const body = await request.json();
    const { action, payoutId, creatorId, riskLevel, payoutDelayDays, reason } = body;

    const adminId = session.user.id;

    switch (action) {
      case 'force-release': {
        if (!payoutId) {
          return NextResponse.json({ error: 'payoutId required' }, { status: 400 });
        }
        const result = await forceReleasePayout(payoutId, adminId);
        return NextResponse.json(result);
      }

      case 'cancel': {
        if (!payoutId || !reason) {
          return NextResponse.json({ error: 'payoutId and reason required' }, { status: 400 });
        }
        const result = await cancelPayout(payoutId, reason, adminId);
        return NextResponse.json(result);
      }

      case 'freeze': {
        if (!payoutId || !reason) {
          return NextResponse.json({ error: 'payoutId and reason required' }, { status: 400 });
        }
        const result = await freezePayout(payoutId, reason, adminId);
        return NextResponse.json(result);
      }

      case 'update-risk': {
        if (!creatorId || !riskLevel) {
          return NextResponse.json({ error: 'creatorId and riskLevel required' }, { status: 400 });
        }
        if (!['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel)) {
          return NextResponse.json({ error: 'Invalid riskLevel' }, { status: 400 });
        }
        const result = await updateCreatorRiskLevel(
          creatorId, 
          riskLevel as RiskLevel, 
          payoutDelayDays
        );
        return NextResponse.json(result);
      }

      case 'get-summary': {
        if (!creatorId) {
          return NextResponse.json({ error: 'creatorId required' }, { status: 400 });
        }
        const summary = await getCreatorPayoutSummary(creatorId);
        return NextResponse.json(summary);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[ADMIN_PAYOUTS] Error', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
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
    const status = url.searchParams.get('status');
    const creatorId = url.searchParams.get('creatorId');

    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    if (creatorId) {
      where.creatorId = creatorId;
    }

    const payouts = await db.payoutQueue.findMany({
      where,
      include: {
        campaign: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const stats = {
      totalPending: await db.payoutQueue.count({ where: { status: 'PENDING' } }),
      totalFrozen: await db.payoutQueue.count({ where: { status: 'FROZEN' } }),
      totalReleased: await db.payoutQueue.count({ where: { status: 'RELEASED' } }),
      totalCancelled: await db.payoutQueue.count({ where: { status: 'CANCELLED' } }),
      eligibleNow: await db.payoutQueue.count({
        where: {
          status: 'PENDING',
          eligibleAt: { lte: new Date() },
        },
      }),
    };

    const creatorStats = await db.creatorBalance.groupBy({
      by: ['riskLevel'],
      _count: { riskLevel: true },
    });

    return NextResponse.json({
      payouts,
      stats,
      creatorStats,
    });
  } catch (error) {
    console.error('[ADMIN_PAYOUTS] Error', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}
