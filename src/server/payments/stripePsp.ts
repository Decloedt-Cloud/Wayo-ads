/**
 * Stripe Payment Service Provider Implementation
 * 
 * Production implementation using Stripe for payment processing.
 * Reads credentials from database (encrypted) instead of environment variables.
 * 
 * Configuration:
 * - Set credentials via SuperAdmin UI at /admin/settings/stripe
 * - All credentials are encrypted with AES-256-GCM before storage
 * - Falls back to STRIPE_SECRET_KEY env var if DB not configured
 */

import {
  PSPInterface,
  DepositIntent,
  CreateDepositIntentParams,
  WebhookEvent,
  WebhookVerificationResult,
  PayoutResult,
  CreatePayoutParams,
  PSPError,
  PSPErrorCodes,
} from './psp';
import { getStripeCredentials } from '../admin/stripeSettingsService';
import { getCreatorBalance } from '@/server/finance/financeService';
import { db } from '@/lib/db';

// Type for Stripe - using any to avoid complex SDK type issues
type StripeType = any;
type StripePaymentIntent = any;
type StripeAccount = any;
type StripeTransfer = any;

// ============================================
// STRIPE CLIENT CACHE
// ============================================

let _stripeInstance: StripeType | null = null;
let _stripeModule: typeof import('stripe') | null = null;
let _lastCredentialsHash: string | null = null;

/**
 * Get or create Stripe client
 * Reads credentials from DB (primary) or env (fallback)
 */
async function getStripeClient(): Promise<StripeType> {
  // Try to get credentials from DB first
  const credentials = await getStripeCredentials();
  
  let secretKey: string | null = null;
  let webhookSecret: string | null = null;
  
  if (credentials && credentials.secretKey) {
    console.log('[StripePSP] Using credentials from database');
    secretKey = credentials.secretKey;
    webhookSecret = credentials.webhookSecret;
    (globalThis as any).__stripeWebhookSecret = webhookSecret;
  } else {
    console.log('[StripePSP] No DB credentials, falling back to env vars');
    // Fallback to environment variables
    secretKey = process.env.STRIPE_SECRET_KEY || null;
    webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
    (globalThis as any).__stripeWebhookSecret = webhookSecret;
  }
  
  if (!secretKey) {
    throw new PSPError(
      'Stripe not configured. Configure via SuperAdmin or set STRIPE_SECRET_KEY env var',
      PSPErrorCodes.INVALID_CONFIGURATION,
      500
    );
  }
  
  // Check if we need to reinitialize (credentials changed)
  const credentialsHash = `${secretKey.slice(0, 8)}_${credentials?.mode || 'env'}`;
  
  if (_stripeInstance && _lastCredentialsHash === credentialsHash) {
    return _stripeInstance;
  }
  
  // Initialize Stripe
  try {
    const StripeModule = await import('stripe');
    _stripeModule = StripeModule;
    _stripeInstance = new StripeModule.default(secretKey, {
      apiVersion: '2026-01-28.clover',
    });
    _lastCredentialsHash = credentialsHash;
    
    return _stripeInstance;
  } catch (error) {
    console.error('[StripePSP] Failed to initialize Stripe:', error);
    throw new PSPError(
      'Failed to initialize Stripe client',
      PSPErrorCodes.INVALID_CONFIGURATION,
      500
    );
  }
}

/**
 * Get webhook secret from DB or env
 */
async function getWebhookSecret(): Promise<string | null> {
  // Try cached value first
  const cached = (globalThis as any).__stripeWebhookSecret;
  if (cached) return cached;
  
  // Get fresh from DB
  const credentials = await getStripeCredentials();
  if (credentials?.webhookSecret) {
    return credentials.webhookSecret;
  }
  
  // Fallback to env
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

// ============================================
// STRIPE PSP IMPLEMENTATION
// ============================================

export class StripePSP implements PSPInterface {
  readonly name = 'StripePSP';

  /**
   * Create a Stripe PaymentIntent for deposit
   */
  async createDepositIntent(params: CreateDepositIntentParams): Promise<DepositIntent> {
    const stripe = await getStripeClient();
    const { userId, amountCents, currency = 'EUR', metadata } = params;

    // Validate amount (Stripe minimum is typically 50 cents)
    if (amountCents < 50) {
      throw new PSPError(
        'Minimum deposit amount is €0.50',
        PSPErrorCodes.INVALID_AMOUNT,
        400
      );
    }

    if (amountCents > 1000000000) {
      throw new PSPError(
        'Maximum deposit amount is €10,000,000',
        PSPErrorCodes.INVALID_AMOUNT,
        400
      );
    }

    try {
      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        metadata: {
          userId,
          type: 'wallet_deposit',
          ...metadata,
        },
        // Automatically capture when payment succeeds
        capture_method: 'automatic',
        // Automatic confirmation for client-side confirmation
        confirmation_method: 'automatic',
      });

      return {
        intentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        amountCents: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        userId,
        status: this.mapStripeStatus(paymentIntent.status),
        createdAt: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error) {
      console.error('[StripePSP] Error creating PaymentIntent:', error);
      throw new PSPError(
        'Failed to create payment intent',
        PSPErrorCodes.PSP_UNAVAILABLE,
        500
      );
    }
  }

  /**
   * Get an existing PaymentIntent
   */
  async getIntent(intentId: string): Promise<DepositIntent | null> {
    const stripe = await getStripeClient();

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(intentId);

      return {
        intentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        amountCents: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        userId: paymentIntent.metadata.userId || '',
        status: this.mapStripeStatus(paymentIntent.status),
        createdAt: new Date(paymentIntent.created * 1000),
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error) {
      console.error('[StripePSP] Error retrieving PaymentIntent:', error);
      return null;
    }
  }

  /**
   * Cancel a PaymentIntent
   */
  async cancelIntent(intentId: string): Promise<boolean> {
    const stripe = await getStripeClient();

    try {
      const paymentIntent = await stripe.paymentIntents.cancel(intentId);
      return paymentIntent.status === 'canceled';
    } catch (error) {
      console.error('[StripePSP] Error cancelling PaymentIntent:', error);
      return false;
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  async verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    _timestamp?: number
  ): Promise<WebhookVerificationResult> {
    const stripe = await getStripeClient();
    const webhookSecret = await getWebhookSecret();

    if (!webhookSecret) {
      console.error('[StripePSP] Webhook secret not configured');
      return {
        valid: false,
        error: 'Webhook secret not configured',
      };
    }

    try {
      // Verify and construct the event
      const payloadString = typeof payload === 'string' ? payload : payload.toString();
      const event = stripe.webhooks.constructEvent(
        payloadString,
        signature,
        webhookSecret
      );

      // Extract relevant data based on event type
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as StripePaymentIntent;
        return {
          valid: true,
          event: {
            eventId: event.id,
            type: 'payment_succeeded',
            intentId: paymentIntent.id,
            amountCents: paymentIntent.amount,
            currency: paymentIntent.currency.toUpperCase(),
            userId: paymentIntent.metadata.userId || '',
            succeeded: true,
            timestamp: new Date(event.created * 1000),
            rawData: event,
          },
        };
      }

      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as StripePaymentIntent;
        return {
          valid: true,
          event: {
            eventId: event.id,
            type: 'payment_failed',
            intentId: paymentIntent.id,
            amountCents: paymentIntent.amount,
            currency: paymentIntent.currency.toUpperCase(),
            userId: paymentIntent.metadata.userId || '',
            succeeded: false,
            timestamp: new Date(event.created * 1000),
            rawData: event,
          },
        };
      }

      if (event.type === 'account.updated') {
        const account = event.data.object as StripeAccount;
        return {
          valid: true,
          event: {
            eventId: event.id,
            type: 'account_updated',
            intentId: account.id,
            amountCents: 0,
            currency: 'EUR',
            userId: account.metadata?.userId || '',
            succeeded: true,
            timestamp: new Date(event.created * 1000),
            rawData: event,
          },
        };
      }

      if (event.type === 'transfer.created') {
        const transfer = event.data.object as StripeTransfer;
        return {
          valid: true,
          event: {
            eventId: event.id,
            type: 'transfer_created',
            intentId: transfer.id,
            amountCents: transfer.amount,
            currency: transfer.currency.toUpperCase(),
            userId: '',
            succeeded: true,
            timestamp: new Date(event.created * 1000),
            rawData: event,
          },
        };
      }

      if (event.type === 'transfer.failed') {
        const transfer = event.data.object as StripeTransfer;
        return {
          valid: true,
          event: {
            eventId: event.id,
            type: 'transfer_failed',
            intentId: transfer.id,
            amountCents: transfer.amount,
            currency: transfer.currency.toUpperCase(),
            userId: '',
            succeeded: false,
            timestamp: new Date(event.created * 1000),
            rawData: event,
          },
        };
      }

      // Other event types
      return {
        valid: true,
        event: {
          eventId: event.id,
          type: event.type,
          intentId: (event.data.object as { id?: string })?.id || '',
          amountCents: 0,
          currency: 'EUR',
          userId: '',
          succeeded: false,
          timestamp: new Date(event.created * 1000),
          rawData: event,
        },
      };
    } catch (error) {
      console.error('[StripePSP] Webhook verification failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a payout (requires Stripe Connect)
   * Uses Stripe Connect transfers to send funds to creator's connected account
   */
  async createPayout(params: CreatePayoutParams): Promise<PayoutResult> {
    const { userId, amountCents, currency = 'EUR', withdrawalRequestId, metadata } = params;

    console.log(`[StripePSP] Creating payout for user ${userId}, amount: ${amountCents} ${currency}`);

    const stripe = await getStripeClient();

    const user = await (db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeAccountId: true,
        stripeOnboardingCompleted: true,
        stripePayoutsEnabled: true,
      },
    }) as any) as {
      id: string;
      stripeAccountId: string | null;
      stripeOnboardingCompleted: boolean;
      stripePayoutsEnabled: boolean;
    } | null;

    if (!user) {
      throw new PSPError(
        'Creator not found',
        PSPErrorCodes.INVALID_CONFIGURATION,
        400
      );
    }

    if (!user.stripeAccountId) {
      throw new PSPError(
        'Creator has not connected their Stripe account',
        PSPErrorCodes.INVALID_CONFIGURATION,
        400
      );
    }

    if (!user.stripeOnboardingCompleted) {
      throw new PSPError(
        'Creator has not completed Stripe onboarding',
        PSPErrorCodes.INVALID_CONFIGURATION,
        400
      );
    }

    if (!user.stripePayoutsEnabled) {
      throw new PSPError(
        'Creator payouts are not enabled on their Stripe account',
        PSPErrorCodes.INVALID_CONFIGURATION,
        400
      );
    }

    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id: withdrawalRequestId },
    });

    if (!withdrawal) {
      throw new PSPError(
        'Withdrawal request not found',
        PSPErrorCodes.INVALID_CONFIGURATION,
        400
      );
    }

    if (withdrawal.status !== 'PENDING') {
      throw new PSPError(
        `Withdrawal is not in a valid state for payout. Current status: ${withdrawal.status}`,
        PSPErrorCodes.INVALID_CONFIGURATION,
        400
      );
    }

    const balance = await getCreatorBalance(userId);
    if (balance.availableCents < amountCents) {
      throw new PSPError(
        `Insufficient balance. Available: ${balance.availableCents}, Requested: ${amountCents}`,
        PSPErrorCodes.INSUFFICIENT_BALANCE,
        400
      );
    }

    const idempotencyKey = `payout_${withdrawalRequestId}_${Date.now()}`;

    try {
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        destination: user.stripeAccountId,
        metadata: {
          withdrawalRequestId,
          userId,
          ...metadata,
        },
      }, {
        idempotencyKey,
      });

      await db.withdrawalRequest.update({
        where: { id: withdrawalRequestId },
        data: {
          stripeTransferId: transfer.id,
          idempotencyKey,
          psReference: transfer.id,
          status: 'PROCESSING',
        } as any,
      });

      return {
        payoutId: transfer.id,
        userId,
        status: 'processing',
        amountCents: transfer.amount,
        currency: transfer.currency.toUpperCase(),
        createdAt: new Date(transfer.created * 1000),
      };
    } catch (error: any) {
      console.error('[StripePSP] Payout creation failed:', error);

      await db.withdrawalRequest.update({
        where: { id: withdrawalRequestId },
        data: {
          failureReason: error.message || 'Transfer creation failed',
          status: 'FAILED',
        } as any,
      });

      throw new PSPError(
        error.message || 'Failed to create payout',
        PSPErrorCodes.PAYOUT_FAILED,
        500
      );
    }
  }

  /**
   * Get payout status
   */
  async getPayout(payoutId: string): Promise<PayoutResult | null> {
    return null;
  }

  /**
   * Map Stripe status to our internal status
   */
  private mapStripeStatus(status: string): DepositIntent['status'] {
    switch (status) {
      case 'succeeded':
        return 'succeeded';
      case 'canceled':
        return 'cancelled';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'processing':
        return 'pending';
      default:
        return 'failed';
    }
  }
}

// ============================================
// UTILITY EXPORTS
// ============================================

/**
 * Get the publishable key for frontend use
 * Returns null if not configured
 */
export async function getStripePublishableKeyForClient(): Promise<string | null> {
  const credentials = await getStripeCredentials();
  
  if (credentials?.publishableKey) {
    return credentials.publishableKey;
  }
  
  // Fallback to env
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}

/**
 * Check if Stripe is configured
 */
export async function isStripeConfigured(): Promise<boolean> {
  const credentials = await getStripeCredentials();
  if (credentials?.secretKey) return true;
  return !!process.env.STRIPE_SECRET_KEY;
}
