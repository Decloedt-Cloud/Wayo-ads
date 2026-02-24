import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { grantRole } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { role } = body as { role?: 'ADVERTISER' | 'CREATOR' };

    if (role !== 'ADVERTISER' && role !== 'CREATOR') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const roles = await grantRole(session.user.id, role);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error updating roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

