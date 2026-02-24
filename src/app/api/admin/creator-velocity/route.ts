import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

interface VelocityDataPoint {
  timestamp: string;
  date: string;
  recordedViews: number;
  validatedViews: number;
  billableViews: number;
  fraudScoreAverage: number;
  spikePercent: number;
  anomalyScore: number;
}

interface CreatorVelocityResponse {
  creatorId: string | null;
  creatorName: string | null;
  trustScore: number | null;
  riskLevel: string;
  isFrozen: boolean;
  data: VelocityDataPoint[];
  summary: {
    currentVelocity: number;
    baselineVelocity: number;
    velocityChangePercent: number;
    spikePercent: number;
    validationRate: number;
    conversionRate: number;
    riskLevel: string;
    activeCampaigns: number;
    totalRecordedViews: number;
    totalValidatedViews: number;
  };
  alerts: {
    type: 'red' | 'orange' | 'yellow' | 'none';
    message: string | null;
  }[];
}

function getTimeWindowHours(period: string): number {
  switch (period) {
    case '24h': return 24;
    case '7d': return 24 * 7;
    case '30d': return 24 * 30;
    default: return 24 * 7;
  }
}

function getGranularity(period: string): 'hour' | 'day' {
  return period === '24h' ? 'hour' : 'day';
}

async function getCreatorVelocityData(
  creatorId: string,
  period: string
): Promise<VelocityDataPoint[]> {
  const hours = getTimeWindowHours(period);
  const granularity = getGranularity(period);
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  const metrics = await db.creatorTrafficMetrics.findMany({
    where: {
      creatorId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      totalRecorded: true,
      totalValidated: true,
      totalBillable: true,
      avgFraudScore: true,
      spikePercent: true,
      anomalyScore: true,
      validationRate: true,
      conversionRate: true,
    },
  });

  return metrics.map((m) => ({
    timestamp: granularity === 'hour' 
      ? m.date.toISOString() 
      : m.date.toISOString().split('T')[0],
    date: m.date.toISOString().split('T')[0],
    recordedViews: m.totalRecorded,
    validatedViews: m.totalValidated,
    billableViews: m.totalBillable,
    fraudScoreAverage: m.avgFraudScore,
    spikePercent: m.spikePercent,
    anomalyScore: m.anomalyScore,
  }));
}

async function calculateVelocityMetrics(creatorId: string): Promise<{
  currentVelocity: number;
  baselineVelocity: number;
  velocityChangePercent: number;
  validationRate: number;
  conversionRate: number;
  totalRecorded: number;
  totalValidated: number;
  spikePercent: number;
}> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previous7d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [last24hMetrics, last7dMetrics, previous7dMetrics] = await Promise.all([
    db.creatorTrafficMetrics.aggregate({
      where: { creatorId, date: { gte: last24h } },
      _sum: { totalRecorded: true, totalValidated: true, totalBillable: true },
      _avg: { validationRate: true, conversionRate: true, spikePercent: true },
    }),
    db.creatorTrafficMetrics.aggregate({
      where: { creatorId, date: { gte: last7d } },
      _sum: { totalRecorded: true, totalValidated: true, totalBillable: true },
      _avg: { validationRate: true, conversionRate: true, spikePercent: true },
    }),
    db.creatorTrafficMetrics.aggregate({
      where: { creatorId, date: { gte: previous7d, lt: last7d } },
      _sum: { totalRecorded: true, totalValidated: true },
    }),
  ]);

  const currentVelocity = last24hMetrics._sum.totalValidated || 0;
  const baselineVelocity = previous7dMetrics._sum.totalValidated 
    ? Math.round((previous7dMetrics._sum.totalValidated / 7) * 24) 
    : last7dMetrics._sum.totalValidated 
      ? Math.round((last7dMetrics._sum.totalValidated / 7) * 24)
      : 0;

  const velocityChangePercent = baselineVelocity > 0
    ? ((currentVelocity - baselineVelocity) / baselineVelocity) * 100
    : 0;

  return {
    currentVelocity,
    baselineVelocity,
    velocityChangePercent,
    validationRate: last7dMetrics._avg.validationRate || 0,
    conversionRate: last7dMetrics._avg.conversionRate || 0,
    totalRecorded: last7dMetrics._sum.totalRecorded || 0,
    totalValidated: last7dMetrics._sum.totalValidated || 0,
    spikePercent: last7dMetrics._avg.spikePercent || 0,
  };
}

async function getTopCreatorsByVelocity(period: string): Promise<Array<{
  creatorId: string;
  creatorName: string;
  velocityChangePercent: number;
  trustScore: number | null;
  riskLevel: string;
}>> {
  const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
  const comparisonDays = days * 2;
  
  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - comparisonDays * 24 * 60 * 60 * 1000);

  const currentMetrics = await db.creatorTrafficMetrics.groupBy({
    by: ['creatorId'],
    where: { date: { gte: currentStart } },
    _sum: { totalValidated: true },
  });

  const previousMetrics = await db.creatorTrafficMetrics.groupBy({
    by: ['creatorId'],
    where: { date: { gte: previousStart, lt: currentStart } },
    _sum: { totalValidated: true },
  });

  const creatorIds = [...new Set([
    ...currentMetrics.map(m => m.creatorId),
    ...previousMetrics.map(m => m.creatorId)
  ])];

  const creators = await db.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, name: true, trustScore: true },
  });

  const creatorMap = new Map(creators.map(c => [c.id, c]));

  const velocityChanges = currentMetrics.map(current => {
    const previous = previousMetrics.find(p => p.creatorId === current.creatorId);
    const currentTotal = current._sum.totalValidated || 0;
    const previousTotal = previous?._sum.totalValidated || 0;
    
    const baseline = previousTotal > 0 ? previousTotal : 1;
    const changePercent = ((currentTotal - previousTotal) / baseline) * 100;
    
    return {
      creatorId: current.creatorId,
      creatorName: creatorMap.get(current.creatorId)?.name || 'Unknown',
      velocityChangePercent: changePercent,
      trustScore: creatorMap.get(current.creatorId)?.trustScore || null,
    };
  });

  return velocityChanges
    .sort((a, b) => Math.abs(b.velocityChangePercent) - Math.abs(a.velocityChangePercent))
    .slice(0, 10)
    .map(c => ({
      ...c,
      riskLevel: Math.abs(c.velocityChangePercent) > 200 ? 'HIGH' : 
                 Math.abs(c.velocityChangePercent) > 100 ? 'MEDIUM' : 'LOW',
    }));
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const period = searchParams.get('period') || '7d';

    const cacheKey = `creator-velocity-${creatorId || 'top'}-${period}`;
    
    const cacheHeader = request.headers.get('cache-control');
    const noCache = cacheHeader?.includes('no-cache') || false;

    if (!creatorId) {
      const topCreators = await getTopCreatorsByVelocity(period);
      return NextResponse.json({
        creatorId: null,
        creatorName: null,
        data: [],
        topCreators,
        summary: null,
        alerts: [],
      });
    }

    const [metrics, creator, balance] = await Promise.all([
      getCreatorVelocityData(creatorId, period),
      db.user.findUnique({
        where: { id: creatorId },
        select: { name: true, trustScore: true },
      }),
      db.creatorBalance.findUnique({
        where: { creatorId },
        select: { riskLevel: true },
      }),
    ]);

    const velocityMetrics = await calculateVelocityMetrics(creatorId);

    const alerts: CreatorVelocityResponse['alerts'] = [];
    
    if (velocityMetrics.velocityChangePercent > 200) {
      alerts.push({
        type: 'red',
        message: 'Abnormal traffic acceleration detected',
      });
    } else if (velocityMetrics.velocityChangePercent > 100) {
      alerts.push({
        type: 'orange',
        message: 'Elevated traffic velocity detected',
      });
    }

    const activeCampaigns = await db.campaignApplication.count({
      where: { creatorId, status: 'APPROVED' },
    });

    const creatorTrustScore = creator?.trustScore ?? null;
    if (creatorTrustScore !== null && creatorTrustScore < 40) {
      alerts.push({
        type: 'red',
        message: 'Low trust score - requires review',
      });
    }

    const response: CreatorVelocityResponse = {
      creatorId,
      creatorName: creator?.name || null,
      trustScore: creatorTrustScore,
      riskLevel: balance?.riskLevel || 'LOW',
      isFrozen: false,
      data: metrics,
      summary: {
        currentVelocity: velocityMetrics.currentVelocity,
        baselineVelocity: velocityMetrics.baselineVelocity,
        velocityChangePercent: velocityMetrics.velocityChangePercent,
        spikePercent: velocityMetrics.spikePercent,
        validationRate: velocityMetrics.validationRate,
        conversionRate: velocityMetrics.conversionRate,
        riskLevel: balance?.riskLevel || 'LOW',
        activeCampaigns,
        totalRecordedViews: velocityMetrics.totalRecorded,
        totalValidatedViews: velocityMetrics.totalValidated,
      },
      alerts,
    };

    return NextResponse.json(response, {
      headers: noCache ? {} : { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Error fetching creator velocity:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch velocity data' }, { status: 500 });
  }
}
