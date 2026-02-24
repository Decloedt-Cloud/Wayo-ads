/**
 * Finance Domain Types for Wallet & Ledger Architecture
 * 
 * This module defines the core types for the Upfront Funding + Internal Wallet/Ledger system.
 * All monetary values are stored as integer cents to avoid floating-point precision issues.
 */

// ============================================
// CONSTANTS
// ============================================

/** Default currency for all transactions */
export const DEFAULT_CURRENCY = 'EUR' as const;

/** Platform fee percentage - DEFAULT/FALLBACK value (3% ex VAT on campaign budget) */
/** NOTE: The actual fee rate is stored in PlatformSettings table and should be fetched via getPlatformFeeRate() */
export const PLATFORM_FEE_RATE = 0.03;

/** Minimum wallet balance in cents (cannot go below this) */
export const MIN_WALLET_BALANCE_CENTS = 0;

/** Minimum withdrawal amount in cents (e.g., €10.00 = 1000 cents) - DEFAULT */
/** NOTE: The actual minimum is stored in PlatformSettings table */
export const MIN_WITHDRAWAL_CENTS = 1000;

/** Pending balance hold period in days before becoming available - DEFAULT */
/** NOTE: The actual hold period is stored in PlatformSettings table */
export const PENDING_HOLD_DAYS = 7;

// ============================================
// ENUMS
// ============================================

/** Types of wallet transactions */
export type WalletTransactionType =
  | 'DEPOSIT'       // Funds added to wallet (e.g., via Stripe)
  | 'WITHDRAWAL'    // Funds withdrawn from wallet
  | 'HOLD'          // Funds locked for campaign budget
  | 'RELEASE'       // Funds released back to available
  | 'FEE'           // Platform fee deducted
  | 'ADJUSTMENT';   // Manual adjustment (admin)

/** Types of ledger entries for creator payouts */
export type LedgerEntryType =
  | 'VIEW_PAYOUT'       // Payout for validated view
  | 'CONVERSION_PAYOUT' // Payout for conversion
  | 'PLATFORM_FEE'      // Platform's cut of payout
  | 'REVERSAL';         // Reversal of previous payout

/** Reference types for wallet transactions */
export type WalletReferenceType =
  | 'CAMPAIGN_BUDGET'
  | 'CAMPAIGN_REFUND'
  | 'STRIPE_DEPOSIT'
  | 'STRIPE_WITHDRAWAL'
  | 'CREATOR_PAYOUT'
  | 'ADMIN_ADJUSTMENT';

// ============================================
// DOMAIN ENTITIES
// ============================================

/**
 * User Wallet - holds available and pending funds
 * 
 * Invariants:
 * - availableCents >= 0 (enforced at service layer)
 * - One wallet per user (unique constraint on ownerUserId)
 */
export interface Wallet {
  id: string;
  ownerUserId: string;
  currency: string;
  availableCents: number;
  pendingCents: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Wallet Transaction - history of all wallet movements
 * 
 * Invariants:
 * - amountCents is signed: positive for credits, negative for debits
 * - Immutable once created (append-only log)
 */
export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amountCents: number;
  currency: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
}

/**
 * Campaign Budget Lock - reserves funds when campaign goes active
 * 
 * Invariants:
 * - lockedCents <= wallet.availableCents (at time of lock)
 * - One lock per campaign (unique constraint on campaignId)
 * - Lock is created when campaign status changes to ACTIVE
 * - Lock is released when campaign is COMPLETED or CANCELLED
 */
export interface CampaignBudgetLock {
  id: string;
  campaignId: string;
  walletId: string;
  lockedCents: number;
  createdAt: Date;
}

/**
 * Ledger Entry - immutable record of creator payouts
 * 
 * Invariants:
 * - amountCents is signed: positive for credits, negative for reversals
 * - Immutable once created (append-only log)
 * - Sum of VIEW_PAYOUT entries for a creator drives their balance
 */
export interface LedgerEntry {
  id: string;
  campaignId: string;
  creatorId: string;
  type: LedgerEntryType;
  amountCents: number;
  refEventId: string | null;
  description: string | null;
  createdAt: Date;
}

/**
 * Creator Balance - aggregated view of creator earnings
 * 
 * This is a denormalized view for quick access to creator's balance.
 * The source of truth is the LedgerEntry table.
 * 
 * Invariants:
 * - availableCents = sum of settled payouts
 * - pendingCents = sum of payouts within hold period
 * - totalEarnedCents = lifetime earnings (never decreases)
 */
export interface CreatorBalance {
  id: string;
  creatorId: string;
  currency: string;
  availableCents: number;
  pendingCents: number;
  totalEarnedCents: number;
  updatedAt: Date;
}

// ============================================
// DTO TYPES (Data Transfer Objects)
// ============================================

/** Request to create a new wallet */
export interface CreateWalletRequest {
  ownerUserId: string;
  currency?: string;
}

/** Request to deposit funds to wallet */
export interface DepositRequest {
  walletId: string;
  amountCents: number;
  referenceType: WalletReferenceType;
  referenceId?: string;
  description?: string;
}

/** Request to withdraw funds from wallet */
export interface WithdrawalRequest {
  walletId: string;
  amountCents: number;
  destinationAccountId?: string; // External account for withdrawal
  description?: string;
}

/** Request to lock funds for campaign budget */
export interface LockBudgetRequest {
  campaignId: string;
  walletId: string;
  amountCents: number;
}

/** Request to release locked funds back to wallet */
export interface ReleaseBudgetRequest {
  campaignId: string;
  releaseAmountCents: number;
  reason: 'CAMPAIGN_COMPLETED' | 'CAMPAIGN_CANCELLED' | 'BUDGET_ADJUSTMENT';
}

/** Request to record a creator payout */
export interface RecordPayoutRequest {
  campaignId: string;
  creatorId: string;
  type: LedgerEntryType;
  amountCents: number;
  refEventId?: string;
  description?: string;
}

/** Response for wallet balance inquiry */
export interface WalletBalanceResponse {
  walletId: string;
  currency: string;
  availableCents: number;
  pendingCents: number;
  totalCents: number;
}

/** Response for creator balance inquiry */
export interface CreatorBalanceResponse {
  creatorId: string;
  currency: string;
  availableCents: number;
  pendingCents: number;
  totalEarnedCents: number;
}

// ============================================
// UTILITY TYPES
// ============================================

/** Money amount with currency */
export interface Money {
  amountCents: number;
  currency: string;
}

/** Result of a financial operation */
export interface FinanceOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: FinanceErrorCode;
}

/** Error codes for financial operations */
export type FinanceErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'WALLET_NOT_FOUND'
  | 'CAMPAIGN_LOCK_NOT_FOUND'
  | 'INVALID_AMOUNT'
  | 'CURRENCY_MISMATCH'
  | 'OPERATION_NOT_ALLOWED'
  | 'DATABASE_ERROR';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert cents to a formatted currency string
 * @example centsToFormattedString(1500, 'EUR') => '€15.00'
 */
export function centsToFormattedString(cents: number, currency: string = DEFAULT_CURRENCY): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Convert a decimal amount to cents
 * @example dollarsToCents(15.50) => 1550
 */
export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents to a decimal amount
 * @example centsToDollars(1550) => 15.50
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Calculate platform fee from gross amount
 * @example calculatePlatformFee(1000) => 30 (3% of 1000 cents)
 */
export function calculatePlatformFee(grossCents: number, feeRate: number = PLATFORM_FEE_RATE): number {
  return Math.round(grossCents * feeRate);
}

/**
 * Calculate net payout after platform fee
 * @example calculateNetPayout(1000) => 970 (1000 - 3% fee)
 */
export function calculateNetPayout(grossCents: number, feeRate: number = PLATFORM_FEE_RATE): number {
  return grossCents - calculatePlatformFee(grossCents, feeRate);
}

/**
 * Check if an amount is valid (non-negative integer)
 */
export function isValidAmount(amountCents: number): boolean {
  return Number.isInteger(amountCents) && amountCents >= 0;
}

/**
 * Check if wallet has sufficient funds
 */
export function hasSufficientFunds(wallet: Wallet, requiredCents: number): boolean {
  return wallet.availableCents >= requiredCents;
}
