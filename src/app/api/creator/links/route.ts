import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCreatorLinks } from '@/server/creators';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const links = await getCreatorLinks(userId);

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching tracking links:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking links' }, { status: 500 });
  }
}
