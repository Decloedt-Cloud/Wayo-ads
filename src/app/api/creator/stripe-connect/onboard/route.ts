import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server-auth';
import { getStripeConnectOnboardingLink } from '@/server/users';

export async function POST(request: NextRequest) {
  try {
    console.log('[Stripe Connect] Starting onboarding process');
    const sessionUser = await requireRole('CREATOR');
    console.log('[Stripe Connect] User authenticated:', sessionUser.id);
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const result = await getStripeConnectOnboardingLink(sessionUser.id, appUrl);

    if ('error' in result) {
      if (result.error === 'User not found') {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('[Stripe Connect] Error:', error);
    return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 });
  }
}
