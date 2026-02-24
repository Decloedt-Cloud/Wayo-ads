import { NextRequest, NextResponse } from 'next/server';
import { checkPostViews, getCheckPostViewsStats } from '@/server/admin/adminJobsService';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.ADMIN_JOB_SECRET;
  
  if (adminKey && authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkPostViews();
    
    if (!result.success) {
      return NextResponse.json({
        error: 'API quota exceeded threshold',
        quotaUsage: result.quotaUsage,
        processed: 0
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      validatedDeltas: result.validatedDeltas,
      flaggedPosts: result.flaggedPosts,
      quotaUsage: result.quotaUsage,
      results: result.results,
    });
  } catch (error) {
    console.error('Error in check-post-views job:', error);
    return NextResponse.json(
      { error: 'Failed to process view snapshots' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getCheckPostViewsStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
