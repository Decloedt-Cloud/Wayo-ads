import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server-auth';
import { getStripeConnectLoginLink } from '@/server/users';

export async function POST(_request: NextRequest) {
  try {
    console.log('[Stripe Connect Login] Starting login link generation');
    const sessionUser = await requireRole('CREATOR');
    console.log('[Stripe Connect Login] User authenticated:', sessionUser.id);
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const result = await getStripeConnectLoginLink(sessionUser.id, appUrl);

    if ('error' in result) {
      if (result.error.includes('No Stripe account')) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      if (result.error === 'User not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log('[Stripe Connect Login] Login link created successfully');
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Stripe Connect login error:', error);
    return NextResponse.json({ error: 'Failed to create login link' }, { status: 500 });
  }
}
