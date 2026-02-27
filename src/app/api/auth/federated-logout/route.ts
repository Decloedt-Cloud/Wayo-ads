import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createHmac } from 'crypto';

/**
 * GET /api/auth/federated-logout
 *
 * Single Logout: clears the NextAuth session cookie, then redirects
 * to the centralized auth server's logout endpoint which in turn
 * redirects the user back to Wayo-ads.
 */
export async function GET() {
  const cookieStore = await cookies();

  cookieStore.delete('next-auth.session-token');
  cookieStore.delete('__Secure-next-auth.session-token');

  const wayoUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const sig = createHmac('sha256', env.AUTH_OAUTH_CLIENT_SECRET).update(wayoUrl).digest('hex');
  const authLogoutUrl = `${env.AUTH_API_URL}/auth/slo?redirect_uri=${encodeURIComponent(wayoUrl)}&sig=${sig}`;

  return NextResponse.redirect(authLogoutUrl);
}
