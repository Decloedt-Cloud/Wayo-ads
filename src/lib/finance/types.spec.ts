import { describe, it, expect } from 'vitest';
import {
  centsToFormattedString,
  dollarsToCents,
  centsToDollars,
  calculatePlatformFee,
  calculateNetPayout,
  isValidAmount,
  hasSufficientFunds,
  DEFAULT_CURRENCY,
  PLATFORM_FEE_RATE,
  Wallet,
} from '@/lib/finance/types';

describe('Finance Utility Functions', () => {
  describe('centsToFormattedString', () => {
    it('should format 0 cents as €0.00', () => {
      expect(centsToFormattedString(0, 'EUR')).toBe('€0.00');
    });

    it('should format positive cents correctly', () => {
      expect(centsToFormattedString(100, 'EUR')).toBe('€1.00');
      expect(centsToFormattedString(1500, 'EUR')).toBe('€15.00');
      expect(centsToFormattedString(1050, 'EUR')).toBe('€10.50');
    });

    it('should format large amounts correctly', () => {
      expect(centsToFormattedString(100000, 'EUR')).toBe('€1,000.00');
      expect(centsToFormattedString(999999, 'EUR')).toBe('€9,999.99');
    });

    it('should use default EUR currency', () => {
      expect(centsToFormattedString(100)).toBe('€1.00');
    });

    it('should format with different currencies', () => {
      expect(centsToFormattedString(100, 'USD')).toBe('$1.00');
      expect(centsToFormattedString(100, 'GBP')).toBe('£1.00');
    });
  });

  describe('dollarsToCents', () => {
    it('should convert 0 dollars to 0 cents', () => {
      expect(dollarsToCents(0)).toBe(0);
    });

    it('should convert whole dollars correctly', () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(10)).toBe(1000);
      expect(dollarsToCents(100)).toBe(10000);
    });

    it('should convert decimal dollars correctly', () => {
      expect(dollarsToCents(1.5)).toBe(150);
      expect(dollarsToCents(10.99)).toBe(1099);
      expect(dollarsToCents(0.01)).toBe(1);
    });

    it('should round to nearest cent', () => {
      expect(dollarsToCents(1.555)).toBe(156);
      expect(dollarsToCents(1.554)).toBe(155);
    });

    it('should handle negative amounts', () => {
      expect(dollarsToCents(-10)).toBe(-1000);
      expect(dollarsToCents(-5.5)).toBe(-550);
    });
  });

  describe('centsToDollars', () => {
    it('should convert 0 cents to 0 dollars', () => {
      expect(centsToDollars(0)).toBe(0);
    });

    it('should convert whole cents correctly', () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(1000)).toBe(10);
      expect(centsToDollars(10000)).toBe(100);
    });

    it('should convert decimal cents correctly', () => {
      expect(centsToDollars(1)).toBe(0.01);
      expect(centsToDollars(50)).toBe(0.5);
      expect(centsToDollars(105)).toBe(1.05);
    });

    it('should handle negative cents', () => {
      expect(centsToDollars(-100)).toBe(-1);
      expect(centsToDollars(-550)).toBe(-5.5);
    });
  });

  describe('calculatePlatformFee', () => {
    it('should calculate 3% platform fee by default', () => {
      expect(calculatePlatformFee(1000)).toBe(30);
      expect(calculatePlatformFee(100)).toBe(3);
      expect(calculatePlatformFee(10000)).toBe(300);
    });

    it('should use custom fee rate when provided', () => {
      expect(calculatePlatformFee(1000, 0.05)).toBe(50);
      expect(calculatePlatformFee(1000, 0.1)).toBe(100);
      expect(calculatePlatformFee(1000, 0)).toBe(0);
    });

    it('should round the fee to nearest cent', () => {
      expect(calculatePlatformFee(100)).toBe(3);
      expect(calculatePlatformFee(101)).toBe(3);
      expect(calculatePlatformFee(102)).toBe(3);
      expect(calculatePlatformFee(104)).toBe(3);
    });

    it('should return 0 for 0 amount', () => {
      expect(calculatePlatformFee(0)).toBe(0);
    });

    it('should handle small amounts', () => {
      expect(calculatePlatformFee(1)).toBe(0);
      expect(calculatePlatformFee(10)).toBe(0);
    });
  });

  describe('calculateNetPayout', () => {
    it('should calculate net payout after 3% fee by default', () => {
      expect(calculateNetPayout(1000)).toBe(970);
      expect(calculateNetPayout(100)).toBe(97);
      expect(calculateNetPayout(10000)).toBe(9700);
    });

    it('should use custom fee rate when provided', () => {
      expect(calculateNetPayout(1000, 0.05)).toBe(950);
      expect(calculateNetPayout(1000, 0.1)).toBe(900);
      expect(calculateNetPayout(1000, 0)).toBe(1000);
    });

    it('should return full amount when fee is 0', () => {
      expect(calculateNetPayout(5000, 0)).toBe(5000);
    });

    it('should return 0 for 0 amount', () => {
      expect(calculateNetPayout(0)).toBe(0);
    });

    it('should be the inverse of gross minus fee', () => {
      const gross = 1000;
      const fee = calculatePlatformFee(gross);
      const net = calculateNetPayout(gross);
      expect(net).toBe(gross - fee);
    });
  });

  describe('isValidAmount', () => {
    it('should return true for valid positive amounts', () => {
      expect(isValidAmount(1)).toBe(true);
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(1000000)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isValidAmount(0)).toBe(true);
    });

    it('should return false for negative amounts', () => {
      expect(isValidAmount(-1)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
    });

    it('should return false for non-integer values', () => {
      expect(isValidAmount(1.5)).toBe(false);
      expect(isValidAmount(0.1)).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isValidAmount(undefined as any)).toBe(false);
      expect(isValidAmount(null as any)).toBe(false);
      expect(isValidAmount('100' as any)).toBe(false);
    });
  });

  describe('hasSufficientFunds', () => {
    const mockWallet: Wallet = {
      id: 'wallet-1',
      ownerUserId: 'user-1',
      currency: 'EUR',
      availableCents: 1000,
      pendingCents: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return true when wallet has exact amount', () => {
      expect(hasSufficientFunds(mockWallet, 1000)).toBe(true);
    });

    it('should return true when wallet has more than required', () => {
      expect(hasSufficientFunds(mockWallet, 500)).toBe(true);
      expect(hasSufficientFunds(mockWallet, 1)).toBe(true);
    });

    it('should return false when wallet has less than required', () => {
      expect(hasSufficientFunds(mockWallet, 1001)).toBe(false);
      expect(hasSufficientFunds(mockWallet, 2000)).toBe(false);
    });

    it('should return false when wallet has zero balance', () => {
      const emptyWallet: Wallet = {
        ...mockWallet,
        availableCents: 0,
      };
      expect(hasSufficientFunds(emptyWallet, 1)).toBe(false);
    });

    it('should handle zero required amount', () => {
      expect(hasSufficientFunds(mockWallet, 0)).toBe(true);
    });
  });

  describe('PLATFORM_FEE_RATE constant', () => {
    it('should be 0.03 (3%)', () => {
      expect(PLATFORM_FEE_RATE).toBe(0.03);
    });
  });

  describe('DEFAULT_CURRENCY constant', () => {
    it('should be EUR', () => {
      expect(DEFAULT_CURRENCY).toBe('EUR');
    });
  });
});
