import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

/**
 * POST /api/internal/delete-user
 *
 * Called by the Auth server when a user is deleted there.
 * Finds the local user via Account.providerAccountId and deletes them.
 * Protected by shared X-App-Key header.
 */
export async function POST(request: NextRequest) {
  const appKey = request.headers.get('X-App-Key') || '';
  if (!env.AUTH_APP_KEY || appKey !== env.AUTH_APP_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { auth_user_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const authUserId = body.auth_user_id;
  if (!authUserId) {
    return NextResponse.json({ error: 'Missing auth_user_id' }, { status: 400 });
  }

  try {
    const account = await db.account.findFirst({
      where: {
        provider: 'wayo-auth',
        providerAccountId: authUserId,
      },
      select: { userId: true },
    });

    if (!account) {
      return NextResponse.json({ message: 'User not found or already deleted' }, { status: 404 });
    }

    await db.user.delete({
      where: { id: account.userId },
    });

    return NextResponse.json({ message: 'User deleted' }, { status: 200 });
  } catch (err) {
    console.error('[internal/delete-user]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
