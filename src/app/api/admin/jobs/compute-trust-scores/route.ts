import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { batchComputeTrustScores } from '@/server/risk/riskService';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Superadmin only' }, { status: 403 });
    }

    const result = await batchComputeTrustScores();
    
    return NextResponse.json({
      success: true,
      processed: result.success + result.failed,
      successCount: result.success,
      failedCount: result.failed,
    });
  } catch (error) {
    console.error('[COMPUTE_TRUST_SCORES] Error', error);
    return NextResponse.json({ error: 'Failed to compute trust scores' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Superadmin only' }, { status: 403 });
    }

    return NextResponse.json({
      endpoint: 'POST to compute trust scores for all creators',
      description: 'Batch computes trust scores based on 30-day traffic metrics',
    });
  } catch (error) {
    console.error('[TRUST_SCORES] Error', error);
    return NextResponse.json({ error: 'Failed to fetch info' }, { status: 500 });
  }
}
