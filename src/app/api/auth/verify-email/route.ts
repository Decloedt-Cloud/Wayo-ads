import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const AUTH_API_URL = process.env.AUTH_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const code = body?.code?.trim();
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: 'Code must be 6 digits' }, { status: 400 });
  }

  try {
    const res = await fetch(`${AUTH_API_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.user.email, code }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || 'Verification failed' },
        { status: res.status }
      );
    }

    const payload = data.data || {};
    return NextResponse.json({
      success: true,
      verified: payload.verified ?? true,
      emailVerifiedAt: payload.email_verified_at ?? new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to verify' }, { status: 502 });
  }
}
