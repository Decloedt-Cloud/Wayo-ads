import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, requireRole } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const creatorId = searchParams.get('creatorId');
    const campaignId = searchParams.get('campaignId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (type && type !== 'all') {
      where.type = type;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (campaignId) {
      where.campaignId = campaignId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [entries, total] = await Promise.all([
      db.ledgerEntry.findMany({
        where,
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              advertiser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.ledgerEntry.count({ where }),
    ]);

    const summary = await db.ledgerEntry.groupBy({
      by: ['type'],
      _sum: { amountCents: true },
      _count: { id: true },
    });

    const totalAmount = await db.ledgerEntry.aggregate({
      _sum: { amountCents: true },
    });

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: totalAmount._sum.amountCents || 0,
        byType: summary.map(s => ({
          type: s.type,
          amountCents: s._sum.amountCents || 0,
          count: s._count.id,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
