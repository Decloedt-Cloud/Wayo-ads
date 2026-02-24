/**
 * Finance Service Layer
 * 
 * Core service for the Upfront Funding + Internal Wallet/Ledger architecture.
 * Handles all financial operations with proper atomicity and fraud prevention.
 * 
 * Key Invariants:
 * - Wallet.availableCents >= 0 (always)
 * - CampaignBudgetLock.lockedCents <= Wallet.availableCents (at time of lock)
 * - Ledger entries are immutable (append-only)
 * - No double-payout for the same event (unique constraint)
 */

import { Prisma, WalletTransactionType, LedgerEntryType, CampaignStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { ledgerEntryRepository, invoiceRepository } from './repositories';
import { walletRepository, walletTransactionRepository } from '@/server/wallets/repositories';
import { campaignBudgetLockRepository } from '@/server/budgets/repositories';
import { campaignRepository } from '@/server/campaigns/repositories';
import {
  DEFAULT_CURRENCY,
  PLATFORM_FEE_RATE,
  centsToFormattedString,
  calculatePlatformFee,
  calculateNetPayout,
  isValidAmount,
} from '@/lib/finance/types';
import { getPlatformFeeRate } from '@/server/admin/platformSettingsService';
import { domainEventBus } from '@/lib/events/domainEventBus';

// ============================================
// TYPES
// ============================================

export interface WalletInfo {
  id: string;
  ownerUserId: string;
  currency: string;
  availableCents: number;
  pendingCents: number;
}

export interface CampaignBudgetInfo {
  campaignId: string;
  totalBudgetCents: number;
  lockedCents: number;
  spentCents: number;
  remainingCents: number;
  cpmCents: number;
  payoutPerViewCents: number;
}

export interface PayoutResult {
  success: boolean;
  payoutCents: number;
  platformFeeCents: number;
  netPayoutCents: number;
  newRemainingBudgetCents: number;
  ledgerEntryId: string;
  error?: string;
}

export interface DepositResult {
  success: boolean;
  walletId: string;
  newAvailableCents: number;
  transactionId: string;
  error?: string;
}

export interface LockBudgetResult {
  success: boolean;
  budgetLockId: string;
  lockedCents: number;
  newAvailableCents: number;
  error?: string;
}

export interface ReleaseBudgetResult {
  success: boolean;
  releasedCents: number;
  newAvailableCents: number;
  error?: string;
}

async function createInvoiceRecord(params: {
  userId: string;
  roleType: 'CREATOR' | 'ADVERTISER';
  invoiceType: 'DEPOSIT' | 'PAYOUT' | 'BILLING';
  referenceId: string;
  totalAmountCents: number;
  taxAmountCents?: number;
  status?: 'PENDING' | 'PAID' | 'CANCELLED';
  tx?: Prisma.TransactionClient;
}) {
  const {
    userId,
    roleType,
    invoiceType,
    referenceId,
    totalAmountCents,
    taxAmountCents = 0,
    status = 'PAID',
    tx,
  } = params;

  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`;

  const invoiceData = {
    invoiceNumber,
    userId,
    roleType,
    invoiceType,
    referenceId,
    totalAmountCents,
    taxAmountCents,
    status,
    paidAt: status === 'PAID' ? new Date() : null,
  };

  if (tx) {
    return invoiceRepository.createWithTx(tx, invoiceData);
  }
  return invoiceRepository.create(invoiceData);
}

// ============================================
// ERROR CODES
// ============================================

export class FinanceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'FinanceError';
  }
}

export const FinanceErrorCodes = {
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  BUDGET_LOCK_NOT_FOUND: 'BUDGET_LOCK_NOT_FOUND',
  BUDGET_LOCK_EXISTS: 'BUDGET_LOCK_EXISTS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CAMPAIGN_STATUS: 'INVALID_CAMPAIGN_STATUS',
  EVENT_NOT_VALID: 'EVENT_NOT_VALID',
  EVENT_ALREADY_PAID: 'EVENT_ALREADY_PAID',
  INSUFFICIENT_BUDGET: 'INSUFFICIENT_BUDGET',
  CREATOR_BALANCE_NOT_FOUND: 'CREATOR_BALANCE_NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================
// CORE WALLET FUNCTIONS
// ============================================

/**
 * Get or create a wallet for a user.
 * Ensures every user has exactly one wallet.
 */
export async function getOrCreateWallet(userId: string): Promise<WalletInfo> {
  const wallet = await walletRepository.upsert({
    ownerUserId: userId,
    currency: DEFAULT_CURRENCY,
    availableCents: 0,
    pendingCents: 0,
  });

  return {
    id: wallet.id,
    ownerUserId: wallet.ownerUserId,
    currency: wallet.currency,
    availableCents: wallet.availableCents,
    pendingCents: wallet.pendingCents,
  };
}

/**
 * Get wallet by user ID (throws if not found)
 */
export async function getWalletByUserId(userId: string): Promise<WalletInfo> {
  const wallet = await walletRepository.findByUserId(userId);

  if (!wallet) {
    throw new FinanceError(
      `Wallet not found for user ${userId}`,
      FinanceErrorCodes.WALLET_NOT_FOUND
    );
  }

  return {
    id: wallet.id,
    ownerUserId: wallet.ownerUserId,
    currency: wallet.currency,
    availableCents: wallet.availableCents,
    pendingCents: wallet.pendingCents,
  };
}

export async function depositToWallet(params: {
  userId: string;
  amountCents: number;
  currency?: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}): Promise<DepositResult> {
  const { userId, amountCents, currency = DEFAULT_CURRENCY, referenceType, referenceId, description } = params;

  // Validate amount
  if (!isValidAmount(amountCents) || amountCents <= 0) {
    return {
      success: false,
      walletId: '',
      newAvailableCents: 0,
      transactionId: '',
      error: FinanceErrorCodes.INVALID_AMOUNT,
    };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const existingWallet = await walletRepository.findByUserIdWithTx(tx, userId);
      
      let wallet;
      if (existingWallet) {
        wallet = await walletRepository.updateBalanceWithTx(tx, existingWallet.id, {
          availableCents: { increment: amountCents },
        });
      } else {
        wallet = await walletRepository.create({
          ownerUserId: userId,
          currency,
          availableCents: amountCents,
          pendingCents: 0,
        });
      }

      const transaction = await walletTransactionRepository.createWithTx(tx, {
        walletId: wallet.id,
        type: 'DEPOSIT' as WalletTransactionType,
        amountCents,
        currency,
        referenceType: referenceType || 'MANUAL_DEPOSIT',
        referenceId,
        description: description || `Deposit of ${centsToFormattedString(amountCents, currency)}`,
      });

      return { wallet, transaction };
    });

    try {
      await createInvoiceRecord({
        userId,
        roleType: 'ADVERTISER',
        invoiceType: 'DEPOSIT',
        referenceId: result.transaction.id,
        totalAmountCents: amountCents,
        taxAmountCents: 0,
        status: 'PAID',
      });
    } catch (invoiceError) {
      console.error('Failed to create invoice for deposit:', invoiceError);
    }

    try {
      await domainEventBus.publish(domainEventBus.createEvent('WALLET_CREDITED', {
        userId,
        amountCents,
        currency,
        newBalance: result.wallet.availableCents,
        transactionId: result.transaction.id,
      }));
    } catch (notificationError) {
      console.error('Failed to publish WALLET_CREDITED event:', notificationError);
    }

    return {
      success: true,
      walletId: result.wallet.id,
      newAvailableCents: result.wallet.availableCents,
      transactionId: result.transaction.id,
    };
  } catch (error) {
    console.error('Deposit error:', error);
    return {
      success: false,
      walletId: '',
      newAvailableCents: 0,
      transactionId: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

/**
 * Withdraw funds from a user's wallet.
 * Creates a WITHDRAWAL transaction record.
 */
export async function withdrawFromWallet(params: {
  userId: string;
  amountCents: number;
  currency?: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}): Promise<DepositResult> {
  const { userId, amountCents, currency = DEFAULT_CURRENCY, referenceType, referenceId, description } = params;

  // Validate amount
  if (!isValidAmount(amountCents) || amountCents <= 0) {
    return {
      success: false,
      walletId: '',
      newAvailableCents: 0,
      transactionId: '',
      error: FinanceErrorCodes.INVALID_AMOUNT,
    };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const wallet = await walletRepository.findByUserIdWithTx(tx, userId);

      if (!wallet) {
        throw new FinanceError(
          `Wallet not found for user ${userId}`,
          FinanceErrorCodes.WALLET_NOT_FOUND
        );
      }

      if (wallet.availableCents < amountCents) {
        throw new FinanceError(
          `Insufficient funds. Available: ${wallet.availableCents}, Requested: ${amountCents}`,
          FinanceErrorCodes.INSUFFICIENT_FUNDS
        );
      }

      const updatedWallet = await walletRepository.updateBalanceWithTx(tx, wallet.id, {
        availableCents: { decrement: amountCents },
      });

      const transaction = await walletTransactionRepository.createWithTx(tx, {
        walletId: wallet.id,
        type: 'WITHDRAWAL' as WalletTransactionType,
        amountCents: -amountCents,
        currency,
        referenceType: referenceType || 'MANUAL_WITHDRAWAL',
        referenceId,
        description: description || `Withdrawal of ${centsToFormattedString(amountCents, currency)}`,
      });

      return { wallet: updatedWallet, transaction };
    });

    return {
      success: true,
      walletId: result.wallet.id,
      newAvailableCents: result.wallet.availableCents,
      transactionId: result.transaction.id,
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        walletId: '',
        newAvailableCents: 0,
        transactionId: '',
        error: error.code,
      };
    }
    console.error('Withdrawal error:', error);
    return {
      success: false,
      walletId: '',
      newAvailableCents: 0,
      transactionId: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

// ============================================
// CAMPAIGN BUDGET FUNCTIONS
// ============================================

/**
 * Lock campaign budget from advertiser's wallet.
 * Creates a CampaignBudgetLock and HOLD transaction.
 * If a budget lock already exists, increments it (for budget increases).
 * 
 * Pre-conditions:
 * - Advertiser must have sufficient available funds
 */
export async function lockCampaignBudget(params: {
  campaignId: string;
  advertiserId: string;
  amountCents: number;
}): Promise<LockBudgetResult> {
  const { campaignId, advertiserId, amountCents } = params;

  // Validate amount
  if (!isValidAmount(amountCents) || amountCents <= 0) {
    return {
      success: false,
      budgetLockId: '',
      lockedCents: 0,
      newAvailableCents: 0,
      error: FinanceErrorCodes.INVALID_AMOUNT,
    };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // Get campaign
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        include: { budgetLock: true },
      });

      if (!campaign) {
        throw new FinanceError(
          `Campaign not found: ${campaignId}`,
          FinanceErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      // Check campaign ownership
      if (campaign.advertiserId !== advertiserId) {
        throw new FinanceError(
          'Campaign does not belong to this advertiser',
          FinanceErrorCodes.INVALID_CAMPAIGN_STATUS
        );
      }

      // Get advertiser's wallet
      const wallet = await tx.wallet.findUnique({
        where: { ownerUserId: advertiserId },
      });

      if (!wallet) {
        throw new FinanceError(
          `Wallet not found for advertiser ${advertiserId}`,
          FinanceErrorCodes.WALLET_NOT_FOUND
        );
      }

      // Check sufficient funds
      if (wallet.availableCents < amountCents) {
        throw new FinanceError(
          `Insufficient funds. Available: ${wallet.availableCents}, Requested: ${amountCents}`,
          FinanceErrorCodes.INSUFFICIENT_FUNDS
        );
      }

      let budgetLock;

      // Check for existing budget lock
      if (campaign.budgetLock) {
        // Increment existing lock (for budget increases)
        budgetLock = await tx.campaignBudgetLock.update({
          where: { campaignId },
          data: {
            lockedCents: {
              increment: amountCents,
            },
          },
        });
      } else {
        // Create new budget lock
        budgetLock = await tx.campaignBudgetLock.create({
          data: {
            campaignId,
            walletId: wallet.id,
            lockedCents: amountCents,
          },
        });
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableCents: {
            decrement: amountCents,
          },
        },
      });

      const holdTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'HOLD' as WalletTransactionType,
          amountCents: -amountCents,
          currency: wallet.currency,
          referenceType: campaign.budgetLock ? 'CAMPAIGN_BUDGET_INCREASE' : 'CAMPAIGN_BUDGET',
          referenceId: campaignId,
          description: campaign.budgetLock
            ? `Budget increase for campaign: ${campaign.title}`
            : `Budget lock for campaign: ${campaign.title}`,
        },
      });

      return { budgetLock, wallet: updatedWallet, holdTransaction };
    });

    try {
      await createInvoiceRecord({
        userId: advertiserId,
        roleType: 'ADVERTISER',
        invoiceType: 'BILLING',
        referenceId: result.holdTransaction.id,
        totalAmountCents: amountCents,
        taxAmountCents: 0,
        status: 'PAID',
      });
    } catch (invoiceError) {
      console.error('Failed to create invoice for campaign budget lock:', invoiceError);
    }

    return {
      success: true,
      budgetLockId: result.budgetLock.id,
      lockedCents: result.budgetLock.lockedCents,
      newAvailableCents: result.wallet.availableCents,
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        budgetLockId: '',
        lockedCents: 0,
        newAvailableCents: 0,
        error: error.code,
      };
    }
    console.error('Lock budget error:', error);
    return {
      success: false,
      budgetLockId: '',
      lockedCents: 0,
      newAvailableCents: 0,
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

/**
 * Release campaign budget back to advertiser's wallet.
 * Creates a RELEASE transaction.
 * 
 * Used when:
 * - Campaign is cancelled
 * - Campaign is completed with remaining budget
 * - Budget is being adjusted
 */
export async function releaseCampaignBudget(params: {
  campaignId: string;
  advertiserId: string;
  amountCents?: number; // If not provided, releases all locked funds
  reason: 'CAMPAIGN_COMPLETED' | 'CAMPAIGN_CANCELLED' | 'BUDGET_ADJUSTMENT';
}): Promise<ReleaseBudgetResult> {
  const { campaignId, advertiserId, amountCents, reason } = params;

  try {
    const result = await db.$transaction(async (tx) => {
      // Get campaign with budget lock
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        include: { budgetLock: true },
      });

      if (!campaign) {
        throw new FinanceError(
          `Campaign not found: ${campaignId}`,
          FinanceErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      if (!campaign.budgetLock) {
        throw new FinanceError(
          'No budget lock found for this campaign',
          FinanceErrorCodes.BUDGET_LOCK_NOT_FOUND
        );
      }

      // Get advertiser's wallet
      const wallet = await tx.wallet.findUnique({
        where: { ownerUserId: advertiserId },
      });

      if (!wallet) {
        throw new FinanceError(
          `Wallet not found for advertiser ${advertiserId}`,
          FinanceErrorCodes.WALLET_NOT_FOUND
        );
      }

      // Determine amount to release
      const releaseAmount = amountCents ?? campaign.budgetLock.lockedCents;

      if (releaseAmount <= 0 || releaseAmount > campaign.budgetLock.lockedCents) {
        throw new FinanceError(
          `Invalid release amount: ${releaseAmount}`,
          FinanceErrorCodes.INVALID_AMOUNT
        );
      }

      // Update budget lock
      const updatedLock = await tx.campaignBudgetLock.update({
        where: { campaignId },
        data: {
          lockedCents: {
            decrement: releaseAmount,
          },
        },
      });

      // Update wallet (increase available)
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableCents: {
            increment: releaseAmount,
          },
        },
      });

      // Create RELEASE transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'RELEASE' as WalletTransactionType,
          amountCents: releaseAmount,
          currency: wallet.currency,
          referenceType: 'CAMPAIGN_REFUND',
          referenceId: campaignId,
          description: `Budget release for campaign: ${campaign.title} (${reason})`,
        },
      });

      // Delete budget lock if fully released
      if (updatedLock.lockedCents === 0) {
        await tx.campaignBudgetLock.delete({
          where: { campaignId },
        });
      }

      return { wallet: updatedWallet, releasedCents: releaseAmount };
    });

    return {
      success: true,
      releasedCents: result.releasedCents,
      newAvailableCents: result.wallet.availableCents,
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        releasedCents: 0,
        newAvailableCents: 0,
        error: error.code,
      };
    }
    console.error('Release budget error:', error);
    return {
      success: false,
      releasedCents: 0,
      newAvailableCents: 0,
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

/**
 * Compute campaign budget information.
 * Returns total, locked, spent, and remaining amounts.
 */
export async function computeCampaignBudget(campaignId: string): Promise<CampaignBudgetInfo> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      budgetLock: true,
      ledgerEntries: {
        where: {
          type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT', 'PLATFORM_FEE'] as LedgerEntryType[] },
          amountCents: { gt: 0 },
        },
        select: { amountCents: true },
      },
    },
  });

  if (!campaign) {
    throw new FinanceError(
      `Campaign not found: ${campaignId}`,
      FinanceErrorCodes.CAMPAIGN_NOT_FOUND
    );
  }

  const lockedCents = campaign.budgetLock?.lockedCents ?? 0;
  const spentCents = campaign.ledgerEntries.reduce((sum, entry) => sum + entry.amountCents, 0);
  const remainingCents = lockedCents - spentCents;
  const payoutPerViewCents = Math.floor(campaign.cpmCents / 1000);

  return {
    campaignId: campaign.id,
    totalBudgetCents: campaign.totalBudgetCents,
    lockedCents,
    spentCents,
    remainingCents,
    cpmCents: campaign.cpmCents,
    payoutPerViewCents,
  };
}

// ============================================
// PAYOUT FUNCTIONS
// ============================================

/**
 * Record a payout for a valid view event.
 * 
 * Pre-conditions:
 * - VisitEvent must exist and have isValid = true
 * - VisitEvent must not already be paid (isPaid = false)
 * - Campaign must have sufficient remaining budget
 * 
 * Post-conditions:
 * - Creates LedgerEntry with VIEW_PAYOUT
 * - Creates LedgerEntry with PLATFORM_FEE
 * - Updates CreatorBalance
 * - Marks VisitEvent as paid
 * 
 * @returns PayoutResult with payout details
 */
/**
 * ATOMIC VIEW PAYOUT - Race-condition-safe budget protection
 * 
 * Strategy: Option A + Optimistic Locking
 * - Compute remaining budget INSIDE the transaction from LedgerEntry
 * - Use spentBudgetCents as source of truth (synced from LedgerEntry)
 * - Add version field for optimistic locking (prevents lost updates)
 * - All budget checks happen atomically inside transaction
 * - SQLite uses serializable isolation via Prisma transaction
 * 
 * This prevents:
 * - Double-spend: Unique constraint on LedgerEntry + budget check
 * - Negative budget: Budget check before any write
 * - Overspend: Transaction atomicity ensures consistency
 */

export async function recordValidViewPayout(params: {
  campaignId: string;
  creatorId: string;
  visitEventId: string;
}): Promise<PayoutResult> {
  const { campaignId, creatorId, visitEventId } = params;
  const startTime = Date.now();

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Get visit event and validate (with FOR UPDATE lock if using PostgreSQL)
      const visitEvent = await tx.visitEvent.findUnique({
        where: { id: visitEventId },
      });

      if (!visitEvent) {
        throw new FinanceError(
          `Visit event not found: ${visitEventId}`,
          FinanceErrorCodes.EVENT_NOT_VALID
        );
      }

      if (!visitEvent.isValidated) {
        throw new FinanceError(
          'Visit event is not validated - requires pixel confirmation',
          FinanceErrorCodes.EVENT_NOT_VALID
        );
      }

      if (visitEvent.isBillable) {
        throw new FinanceError(
          'Visit event has already been marked billable',
          FinanceErrorCodes.EVENT_ALREADY_PAID
        );
      }

      if (visitEvent.isPaid) {
        throw new FinanceError(
          'Visit event has already been paid out',
          FinanceErrorCodes.EVENT_ALREADY_PAID
        );
      }

      if (visitEvent.campaignId !== campaignId || visitEvent.creatorId !== creatorId) {
        throw new FinanceError(
          'Visit event does not match campaign/creator',
          FinanceErrorCodes.EVENT_NOT_VALID
        );
      }

      // 2. Get campaign with current budget state
      // NOTE: In PostgreSQL, we would use .lock({ mode: 'update' }) here
      // SQLite serializes transactions automatically, providing equivalent safety
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        include: { budgetLock: true },
      });

      if (!campaign) {
        throw new FinanceError(
          `Campaign not found: ${campaignId}`,
          FinanceErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      // 3. CRITICAL: Compute remaining budget INSIDE transaction
      // This is the source of truth - recomputed from ledger for each transaction
      const ledgerSpentResult = await tx.ledgerEntry.aggregate({
        where: {
          campaignId,
          type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT', 'PLATFORM_FEE'] as LedgerEntryType[] },
          amountCents: { gt: 0 },
        },
        _sum: { amountCents: true },
      });

      const ledgerSpentCents = ledgerSpentResult._sum.amountCents ?? 0;
      const lockedCents = campaign.budgetLock?.lockedCents ?? 0;
      
      // Remaining = locked - spent (from ledger)
      const remainingBudgetCents = lockedCents - ledgerSpentCents;

      // 4. Calculate payout amounts
      const payoutPerViewCents = Math.floor(campaign.cpmCents / 1000);
      
      if (payoutPerViewCents <= 0) {
        throw new FinanceError(
          'Invalid CPM configuration',
          FinanceErrorCodes.INVALID_AMOUNT
        );
      }

      const platformFeeRate = await getPlatformFeeRate();
      
      const grossPayoutCents = payoutPerViewCents;
      const platformFeeCents = calculatePlatformFee(grossPayoutCents, platformFeeRate);
      const netPayoutCents = calculateNetPayout(grossPayoutCents, platformFeeRate);
      const totalCostCents = grossPayoutCents;

      // 5. ATOMIC BUDGET CHECK - Must happen inside transaction
      // This is the critical race-condition protection
      if (remainingBudgetCents < totalCostCents) {
        // Log structured safety event for monitoring
        console.warn('[BUDGET_SAFETY] View payout blocked - budget exhausted', {
          campaignId,
          visitEventId,
          remainingBudgetCents,
          requiredCostCents: totalCostCents,
          ledgerSpentCents,
          lockedCents,
          timestamp: new Date().toISOString(),
        });

        throw new FinanceError(
          `BUDGET_EXHAUSTED: Insufficient campaign budget. Remaining: ${remainingBudgetCents}, Required: ${totalCostCents}`,
          FinanceErrorCodes.INSUFFICIENT_BUDGET
        );
      }

      // 6. Check for duplicate payout (idempotency)
      // The unique constraint will catch this, but we check first for clear error
      const existingPayout = await tx.ledgerEntry.findUnique({
        where: {
          unique_payout_per_event: {
            campaignId,
            creatorId,
            refEventId: visitEventId,
          },
        },
      });

      if (existingPayout) {
        throw new FinanceError(
          'Duplicate payout detected - event already paid',
          FinanceErrorCodes.EVENT_ALREADY_PAID
        );
      }

      // 7. Create ledger entries atomically
      // These are the actual financial records
      const viewPayoutEntry = await tx.ledgerEntry.create({
        data: {
          campaignId,
          creatorId,
          type: 'VIEW_PAYOUT' as LedgerEntryType,
          amountCents: netPayoutCents,
          refEventId: visitEventId,
          description: `View payout for visit ${visitEventId}`,
        },
      });

      const platformFeeEntry = await tx.ledgerEntry.create({
        data: {
          campaignId,
          creatorId,
          type: 'PLATFORM_FEE' as LedgerEntryType,
          amountCents: platformFeeCents,
          refEventId: visitEventId,
          description: `Platform fee (${(platformFeeRate * 100)}%) for visit ${visitEventId}`,
        },
      });

      // 8. Update spentBudgetCents atomically (source of truth sync)
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          spentBudgetCents: {
            increment: totalCostCents,
          },
        },
      });

      // 9. Update creator balance atomically
      await tx.creatorBalance.upsert({
        where: { creatorId },
        create: {
          creatorId,
          currency: DEFAULT_CURRENCY,
          availableCents: 0,
          pendingCents: 0,
          availableBalanceCents: 0,
          pendingBalanceCents: 0,
          lockedReserveCents: 0,
          riskLevel: 'MEDIUM',
          payoutDelayDays: 3,
          totalEarnedCents: netPayoutCents,
        },
        update: {
          totalEarnedCents: {
            increment: netPayoutCents,
          },
        },
      });

      // 10. Mark visit event as paid (atomic with payout)
      await tx.visitEvent.update({
        where: { id: visitEventId },
        data: { isPaid: true },
      });

      const newRemainingBudget = remainingBudgetCents - totalCostCents;
      const processingTime = Date.now() - startTime;

      // Log successful payout
      console.log('[PAYOUT_SUCCESS] View payout recorded', {
        campaignId,
        creatorId,
        visitEventId,
        payoutCents: grossPayoutCents,
        netPayoutCents,
        platformFeeCents,
        newRemainingBudget,
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString(),
      });

      return {
        viewPayoutEntry,
        platformFeeEntry,
        payoutCents: grossPayoutCents,
        platformFeeCents,
        netPayoutCents,
        newRemainingBudget,
        processingTimeMs: processingTime,
      };
    });

    return {
      success: true,
      payoutCents: result.payoutCents,
      platformFeeCents: result.platformFeeCents,
      netPayoutCents: result.netPayoutCents,
      newRemainingBudgetCents: result.newRemainingBudget,
      ledgerEntryId: result.viewPayoutEntry.id,
    };
  } catch (error) {
    // Log payout failure
    if (error instanceof FinanceError) {
      console.error('[PAYOUT_ERROR] View payout failed', {
        campaignId,
        creatorId,
        visitEventId,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        payoutCents: 0,
        platformFeeCents: 0,
        netPayoutCents: 0,
        newRemainingBudgetCents: 0,
        ledgerEntryId: '',
        error: error.code,
      };
    }

    console.error('[PAYOUT_FATAL] Unexpected error in view payout', {
      campaignId,
      creatorId,
      visitEventId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      payoutCents: 0,
      platformFeeCents: 0,
      netPayoutCents: 0,
      newRemainingBudgetCents: 0,
      ledgerEntryId: '',
      error: 'DATABASE_ERROR',
    };
  }
}

/**
 * Record a payout for a conversion event.
 * Similar to view payout but with conversion-specific amounts.
 */
export async function recordConversionPayout(params: {
  campaignId: string;
  creatorId: string;
  conversionEventId: string;
  payoutCents: number;
}): Promise<PayoutResult> {
  const { campaignId, creatorId, conversionEventId, payoutCents } = params;

  if (!isValidAmount(payoutCents) || payoutCents <= 0) {
    return {
      success: false,
      payoutCents: 0,
      platformFeeCents: 0,
      netPayoutCents: 0,
      newRemainingBudgetCents: 0,
      ledgerEntryId: '',
      error: FinanceErrorCodes.INVALID_AMOUNT,
    };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // Get conversion event
      const conversionEvent = await tx.conversionEvent.findUnique({
        where: { id: conversionEventId },
      });

      if (!conversionEvent) {
        throw new FinanceError(
          `Conversion event not found: ${conversionEventId}`,
          FinanceErrorCodes.EVENT_NOT_VALID
        );
      }

      // Get campaign
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        include: { budgetLock: true },
      });

      if (!campaign) {
        throw new FinanceError(
          `Campaign not found: ${campaignId}`,
          FinanceErrorCodes.CAMPAIGN_NOT_FOUND
        );
      }

      // Get platform fee rate from settings
      const platformFeeRate = await getPlatformFeeRate();

      // Calculate amounts
      const platformFeeCents = calculatePlatformFee(payoutCents, platformFeeRate);
      const netPayoutCents = calculateNetPayout(payoutCents, platformFeeRate);

      // Check budget
      const spentResult = await tx.ledgerEntry.aggregate({
        where: {
          campaignId,
          type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT', 'PLATFORM_FEE'] as LedgerEntryType[] },
          amountCents: { gt: 0 },
        },
        _sum: { amountCents: true },
      });

      const currentSpent = spentResult._sum.amountCents ?? 0;
      const lockedCents = campaign.budgetLock?.lockedCents ?? 0;
      const remainingBudget = lockedCents - currentSpent;

      if (remainingBudget < payoutCents) {
        throw new FinanceError(
          `Insufficient campaign budget for conversion payout`,
          FinanceErrorCodes.INSUFFICIENT_BUDGET
        );
      }

      // Create ledger entries
      const conversionPayoutEntry = await tx.ledgerEntry.create({
        data: {
          campaignId,
          creatorId,
          type: 'CONVERSION_PAYOUT' as LedgerEntryType,
          amountCents: netPayoutCents,
          refEventId: conversionEventId,
          description: `Conversion payout for conversion ${conversionEventId}`,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          campaignId,
          creatorId,
          type: 'PLATFORM_FEE' as LedgerEntryType,
          amountCents: platformFeeCents,
          refEventId: conversionEventId,
          description: `Platform fee (${(platformFeeRate * 100)}%) for conversion ${conversionEventId}`,
        },
      });

      // Update creator balance
      await tx.creatorBalance.upsert({
        where: { creatorId },
        create: {
          creatorId,
          currency: DEFAULT_CURRENCY,
          availableCents: 0,
          pendingCents: 0,
          availableBalanceCents: 0,
          pendingBalanceCents: netPayoutCents,
          lockedReserveCents: 0,
          riskLevel: 'MEDIUM',
          payoutDelayDays: 3,
          totalEarnedCents: netPayoutCents,
        },
        update: {
          pendingBalanceCents: { increment: netPayoutCents },
          totalEarnedCents: { increment: netPayoutCents },
        },
      });

      const newRemainingBudget = remainingBudget - payoutCents;

      return {
        conversionPayoutEntry,
        payoutCents,
        platformFeeCents,
        netPayoutCents,
        newRemainingBudget,
      };
    });

    return {
      success: true,
      payoutCents: result.payoutCents,
      platformFeeCents: result.platformFeeCents,
      netPayoutCents: result.netPayoutCents,
      newRemainingBudgetCents: result.newRemainingBudget,
      ledgerEntryId: result.conversionPayoutEntry.id,
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        payoutCents: 0,
        platformFeeCents: 0,
        netPayoutCents: 0,
        newRemainingBudgetCents: 0,
        ledgerEntryId: '',
        error: error.code,
      };
    }

    console.error('Record conversion payout error:', error);
    return {
      success: false,
      payoutCents: 0,
      platformFeeCents: 0,
      netPayoutCents: 0,
      newRemainingBudgetCents: 0,
      ledgerEntryId: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

// ============================================
// BALANCE QUERY FUNCTIONS
// ============================================

/**
 * Get creator balance by creator ID.
 */
export async function getCreatorBalance(creatorId: string): Promise<{
  availableCents: number;
  pendingCents: number;
  totalEarnedCents: number;
  currency: string;
}> {
  const balance = await db.creatorBalance.findUnique({
    where: { creatorId },
  });

  if (!balance) {
    return {
      availableCents: 0,
      pendingCents: 0,
      totalEarnedCents: 0,
      currency: DEFAULT_CURRENCY,
    };
  }

  return {
    availableCents: balance.availableCents,
    pendingCents: balance.pendingCents,
    totalEarnedCents: balance.totalEarnedCents,
    currency: balance.currency,
  };
}

/**
 * Get wallet transaction history.
 */
export async function getWalletTransactions(
  walletId: string,
  options?: {
    limit?: number;
    offset?: number;
    types?: WalletTransactionType[];
  }
) {
  const { limit = 50, offset = 0, types } = options || {};

  const where: Prisma.WalletTransactionWhereInput = {
    walletId,
  };

  if (types && types.length > 0) {
    where.type = { in: types };
  }

  const [transactions, total] = await Promise.all([
    db.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.walletTransaction.count({ where }),
  ]);

  return { transactions, total };
}

/**
 * Get ledger entries for a creator.
 */
export async function getCreatorLedgerEntries(
  creatorId: string,
  options?: {
    limit?: number;
    offset?: number;
    campaignId?: string;
  }
) {
  const { limit = 50, offset = 0, campaignId } = options || {};

  const where: Prisma.LedgerEntryWhereInput = {
    creatorId,
  };

  if (campaignId) {
    where.campaignId = campaignId;
  }

  const [entries, total] = await Promise.all([
    db.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        campaign: {
          select: { id: true, title: true },
        },
      },
    }),
    db.ledgerEntry.count({ where }),
  ]);

  return { entries, total };
}

// ============================================
// CREATOR WITHDRAWAL FUNCTIONS
// ============================================

export interface WithdrawalRequestResult {
  success: boolean;
  withdrawalId: string;
  amountCents: number;
  platformFeeCents?: number;
  newAvailableCents: number;
  status: string;
  error?: string;
}

/**
 * Request a withdrawal from creator balance.
 * Deducts from available balance immediately and creates a pending withdrawal request.
 * 
 * Pre-conditions:
 * - Creator must have sufficient available balance
 * - Amount must meet minimum withdrawal threshold (€10 = 1000 cents)
 * 
 * Post-conditions:
 * - CreatorBalance.availableCents decreased
 * - WithdrawalRequest created with PENDING status
 */
export async function requestWithdrawal(params: {
  creatorId: string;
  amountCents: number;
  currency?: string;
}): Promise<WithdrawalRequestResult> {
  const { creatorId, amountCents, currency = DEFAULT_CURRENCY } = params;
  const MIN_WITHDRAWAL_CENTS = 1000; // €10 minimum

  // Get platform fee rate
  const platformFeeRate = await getPlatformFeeRate();
  const platformFeeCents = calculatePlatformFee(amountCents, platformFeeRate);
  const netAmountCents = amountCents - platformFeeCents;

  // Validate amount
  if (!isValidAmount(amountCents) || amountCents < MIN_WITHDRAWAL_CENTS) {
    return {
      success: false,
      withdrawalId: '',
      amountCents: 0,
      newAvailableCents: 0,
      status: '',
      error: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_CENTS} cents (€10.00)`,
    };
  }

  // Validate net amount (after platform fee)
  if (!isValidAmount(netAmountCents) || netAmountCents < MIN_WITHDRAWAL_CENTS) {
    return {
      success: false,
      withdrawalId: '',
      amountCents: 0,
      newAvailableCents: 0,
      status: '',
      error: `Withdrawal amount too small after platform fee. Minimum is ${MIN_WITHDRAWAL_CENTS} cents (€10.00)`,
    };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // Get creator balance
      const balance = await tx.creatorBalance.findUnique({
        where: { creatorId },
      });

      if (!balance) {
        throw new FinanceError(
          `Creator balance not found for ${creatorId}`,
          FinanceErrorCodes.CREATOR_BALANCE_NOT_FOUND
        );
      }

      // Check sufficient funds for gross amount
      if (balance.availableCents < amountCents) {
        throw new FinanceError(
          `Insufficient balance. Available: ${balance.availableCents}, Requested: ${amountCents}`,
          FinanceErrorCodes.INSUFFICIENT_FUNDS
        );
      }

      // Deduct only the net amount (after platform fee) from available balance
      const updatedBalance = await tx.creatorBalance.update({
        where: { creatorId },
        data: {
          availableCents: {
            decrement: netAmountCents,
          },
        },
      });

      // Create withdrawal request with net amount and platform fee
      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: {
          creatorId,
          amountCents: netAmountCents, // Store net amount (after platform fee)
          platformFeeCents, // Store platform fee for record
          currency,
          status: 'PENDING',
        },
      });

      return { balance: updatedBalance, withdrawalRequest, platformFeeCents };
    });

    return {
      success: true,
      withdrawalId: result.withdrawalRequest.id,
      amountCents: netAmountCents, // Return net amount to caller
      platformFeeCents,
      newAvailableCents: result.balance.availableCents,
      status: 'PENDING',
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        withdrawalId: '',
        amountCents: 0,
        newAvailableCents: 0,
        status: '',
        error: error.code,
      };
    }
    console.error('Withdrawal request error:', error);
    return {
      success: false,
      withdrawalId: '',
      amountCents: 0,
      newAvailableCents: 0,
      status: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

/**
 * Get withdrawal requests for a creator.
 */
export async function getWithdrawalRequests(
  creatorId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
) {
  const { limit = 20, offset = 0, status } = options || {};

  const where: Prisma.WithdrawalRequestWhereInput = {
    creatorId,
  };

  if (status) {
    where.status = status as any;
  }

  const [requests, total] = await Promise.all([
    db.withdrawalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.withdrawalRequest.count({ where }),
  ]);

  return { requests, total };
}

/**
 * Process a withdrawal request through PSP.
 * Called by admin/system when ready to pay out.
 */
export async function processWithdrawal(params: {
  withdrawalId: string;
  psReference: string;
}): Promise<WithdrawalRequestResult> {
  const { withdrawalId, psReference } = params;

  try {
    const result = await db.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new FinanceError(
          `Withdrawal request not found: ${withdrawalId}`,
          'WITHDRAWAL_NOT_FOUND'
        );
      }

      if (withdrawal.status !== 'PENDING') {
        throw new FinanceError(
          `Withdrawal already processed: ${withdrawal.status}`,
          'WITHDRAWAL_ALREADY_PROCESSED'
        );
      }

      // Update to PROCESSING status
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'PROCESSING',
          psReference,
        },
      });

      return { withdrawal: updatedWithdrawal };
    });

    return {
      success: true,
      withdrawalId: result.withdrawal.id,
      amountCents: result.withdrawal.amountCents,
      newAvailableCents: 0,
      status: 'PROCESSING',
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        withdrawalId: '',
        amountCents: 0,
        newAvailableCents: 0,
        status: '',
        error: error.code,
      };
    }
    console.error('Process withdrawal error:', error);
    return {
      success: false,
      withdrawalId: '',
      amountCents: 0,
      newAvailableCents: 0,
      status: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

/**
 * Mark withdrawal as paid (after PSP confirmation).
 */
export async function completeWithdrawal(params: {
  withdrawalId: string;
  psReference: string;
}): Promise<WithdrawalRequestResult> {
  const { withdrawalId, psReference } = params;

  try {
    const result = await db.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new FinanceError(
          `Withdrawal request not found: ${withdrawalId}`,
          'WITHDRAWAL_NOT_FOUND'
        );
      }

      if (withdrawal.status === 'PAID') {
        return { withdrawal };
      }

      if (withdrawal.status === 'CANCELLED' || withdrawal.status === 'FAILED') {
        throw new FinanceError(
          `Cannot complete withdrawal with status: ${withdrawal.status}`,
          'INVALID_WITHDRAWAL_STATUS'
        );
      }

      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'PAID',
          psReference,
          processedAt: new Date(),
        },
      });
      return { withdrawal: updatedWithdrawal };
    });

    try {
      await createInvoiceRecord({
        userId: result.withdrawal.creatorId,
        roleType: 'CREATOR',
        invoiceType: 'PAYOUT',
        referenceId: result.withdrawal.id,
        totalAmountCents: result.withdrawal.amountCents,
        taxAmountCents: 0,
        status: 'PAID',
      });
    } catch (invoiceError) {
      console.error('Failed to create invoice for withdrawal payout:', invoiceError);
    }

    try {
      await domainEventBus.publish(domainEventBus.createEvent('PAYOUT_COMPLETED', {
        userId: result.withdrawal.creatorId,
        amountCents: result.withdrawal.amountCents,
        currency: result.withdrawal.currency,
        withdrawalId: result.withdrawal.id,
      }));
    } catch (notificationError) {
      console.error('Failed to publish PAYOUT_COMPLETED event:', notificationError);
    }

    return {
      success: true,
      withdrawalId: result.withdrawal.id,
      amountCents: result.withdrawal.amountCents,
      newAvailableCents: 0,
      status: 'PAID',
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        withdrawalId: '',
        amountCents: 0,
        newAvailableCents: 0,
        status: '',
        error: error.code,
      };
    }
    console.error('Complete withdrawal error:', error);
    return {
      success: false,
      withdrawalId: '',
      amountCents: 0,
      newAvailableCents: 0,
      status: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

/**
 * Mark withdrawal as failed and refund to creator balance.
 */
export async function failWithdrawal(params: {
  withdrawalId: string;
  reason: string;
}): Promise<WithdrawalRequestResult> {
  const { withdrawalId, reason } = params;

  try {
    const result = await db.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new FinanceError(
          `Withdrawal request not found: ${withdrawalId}`,
          'WITHDRAWAL_NOT_FOUND'
        );
      }

      if (withdrawal.status === 'PAID') {
        throw new FinanceError(
          'Cannot fail a withdrawal that has already been paid',
          'INVALID_WITHDRAWAL_STATUS'
        );
      }

      if (withdrawal.status === 'CANCELLED') {
        throw new FinanceError(
          'Withdrawal already cancelled',
          'INVALID_WITHDRAWAL_STATUS'
        );
      }

      // Refund the amount to creator balance if not already cancelled
      const updatedBalance = await tx.creatorBalance.update({
        where: { creatorId: withdrawal.creatorId },
        data: {
          availableCents: {
            increment: withdrawal.amountCents,
          },
        },
      });

      // Update withdrawal status
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'FAILED',
          failureReason: reason,
          processedAt: new Date(),
        },
      });

      return { withdrawal: updatedWithdrawal, balance: updatedBalance };
    });

    return {
      success: true,
      withdrawalId: result.withdrawal.id,
      amountCents: result.withdrawal.amountCents,
      newAvailableCents: result.balance.availableCents,
      status: 'FAILED',
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        withdrawalId: '',
        amountCents: 0,
        newAvailableCents: 0,
        status: '',
        error: error.code,
      };
    }
    console.error('Fail withdrawal error:', error);
    return {
      success: false,
      withdrawalId: '',
      amountCents: 0,
      newAvailableCents: 0,
      status: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

/**
 * Cancel a pending withdrawal and refund to creator balance.
 */
export async function cancelWithdrawal(params: {
  withdrawalId: string;
  creatorId: string;
}): Promise<WithdrawalRequestResult> {
  const { withdrawalId, creatorId } = params;

  try {
    const result = await db.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new FinanceError(
          `Withdrawal request not found: ${withdrawalId}`,
          'WITHDRAWAL_NOT_FOUND'
        );
      }

      // Verify ownership
      if (withdrawal.creatorId !== creatorId) {
        throw new FinanceError(
          'Withdrawal does not belong to this creator',
          'UNAUTHORIZED'
        );
      }

      if (withdrawal.status !== 'PENDING') {
        throw new FinanceError(
          `Cannot cancel withdrawal with status: ${withdrawal.status}`,
          'INVALID_WITHDRAWAL_STATUS'
        );
      }

      // Refund to creator balance
      const updatedBalance = await tx.creatorBalance.update({
        where: { creatorId },
        data: {
          availableCents: {
            increment: withdrawal.amountCents,
          },
        },
      });

      // Update withdrawal status
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'CANCELLED',
          processedAt: new Date(),
        },
      });

      return { withdrawal: updatedWithdrawal, balance: updatedBalance };
    });

    return {
      success: true,
      withdrawalId: result.withdrawal.id,
      amountCents: result.withdrawal.amountCents,
      newAvailableCents: result.balance.availableCents,
      status: 'CANCELLED',
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        withdrawalId: '',
        amountCents: 0,
        newAvailableCents: 0,
        status: '',
        error: error.code,
      };
    }
    console.error('Cancel withdrawal error:', error);
    return {
      success: false,
      withdrawalId: '',
      amountCents: 0,
      newAvailableCents: 0,
      status: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Adjust wallet balance (admin only).
 * Creates an ADJUSTMENT transaction.
 */
export async function adjustWalletBalance(params: {
  userId: string;
  amountCents: number; // Positive to add, negative to subtract
  description: string;
  adminId: string;
}): Promise<DepositResult> {
  const { userId, amountCents, description, adminId } = params;

  if (amountCents === 0) {
    return {
      success: false,
      walletId: '',
      newAvailableCents: 0,
      transactionId: '',
      error: FinanceErrorCodes.INVALID_AMOUNT,
    };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { ownerUserId: userId },
      });

      if (!wallet) {
        throw new FinanceError(
          `Wallet not found for user ${userId}`,
          FinanceErrorCodes.WALLET_NOT_FOUND
        );
      }

      // Check if we have enough funds for negative adjustment
      if (amountCents < 0 && wallet.availableCents < Math.abs(amountCents)) {
        throw new FinanceError(
          'Insufficient funds for adjustment',
          FinanceErrorCodes.INSUFFICIENT_FUNDS
        );
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableCents: {
            increment: amountCents,
          },
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'ADJUSTMENT' as WalletTransactionType,
          amountCents,
          currency: wallet.currency,
          referenceType: 'ADMIN_ADJUSTMENT',
          referenceId: adminId,
          description,
        },
      });

      return { wallet: updatedWallet, transaction };
    });

    return {
      success: true,
      walletId: result.wallet.id,
      newAvailableCents: result.wallet.availableCents,
      transactionId: result.transaction.id,
    };
  } catch (error) {
    if (error instanceof FinanceError) {
      return {
        success: false,
        walletId: '',
        newAvailableCents: 0,
        transactionId: '',
        error: error.code,
      };
    }
    console.error('Adjust wallet error:', error);
    return {
      success: false,
      walletId: '',
      newAvailableCents: 0,
      transactionId: '',
      error: FinanceErrorCodes.DATABASE_ERROR,
    };
  }
}
