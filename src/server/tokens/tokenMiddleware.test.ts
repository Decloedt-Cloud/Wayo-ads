import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkAndConsumeTokens,
  createTokenCheckMiddleware,
  requireTokens,
  TokenCheckResult,
} from '../tokens/tokenMiddleware';
import * as tokenService from '../tokens/tokenService';

vi.mock('../tokens/tokenService', () => ({
  consumeTokens: vi.fn(),
  checkTokenBalance: vi.fn(),
  getTokenCost: vi.fn(),
  TOKEN_COSTS: {
    SCRIPT_GENERATION: 5,
    PATTERN_ANALYSIS: 10,
    TITLE_ENGINE: 3,
    THUMBNAIL_PSYCHOLOGY: 5,
    VIRAL_PATTERN_LIBRARY: 15,
    CREATOR_INTELLIGENCE: 8,
    CONTENT_ANALYSIS: 5,
    TREND_ANALYSIS: 10,
  },
}));

describe('TokenMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndConsumeTokens', () => {
    it('should allow when cost is 0', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(0);

      const result = await checkAndConsumeTokens('user-1', 'SCRIPT_GENERATION');

      expect(result.allowed).toBe(true);
      expect(result.cost).toBe(0);
      expect(tokenService.checkTokenBalance).not.toHaveBeenCalled();
      expect(tokenService.consumeTokens).not.toHaveBeenCalled();
    });

    it('should deny when insufficient tokens', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(5);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: false,
        balance: 3,
        threshold: 20,
      });

      const result = await checkAndConsumeTokens('user-1', 'SCRIPT_GENERATION');

      expect(result.allowed).toBe(false);
      expect(result.balance).toBe(3);
      expect(result.cost).toBe(5);
      expect(result.errorCode).toBe('INSUFFICIENT_TOKENS');
      expect(result.error).toContain('Insufficient tokens');
      expect(tokenService.consumeTokens).not.toHaveBeenCalled();
    });

    it('should consume tokens when balance is sufficient', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(5);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: true,
        balance: 50,
        threshold: 20,
      });
      vi.mocked(tokenService.consumeTokens).mockResolvedValue({
        success: true,
        newBalance: 45,
        transactionId: 'tx-1',
      });

      const result = await checkAndConsumeTokens('user-1', 'SCRIPT_GENERATION');

      expect(result.allowed).toBe(true);
      expect(result.balance).toBe(45);
      expect(result.cost).toBe(5);
      expect(tokenService.consumeTokens).toHaveBeenCalledWith(
        'user-1',
        5,
        'SCRIPT_GENERATION'
      );
    });

    it('should deny when consumeTokens fails', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(5);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: true,
        balance: 50,
        threshold: 20,
      });
      vi.mocked(tokenService.consumeTokens).mockResolvedValue({
        success: false,
        error: 'Transaction failed',
        errorCode: 'TRANSACTION_FAILED',
      });

      const result = await checkAndConsumeTokens('user-1', 'SCRIPT_GENERATION');

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe('TRANSACTION_FAILED');
      expect(result.error).toBe('Transaction failed');
    });

    it('should handle different token features with correct costs', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(10);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: true,
        balance: 100,
        threshold: 20,
      });
      vi.mocked(tokenService.consumeTokens).mockResolvedValue({
        success: true,
        newBalance: 90,
        transactionId: 'tx-1',
      });

      const result = await checkAndConsumeTokens('user-1', 'PATTERN_ANALYSIS');

      expect(result.allowed).toBe(true);
      expect(result.cost).toBe(10);
    });

    it('should pass correct parameters to consumeTokens', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(5);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: true,
        balance: 50,
        threshold: 20,
      });
      vi.mocked(tokenService.consumeTokens).mockResolvedValue({
        success: true,
        newBalance: 45,
        transactionId: 'tx-1',
      });

      await checkAndConsumeTokens('user-1', 'SCRIPT_GENERATION');

      expect(tokenService.consumeTokens).toHaveBeenCalledWith(
        'user-1',
        5,
        'SCRIPT_GENERATION'
      );
    });
  });

  describe('createTokenCheckMiddleware', () => {
    it('should create middleware function', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(5);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: true,
        balance: 50,
        threshold: 20,
      });
      vi.mocked(tokenService.consumeTokens).mockResolvedValue({
        success: true,
        newBalance: 45,
        transactionId: 'tx-1',
      });

      const middleware = createTokenCheckMiddleware('PATTERN_ANALYSIS');
      const result = await middleware('user-1');

      expect(result.allowed).toBe(true);
    });

    it('should use correct feature for middleware', async () => {
      vi.mocked(tokenService.getTokenCost).mockImplementation((feature) => {
        const costs: Record<string, number> = {
          SCRIPT_GENERATION: 5,
          PATTERN_ANALYSIS: 10,
          TITLE_ENGINE: 3,
        };
        return costs[feature] || 0;
      });
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: true,
        balance: 50,
        threshold: 20,
      });
      vi.mocked(tokenService.consumeTokens).mockResolvedValue({
        success: true,
        newBalance: 40,
        transactionId: 'tx-1',
      });

      const middleware = createTokenCheckMiddleware('TITLE_ENGINE');
      await middleware('user-1');

      expect(tokenService.getTokenCost).toHaveBeenCalledWith('TITLE_ENGINE');
    });
  });

  describe('requireTokens', () => {
    it('should return null (allowed) when tokens are available', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(5);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: true,
        balance: 50,
        threshold: 20,
      });
      vi.mocked(tokenService.consumeTokens).mockResolvedValue({
        success: true,
        newBalance: 45,
        transactionId: 'tx-1',
      });

      const middleware = requireTokens('SCRIPT_GENERATION');
      const result = await middleware('user-1');

      expect(result).toBeNull();
    });

    it('should return NextResponse when tokens are insufficient', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(5);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: false,
        balance: 3,
        threshold: 20,
      });

      const middleware = requireTokens('SCRIPT_GENERATION');
      const result = await middleware('user-1');

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it('should return NextResponse when consumeTokens fails', async () => {
      vi.mocked(tokenService.getTokenCost).mockReturnValue(5);
      vi.mocked(tokenService.checkTokenBalance).mockResolvedValue({
        hasEnough: true,
        balance: 50,
        threshold: 20,
      });
      vi.mocked(tokenService.consumeTokens).mockResolvedValue({
        success: false,
        error: 'Transaction failed',
        errorCode: 'TRANSACTION_FAILED',
      });

      const middleware = requireTokens('SCRIPT_GENERATION');
      const result = await middleware('user-1');

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });
  });
});
