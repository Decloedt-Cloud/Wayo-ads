import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

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

const mockStripeAccountsCreateLoginLink = vi.fn();

vi.mock('stripe', () => {
  const MockStripe = class Stripe {
    get accounts() {
      return {
        createLoginLink: mockStripeAccountsCreateLoginLink,
      };
    }
  };
  return { default: MockStripe };
});

import { db } from '@/lib/db';
import { getStripeCredentials } from '@/server/admin/stripeSettingsService';

import { POST } from '@/app/api/creator/stripe-connect/login/route';

const mockDb = db as any;
const mockGetStripeCredentials = getStripeCredentials as any;

describe('POST /api/creator/stripe-connect/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeAccountsCreateLoginLink.mockResolvedValue({
      url: 'https://connect.stripe.com/express/oauth/abc123',
      object: 'login_link',
    });
  });

  it('should return 500 if Stripe is not configured', async () => {
    mockGetStripeCredentials.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: 'acct_123',
    });

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/login', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Stripe not configured. Contact admin.');
  });

  it('should return 404 if user not found', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
    mockDb.user.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/login', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return 400 if user has no Stripe account connected', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: null,
    });

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/login', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No Stripe account connected. Please complete onboarding first.');
  });

  it('should create login link for user with Stripe account', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: 'acct_123',
    });
    mockStripeAccountsCreateLoginLink.mockResolvedValue({
      url: 'https://connect.stripe.com/express/oauth/abc123',
      object: 'login_link',
    });

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/login', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe('https://connect.stripe.com/express/oauth/abc123');
    expect(mockStripeAccountsCreateLoginLink).toHaveBeenCalledWith('acct_123');
  });

  it('should return 400 if Stripe account not found on Stripe', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: 'acct_invalid',
    });
    mockStripeAccountsCreateLoginLink.mockRejectedValue({
      code: 'resource_missing',
      message: 'No such account: acct_invalid',
    });

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/login', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Stripe account not found. Please complete onboarding first.');
  });

  it('should handle unexpected errors gracefully', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_test_123' });
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: 'acct_123',
    });
    mockStripeAccountsCreateLoginLink.mockRejectedValue(new Error('Network error'));

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/login', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create Stripe dashboard login link');
  });

  it('should use platform secret key for all Stripe calls', async () => {
    mockGetStripeCredentials.mockResolvedValue({ secretKey: 'sk_live_123' });
    mockDb.user.findUnique.mockResolvedValue({ 
      id: 'user-123', 
      email: 'test@example.com',
      stripeAccountId: 'acct_123',
    });

    const request = new Request('http://localhost:3000/api/creator/stripe-connect/login', {
      method: 'POST',
    });

    const response = await POST(request as unknown as NextRequest);

    expect(response.status).toBe(200);
    expect(mockGetStripeCredentials).toHaveBeenCalled();
  });
});
