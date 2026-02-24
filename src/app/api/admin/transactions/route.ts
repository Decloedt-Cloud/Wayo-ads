import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminTransactions } from '@/server/admin/adminTransactionsService';
import { verifySuperAdmin } from '@/server/admin/adminAuthService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = await verifySuperAdmin(session.user.id);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const reason = searchParams.get('reason');
    const campaignId = searchParams.get('campaignId');
    const creatorId = searchParams.get('creatorId');

    const result = await getAdminTransactions({
      page,
      limit,
      reason: reason || undefined,
      campaignId: campaignId || undefined,
      creatorId: creatorId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
