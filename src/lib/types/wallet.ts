import { WalletTransactionType, LedgerEntryType, WithdrawalStatus } from '@prisma/client';

export type WalletTransactionTypeType = WalletTransactionType;
export type LedgerEntryTypeType = LedgerEntryType;
export type WithdrawalStatusType = WithdrawalStatus;

export type { Wallet, WalletTransaction, LedgerEntry, WithdrawalRequest, WalletBalanceResponse as WalletBalance } from '@/lib/finance/types';

export interface AddFundsParams {
  amountCents: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}

export interface LockFundsParams {
  amountCents: number;
  referenceType: string;
  referenceId: string;
  description?: string;
}

export interface CreateWithdrawalParams {
  amountCents: number;
  method: string;
  details?: string;
}

export interface WalletListParams {
  userId?: string;
  page?: number;
  limit?: number;
}

export interface TransactionListParams {
  walletId?: string;
  type?: WalletTransactionTypeType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface WithdrawalListParams {
  creatorId?: string;
  status?: WithdrawalStatusType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedTransactions {
  transactions: import('@/lib/finance/types').WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedWithdrawals {
  withdrawals: import('@/lib/finance/types').WithdrawalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
