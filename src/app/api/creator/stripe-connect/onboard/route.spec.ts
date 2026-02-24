import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/server-auth', () => ({
  requireRole: vi.fn((role: string) => Promise.resolve({ id: 'user-123', roles: [role] })),
}));

vi.mock('@/server/admin/stripeSettingsService', () => ({
  getStripeCredentials: vi.fn(),
}));

const mockStripeAccountsRetrieve = vi.fn();
const mockStripeAccountsCreate = vi.fn();
const mockStripeAccountLinksCreate = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      accounts: {
        create: mockStripeAccountsCreate,
        retrieve: mockStripeAccountsRetrieve,
      },
      accountLinks: {
        create: mockStripeAccountLinksCreate,
      },
    })),
  };
});

import { db } from '@/lib/db';
import { getStripeCredentials } from '@/server/admin/stripeSettingsService';
import { POST } from '@/app/api/creator/stripe-connect/onboard/route';

const mockDb = db as any;
const mockGetStripeCredentials = getStripeCredentials as any;

describe('POST /api/creator/stripe-connect/onboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeAccountsCreate.mockResolvedValue({ id: 'acct_new123' });
    mockStripeAccountLinksCreate.mockResolvedValue({
      url: 'https://connect.stripe.com/setup/s/test',
      object: 'account_link',
    });
  });

  it('should return 500 if Stripe is not configured', async () => {
    mockGetStripeCredentials.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: null 
    });

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/onboard', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Stripe not configured');
  });

  it('should create new Stripe account for user without one', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: null 
    });
    mockDb.user.update.mockResolvedValue({});

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/onboard', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockStripeAccountsCreate).toHaveBeenCalledWith({
      type: 'express',
      email: 'test@example.com',
      metadata: {
        userId: 'user-123',
        platform: 'wayo-ads',
      },
      capabilities: {
        transfers: { requested: true },
      },
    });
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { stripeAccountId: 'acct_new123' },
    });
    expect(data.url).toContain('stripe.com');
  });

  it('should return onboarding URL for existing Stripe account', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: 'acct_existing123' 
    });

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/onboard', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockStripeAccountsCreate).not.toHaveBeenCalled();
    expect(mockStripeAccountLinksCreate).toHaveBeenCalled();
    expect(data.url).toContain('stripe.com');
  });

  it('should return 500 if Stripe account creation fails', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: null 
    });
    mockStripeAccountsCreate.mockRejectedValue(new Error('Stripe error'));

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/onboard', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to create');
  });
});
