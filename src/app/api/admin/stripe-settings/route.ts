/**
 * Stripe Settings API Routes
 * 
 * GET: Retrieve current Stripe settings (masked)
 * PUT: Update Stripe settings
 * 
 * All routes require SUPERADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import {
  getStripeSettings,
  updateStripeSettings,
  StripeSettingsError,
} from '@/server/admin/stripeSettingsService';
import { z } from 'zod';

// Rate limiting (in-memory, basic implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max requests per window

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

// Input validation schema
const updateSettingsSchema = z.object({
  mode: z.enum(['TEST', 'LIVE']),
  publishableKey: z.string().min(1).max(256).optional(),
  secretKey: z.string().min(1).max(256).optional(),
  webhookSecret: z.string().min(1).max(256).optional(),
  connectAccountId: z.string().min(1).max(128).optional(),
});

/**
 * GET /api/admin/stripe-settings
 * Get current Stripe settings (all values are masked)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    
    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests', errorCode: 'RATE_LIMITED' },
        { status: 429 }
      );
    }
    
    const settings = await getStripeSettings();
    
    return NextResponse.json({
      settings,
      encryptionConfigured: true, // We check this at startup
    });
  } catch (error) {
    console.error('[API] GET /api/admin/stripe-settings error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to retrieve Stripe settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/stripe-settings
 * Update Stripe settings
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    
    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests', errorCode: 'RATE_LIMITED' },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const validated = updateSettingsSchema.parse(body);
    
    // Ensure at least secret key is provided for a valid configuration
    if (!validated.secretKey) {
      // Check if there are existing settings
      const existingSettings = await getStripeSettings();
      if (!existingSettings || !existingSettings.secretKeyMasked) {
        return NextResponse.json(
          { error: 'Secret key is required for initial configuration' },
          { status: 400 }
        );
      }
    }
    
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    const result = await updateStripeSettings(
      validated,
      user.id,
      { ipAddress: ip, userAgent }
    );
    
    return NextResponse.json({ success: true, settings: result });
  } catch (error) {
    console.error('[API] PUT /api/admin/stripe-settings error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    if (error instanceof StripeSettingsError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update Stripe settings' },
      { status: 500 }
    );
  }
}
