/**
 * Platform Settings Service
 * 
 * Manages platform-wide configuration settings including:
 * - Platform fee rate
 * - Default currency
 * - Minimum withdrawal amount
 * - Pending hold period
 * 
 * All settings have sensible defaults and can be updated by SUPERADMIN.
 */

import { z } from 'zod';
import { adminSettingsRepository } from './repositories';

// ============================================
// TYPES
// ============================================

export interface PlatformSettingsInput {
  platformFeeRate: number;
  platformFeeDescription?: string;
  defaultCurrency: string;
  minimumWithdrawalCents: number;
  pendingHoldDays: number;
}

export interface PlatformSettingsOutput {
  id: string;
  platformFeeRate: number;
  platformFeeDescription: string | null;
  defaultCurrency: string;
  minimumWithdrawalCents: number;
  pendingHoldDays: number;
  updatedAt: Date;
  updatedByUserId: string | null;
}

export interface PlatformFeeInfo {
  rate: number;
  description: string;
  percentageDisplay: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const platformSettingsInputSchema = z.object({
  platformFeeRate: z.number().min(0).max(1, 'Fee rate cannot exceed 100%'),
  platformFeeDescription: z.string().max(256).optional(),
  defaultCurrency: z.string().length(3, 'Currency must be 3 characters (e.g., EUR)'),
  minimumWithdrawalCents: z.number().int().min(100, 'Minimum withdrawal must be at least €1'),
  pendingHoldDays: z.number().int().min(0).max(365, 'Hold period cannot exceed 365 days'),
});

// ============================================
// ERROR CODES
// ============================================

export class PlatformSettingsError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PlatformSettingsError';
  }
}

export const PlatformSettingsErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_INPUT: 'INVALID_INPUT',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================
// CACHING
// ============================================

let cachedSettings: PlatformSettingsOutput | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Clear the settings cache
 */
export function clearPlatformSettingsCache(): void {
  cachedSettings = null;
  lastCacheTime = 0;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get platform settings (with caching)
 */
export async function getPlatformSettings(): Promise<PlatformSettingsOutput> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (cachedSettings && (now - lastCacheTime) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const settings = await adminSettingsRepository.findPlatformSettings();

    if (!settings) {
      const newSettings = await adminSettingsRepository.createPlatformSettings({
        platformFeeRate: 0.03,
        platformFeeDescription: '3% (ex VAT)',
        defaultCurrency: 'EUR',
        minimumWithdrawalCents: 1000,
        pendingHoldDays: 7,
      });
      
      const output: PlatformSettingsOutput = {
        id: newSettings.id,
        platformFeeRate: newSettings.platformFeeRate,
        platformFeeDescription: newSettings.platformFeeDescription,
        defaultCurrency: newSettings.defaultCurrency,
        minimumWithdrawalCents: newSettings.minimumWithdrawalCents,
        pendingHoldDays: newSettings.pendingHoldDays,
        updatedAt: newSettings.updatedAt,
        updatedByUserId: newSettings.updatedByUserId,
      };
      
      cachedSettings = output;
      lastCacheTime = now;
      
      return output;
    }

    const output: PlatformSettingsOutput = {
      id: settings.id,
      platformFeeRate: settings.platformFeeRate,
      platformFeeDescription: settings.platformFeeDescription,
      defaultCurrency: settings.defaultCurrency,
      minimumWithdrawalCents: settings.minimumWithdrawalCents,
      pendingHoldDays: settings.pendingHoldDays,
      updatedAt: settings.updatedAt,
      updatedByUserId: settings.updatedByUserId,
    };

    // Update cache
    cachedSettings = output;
    lastCacheTime = now;

    return output;
  } catch (error) {
    console.error('[PlatformSettings] Failed to get settings:', error);
    throw new PlatformSettingsError(
      'Failed to retrieve platform settings',
      PlatformSettingsErrorCodes.DATABASE_ERROR
    );
  }
}

/**
 * Get platform fee rate (convenience function)
 * Returns the fee rate as a decimal (e.g., 0.03 for 3%)
 */
export async function getPlatformFeeRate(): Promise<number> {
  const settings = await getPlatformSettings();
  return settings.platformFeeRate;
}

/**
 * Get platform fee info for display
 */
export async function getPlatformFeeInfo(): Promise<PlatformFeeInfo> {
  const settings = await getPlatformSettings();
  const percentage = settings.platformFeeRate * 100;
  
  return {
    rate: settings.platformFeeRate,
    description: settings.platformFeeDescription || `${percentage}%`,
    percentageDisplay: `${percentage}%`,
  };
}

/**
 * Get minimum withdrawal amount in cents
 */
export async function getMinimumWithdrawalCents(): Promise<number> {
  const settings = await getPlatformSettings();
  return settings.minimumWithdrawalCents;
}

/**
 * Get pending hold period in days
 */
export async function getPendingHoldDays(): Promise<number> {
  const settings = await getPlatformSettings();
  return settings.pendingHoldDays;
}

/**
 * Update platform settings
 */
export async function updatePlatformSettings(
  input: PlatformSettingsInput,
  userId: string
): Promise<PlatformSettingsOutput> {
  // Validate input
  const validated = platformSettingsInputSchema.parse(input);

  try {
    const result = await adminSettingsRepository.transaction(async (tx) => {
      await tx.platformSettings.deleteMany({});

      const newSettings = await tx.platformSettings.create({
        data: {
          platformFeeRate: validated.platformFeeRate,
          platformFeeDescription: validated.platformFeeDescription,
          defaultCurrency: validated.defaultCurrency,
          minimumWithdrawalCents: validated.minimumWithdrawalCents,
          pendingHoldDays: validated.pendingHoldDays,
          updatedByUserId: userId,
        },
      });

      return newSettings;
    });

    await adminSettingsRepository.createAuditLog({
      userId,
      action: 'PLATFORM_SETTINGS_UPDATED',
      metadata: JSON.stringify({
        platformFeeRate: validated.platformFeeRate,
        defaultCurrency: validated.defaultCurrency,
        minimumWithdrawalCents: validated.minimumWithdrawalCents,
        pendingHoldDays: validated.pendingHoldDays,
      }),
    });

    // Clear cache
    clearPlatformSettingsCache();

    return {
      id: result.id,
      platformFeeRate: result.platformFeeRate,
      platformFeeDescription: result.platformFeeDescription,
      defaultCurrency: result.defaultCurrency,
      minimumWithdrawalCents: result.minimumWithdrawalCents,
      pendingHoldDays: result.pendingHoldDays,
      updatedAt: result.updatedAt,
      updatedByUserId: result.updatedByUserId,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new PlatformSettingsError(
        'Invalid input',
        PlatformSettingsErrorCodes.INVALID_INPUT
      );
    }
    console.error('[PlatformSettings] Failed to update settings:', error);
    throw new PlatformSettingsError(
      'Failed to update platform settings',
      PlatformSettingsErrorCodes.DATABASE_ERROR
    );
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate platform fee from gross amount using current settings
 */
export async function calculatePlatformFeeFromSettings(grossCents: number): Promise<number> {
  const feeRate = await getPlatformFeeRate();
  return Math.round(grossCents * feeRate);
}

/**
 * Calculate net payout after platform fee using current settings
 */
export async function calculateNetPayoutFromSettings(grossCents: number): Promise<number> {
  const platformFee = await calculatePlatformFeeFromSettings(grossCents);
  return grossCents - platformFee;
}

/**
 * Format fee rate for display
 */
export function formatFeeRate(rate: number): string {
  return `${(rate * 100).toFixed(rate < 0.01 ? 2 : 0)}%`;
}
