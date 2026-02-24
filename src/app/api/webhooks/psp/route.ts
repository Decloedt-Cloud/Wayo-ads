import { NextRequest, NextResponse } from 'next/server';
import { getPSP, canSimulate } from '@/server/payments/psp';
import { depositToWallet, completeWithdrawal, failWithdrawal } from '@/server/finance/financeService';
import { db } from '@/lib/db';
import { notifyCreatorWithdrawalStuck } from '@/server/notifications/notificationTriggers';
import { confirmPurchase, cancelPendingPurchase } from '@/server/tokens';

// POST /api/webhooks/psp - Handle PSP webhooks
// In production: Receives real webhooks from Stripe
// In development: Can receive simulated events
export async function POST(request: NextRequest) {
  try {
    const psp = getPSP();

    // Get raw body for signature verification
    const rawBody = await request.text();

    // Get signature from header (Stripe) or use body param (mock)
    const signature = request.headers.get('stripe-signature') || '';

    // Verify webhook signature and parse event
    const result = await psp.verifyWebhookSignature(rawBody, signature);

    if (!result.valid) {
      console.error('Webhook verification failed:', result.error);
      return NextResponse.json(
        { error: 'Invalid webhook signature', details: result.error },
        { status: 400 }
      );
    }

    const event = result.event!;

    // Handle different event types
    if (event.type === 'payment_succeeded' && event.succeeded) {
      return await handlePaymentSucceeded(event);
    }

    if (event.type === 'payment_failed' && !event.succeeded) {
      return await handlePaymentFailed(event);
    }

    // Handle payout events (for creator withdrawals)
    if (event.type === 'payout_succeeded') {
      return await handlePayoutSucceeded(event);
    }

    if (event.type === 'payout_failed') {
      return await handlePayoutFailed(event);
    }

    if (event.type === 'account_updated') {
      return await handleAccountUpdated(event);
    }

    if (event.type === 'transfer_created') {
      return await handleTransferCreated(event);
    }

    if (event.type === 'transfer_failed') {
      return await handleTransferFailed(event);
    }

    // Acknowledge other events
    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(event: {
  eventId: string;
  intentId: string;
  amountCents: number;
  currency: string;
  userId: string;
  succeeded: boolean;
  metadata?: Record<string, string>;
}) {
  // Check if this is a token purchase
  if (event.metadata?.type === 'token_purchase') {
    return await handleTokenPurchaseSucceeded(event);
  }

  // Check if we've already processed this payment (idempotency)
  const existingTransaction = await db.walletTransaction.findFirst({
    where: {
      referenceType: 'PSP_DEPOSIT',
      referenceId: event.intentId,
    },
  });

  if (existingTransaction) {
    return NextResponse.json({
      received: true,
      status: 'already_processed',
      intentId: event.intentId,
    });
  }

  // Deposit to wallet
  const depositResult = await depositToWallet({
    userId: event.userId,
    amountCents: event.amountCents,
    currency: event.currency,
    referenceType: 'PSP_DEPOSIT',
    referenceId: event.intentId,
    description: `Deposit via ${process.env.PSP_MODE || 'mock'} - Intent: ${event.intentId}`,
  });

  if (!depositResult.success) {
    console.error('Failed to deposit to wallet:', depositResult.error);
    return NextResponse.json(
      { error: 'Failed to credit wallet', details: depositResult.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
    status: 'succeeded',
    intentId: event.intentId,
    walletTransactionId: depositResult.transactionId,
    newBalance: depositResult.newAvailableCents,
  });
}

/**
 * Handle successful token purchase
 */
async function handleTokenPurchaseSucceeded(event: {
  eventId: string;
  intentId: string;
  amountCents: number;
  currency: string;
  userId: string;
  succeeded: boolean;
  metadata?: Record<string, string>;
}) {
  const tokens = parseInt(event.metadata?.tokens || '0', 10);
  
  if (!tokens || tokens <= 0) {
    console.error('[TokenPurchase] Invalid token amount:', event.metadata?.tokens);
    return NextResponse.json({
      received: true,
      status: 'error',
      error: 'Invalid token amount',
    });
  }

  const result = await confirmPurchase(event.userId, event.intentId, tokens);

  if (!result.success) {
    console.error('[TokenPurchase] Failed to confirm purchase:', result.error);
    return NextResponse.json({
      received: true,
      status: 'error',
      error: result.error,
    }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    status: 'succeeded',
    intentId: event.intentId,
    tokens,
    newBalance: result.newBalance,
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event: {
  eventId: string;
  intentId: string;
  amountCents: number;
  currency: string;
  userId: string;
  succeeded: boolean;
  metadata?: Record<string, string>;
}) {
  // Check if this is a token purchase
  if (event.metadata?.type === 'token_purchase') {
    await cancelPendingPurchase(event.userId, event.intentId);
    return NextResponse.json({
      received: true,
      status: 'cancelled',
      intentId: event.intentId,
      type: 'token_purchase',
    });
  }

  // Log the failure (we could store this for user notification)
  // For now, just acknowledge

  return NextResponse.json({
    received: true,
    status: 'failed',
    intentId: event.intentId,
  });
}

/**
 * Handle successful payout (creator withdrawal completed)
 */
async function handlePayoutSucceeded(event: {
  eventId: string;
  intentId: string;
  amountCents: number;
  currency: string;
  userId: string;
  succeeded: boolean;
  rawData?: unknown;
}) {
  // The intentId here is the payout ID (psReference)
  const payoutId = event.intentId;

  // Find the withdrawal request by psReference
  const withdrawal = await db.withdrawalRequest.findFirst({
    where: { psReference: payoutId },
  });

  if (!withdrawal) {
    return NextResponse.json({
      received: true,
      status: 'no_matching_withdrawal',
      payoutId,
    });
  }

  // Mark withdrawal as paid
  const result = await completeWithdrawal({
    withdrawalId: withdrawal.id,
    psReference: payoutId,
  });

  if (!result.success) {
    console.error('Failed to complete withdrawal:', result.error);
    return NextResponse.json(
      { error: 'Failed to mark withdrawal as paid', details: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
    status: 'payout_succeeded',
    payoutId,
    withdrawalId: withdrawal.id,
  });
}

/**
 * Handle failed payout (creator withdrawal failed)
 */
async function handlePayoutFailed(event: {
  eventId: string;
  intentId: string;
  amountCents: number;
  currency: string;
  userId: string;
  succeeded: boolean;
  rawData?: unknown;
}) {
  // The intentId here is the payout ID (psReference)
  const payoutId = event.intentId;

  // Find the withdrawal request by psReference
  const withdrawal = await db.withdrawalRequest.findFirst({
    where: { psReference: payoutId },
  });

  if (!withdrawal) {
    return NextResponse.json({
      received: true,
      status: 'no_matching_withdrawal',
      payoutId,
    });
  }

  // Get failure reason from raw data if available
  const failureReason = (event.rawData as any)?.reason || 'Payout failed';

  // Mark withdrawal as failed and refund balance
  const result = await failWithdrawal({
    withdrawalId: withdrawal.id,
    reason: failureReason,
  });

  if (!result.success) {
    console.error('Failed to mark withdrawal as failed:', result.error);
    return NextResponse.json(
      { error: 'Failed to mark withdrawal as failed', details: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
    status: 'payout_failed',
    payoutId,
    withdrawalId: withdrawal.id,
    newAvailableCents: result.newAvailableCents,
  });
}

/**
 * Handle Stripe account.updated webhook
 * Updates creator's Stripe Connect account status in our database
 */
async function handleAccountUpdated(event: {
  eventId: string;
  intentId: string;
  userId: string;
  rawData?: unknown;
}) {
  const accountId = event.intentId;
  const rawAccount = (event.rawData as any)?.data?.object;

  if (!accountId) {
    return NextResponse.json({
      received: true,
      status: 'no_account_id',
    });
  }

  const chargesEnabled = rawAccount?.charges_enabled ?? false;
  const payoutsEnabled = rawAccount?.payouts_enabled ?? false;
  const detailsSubmitted = rawAccount?.details_submitted ?? false;
  const accountStatus = rawAccount?.payouts_enabled ? 'enabled' : (rawAccount?.charges_enabled ? 'active' : 'pending');

  await db.user.updateMany({
    where: { stripeAccountId: accountId } as any,
    data: {
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
      stripeOnboardingCompleted: detailsSubmitted,
      stripeDetailsSubmitted: detailsSubmitted,
      stripeAccountStatus: accountStatus,
    } as any,
  });

  return NextResponse.json({
    received: true,
    status: 'account_updated',
    accountId,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    accountStatus,
  });
}

/**
 * Handle Stripe transfer.created webhook
 * Marks withdrawal as processing when transfer is created
 */
async function handleTransferCreated(event: {
  eventId: string;
  intentId: string;
  amountCents: number;
  rawData?: unknown;
}) {
  const transferId = event.intentId;

  const withdrawal = await db.withdrawalRequest.findFirst({
    where: { stripeTransferId: transferId } as any,
  });

  if (!withdrawal) {
    return NextResponse.json({
      received: true,
      status: 'no_matching_withdrawal',
      transferId,
    });
  }

  if (withdrawal.status === 'PROCESSING') {
    return NextResponse.json({
      received: true,
      status: 'already_processed',
      transferId,
      withdrawalId: withdrawal.id,
    });
  }

  await db.withdrawalRequest.update({
    where: { id: withdrawal.id },
    data: {
      status: 'PROCESSING',
      processedAt: new Date(),
    },
  });

  return NextResponse.json({
    received: true,
    status: 'transfer_created',
    transferId,
    withdrawalId: withdrawal.id,
  });
}

/**
 * Handle Stripe transfer.failed webhook
 * Marks withdrawal as failed when transfer fails
 */
async function handleTransferFailed(event: {
  eventId: string;
  intentId: string;
  amountCents: number;
  rawData?: unknown;
}) {
  const transferId = event.intentId;

  const withdrawal = await db.withdrawalRequest.findFirst({
    where: { stripeTransferId: transferId } as any,
  });

  if (!withdrawal) {
    return NextResponse.json({
      received: true,
      status: 'no_matching_withdrawal',
      transferId,
    });
  }

  const failureReason = (event.rawData as any)?.failure_message || 'Transfer failed';

  await db.withdrawalRequest.update({
    where: { id: withdrawal.id },
    data: {
      status: 'FAILED',
      failureReason,
    },
  });

  await db.creatorBalance.update({
    where: { creatorId: withdrawal.creatorId },
    data: {
      availableCents: {
        increment: withdrawal.amountCents,
      },
    },
  });

  try {
    await notifyCreatorWithdrawalStuck({
      withdrawalId: withdrawal.id,
      amount: withdrawal.amountCents / 100,
      currency: withdrawal.currency || 'EUR',
      creatorId: withdrawal.creatorId,
      reason: failureReason,
    });
  } catch (notifyError) {
    console.error('[WITHDRAWAL_FAILED] Failed to send notification:', notifyError);
  }

  return NextResponse.json({
    received: true,
    status: 'transfer_failed',
    transferId,
    withdrawalId: withdrawal.id,
    failureReason,
  });
}

// GET /api/webhooks/psp - Get webhook info (development only)
export async function GET(request: NextRequest) {
  if (!canSimulate()) {
    return NextResponse.json(
      { error: 'Webhook simulation not available in production' },
      { status: 403 }
    );
  }

  // Return info about how to simulate webhooks
  return NextResponse.json({
    mode: 'development',
    message: 'Webhook simulation available',
    endpoints: {
      simulateSuccess: 'POST /api/webhooks/psp/simulate',
      simulateFailure: 'POST /api/webhooks/psp/simulate-failure',
    },
    usage: {
      method: 'POST',
      body: { intentId: 'string' },
    },
  });
}
