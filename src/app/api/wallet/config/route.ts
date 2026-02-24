import { NextResponse } from 'next/server';
import { isRealPSP } from '@/server/payments/psp';

export async function GET() {
  try {
    const isStripe = isRealPSP();

    let publishableKey: string | null = null;
    let isTestMode = false;

    if (isStripe) {
      const { getStripePublishableKeyForClient } = await import('@/server/payments/stripePsp');
      publishableKey = await getStripePublishableKeyForClient();
      isTestMode = publishableKey?.startsWith('pk_test_') ?? false;
    }

    return NextResponse.json({
      pspMode: isStripe ? 'stripe' : 'mock',
      isStripe,
      publishableKey,
      isTestMode,
    });
  } catch (error) {
    console.error('Error getting PSP config:', error);
    return NextResponse.json(
      { error: 'Failed to get PSP configuration' },
      { status: 500 }
    );
  }
}
