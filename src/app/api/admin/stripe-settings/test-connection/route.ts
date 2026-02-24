/**
 * Stripe Test Connection API Route
 * 
 * POST: Test Stripe connection by validating credentials
 * 
 * Requires SUPERADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import { testStripeConnection } from '@/server/admin/stripeSettingsService';

// Rate limiting (stricter for test connection)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // Max requests per window (lower for test connection)

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

/**
 * POST /api/admin/stripe-settings/test-connection
 * Test the Stripe connection by making a simple API call
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    
    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests', errorCode: 'RATE_LIMITED' },
        { status: 429 }
      );
    }
    
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const result = await testStripeConnection(
      user.id,
      { ipAddress: ip, userAgent }
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] POST /api/admin/stripe-settings/test-connection error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to test Stripe connection' },
      { status: 500 }
    );
  }
}
