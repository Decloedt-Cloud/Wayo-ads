import { Prisma, WalletTransactionType, LedgerEntryType, WithdrawalStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { walletRepository, walletTransactionRepository } from './repositories';

export interface WalletInfo {
  id: string;
  ownerUserId: string;
  currency: string;
  availableCents: number;
  pendingCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionInfo {
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

export interface LedgerEntryInfo {
  id: string;
  walletId: string;
  creatorId: string | null;
  campaignId: string | null;
  type: LedgerEntryType;
  amountCents: number;
  description: string | null;
  createdAt: Date;
}

export interface WithdrawalRequestInfo {
  id: string;
  creatorId: string;
  amountCents: number;
  platformFeeCents: number | null;
  currency: string;
  status: WithdrawalStatus;
  psReference: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
}

export async function getOrCreateWallet(userId: string): Promise<WalletInfo> {
  let wallet = await walletRepository.findByUserId(userId);

  if (!wallet) {
    wallet = await walletRepository.create({
      ownerUserId: userId,
      currency: 'EUR',
      availableCents: 0,
      pendingCents: 0,
    });
  }

  return wallet as WalletInfo;
}

export async function getWallet(userId: string): Promise<WalletInfo | null> {
  const wallet = await walletRepository.findByUserId(userId);
  return wallet as WalletInfo | null;
}

export async function getWalletBalance(userId: string): Promise<{ available: number; pending: number }> {
  const wallet = await getWallet(userId);
  if (!wallet) {
    return { available: 0, pending: 0 };
  }
  return { available: wallet.availableCents, pending: wallet.pendingCents };
}

export async function getWalletTransactions(
  userId: string,
  limit = 20,
  offset = 0
): Promise<WalletTransactionInfo[]> {
  const wallet = await walletRepository.findByUserId(userId);

  if (!wallet) return [];

  const transactions = await walletTransactionRepository.findByWalletId(wallet.id, limit);
  return transactions as WalletTransactionInfo[];
}

export async function addFunds(
  userId: string,
  amountCents: number,
  referenceType?: string,
  referenceId?: string,
  description?: string
): Promise<WalletTransactionInfo> {
  const wallet = await getOrCreateWallet(userId);

  const transaction = await db.$transaction(async (tx) => {
    const txCreated = await walletTransactionRepository.createWithTx(tx, {
      walletId: wallet.id,
      type: 'DEPOSIT',
      amountCents,
      referenceType,
      referenceId,
      description: description || 'Funds added to wallet',
    });
    await walletRepository.updateBalanceWithTx(tx, wallet.id, { availableCents: { increment: amountCents } });
    return txCreated;
  });

  return transaction as WalletTransactionInfo;
}

export async function lockFunds(
  userId: string,
  amountCents: number,
  referenceType: string,
  referenceId: string,
  description?: string
): Promise<WalletTransactionInfo | null> {
  const wallet = await walletRepository.findByUserId(userId);

  if (!wallet || wallet.availableCents < amountCents) {
    return null;
  }

  const transaction = await db.$transaction(async (tx) => {
    const txCreated = await walletTransactionRepository.createWithTx(tx, {
      walletId: wallet.id,
      type: 'HOLD',
      amountCents,
      referenceType,
      referenceId,
      description: description || 'Funds locked for campaign',
    });
    await walletRepository.updateBalanceWithTx(tx, wallet.id, {
      availableCents: { decrement: amountCents },
      pendingCents: { increment: amountCents },
    });
    return txCreated;
  });

  return transaction as WalletTransactionInfo;
}

export async function releaseFunds(
  userId: string,
  amountCents: number,
  referenceId: string
): Promise<WalletTransactionInfo | null> {
  const wallet = await walletRepository.findByUserId(userId);

  if (!wallet) return null;

  const transaction = await db.$transaction(async (tx) => {
    const txCreated = await walletTransactionRepository.createWithTx(tx, {
      walletId: wallet.id,
      type: 'RELEASE',
      amountCents,
      referenceType: 'CAMPAIGN_REFUND',
      referenceId,
      description: 'Funds released from campaign',
    });
    await walletRepository.updateBalanceWithTx(tx, wallet.id, {
      availableCents: { increment: amountCents },
      pendingCents: { decrement: amountCents },
    });
    return txCreated;
  });

  return transaction as WalletTransactionInfo;
}

export async function createWithdrawal(
  userId: string,
  amountCents: number
): Promise<WithdrawalRequestInfo> {
  const wallet = await walletRepository.findByUserId(userId);

  if (!wallet || wallet.availableCents < amountCents) {
    throw new Error('Insufficient funds');
  }

  const withdrawal = await db.$transaction(async (tx) => {
    const created = await tx.withdrawalRequest.create({
      data: {
        creatorId: userId,
        amountCents,
        status: 'PENDING',
      },
    });
    await walletRepository.updateBalanceWithTx(tx, wallet.id, {
      availableCents: { decrement: amountCents },
      pendingCents: { increment: amountCents },
    });
    return created;
  });

  return withdrawal as WithdrawalRequestInfo;
}

export async function getWithdrawalRequests(
  userId: string,
  limit = 20,
  offset = 0
): Promise<WithdrawalRequestInfo[]> {
  const requests = await db.withdrawalRequest.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return requests as WithdrawalRequestInfo[];
}

export async function processWithdrawal(
  withdrawalId: string,
  status: WithdrawalStatus
): Promise<WithdrawalRequestInfo> {
  const withdrawal = await db.withdrawalRequest.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }

  const wallet = await db.wallet.findUnique({
    where: { ownerUserId: withdrawal.creatorId },
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const updated = await db.$transaction(async (tx) => {
    const updatedWithdrawal = await tx.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status,
        processedAt: status === 'PAID' || status === 'FAILED' ? new Date() : null,
      },
    });

    if (status === 'FAILED') {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableCents: { increment: withdrawal.amountCents },
          pendingCents: { decrement: withdrawal.amountCents },
        },
      });
    }

    return updatedWithdrawal;
  });

  return updated as WithdrawalRequestInfo;
}
