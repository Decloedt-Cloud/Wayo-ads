import { NextRequest, NextResponse } from 'next/server';
import { consumeTokens, checkTokenBalance, getTokenCost, TokenFeature } from '@/server/tokens';

export interface TokenCheckResult {
  allowed: boolean;
  balance?: number;
  cost?: number;
  error?: string;
  errorCode?: 'INSUFFICIENT_TOKENS' | 'WALLET_NOT_FOUND' | 'TRANSACTION_FAILED';
}

export async function checkAndConsumeTokens(
  userId: string,
  feature: TokenFeature
): Promise<TokenCheckResult> {
  const cost = getTokenCost(feature);
  
  if (cost === 0) {
    return { allowed: true, cost: 0 };
  }

  const { hasEnough, balance } = await checkTokenBalance(userId);
  
  if (!hasEnough || balance < cost) {
    return {
      allowed: false,
      balance,
      cost,
      error: `Insufficient tokens. Required: ${cost}, Available: ${balance || 0}`,
      errorCode: 'INSUFFICIENT_TOKENS',
    };
  }

  const result = await consumeTokens(userId, cost, feature);
  
  if (!result.success) {
    return {
      allowed: false,
      balance,
      cost,
      error: result.error || 'Failed to consume tokens',
      errorCode: result.errorCode || 'TRANSACTION_FAILED',
    };
  }

  return {
    allowed: true,
    balance: result.newBalance,
    cost,
  };
}

export function createTokenCheckMiddleware(feature: TokenFeature) {
  return async function tokenCheck(userId: string): Promise<TokenCheckResult> {
    return checkAndConsumeTokens(userId, feature);
  };
}

export function requireTokens(feature: TokenFeature) {
  return async function (userId: string): Promise<NextResponse | null> {
    const result = await checkAndConsumeTokens(userId, feature);
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: result.errorCode,
          message: result.error,
          balance: result.balance,
          required: result.cost,
        },
        { status: 403 }
      );
    }
    
    return null;
  };
}
