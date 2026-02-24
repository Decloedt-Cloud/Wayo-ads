import { NextRequest, NextResponse } from 'next/server';
import { getTokenTransactions } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || undefined;

    const result = await getTokenTransactions(user.id, { limit, offset, type });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[TokenTransactions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get token transactions' },
      { status: 500 }
    );
  }
}
