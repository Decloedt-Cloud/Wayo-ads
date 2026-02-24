import type { TokenFeature } from './tokenService';

export interface TokenTransactionResult {
  success: boolean;
  newBalance?: number;
  transactionId?: string;
  error?: string;
  errorCode?: string;
}

export interface ITokenService {
  consumeTokens(
    userId: string,
    amount: number,
    feature: TokenFeature
  ): Promise<TokenTransactionResult>;
  
  checkTokenBalance(userId: string): Promise<{ hasEnough: boolean; balance: number }>;
  
  getTokenCost(feature: TokenFeature): number;
}
