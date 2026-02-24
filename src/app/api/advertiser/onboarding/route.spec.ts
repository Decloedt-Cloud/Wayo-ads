import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

import { POST } from '@/app/api/advertiser/onboarding/route';
import { getServerSession } from 'next-auth';

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

describe('POST /api/advertiser/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/advertiser/onboarding', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Unauthorized');
  });

  it('should return 401 if user id is missing from session', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });

    const request = new Request('http://localhost:3000/api/advertiser/onboarding', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Unauthorized');
  });

  it('should successfully complete onboarding with valid data', async () => {
    const mockSession = {
      user: {
        id: 'advertiser-123',
        email: 'test@advertiser.com',
      },
    };
    mockGetServerSession.mockResolvedValue(mockSession);

    const onboardingData = {
      business: {
        companyName: 'Test Company',
        industry: 'Technology',
        website: 'https://testcompany.com',
        description: 'A test company',
      },
      payment: {
        method: 'card',
        cardNumber: '1234567890123456',
        expiryDate: '12/25',
        cvv: '123',
        billingAddress: '123 Test St',
      },
      campaign: {
        name: 'My First Campaign',
        goal: 'brand_awareness',
        budget: '5000',
        duration: '30',
      },
    };

    const request = new Request('http://localhost:3000/api/advertiser/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onboardingData),
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Onboarding completed successfully');
    expect(data.data.business.companyName).toBe('Test Company');
    expect(data.data.paymentMethod).toBe('card');
    expect(data.data.campaign).toBe('My First Campaign');
  });

  it('should handle different campaign goals', async () => {
    const mockSession = {
      user: {
        id: 'advertiser-123',
        email: 'test@advertiser.com',
      },
    };
    mockGetServerSession.mockResolvedValue(mockSession);

    const goals = ['brand_awareness', 'website_traffic', 'lead_generation', 'app_installs'];

    for (const goal of goals) {
      const onboardingData = {
        business: {
          companyName: 'Test Company',
          industry: 'Technology',
          website: '',
          description: '',
        },
        payment: {
          method: 'card',
        },
        campaign: {
          name: 'Test Campaign',
          goal: goal,
          budget: '1000',
          duration: '30',
        },
      };

      const request = new Request('http://localhost:3000/api/advertiser/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData),
      });

      const response = await POST(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
    }
  });

  it('should handle different campaign durations', async () => {
    const mockSession = {
      user: {
        id: 'advertiser-123',
        email: 'test@advertiser.com',
      },
    };
    mockGetServerSession.mockResolvedValue(mockSession);

    const durations = ['7', '14', '30', '60', '90'];

    for (const duration of durations) {
      const onboardingData = {
        business: {
          companyName: 'Test Company',
          industry: 'Technology',
          website: '',
          description: '',
        },
        payment: {
          method: 'card',
        },
        campaign: {
          name: 'Test Campaign',
          goal: 'brand_awareness',
          budget: '1000',
          duration: duration,
        },
      };

      const request = new Request('http://localhost:3000/api/advertiser/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(onboardingData),
      });

      const response = await POST(request as unknown as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
    }
  });

  it('should handle empty optional fields', async () => {
    const mockSession = {
      user: {
        id: 'advertiser-123',
        email: 'test@advertiser.com',
      },
    };
    mockGetServerSession.mockResolvedValue(mockSession);

    const onboardingData = {
      business: {
        companyName: 'Minimal Company',
        industry: 'Other',
        website: '',
        description: '',
      },
      payment: {
        method: 'card',
      },
      campaign: {
        name: 'Simple Campaign',
        goal: 'brand_awareness',
        budget: '100',
        duration: '7',
      },
    };

    const request = new Request('http://localhost:3000/api/advertiser/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onboardingData),
    });

    const response = await POST(request as unknown as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.business.companyName).toBe('Minimal Company');
  });
});
