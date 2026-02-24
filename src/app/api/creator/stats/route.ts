import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCreatorStats, getCreatorDailyStats } from '@/lib/analytics';

// GET /api/creator/stats - Get stats for the current creator
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const [stats, dailyStats] = await Promise.all([
      getCreatorStats(userId),
      getCreatorDailyStats(userId),
    ]);

    return NextResponse.json({ ...stats, dailyStats });
  } catch (error) {
    console.error('Error fetching creator stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
