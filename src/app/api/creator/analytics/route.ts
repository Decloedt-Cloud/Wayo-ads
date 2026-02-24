import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const period = searchParams.get('period') || '30d';

    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereClause: any = {
      creatorId: userId,
      occurredAt: { gte: startDate },
    };
    if (campaignId) {
      whereClause.campaignId = campaignId;
    }

    const [campaigns, visitEvents] = await Promise.all([
      db.campaignApplication.findMany({
        where: {
          creatorId: userId,
          status: 'APPROVED',
          campaign: { status: 'ACTIVE' },
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              cpmCents: true,
              status: true,
            },
          },
        },
      }),
      db.visitEvent.findMany({
        where: whereClause,
        orderBy: { occurredAt: 'asc' },
      }),
    ]);

    const campaignsMap = new Map(
      campaigns.map((app) => [
        app.campaign.id,
        { id: app.campaign.id, title: app.campaign.title, cpmCents: app.campaign.cpmCents, status: app.campaign.status },
      ])
    );

    const dailyData: Record<string, { date: string; recordedViews: number; validatedViews: number; fraudScore: number; conversions: number }> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { date: dateStr, recordedViews: 0, validatedViews: 0, fraudScore: 0, conversions: 0 };
    }

    visitEvents.forEach((event) => {
      const dateStr = event.occurredAt.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].recordedViews += 1;
        if (event.isValidated) {
          dailyData[dateStr].validatedViews += 1;
        }
        if (event.fraudScore) {
          dailyData[dateStr].fraudScore += event.fraudScore;
        }
      }
    });

    const data = Object.values(dailyData).map((d) => ({
      ...d,
      fraudScore: d.recordedViews > 0 ? Math.round((d.fraudScore / d.recordedViews) * 100) / 100 : 0,
    }));

    const totalRecorded = visitEvents.length;
    const totalValidated = visitEvents.filter((v) => v.isValidated).length;
    const validationRate = totalRecorded > 0 ? Math.round((totalValidated / totalRecorded) * 10000) / 100 : 0;

    const avgFraudScore = visitEvents.length > 0
      ? visitEvents.reduce((sum, v) => sum + (v.fraudScore || 0), 0) / visitEvents.length
      : 0;

    const earningsWhere: any = {
      creatorId: userId,
      type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT'] },
    };
    if (campaignId) {
      earningsWhere.campaignId = campaignId;
    }

    const earnings = await db.ledgerEntry.aggregate({
      where: earningsWhere,
      _sum: { amountCents: true },
    });

    const pendingWhere: any = {
      creatorId: userId,
      type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT'] },
    };
    if (campaignId) {
      pendingWhere.campaignId = campaignId;
    }

    const pendingPayouts = await db.ledgerEntry.aggregate({
      where: pendingWhere,
      _sum: { amountCents: true },
    });

    const totalEarnings = earnings._sum.amountCents || 0;
    const pendingAmount = pendingPayouts._sum.amountCents || 0;

    let campaignBreakdown: Array<{ campaignId: string; campaignName: string; recordedViews: number; validatedViews: number; validationRate: number; earnings: number }> = [];
    if (!campaignId && campaigns.length > 0) {
      for (const campaign of campaigns) {
        const campaignVisits = visitEvents.filter((v) => v.campaignId === campaign.campaign.id);
        const campaignValidated = campaignVisits.filter((v) => v.isValidated).length;
        const campaignEarnings = await db.ledgerEntry.aggregate({
          where: {
            creatorId: userId,
            campaignId: campaign.campaign.id,
            type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT'] },
          },
          _sum: { amountCents: true },
        });

        campaignBreakdown.push({
          campaignId: campaign.campaign.id,
          campaignName: campaign.campaign.title,
          recordedViews: campaignVisits.length,
          validatedViews: campaignValidated,
          validationRate: campaignVisits.length > 0 ? Math.round((campaignValidated / campaignVisits.length) * 10000) / 100 : 0,
          earnings: campaignEarnings._sum.amountCents || 0,
        });
      }
    }

    return NextResponse.json({
      period,
      days,
      data,
      summary: {
        totalRecordedViews: totalRecorded,
        totalValidatedViews: totalValidated,
        validationRate,
        avgFraudScore: Math.round(avgFraudScore * 100) / 100,
        totalEarnings,
        pendingAmount,
      },
      campaigns: Array.from(campaignsMap.values()),
      campaignBreakdown,
    });
  } catch (error) {
    console.error('Error fetching creator analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
