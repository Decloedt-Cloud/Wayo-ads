import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import * as jose from 'jose';

/**
 * POST /api/auth/back-channel-logout
 *
 * Back-channel logout: receives notification from the auth server when a user
 * logs out there. Invalidates the Wayo-ads session for that user.
 *
 * Expects: application/x-www-form-urlencoded with logout_token (JWT)
 * JWT payload: { sub: auth_server_user_id, iss: auth_server_url, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let logoutToken: string;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.formData();
      logoutToken = body.get('logout_token') as string;
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      logoutToken = body.logout_token;
    } else {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    if (!logoutToken) {
      return NextResponse.json(
        { error: 'Missing logout_token' },
        { status: 400 }
      );
    }

    const secret = new TextEncoder().encode(
      env.AUTH_OAUTH_CLIENT_SECRET || env.NEXTAUTH_SECRET
    );

    const authOrigin = new URL(env.AUTH_API_URL).origin;
    const { payload } = await jose.jwtVerify(logoutToken, secret, {
      issuer: [authOrigin, env.AUTH_API_URL, env.AUTH_API_URL.replace(/\/$/, '')],
      maxTokenAge: '5m',
    });

    const sub = payload.sub as string;
    if (!sub) {
      return NextResponse.json(
        { error: 'Invalid logout_token: missing sub' },
        { status: 400 }
      );
    }

    const account = await db.account.findFirst({
      where: {
        provider: 'wayo-auth',
        providerAccountId: sub,
      },
      select: { userId: true },
    });

    if (account) {
      await db.logoutEvent.create({
        data: {
          wayoUserId: account.userId,
          authServerId: sub,
        },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('expired') || msg.includes('Expired')) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }
    if (msg.includes('signature') || msg.includes('verification') || msg.includes('invalid')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    console.error('[back-channel-logout]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
