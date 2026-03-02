import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/server-auth';

// Interfaces pour typer les résultats des queries raw Prisma
interface DailyCostRow {
  date: string;          // DATE() retourne généralement une string au format YYYY-MM-DD
  requests: bigint;
  totalCost: number | string;
  tokensCharged: bigint;
  totalTokens: bigint;
}

interface HourlyCostRow {
  hour: string;          // DATE_FORMAT retourne une string comme 'YYYY-MM-DD HH:00'
  requests: bigint;
  totalCost: number | string;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole('SUPERADMIN');
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : period === '24h' ? 1 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totalStats = await db.creatorAiUsage.aggregate({
      where: {
        createdAt: { gte: startDate },
      },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
        estimatedCostUsd: true,
        tokensCharged: true,
        tokenRevenueUsd: true,
        marginUsd: true,
      },
      _count: true,
    });

    const byModel = await db.creatorAiUsage.groupBy({
      by: ['model'],
      where: {
        createdAt: { gte: startDate },
      },
      _sum: {
        totalTokens: true,
        estimatedCostUsd: true,
        tokensCharged: true,
        tokenRevenueUsd: true,
        marginUsd: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          estimatedCostUsd: 'desc',
        },
      },
    });

    const byFeature = await db.creatorAiUsage.groupBy({
      by: ['feature'],
      where: {
        createdAt: { gte: startDate },
      },
      _sum: {
        estimatedCostUsd: true,
        tokensCharged: true,
        totalTokens: true,
        tokenRevenueUsd: true,
        marginUsd: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          estimatedCostUsd: 'desc',
        },
      },
    });

    const byProvider = await db.creatorAiUsage.groupBy({
      by: ['provider'],
      where: {
        createdAt: { gte: startDate },
      },
      _sum: {
        estimatedCostUsd: true,
        tokensCharged: true,
        totalTokens: true,
        tokenRevenueUsd: true,
        marginUsd: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          estimatedCostUsd: 'desc',
        },
      },
    });

    const topCreators = await db.creatorAiUsage.groupBy({
      by: ['creatorId'],
      where: {
        createdAt: { gte: startDate },
      },
      _sum: {
        estimatedCostUsd: true,
        tokensCharged: true,
        tokenRevenueUsd: true,
        marginUsd: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          estimatedCostUsd: 'desc',
        },
      },
      take: 20,
    });

    const creatorIds = topCreators.map(c => c.creatorId);
    const creators = await db.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, name: true, email: true },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    // Query raw typée
    const dailyCosts = await db.$queryRaw<DailyCostRow[]>`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as requests,
        COALESCE(SUM(estimatedCostUsd), 0) as totalCost,
        COALESCE(SUM(tokensCharged), 0) as tokensCharged,
        COALESCE(SUM(totalTokens), 0) as totalTokens
      FROM CreatorAiUsage
      WHERE createdAt >= ${startDate}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `;

    const hourlyCosts = await db.$queryRaw<HourlyCostRow[]>`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m-%d %H:00') as hour,
        COUNT(*) as requests,
        COALESCE(SUM(estimatedCostUsd), 0) as totalCost
      FROM CreatorAiUsage
      WHERE createdAt >= ${startDate}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d %H:00')
      ORDER BY hour DESC
      LIMIT 168
    `;

    const anomalyCheck = await db.creatorAiUsage.groupBy({
      by: ['creatorId'],
      where: {
        createdAt: { gte: startDate },
      },
      _sum: {
        estimatedCostUsd: true,
      },
      _count: true,
    });

    const avgCost = (totalStats._sum.estimatedCostUsd || 0) / Math.max(totalStats._count, 1);
    const stdDevThreshold = avgCost * 3;
    const anomalies = anomalyCheck
      .filter(a => (a._sum.estimatedCostUsd || 0) > stdDevThreshold && stdDevThreshold > 0)
      .map(a => ({
        creatorId: a.creatorId,
        totalCostUsd: a._sum.estimatedCostUsd || 0,
        requestCount: a._count,
        isAnomaly: true,
      }));

    const featureLabels: Record<string, string> = {
      'script-generation': 'Script Generation',
      'thumbnail-analysis': 'Thumbnail Analysis',
      'title-generation': 'Title Generation',
      'viral-patterns': 'Viral Patterns',
      'creator-intelligence': 'Creator Intelligence',
      'video-research': 'Video Research',
      'ctr-prediction': 'CTR Prediction',
      'retention-prediction': 'Retention Prediction',
      'expected-value': 'Expected Value',
      'pattern-blending': 'Pattern Blending',
    };

    return NextResponse.json({
      period,
      summary: {
        totalRequests: totalStats._count,
        totalTokens: totalStats._sum.totalTokens || 0,
        totalCostUsd: totalStats._sum.estimatedCostUsd || 0,
        totalTokensCharged: totalStats._sum.tokensCharged || 0,
        totalTokenRevenueUsd: totalStats._sum.tokenRevenueUsd || 0,
        totalMarginUsd: totalStats._sum.marginUsd || 0,
        avgCostPerRequest: totalStats._count > 0 ? (totalStats._sum.estimatedCostUsd || 0) / totalStats._count : 0,
        marginRate: totalStats._sum.estimatedCostUsd 
          ? ((totalStats._sum.tokenRevenueUsd || 0) - (totalStats._sum.estimatedCostUsd || 0)) / (totalStats._sum.estimatedCostUsd || 1) * 100 
          : 0,
        uniqueCreators: topCreators.length,
      },
      byModel: byModel.map(m => ({
        model: m.model,
        requests: m._count,
        totalTokens: m._sum.totalTokens || 0,
        costUsd: m._sum.estimatedCostUsd || 0,
        tokensCharged: m._sum.tokensCharged || 0,
        tokenRevenueUsd: m._sum.tokenRevenueUsd || 0,
        marginUsd: m._sum.marginUsd || 0,
      })),
      byFeature: byFeature.map(f => ({
        feature: f.feature,
        featureLabel: featureLabels[f.feature] || f.feature,
        requests: f._count,
        totalTokens: f._sum.totalTokens || 0,
        costUsd: f._sum.estimatedCostUsd || 0,
        tokensCharged: f._sum.tokensCharged || 0,
        tokenRevenueUsd: f._sum.tokenRevenueUsd || 0,
        marginUsd: f._sum.marginUsd || 0,
      })),
      byProvider: byProvider.map(p => ({
        provider: p.provider || 'Unknown',
        requests: p._count,
        totalTokens: p._sum.totalTokens || 0,
        costUsd: p._sum.estimatedCostUsd || 0,
        tokensCharged: p._sum.tokensCharged || 0,
        tokenRevenueUsd: p._sum.tokenRevenueUsd || 0,
        marginUsd: p._sum.marginUsd || 0,
      })),
      topCreators: topCreators.map(c => ({
        creatorId: c.creatorId,
        creator: creatorMap.get(c.creatorId) || { name: 'Unknown', email: 'Unknown' },
        requests: c._count,
        costUsd: c._sum.estimatedCostUsd || 0,
        tokensCharged: c._sum.tokensCharged || 0,
        tokenRevenueUsd: c._sum.tokenRevenueUsd || 0,
        marginUsd: c._sum.marginUsd || 0,
      })),
      dailyCosts: dailyCosts.map(d => ({
        date: d.date,
        requests: Number(d.requests),
        costUsd: Number(d.totalCost),
        tokensCharged: Number(d.tokensCharged),
        totalTokens: Number(d.totalTokens),
      })),
      hourlyCosts: hourlyCosts.map(h => ({
        hour: h.hour,
        requests: Number(h.requests),
        costUsd: Number(h.totalCost),
      })),
      anomalies: anomalies.slice(0, 10),
    });
  } catch (error) {
    console.error('[AdminAIUsage] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin AI usage' },
      { status: 500 }
    );
  }
}