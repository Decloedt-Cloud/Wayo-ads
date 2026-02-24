import { NextRequest, NextResponse } from 'next/server';
import { refreshVideoStatus } from '@/server/admin/adminJobsService';

const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.ADMIN_JOB_SECRET;
  
  if (adminKey && authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await refreshVideoStatus();
    
    if (result.quotaUsage.percentUsed > 80) {
      return NextResponse.json({
        error: 'API quota exceeded threshold',
        quotaUsage: result.quotaUsage,
        processed: 0
      }, { status: 503 });
    }

    return NextResponse.json({
      message: result.message,
      processed: result.processed,
      updated: result.updated,
      failed: result.failed,
      quotaUsage: result.quotaUsage,
    });
  } catch (error) {
    console.error('Error refreshing YouTube video status:', error);
    return NextResponse.json(
      { error: 'Failed to refresh video status' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'YouTube Video Status Cron Job',
    usage: 'POST to refresh video privacy status for pending/active videos',
    batchSize: BATCH_SIZE,
    auth: 'Requires ADMIN_JOB_SECRET in Authorization header (Bearer token)',
  });
}
