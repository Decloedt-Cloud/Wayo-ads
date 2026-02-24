import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    withdrawalRequest: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    wallet: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/server-auth', () => ({
  getCurrentUser: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock('@/server/finance/financeService', () => ({
  getCreatorBalance: vi.fn(),
  getWithdrawalRequests: vi.fn(),
  requestWithdrawal: vi.fn(),
  cancelWithdrawal: vi.fn(),
}));

vi.mock('@/server/payments/psp', () => ({
  getPSP: vi.fn(),
  canSimulate: vi.fn(),
}));

import { db } from '@/lib/db';
import { getCurrentUser, requireRole } from '@/lib/server-auth';
import { 
  getCreatorBalance, 
  getWithdrawalRequests, 
  requestWithdrawal, 
  cancelWithdrawal 
} from '@/server/finance/financeService';
import { getPSP, canSimulate } from '@/server/payments/psp';
import { GET, POST, DELETE } from '@/app/api/creator/withdrawal/route';

const mockDb = db as any;
const mockGetCurrentUser = getCurrentUser as any;
const mockRequireRole = requireRole as any;
const mockGetCreatorBalance = getCreatorBalance as any;
const mockGetWithdrawalRequests = getWithdrawalRequests as any;
const mockRequestWithdrawal = requestWithdrawal as any;
const mockCancelWithdrawal = cancelWithdrawal as any;
const mockCanSimulate = canSimulate as any;
const mockGetPSP = getPSP as any;

describe('GET /api/creator/withdrawal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/creator/withdrawal');
    const response = await GET(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return balance and withdrawals for authenticated creator', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'creator-123', email: 'test@creator.com' });
    mockGetCreatorBalance.mockResolvedValue({
      availableCents: 50000,
      pendingCents: 10000,
      totalEarnedCents: 60000,
      currency: 'EUR',
    });
    mockGetWithdrawalRequests.mockResolvedValue({
      requests: [
        {
          id: 'withdrawal-1',
          amountCents: 10000,
          platformFeeCents: 1000,
          currency: 'EUR',
          status: 'COMPLETED',
          psReference: 'pi_123',
          failureReason: null,
          createdAt: new Date('2024-01-15'),
          processedAt: new Date('2024-01-16'),
        },
      ],
      total: 1,
    });
    mockCanSimulate.mockReturnValue(true);

    const request = new Request('http://localhost:3000/api/creator/withdrawal');
    const response = await GET(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.balance).toEqual({
      availableCents: 50000,
      pendingCents: 10000,
      totalEarnedCents: 60000,
      currency: 'EUR',
    });
    expect(data.withdrawals).toHaveLength(1);
    expect(data.withdrawals[0].id).toBe('withdrawal-1');
    expect(data.total).toBe(1);
  });

  it('should handle query parameters for pagination and status filtering', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'creator-123', email: 'test@creator.com' });
    mockGetCreatorBalance.mockResolvedValue({
      availableCents: 0,
      pendingCents: 0,
      totalEarnedCents: 0,
      currency: 'EUR',
    });
    mockGetWithdrawalRequests.mockResolvedValue({
      requests: [],
      total: 0,
    });
    mockCanSimulate.mockReturnValue(false);

    const request = new Request('http://localhost:3000/api/creator/withdrawal?limit=10&offset=5&status=PENDING');
    const response = await GET(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetWithdrawalRequests).toHaveBeenCalledWith('creator-123', {
      limit: 10,
      offset: 5,
      status: 'PENDING',
    });
  });

  it('should return 500 on database error', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'creator-123', email: 'test@creator.com' });
    mockGetCreatorBalance.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost:3000/api/creator/withdrawal');
    const response = await GET(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch withdrawals');
  });
});

describe('POST /api/creator/withdrawal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanSimulate.mockReturnValue(true);
    mockRequireRole.mockResolvedValue({ id: 'creator-123', email: 'test@creator.com', roles: ['CREATOR'] });
  });

  it('should return 400 if amountCents is missing', async () => {
    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should return 400 if amountCents is not a positive integer', async () => {
    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: -100 }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should return 400 if amountCents is zero', async () => {
    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: 0 }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should return 400 if amountCents is not an integer', async () => {
    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: 10.5 }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should return 400 if insufficient balance', async () => {
    mockGetCreatorBalance.mockResolvedValue({
      availableCents: 5000,
      pendingCents: 0,
      totalEarnedCents: 5000,
      currency: 'EUR',
    });

    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: 10000 }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Insufficient balance');
    expect(data.errorCode).toBe('INSUFFICIENT_FUNDS');
    expect(data.details).toEqual({
      requested: 10000,
      available: 5000,
    });
  });

  it('should create withdrawal successfully with sufficient balance', async () => {
    mockGetCreatorBalance.mockResolvedValue({
      availableCents: 50000,
      pendingCents: 0,
      totalEarnedCents: 50000,
      currency: 'EUR',
    });
    mockRequestWithdrawal.mockResolvedValue({
      success: true,
      withdrawalId: 'withdrawal-123',
      amountCents: 9000,
      platformFeeCents: 1000,
      newAvailableCents: 41000,
    });
    mockGetPSP.mockReturnValue({
      createPayout: vi.fn().mockResolvedValue({ payoutId: 'payout_123' }),
    });

    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: 10000 }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.withdrawal.id).toBe('withdrawal-123');
    expect(data.withdrawal.amountCents).toBe(9000);
    expect(data.withdrawal.platformFeeCents).toBe(1000);
    expect(data.withdrawal.grossAmountCents).toBe(10000);
    expect(data.withdrawal.status).toBe('PROCESSING');
    expect(data.withdrawal.psReference).toBe('payout_123');
    expect(data.newAvailableCents).toBe(41000);
  });

  it('should handle withdrawal request failure', async () => {
    mockGetCreatorBalance.mockResolvedValue({
      availableCents: 50000,
      pendingCents: 0,
      totalEarnedCents: 50000,
      currency: 'EUR',
    });
    mockRequestWithdrawal.mockResolvedValue({
      success: false,
      error: 'WITHDRAWAL_ALREADY_PENDING',
    });

    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: 10000 }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.errorCode).toBe('WITHDRAWAL_ALREADY_PENDING');
  });

  it('should create withdrawal with PENDING status when not in simulate mode', async () => {
    mockCanSimulate.mockReturnValue(false);
    mockGetCreatorBalance.mockResolvedValue({
      availableCents: 50000,
      pendingCents: 0,
      totalEarnedCents: 50000,
      currency: 'EUR',
    });
    mockRequestWithdrawal.mockResolvedValue({
      success: true,
      withdrawalId: 'withdrawal-123',
      amountCents: 9000,
      platformFeeCents: 1000,
      newAvailableCents: 41000,
    });

    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: 10000 }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.withdrawal.status).toBe('PENDING');
    expect(data.withdrawal.psReference).toBeNull();
  });
});

describe('DELETE /api/creator/withdrawal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ id: 'creator-123', email: 'test@creator.com', roles: ['CREATOR'] });
  });

  it('should return 400 if withdrawal ID is missing', async () => {
    const request = new Request('http://localhost:3000/api/creator/withdrawal', {
      method: 'DELETE',
    });

    const response = await DELETE(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Withdrawal ID is required');
  });

  it('should cancel withdrawal successfully', async () => {
    mockCancelWithdrawal.mockResolvedValue({
      success: true,
      withdrawalId: 'withdrawal-123',
      newAvailableCents: 50000,
    });

    const request = new Request('http://localhost:3000/api/creator/withdrawal?id=withdrawal-123', {
      method: 'DELETE',
    });

    const response = await DELETE(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.withdrawal).toEqual({
      id: 'withdrawal-123',
      status: 'CANCELLED',
    });
    expect(data.newAvailableCents).toBe(50000);
  });

  it('should return 400 if cancellation fails', async () => {
    mockCancelWithdrawal.mockResolvedValue({
      success: false,
      error: 'WITHDRAWAL_ALREADY_PROCESSING',
    });

    const request = new Request('http://localhost:3000/api/creator/withdrawal?id=withdrawal-123', {
      method: 'DELETE',
    });

    const response = await DELETE(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.errorCode).toBe('WITHDRAWAL_ALREADY_PROCESSING');
  });

  it('should return 500 for database errors during cancellation', async () => {
    mockCancelWithdrawal.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost:3000/api/creator/withdrawal?id=withdrawal-123', {
      method: 'DELETE',
    });

    const response = await DELETE(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to cancel withdrawal');
  });
});
