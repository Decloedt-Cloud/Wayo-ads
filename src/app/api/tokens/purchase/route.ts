import { NextRequest, NextResponse } from 'next/server';
import { getPSP, canSimulate } from '@/server/payments/psp';
import { getOrCreateTokenWallet, createPendingPurchase, confirmPurchase } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { calculateTotalTokens } from '@/server/tokens/tokenPackages';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    const body = await request.json();

    const { packageId, tokenAmount, simulate } = body;

    if (!packageId && !tokenAmount) {
      return NextResponse.json(
        { error: 'Missing required field: packageId or tokenAmount' },
        { status: 400 }
      );
    }

    const { TOKEN_PACKAGES } = await import('@/server/tokens/tokenPackages');
    
    let tokens: number;
    let priceCents: number;
    let packageName: string;

    if (packageId) {
      const tokenPackage = TOKEN_PACKAGES.find((p) => p.id === packageId);
      if (!tokenPackage) {
        return NextResponse.json(
          { error: 'Invalid package ID' },
          { status: 400 }
        );
      }
      tokens = calculateTotalTokens(tokenPackage);
      priceCents = tokenPackage.priceCents;
      packageName = tokenPackage.name;
    } else if (tokenAmount) {
      tokens = tokenAmount;
      priceCents = Math.max(99, Math.round(tokens * 0.5));
      packageName = `${tokens} Tokens`;
    } else {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    await getOrCreateTokenWallet(user.id);

    if (simulate && canSimulate()) {
      console.log('[TokenPurchase] Simulating purchase for package:', packageId, 'tokens:', tokens);
      const intentId = `simulated_pi_${Date.now()}`;
      await createPendingPurchase(user.id, tokens, intentId);
      
      const result = await confirmPurchase(user.id, intentId, tokens);
      console.log('[TokenPurchase] Confirm purchase result:', result);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          tokens,
          priceCents,
          packageName,
          simulated: true,
        });
      } else {
        return NextResponse.json(
          { error: result.error || 'Failed to simulate purchase' },
          { status: 500 }
        );
      }
    }

    const psp = getPSP();
    
    const depositIntent = await psp.createDepositIntent({
      userId: user.id,
      amountCents: priceCents,
      currency: 'EUR',
      metadata: {
        type: 'token_purchase',
        tokens: tokens.toString(),
        packageId: packageId || 'custom',
      },
    });

    await createPendingPurchase(user.id, tokens, depositIntent.intentId);

    return NextResponse.json({
      clientSecret: depositIntent.clientSecret,
      paymentIntentId: depositIntent.intentId,
      tokens,
      priceCents,
      packageName,
    });
  } catch (error) {
    console.error('[TokenPurchase] Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Stripe not configured')) {
        return NextResponse.json(
          { error: 'Payment system not configured. Please contact support.' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
