import { domainEventBus } from '@/lib/events/domainEventBus';
import { createUserNotification } from './notificationService';
import { centsToFormattedString } from '@/lib/finance/types';

interface WalletCreditedPayload {
  userId: string;
  amountCents: number;
  currency: string;
  newBalance: number;
  transactionId: string;
}

interface PayoutCompletedPayload {
  userId: string;
  amountCents: number;
  currency: string;
  withdrawalId: string;
}

interface CreatorFlaggedPayload {
  creatorId: string;
  reason: string;
  severity: string;
}

interface VelocitySpikePayload {
  creatorId: string;
  spikeAmount: number;
  threshold: number;
}

interface FraudPatternPayload {
  creatorId: string;
  pattern: string;
}

interface ReserveLockedPayload {
  creatorId: string;
  amount: number;
}

interface ReserveReleasedPayload {
  creatorId: string;
  amount: number;
}

interface TrustScoreDowngradedPayload {
  creatorId: string;
  oldScore: number;
  newScore: number;
}

interface CreatorTierChangedPayload {
  creatorId: string;
  oldTier: string;
  newTier: string;
}

export function initializeEventHandlers() {
  domainEventBus.subscribe<WalletCreditedPayload>('WALLET_CREDITED', async (event) => {
    const { userId, amountCents, currency, newBalance, transactionId } = event.payload;
    try {
      await createUserNotification({
        toUserId: userId,
        type: 'WALLET_CREDITED',
        priority: 'P2_NORMAL',
        title: 'Wallet Topped Up',
        message: `Your wallet has been credited with ${centsToFormattedString(amountCents, currency)}. Your new balance is ${centsToFormattedString(newBalance, currency)}.`,
        actionUrl: '/dashboard/advertiser/wallet',
        metadata: {
          amountCents,
          currency,
          transactionId,
        },
      } as any);
    } catch (error) {
      console.error('Failed to send WALLET_CREDITED notification:', error);
    }
  });

  domainEventBus.subscribe<PayoutCompletedPayload>('PAYOUT_COMPLETED', async (event) => {
    const { userId, amountCents, currency, withdrawalId } = event.payload;
    try {
      await createUserNotification({
        toUserId: userId,
        type: 'PAYOUT_COMPLETED',
        priority: 'P2_NORMAL',
        title: 'Payout Completed',
        message: `Your payout of ${centsToFormattedString(amountCents, currency)} has been processed.`,
        actionUrl: '/dashboard/creator/wallet',
        metadata: {
          amountCents,
          currency,
          withdrawalId,
        },
      } as any);
    } catch (error) {
      console.error('Failed to send PAYOUT_COMPLETED notification:', error);
    }
  });

  domainEventBus.subscribe<CreatorFlaggedPayload>('CREATOR_FLAGGED', async (event) => {
    const { creatorId, reason, severity } = event.payload;
    try {
      await createUserNotification({
        toUserId: creatorId,
        type: 'CREATOR_FLAGGED',
        priority: 'P0_CRITICAL',
        title: 'Account Flagged',
        message: `Your account has been flagged: ${reason}`,
        actionUrl: '/dashboard/creator/settings',
        metadata: { reason, severity },
      } as any);
    } catch (error) {
      console.error('Failed to send CREATOR_FLAGGED notification:', error);
    }
  });

  domainEventBus.subscribe<VelocitySpikePayload>('VELOCITY_SPIKE_DETECTED', async (event) => {
    const { creatorId, spikeAmount, threshold } = event.payload;
    try {
      await createUserNotification({
        toUserId: creatorId,
        type: 'VELOCITY_SPIKE_DETECTED',
        priority: 'P1_HIGH',
        title: 'Unusual Activity Detected',
        message: `A velocity spike of ${spikeAmount} was detected, exceeding threshold of ${threshold}.`,
        actionUrl: '/dashboard/creator/wallet',
        metadata: { spikeAmount, threshold },
      } as any);
    } catch (error) {
      console.error('Failed to send VELOCITY_SPIKE_DETECTED notification:', error);
    }
  });

  domainEventBus.subscribe<FraudPatternPayload>('FRAUD_PATTERN_DETECTED', async (event) => {
    const { creatorId, pattern } = event.payload;
    try {
      await createUserNotification({
        toUserId: creatorId,
        type: 'FRAUD_DETECTED',
        priority: 'P0_CRITICAL',
        title: 'Fraud Pattern Detected',
        message: `A suspicious pattern has been detected: ${pattern}`,
        actionUrl: '/dashboard/creator/settings',
        metadata: { pattern },
      } as any);
    } catch (error) {
      console.error('Failed to send FRAUD_PATTERN_DETECTED notification:', error);
    }
  });

  domainEventBus.subscribe<ReserveLockedPayload>('RESERVE_LOCKED', async (event) => {
    const { creatorId, amount } = event.payload;
    try {
      await createUserNotification({
        toUserId: creatorId,
        type: 'RESERVE_LOCKED',
        priority: 'P1_HIGH',
        title: 'Funds Reserved',
        message: `${amount} has been reserved from your account.`,
        actionUrl: '/dashboard/creator/wallet',
        metadata: { amount },
      } as any);
    } catch (error) {
      console.error('Failed to send RESERVE_LOCKED notification:', error);
    }
  });

  domainEventBus.subscribe<ReserveReleasedPayload>('RESERVE_RELEASED', async (event) => {
    const { creatorId, amount } = event.payload;
    try {
      await createUserNotification({
        toUserId: creatorId,
        type: 'RESERVE_RELEASED',
        priority: 'P2_NORMAL',
        title: 'Funds Released',
        message: `${amount} has been released from reserve.`,
        actionUrl: '/dashboard/creator/wallet',
        metadata: { amount },
      } as any);
    } catch (error) {
      console.error('Failed to send RESERVE_RELEASED notification:', error);
    }
  });

  domainEventBus.subscribe<TrustScoreDowngradedPayload>('TRUST_SCORE_DOWNGRADED', async (event) => {
    const { creatorId, oldScore, newScore } = event.payload;
    try {
      await createUserNotification({
        toUserId: creatorId,
        type: 'TRUST_SCORE_DOWNGRADED',
        priority: 'P1_HIGH',
        title: 'Trust Score Updated',
        message: `Your trust score changed from ${oldScore} to ${newScore}.`,
        actionUrl: '/dashboard/creator/analytics',
        metadata: { oldScore, newScore },
      } as any);
    } catch (error) {
      console.error('Failed to send TRUST_SCORE_DOWNGRADED notification:', error);
    }
  });

  domainEventBus.subscribe<CreatorTierChangedPayload>('CREATOR_TIER_CHANGED', async (event) => {
    const { creatorId, oldTier, newTier } = event.payload;
    try {
      await createUserNotification({
        toUserId: creatorId,
        type: 'CREATOR_TIER_CHANGED',
        priority: 'P2_NORMAL',
        title: 'Creator Tier Updated',
        message: `Your tier has changed from ${oldTier} to ${newTier}.`,
        actionUrl: '/dashboard/creator/profile',
        metadata: { oldTier, newTier },
      } as any);
    } catch (error) {
      console.error('Failed to send CREATOR_TIER_CHANGED notification:', error);
    }
  });
}

initializeEventHandlers();
