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
      take: 100,
    });

    const costByFeature = await db.creatorAiUsage.groupBy({
      by: ['feature'],
      where: {
        creatorId: creator.id,
        createdAt: { gte: startDate },
      },
      _sum: {
        estimatedCostUsd: true,
        tokensCharged: true,
        totalTokens: true,
      },
      _count: true,
      _avg: {
        estimatedCostUsd: true,
        totalTokens: true,
      },
    });

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

    const costAnalysis = costByFeature.map((f) => {
      const costUsd = f._sum.estimatedCostUsd || 0;
      const tokensCharged = f._sum.tokensCharged || 0;
      const avgCostPerRequest = f._avg.estimatedCostUsd || 0;
      
      return {
        feature: f.feature,
        featureLabel: featureLabels[f.feature] || f.feature,
        requests: f._count,
        totalCostUsd: costUsd,
        totalTokensCharged: tokensCharged,
        avgCostPerRequest,
        avgTokensPerRequest: f._avg.totalTokens || 0,
        percentageOfSpend: 0,
      };
    });

    const totalSpend = costAnalysis.reduce((sum, f) => sum + f.totalCostUsd, 0);
    costAnalysis.forEach((f) => {
      f.percentageOfSpend = totalSpend > 0 ? (f.totalCostUsd / totalSpend) * 100 : 0;
    });

    const recentTransactions = usageData.map((u) => ({
      id: u.id,
      feature: u.feature,
      featureLabel: featureLabels[u.feature] || u.feature,
      model: u.model,
      tokens: u.totalTokens || 0,
      costUsd: u.estimatedCostUsd || 0,
      tokensCharged: u.tokensCharged,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({
      period,
      summary: {
        totalSpendUsd: totalSpend,
        totalRequests: costAnalysis.reduce((sum, f) => sum + f.requests, 0),
        totalTokensCharged: costAnalysis.reduce((sum, f) => sum + f.totalTokensCharged, 0),
        avgCostPerRequest: totalSpend / Math.max(costAnalysis.reduce((sum, f) => sum + f.requests, 0), 1),
      },
      costByFeature: costAnalysis.sort((a, b) => b.totalCostUsd - a.totalCostUsd),
      recentTransactions,
    });
  } catch (error) {
    console.error('[AICostAnalysis] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost analysis' },
      { status: 500 }
    );
  }
}
