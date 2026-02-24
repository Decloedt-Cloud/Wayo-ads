/**
 * Stripe Settings Service
 * 
 * Manages Stripe credentials for the platform with proper encryption.
 * All secrets are encrypted before storage and never returned in plaintext.
 * 
 * Security:
 * - Only SUPERADMIN can access these functions
 * - All secrets encrypted with AES-256-GCM
 * - Audit logging for all changes
 */

import { z } from 'zod';
import { adminSettingsRepository, userRepository } from './repositories';
import { encrypt, decrypt, maskSecret, maskPublishableKey } from '@/lib/security/crypto';

// ============================================
// TYPES
// ============================================

export interface StripeSettingsInput {
  mode: 'TEST' | 'LIVE';
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  connectAccountId?: string;
}

export interface StripeSettingsOutput {
  id: string;
  mode: 'TEST' | 'LIVE';
  isActive: boolean;
  // Masked values for display
  publishableKeyMasked: string | null;
  secretKeyMasked: string | null;
  webhookSecretMasked: string | null;
  connectAccountIdMasked: string | null;
  // Metadata
  updatedAt: Date;
  updatedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface StripeCredentials {
  mode: 'TEST' | 'LIVE';
  publishableKey: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
  connectAccountId: string | null;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: {
    accountId?: string;
    accountName?: string;
    mode: 'TEST' | 'LIVE';
  };
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const stripeKeySchema = z.string().min(1).max(256).optional();
const connectAccountIdSchema = z.string().min(1).max(128).optional();

export const stripeSettingsInputSchema = z.object({
  mode: z.enum(['TEST', 'LIVE']),
  publishableKey: stripeKeySchema,
  secretKey: stripeKeySchema,
  webhookSecret: stripeKeySchema,
  connectAccountId: connectAccountIdSchema,
});

// ============================================
// ERROR CODES
// ============================================

export class StripeSettingsError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'StripeSettingsError';
  }
}

export const StripeSettingsErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  SETTINGS_NOT_FOUND: 'SETTINGS_NOT_FOUND',
  TEST_CONNECTION_FAILED: 'TEST_CONNECTION_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================
// AUDIT LOGGING
// ============================================

interface AuditLogParams {
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await adminSettingsRepository.createAuditLog({
      userId: params.userId,
      action: params.action,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    console.error('[StripeSettings] Failed to create audit log:', error);
  }
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get the active Stripe settings (masked for display)
 */
export async function getStripeSettings(): Promise<StripeSettingsOutput | null> {
  try {
    const settings = await adminSettingsRepository.findStripeSettingsWithUser({ isActive: true });

    if (!settings) {
      return null;
    }

    return {
      id: settings.id,
      mode: settings.mode as 'TEST' | 'LIVE',
      isActive: settings.isActive,
      publishableKeyMasked: settings.stripePublishableKeyEncrypted
        ? maskPublishableKey(decrypt(settings.stripePublishableKeyEncrypted))
        : null,
      secretKeyMasked: settings.stripeSecretKeyEncrypted
        ? maskSecret(decrypt(settings.stripeSecretKeyEncrypted))
        : null,
      webhookSecretMasked: settings.stripeWebhookSecretEncrypted
        ? maskSecret(decrypt(settings.stripeWebhookSecretEncrypted))
        : null,
      connectAccountIdMasked: settings.stripeConnectAccountIdEncrypted
        ? maskSecret(decrypt(settings.stripeConnectAccountIdEncrypted))
        : null,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    };
  } catch (error) {
    console.error('[StripeSettings] Failed to get settings:', error);
    throw new StripeSettingsError(
      'Failed to retrieve Stripe settings',
      StripeSettingsErrorCodes.DATABASE_ERROR
    );
  }
}

/**
 * Get decrypted Stripe credentials (for internal use only!)
 * This should only be called by server-side code.
 */
export async function getStripeCredentials(): Promise<StripeCredentials | null> {
  try {
    const settings = await adminSettingsRepository.findStripeSettings({ isActive: true });

    if (!settings) {
      console.log('[StripeSettings] No active settings found in DB');
      return null;
    }

    console.log('[StripeSettings] Found active settings in DB, mode:', settings.mode);

    return {
      mode: settings.mode as 'TEST' | 'LIVE',
      publishableKey: settings.stripePublishableKeyEncrypted
        ? decrypt(settings.stripePublishableKeyEncrypted)
        : null,
      secretKey: settings.stripeSecretKeyEncrypted
        ? decrypt(settings.stripeSecretKeyEncrypted)
        : null,
      webhookSecret: settings.stripeWebhookSecretEncrypted
        ? decrypt(settings.stripeWebhookSecretEncrypted)
        : null,
      connectAccountId: settings.stripeConnectAccountIdEncrypted
        ? decrypt(settings.stripeConnectAccountIdEncrypted)
        : null,
    };
  } catch (error) {
    console.error('[StripeSettings] Failed to get credentials:', error);
    return null;
  }
}

/**
 * Update Stripe settings
 */
export async function updateStripeSettings(
  input: StripeSettingsInput,
  userId: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<StripeSettingsOutput> {
  // Validate input
  const validated = stripeSettingsInputSchema.parse(input);

  // Encrypt secrets
  let publishableKeyEncrypted: string | undefined;
  let secretKeyEncrypted: string | undefined;
  let webhookSecretEncrypted: string | undefined;
  let connectAccountIdEncrypted: string | undefined;

  try {
    if (validated.publishableKey) {
      publishableKeyEncrypted = encrypt(validated.publishableKey);
    }
    if (validated.secretKey) {
      secretKeyEncrypted = encrypt(validated.secretKey);
    }
    if (validated.webhookSecret) {
      webhookSecretEncrypted = encrypt(validated.webhookSecret);
    }
    if (validated.connectAccountId) {
      connectAccountIdEncrypted = encrypt(validated.connectAccountId);
    }
  } catch (error) {
    throw new StripeSettingsError(
      'Failed to encrypt credentials',
      StripeSettingsErrorCodes.ENCRYPTION_FAILED
    );
  }

  try {
    const result = await adminSettingsRepository.transaction(async (tx) => {
      await adminSettingsRepository.deactivateAllStripeSettings();

      const newSettings = await tx.stripeSettings.create({
        data: {
          mode: validated.mode,
          stripePublishableKeyEncrypted: publishableKeyEncrypted,
          stripeSecretKeyEncrypted: secretKeyEncrypted,
          stripeWebhookSecretEncrypted: webhookSecretEncrypted,
          stripeConnectAccountIdEncrypted: connectAccountIdEncrypted,
          isActive: true,
          updatedByUserId: userId,
        },
        include: {
          updatedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return newSettings;
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: 'STRIPE_SETTINGS_UPDATED',
      metadata: {
        mode: validated.mode,
        hasPublishableKey: !!validated.publishableKey,
        hasSecretKey: !!validated.secretKey,
        hasWebhookSecret: !!validated.webhookSecret,
        hasConnectAccountId: !!validated.connectAccountId,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    return {
      id: result.id,
      mode: result.mode as 'TEST' | 'LIVE',
      isActive: result.isActive,
      publishableKeyMasked: validated.publishableKey
        ? maskPublishableKey(validated.publishableKey)
        : null,
      secretKeyMasked: validated.secretKey
        ? maskSecret(validated.secretKey)
        : null,
      webhookSecretMasked: validated.webhookSecret
        ? maskSecret(validated.webhookSecret)
        : null,
      connectAccountIdMasked: validated.connectAccountId
        ? maskSecret(validated.connectAccountId)
        : null,
      updatedAt: result.updatedAt,
      updatedBy: result.updatedBy,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new StripeSettingsError(
        'Invalid input',
        StripeSettingsErrorCodes.INVALID_INPUT
      );
    }
    console.error('[StripeSettings] Failed to update settings:', error);
    throw new StripeSettingsError(
      'Failed to update Stripe settings',
      StripeSettingsErrorCodes.DATABASE_ERROR
    );
  }
}

/**
 * Test Stripe connection by validating credentials
 */
export async function testStripeConnection(
  userId: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<TestConnectionResult> {
  const credentials = await getStripeCredentials();

  if (!credentials || !credentials.secretKey) {
    return {
      success: false,
      message: 'No Stripe credentials configured',
    };
  }

  try {
    // Dynamic import to avoid bundling stripe if not needed
    const Stripe = (await import('stripe')).default;
    
    const stripe = new Stripe(credentials.secretKey, {
      apiVersion: '2026-01-28.clover',
    });

    // Test by retrieving account balance (simple read operation)
    const balance = await stripe.balance.retrieve();

    // Create audit log
    await createAuditLog({
      userId,
      action: 'STRIPE_TEST_CONNECTION',
      metadata: {
        mode: credentials.mode,
        success: true,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    return {
      success: true,
      message: 'Successfully connected to Stripe',
      details: {
        mode: credentials.mode,
        accountId: credentials.connectAccountId || undefined,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Create audit log for failure
    await createAuditLog({
      userId,
      action: 'STRIPE_TEST_CONNECTION',
      metadata: {
        mode: credentials.mode,
        success: false,
        error: errorMessage,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    return {
      success: false,
      message: `Failed to connect to Stripe: ${errorMessage}`,
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if Stripe is configured
 */
export async function isStripeConfigured(): Promise<boolean> {
  const credentials = await getStripeCredentials();
  return !!(credentials && credentials.secretKey);
}

/**
 * Get the Stripe publishable key for frontend use
 */
export async function getStripePublishableKey(): Promise<string | null> {
  const credentials = await getStripeCredentials();
  return credentials?.publishableKey || null;
}
