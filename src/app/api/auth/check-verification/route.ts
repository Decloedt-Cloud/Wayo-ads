import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://localhost:8000';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: 'wayo-auth' },
  });

  if (!account?.access_token) {
    return NextResponse.json({ verified: false });
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/api/auth/user?app=wayo_ads`, {
      headers: { Authorization: `Bearer ${account.access_token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ verified: false });
    }

    const data = await res.json();
    const user = data.data?.user || data.user || data;

    return NextResponse.json({
      verified: !!user.email_verified_at,
      emailVerifiedAt: user.email_verified_at || null,
    });
  } catch {
    return NextResponse.json({ verified: false });
  }
}
