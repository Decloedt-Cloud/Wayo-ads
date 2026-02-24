import { NextRequest, NextResponse } from 'next/server';
import { aggregateCreatorMetrics, getAggregateCreatorMetricsStats } from '@/server/admin/adminJobsService';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.JOB_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { targetDate } = await request.json().catch(() => ({}));
    const date = targetDate ? new Date(targetDate) : undefined;

    const result = await aggregateCreatorMetrics(date);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AGGREGATE_METRICS] Error:', error);
    return NextResponse.json(
      { error: 'Aggregation failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = await getAggregateCreatorMetricsStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[AGGREGATE_METRICS] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
