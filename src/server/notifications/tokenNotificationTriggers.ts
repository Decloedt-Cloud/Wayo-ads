import { createUserNotification } from './notificationService';
import { notificationRepository } from './repositories';
import { LOW_TOKEN_THRESHOLD } from '@/server/tokens';

const defaultOptions = {
  scope: 'USER' as const,
  deliveryType: 'IN_APP' as const,
  expiresAt: undefined as unknown as Date | undefined,
};

export async function notifyLowTokens(userId: string, balance: number) {
  const existing = await notificationRepository.findFirst({
    where: {
      toUserId: userId,
      type: 'TOKENS_LOW',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (existing) return;

  return createUserNotification({
    ...defaultOptions,
    toUserId: userId,
    type: 'TOKENS_LOW',
    priority: 'P2_NORMAL',
    title: 'Tokens Running Low',
    message: `You have only ${balance} tokens remaining. Top up to continue using AI features.`,
    actionUrl: '/dashboard/creator/tokens',
    dedupeKey: `low_tokens_${userId}`,
    metadata: { balance, threshold: LOW_TOKEN_THRESHOLD },
  });
}

export async function notifyTokensExhausted(userId: string) {
  const existing = await notificationRepository.findFirst({
    where: {
      toUserId: userId,
      type: 'TOKENS_EXHAUSTED',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (existing) return;

  return createUserNotification({
    ...defaultOptions,
    toUserId: userId,
    type: 'TOKENS_EXHAUSTED',
    priority: 'P1_HIGH',
    title: 'Tokens Exhausted',
    message: 'Your tokens are depleted. Purchase more to continue using AI features.',
    actionUrl: '/dashboard/creator/tokens',
    dedupeKey: `tokens_exhausted_${userId}`,
    metadata: {},
  });
}

export async function notifyTokensPurchased(userId: string, tokens: number, newBalance: number) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: userId,
    type: 'TOKENS_PURCHASED',
    priority: 'P3_LOW',
    title: 'Tokens Added',
    message: `${tokens} tokens have been added to your account. New balance: ${newBalance}`,
    actionUrl: '/dashboard/creator/tokens',
    dedupeKey: `tokens_purchased_${userId}_${Date.now()}`,
    metadata: { tokens, newBalance },
  });
}
