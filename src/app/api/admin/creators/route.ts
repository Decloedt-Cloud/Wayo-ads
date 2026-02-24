import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import { getUsers } from '@/server/admin/userService';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'CREATOR';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const verificationLevel = searchParams.get('verificationLevel') as 'VERIFIED' | 'UNVERIFIED' | 'ALL' || 'ALL';

    const result = await getUsers({ role, page, limit, verificationLevel });

    return NextResponse.json({ creators: result.users, total: result.total, page: result.page, totalPages: result.totalPages });
  } catch (error) {
    console.error('Error fetching creators:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 });
  }
}
