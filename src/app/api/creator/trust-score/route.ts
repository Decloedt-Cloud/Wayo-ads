import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCreatorTrustScore } from '@/server/users';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trustScore = await getCreatorTrustScore(session.user.id);

    if (!trustScore) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(trustScore);
  } catch (error) {
    console.error('[TRUST_SCORE] Error', error);
    return NextResponse.json({ error: 'Failed to fetch trust score' }, { status: 500 });
  }
}
