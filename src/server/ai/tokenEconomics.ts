import { db } from '@/lib/db';
import { estimateCost, getProviderFromModel } from './costCalculator';
import { Prisma } from '@prisma/client';

const USD_PER_PLATFORM_TOKEN = 0.02;

export function computePlatformTokens(costUsd: number | null): number {
  if (!costUsd || costUsd <= 0) {
    return 1;
  }
  return Math.ceil(costUsd / USD_PER_PLATFORM_TOKEN);
}

export function computeTokenRevenue(tokensCharged: number): number {
  return tokensCharged * USD_PER_PLATFORM_TOKEN;
}

export function computeMargin(tokenRevenueUsd: number, llmCostUsd: number): number {
  return tokenRevenueUsd - llmCostUsd;
}

export async function deductCreatorTokensAtomically(
  creatorId: string,
  tokensToDeduct: number
): Promise<{ success: boolean; newBalance: number }> {
  return await db.$transaction(async (tx) => {
    const wallet = await tx.userTokenWallet.findUnique({
      where: { userId: creatorId },
    });

    if (!wallet || wallet.balanceTokens < tokensToDeduct) {
      throw new Error('INSUFFICIENT_TOKENS');
    }

    const updated = await tx.userTokenWallet.update({
      where: { userId: creatorId },
      data: {
        balanceTokens: { decrement: tokensToDeduct },
        lifetimeConsumedTokens: { increment: tokensToDeduct },
      },
    });

    return {
      success: true,
      newBalance: updated.balanceTokens,
    };
  });
}

export async function createAiUsageRecord(data: {
  creatorId: string;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number | null;
  tokensCharged: number;
  tokenRevenueUsd?: number;
  marginUsd?: number;
  traceId?: string;
  metadata?: Record<string, unknown>;
}) {
  return await db.creatorAiUsage.create({
    data: {
      creatorId: data.creatorId,
      feature: data.feature,
      model: data.model,
      provider: getProviderFromModel(data.model),
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.promptTokens + data.completionTokens,
      estimatedCostUsd: data.estimatedCostUsd,
      tokensCharged: data.tokensCharged,
      tokenRevenueUsd: data.tokenRevenueUsd,
      marginUsd: data.marginUsd,
      traceId: data.traceId,
      metadata: (data.metadata || {}) as Prisma.InputJsonValue,
    },
  });
}

export async function trackAiUsageAndDeductTokens(
  creatorId: string,
  feature: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  traceId?: string,
  metadata?: Record<string, unknown>
): Promise<{
  tokensCharged: number;
  newBalance: number;
  estimatedCostUsd: number;
  tokenRevenueUsd: number;
  marginUsd: number;
}> {
  const estimatedCostUsd = estimateCost(model, promptTokens, completionTokens);
  const tokensCharged = computePlatformTokens(estimatedCostUsd);
  const tokenRevenueUsd = computeTokenRevenue(tokensCharged);
  const marginUsd = computeMargin(tokenRevenueUsd, estimatedCostUsd);
  const provider = getProviderFromModel(model);

  await db.$transaction(async (tx) => {
    const wallet = await tx.userTokenWallet.findUnique({
      where: { userId: creatorId },
    });

    if (!wallet || (wallet.balanceTokens ?? 0) < tokensCharged) {
      throw new Error('INSUFFICIENT_TOKENS');
    }

    await tx.userTokenWallet.update({
      where: { userId: creatorId },
      data: {
        balanceTokens: { decrement: tokensCharged },
        lifetimeConsumedTokens: { increment: tokensCharged },
      },
    });

    await tx.creatorAiUsage.create({
      data: {
        creatorId,
        feature,
        model,
        provider,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd,
        tokensCharged,
        tokenRevenueUsd,
        marginUsd,
        traceId,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    });
  });

  const finalWallet = await db.userTokenWallet.findUnique({
    where: { userId: creatorId },
  });

  return {
    tokensCharged,
    newBalance: finalWallet?.balanceTokens ?? 0,
    estimatedCostUsd,
    tokenRevenueUsd,
    marginUsd,
  };
}
