/**
 * Mock Payment Service Provider
 * 
 * Development/testing implementation that simulates payment processing
 * without requiring external services. Stores intents in memory and
 * allows manual simulation of success/failure.
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

// ============================================
// IN-MEMORY STORAGE
// ============================================

// Store intents in memory for development
const intentsStore = new Map<string, DepositIntent>();

// Store webhook events for retrieval
const eventsStore = new Map<string, WebhookEvent>();

// Store payouts in memory
const payoutsStore = new Map<string, PayoutResult>();

// ============================================
// MOCK PSP IMPLEMENTATION
// ============================================

export class MockPSP implements PSPInterface {
  readonly name = 'MockPSP';

  /**
   * Create a mock deposit intent
   */
  async createDepositIntent(params: CreateDepositIntentParams): Promise<DepositIntent> {
    const { userId, amountCents, currency = 'EUR', metadata } = params;

    // Validate amount
    if (amountCents <= 0 || amountCents > 1000000000) {
      throw new PSPError(
        'Invalid amount. Must be between 1 cent and €10,000,000.',
        PSPErrorCodes.INVALID_AMOUNT,
        400
      );
    }

    // Generate mock intent ID and client secret
    const intentId = `mock_pi_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const clientSecret = `mock_cs_${Math.random().toString(36).substring(2, 20)}`;

    const intent: DepositIntent = {
      intentId,
      clientSecret,
      amountCents,
      currency,
      userId,
      status: 'pending',
      createdAt: new Date(),
      metadata: {
        ...metadata,
        mock: 'true',
      },
    };

    // Store in memory
    intentsStore.set(intentId, intent);

    return intent;
  }

  /**
   * Get an existing intent
   */
  async getIntent(intentId: string): Promise<DepositIntent | null> {
    return intentsStore.get(intentId) || null;
  }

  /**
   * Cancel an intent
   */
  async cancelIntent(intentId: string): Promise<boolean> {
    const intent = intentsStore.get(intentId);
    if (!intent) {
      return false;
    }

    if (intent.status !== 'pending') {
      return false;
    }

    intent.status = 'cancelled';
    intentsStore.set(intentId, intent);

    return true;
  }

  /**
   * Verify webhook signature (always succeeds in mock mode)
   * In development, we accept any properly formatted payload
   */
  async verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    _timestamp?: number
  ): Promise<WebhookVerificationResult> {
    try {
      // Parse the payload
      const data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());

      // In mock mode, we trust properly formatted requests
      // The signature should be the intent ID for simulation
      const intentId = signature || data.intentId;

      if (!intentId) {
        return {
          valid: false,
          error: 'Missing intent ID in mock webhook',
        };
      }

      const intent = intentsStore.get(intentId);
      if (!intent) {
        return {
          valid: false,
          error: 'Intent not found',
        };
      }

      // Create webhook event from the data
      const event: WebhookEvent = {
        eventId: `mock_evt_${Date.now()}`,
        type: data.type || 'payment_succeeded',
        intentId,
        amountCents: data.amountCents || intent.amountCents,
        currency: data.currency || intent.currency,
        userId: intent.userId,
        succeeded: data.type === 'payment_succeeded' || data.succeeded === true,
        timestamp: new Date(),
        rawData: data,
      };

      return {
        valid: true,
        event,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to parse mock webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================
  // PAYOUT METHODS
  // ============================================

  /**
   * Create a mock payout
   * In mock mode, we simulate immediate success for development
   */
  async createPayout(params: CreatePayoutParams): Promise<PayoutResult> {
    const { userId, amountCents, currency = 'EUR', withdrawalRequestId, metadata } = params;

    // Validate amount
    if (amountCents <= 0 || amountCents > 1000000000) {
      throw new PSPError(
        'Invalid amount. Must be between 1 cent and €10,000,000.',
        PSPErrorCodes.INVALID_AMOUNT,
        400
      );
    }

    // Generate mock payout ID
    const payoutId = `mock_po_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const payout: PayoutResult = {
      payoutId,
      userId,
      amountCents,
      currency,
      status: 'processing', // Start as processing
      createdAt: new Date(),
      estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    };

    // Store in memory
    payoutsStore.set(payoutId, payout);

    // In mock mode, auto-succeed after a short delay (simulating async processing)
    // For MVP, we can return immediately as succeeded
    payout.status = 'succeeded';
    payoutsStore.set(payoutId, payout);

    return payout;
  }

  /**
   * Get an existing payout
   */
  async getPayout(payoutId: string): Promise<PayoutResult | null> {
    return payoutsStore.get(payoutId) || null;
  }

  /**
   * Simulate a successful payment
   * This is called manually in development to trigger the webhook flow
   */
  async simulateSuccess(intentId: string): Promise<WebhookEvent> {
    const intent = intentsStore.get(intentId);
    if (!intent) {
      throw new PSPError(
        `Intent not found: ${intentId}`,
        PSPErrorCodes.INTENT_NOT_FOUND,
        404
      );
    }

    if (intent.status !== 'pending') {
      throw new PSPError(
        `Intent already processed: ${intent.status}`,
        PSPErrorCodes.INTENT_ALREADY_PROCESSED,
        400
      );
    }

    // Update intent status
    intent.status = 'succeeded';
    intentsStore.set(intentId, intent);

    // Create webhook event
    const event: WebhookEvent = {
      eventId: `mock_evt_success_${Date.now()}`,
      type: 'payment_succeeded',
      intentId,
      amountCents: intent.amountCents,
      currency: intent.currency,
      userId: intent.userId,
      succeeded: true,
      timestamp: new Date(),
    };

    eventsStore.set(event.eventId, event);

    return event;
  }

  /**
   * Simulate a failed payment
   */
  async simulateFailure(intentId: string, reason?: string): Promise<WebhookEvent> {
    const intent = intentsStore.get(intentId);
    if (!intent) {
      throw new PSPError(
        `Intent not found: ${intentId}`,
        PSPErrorCodes.INTENT_NOT_FOUND,
        404
      );
    }

    if (intent.status !== 'pending') {
      throw new PSPError(
        `Intent already processed: ${intent.status}`,
        PSPErrorCodes.INTENT_ALREADY_PROCESSED,
        400
      );
    }

    // Update intent status
    intent.status = 'failed';
    intentsStore.set(intentId, intent);

    // Create webhook event
    const event: WebhookEvent = {
      eventId: `mock_evt_fail_${Date.now()}`,
      type: 'payment_failed',
      intentId,
      amountCents: intent.amountCents,
      currency: intent.currency,
      userId: intent.userId,
      succeeded: false,
      timestamp: new Date(),
      rawData: { reason: reason || 'Simulated failure' },
    };

    eventsStore.set(event.eventId, event);

    return event;
  }

  /**
   * Simulate a successful payout
   */
  async simulatePayoutSuccess(payoutId: string): Promise<PayoutResult> {
    const payout = payoutsStore.get(payoutId);
    if (!payout) {
      throw new PSPError(
        `Payout not found: ${payoutId}`,
        PSPErrorCodes.PAYOUT_NOT_FOUND,
        404
      );
    }

    if (payout.status === 'succeeded') {
      return payout; // Already succeeded
    }

    // Update payout status
    payout.status = 'succeeded';
    payout.failureReason = undefined;
    payoutsStore.set(payoutId, payout);

    return payout;
  }

  /**
   * Simulate a failed payout
   */
  async simulatePayoutFailure(payoutId: string, reason?: string): Promise<PayoutResult> {
    const payout = payoutsStore.get(payoutId);
    if (!payout) {
      throw new PSPError(
        `Payout not found: ${payoutId}`,
        PSPErrorCodes.PAYOUT_NOT_FOUND,
        404
      );
    }

    // Update payout status
    payout.status = 'failed';
    payout.failureReason = reason || 'Simulated failure';
    payoutsStore.set(payoutId, payout);

    return payout;
  }

  /**
   * Get all intents (for debugging/testing)
   */
  getAllIntents(): DepositIntent[] {
    return Array.from(intentsStore.values());
  }

  /**
   * Get all events (for debugging/testing)
   */
  getAllEvents(): WebhookEvent[] {
    return Array.from(eventsStore.values());
  }

  /**
   * Get all payouts (for debugging/testing)
   */
  getAllPayouts(): PayoutResult[] {
    return Array.from(payoutsStore.values());
  }

  /**
   * Clear all stored data (for testing)
   */
  clearAll(): void {
    intentsStore.clear();
    eventsStore.clear();
    payoutsStore.clear();
  }
}

// ============================================
// SINGLETON EXPORT FOR DEVELOPMENT
// ============================================

// Export a singleton instance for consistent state during development
export const mockPSPInstance = new MockPSP();
