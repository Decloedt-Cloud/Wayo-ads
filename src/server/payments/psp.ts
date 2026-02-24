/**
 * Payment Service Provider (PSP) Abstraction Layer
 * 
 * This module provides a clean interface for payment processing,
 * designed to be implemented by different providers (Stripe, etc.)
 * while using a mock implementation for development.
 * 
 * Architecture:
 * - PSPInterface: Defines the contract for payment operations
 * - MockPSP: Development/testing implementation
 * - StripePSP: Production Stripe implementation (optional)
 * - getPSP(): Factory function to get the appropriate implementation
 */

// ============================================
// TYPES
// ============================================

export interface DepositIntent {
  /** Unique identifier for this payment intent */
  intentId: string;
  /** Client secret for frontend to confirm payment */
  clientSecret: string;
  /** Amount in cents */
  amountCents: number;
  /** Currency code (e.g., "EUR") */
  currency: string;
  /** User ID who initiated the deposit */
  userId: string;
  /** Current status of the intent */
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  /** Timestamp when intent was created */
  createdAt: Date;
  /** Metadata for additional information */
  metadata?: Record<string, string>;
}

export interface CreateDepositIntentParams {
  /** User ID making the deposit */
  userId: string;
  /** Amount in cents */
  amountCents: number;
  /** Currency code (default: "EUR") */
  currency?: string;
  /** Optional metadata to attach */
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  /** Unique event ID from PSP */
  eventId: string;
  /** Type of event (e.g., "payment_succeeded") */
  type: string;
  /** Payment intent ID this event relates to */
  intentId: string;
  /** Amount that was processed */
  amountCents: number;
  /** Currency of the payment */
  currency: string;
  /** User ID from metadata */
  userId: string;
  /** Whether the payment succeeded */
  succeeded: boolean;
  /** Timestamp of the event */
  timestamp: Date;
  /** Raw event data for debugging */
  rawData?: unknown;
}

export interface WebhookVerificationResult {
  /** Whether the webhook signature is valid */
  valid: boolean;
  /** Parsed event data if valid */
  event?: WebhookEvent;
  /** Error message if invalid */
  error?: string;
}

// ============================================
// PAYOUT TYPES
// ============================================

export interface PayoutResult {
  /** Unique identifier for this payout */
  payoutId: string;
  /** User ID who initiated the payout */
  userId: string;
  /** Amount in cents */
  amountCents: number;
  /** Currency code */
  currency: string;
  /** Current status of the payout */
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  /** Timestamp when payout was created */
  createdAt: Date;
  /** Estimated arrival date (if available) */
  estimatedArrival?: Date;
  /** Failure reason (if failed) */
  failureReason?: string;
}

export interface CreatePayoutParams {
  /** User ID receiving the payout */
  userId: string;
  /** Amount in cents */
  amountCents: number;
  /** Currency code (default: "EUR") */
  currency?: string;
  /** Withdrawal request ID for reference */
  withdrawalRequestId: string;
  /** Optional metadata to attach */
  metadata?: Record<string, string>;
}

export interface PSPInterface {
  /** Name of the PSP implementation */
  readonly name: string;

  /**
   * Create a deposit payment intent
   * This initiates a payment flow that the user will complete
   */
  createDepositIntent(params: CreateDepositIntentParams): Promise<DepositIntent>;

  /**
   * Get the status of an existing intent
   */
  getIntent(intentId: string): Promise<DepositIntent | null>;

  /**
   * Cancel an existing intent
   */
  cancelIntent(intentId: string): Promise<boolean>;

  /**
   * Verify webhook signature and parse event
   * This is called by the webhook handler
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    timestamp?: number
  ): Promise<WebhookVerificationResult>;

  /**
   * Create a payout to a user
   * This initiates a payout flow to send funds to the user
   */
  createPayout(params: CreatePayoutParams): Promise<PayoutResult>;

  /**
   * Get the status of an existing payout
   */
  getPayout(payoutId: string): Promise<PayoutResult | null>;

  /**
   * Simulate a successful payment (for development/testing only)
   * Should throw error in production implementations
   */
  simulateSuccess?(intentId: string): Promise<WebhookEvent>;

  /**
   * Simulate a failed payment (for development/testing only)
   */
  simulateFailure?(intentId: string, reason?: string): Promise<WebhookEvent>;

  /**
   * Simulate a successful payout (for development/testing only)
   */
  simulatePayoutSuccess?(payoutId: string): Promise<PayoutResult>;

  /**
   * Simulate a failed payout (for development/testing only)
   */
  simulatePayoutFailure?(payoutId: string, reason?: string): Promise<PayoutResult>;
}

// ============================================
// PSP FACTORY
// ============================================

import { MockPSP } from './mockPsp';
import { StripePSP } from './stripePsp';

// Lazy-loaded Stripe implementation
let _stripePSP: PSPInterface | null = null;

/**
 * Get the appropriate PSP implementation based on environment
 * Auto-initializes Stripe if needed
 */
export function getPSP(): PSPInterface {
  const pspMode = process.env.PSP_MODE || 'mock';

  if (pspMode === 'stripe') {
    if (!_stripePSP) {
      _stripePSP = new StripePSP();
    }
    return _stripePSP as PSPInterface;
  }

  return new MockPSP();
}

/**
 * Initialize Stripe PSP (call this at server startup if using Stripe)
 * This ensures Stripe is properly initialized with credentials
 */
export async function initStripePSP(): Promise<PSPInterface> {
  const { StripePSP } = await import('./stripePsp');
  _stripePSP = new StripePSP();
  return _stripePSP;
}

/**
 * Check if we're using a real PSP (not mock)
 */
export function isRealPSP(): boolean {
  return process.env.PSP_MODE === 'stripe';
}

/**
 * Check if simulation is allowed (development mode)
 */
export function canSimulate(): boolean {
  return !isRealPSP();
}

// ============================================
// ERROR TYPES
// ============================================

export class PSPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'PSPError';
  }
}

export const PSPErrorCodes = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INTENT_NOT_FOUND: 'INTENT_NOT_FOUND',
  INTENT_ALREADY_PROCESSED: 'INTENT_ALREADY_PROCESSED',
  WEBHOOK_VERIFICATION_FAILED: 'WEBHOOK_VERIFICATION_FAILED',
  PSP_UNAVAILABLE: 'PSP_UNAVAILABLE',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  PAYOUT_FAILED: 'PAYOUT_FAILED',
  PAYOUT_NOT_FOUND: 'PAYOUT_NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_DESTINATION: 'INVALID_DESTINATION',
} as const;
