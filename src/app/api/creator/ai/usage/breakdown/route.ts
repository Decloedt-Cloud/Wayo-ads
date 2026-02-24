import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const creator = await requireRole('CREATOR');
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usageData = await db.creatorAiUsage.findMany({
      where: {
        creatorId: creator.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const breakdownByFeature = await db.creatorAiUsage.groupBy({
      by: ['feature'],
      where: {
        creatorId: creator.id,
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

    const breakdownByModel = await db.creatorAiUsage.groupBy({
      by: ['model'],
      where: {
        creatorId: creator.id,
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
    });

    const breakdownByProvider = await db.creatorAiUsage.groupBy({
      by: ['provider'],
      where: {
        creatorId: creator.id,
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
    });

    const dailyUsage = await db.$queryRaw`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        COALESCE(SUM(totalTokens), 0) as totalTokens,
        COALESCE(SUM(estimatedCostUsd), 0) as totalCost,
        COALESCE(SUM(tokensCharged), 0) as tokensCharged,
        COALESCE(SUM(tokenRevenueUsd), 0) as tokenRevenue,
        COALESCE(SUM(marginUsd), 0) as margin
      FROM CreatorAiUsage
      WHERE creatorId = ${creator.id}
        AND createdAt >= ${startDate}
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `;

    const totalStats = {
      totalRequests: usageData.length,
      totalTokens: usageData.reduce((sum, u) => sum + (u.totalTokens || 0), 0),
      totalCostUsd: usageData.reduce((sum, u) => sum + (u.estimatedCostUsd || 0), 0),
      totalTokensCharged: usageData.reduce((sum, u) => sum + u.tokensCharged, 0),
      totalTokenRevenueUsd: usageData.reduce((sum, u) => sum + (u.tokenRevenueUsd || 0), 0),
      totalMarginUsd: usageData.reduce((sum, u) => sum + (u.marginUsd || 0), 0),
    };

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
      period: period,
      totalStats,
      marginRate: totalStats.totalCostUsd > 0 
        ? ((totalStats.totalTokenRevenueUsd - totalStats.totalCostUsd) / totalStats.totalCostUsd) * 100 
        : 0,
      byFeature: breakdownByFeature.map(f => ({
        feature: f.feature,
        featureLabel: featureLabels[f.feature] || f.feature,
        requests: f._count,
        totalTokens: f._sum.totalTokens || 0,
        promptTokens: f._sum.promptTokens || 0,
        completionTokens: f._sum.completionTokens || 0,
        costUsd: f._sum.estimatedCostUsd || 0,
        tokensCharged: f._sum.tokensCharged || 0,
        tokenRevenueUsd: f._sum.tokenRevenueUsd || 0,
        marginUsd: f._sum.marginUsd || 0,
      })),
      byModel: breakdownByModel.map(m => ({
        model: m.model,
        requests: m._count,
        totalTokens: m._sum.totalTokens || 0,
        costUsd: m._sum.estimatedCostUsd || 0,
        tokensCharged: m._sum.tokensCharged || 0,
        tokenRevenueUsd: m._sum.tokenRevenueUsd || 0,
        marginUsd: m._sum.marginUsd || 0,
      })),
      byProvider: breakdownByProvider.map(p => ({
        provider: p.provider || 'Unknown',
        requests: p._count,
        totalTokens: p._sum.totalTokens || 0,
        costUsd: p._sum.estimatedCostUsd || 0,
        tokensCharged: p._sum.tokensCharged || 0,
        tokenRevenueUsd: p._sum.tokenRevenueUsd || 0,
        marginUsd: p._sum.marginUsd || 0,
      })),
      dailyUsage: dailyUsage.map((d: any) => ({
        date: d.date,
        count: Number(d.count),
        totalTokens: Number(d.totalTokens),
        costUsd: Number(d.totalCost),
        tokensCharged: Number(d.tokensCharged),
        tokenRevenueUsd: Number(d.tokenRevenue),
        marginUsd: Number(d.margin),
      })),
    });
  } catch (error) {
    console.error('[AIUsageBreakdown] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage breakdown' },
      { status: 500 }
    );
  }
}
