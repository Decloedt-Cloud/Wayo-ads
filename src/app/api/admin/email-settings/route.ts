/**
 * Email Settings API Routes
 * 
 * GET: Retrieve current email settings (masked)
 * PUT: Update email settings
 * 
 * All routes require SUPERADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import {
  getEmailSettings,
  updateEmailSettings,
  EmailSettingsError,
} from '@/server/admin/emailSettingsService';
import { z } from 'zod';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10;

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
  host: z.string().min(1).max(256),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().max(256).optional(),
  password: z.string().max(256).optional(),
  fromEmail: z.string().email().max(256),
  fromName: z.string().max(128).optional(),
  replyToEmail: z.string().email().max(256).optional(),
  isEnabled: z.boolean(),
});

/**
 * GET /api/admin/email-settings
 * Get current email settings (all values are masked)
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

    const settings = await getEmailSettings();

    return NextResponse.json({
      settings,
    });
  } catch (error) {
    console.error('[API] GET /api/admin/email-settings error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.startsWith('Forbidden')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to retrieve email settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/email-settings
 * Update email settings
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

    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await updateEmailSettings(
      validated,
      user.id,
      { ipAddress: ip, userAgent }
    );

    return NextResponse.json({ success: true, settings: result });
  } catch (error) {
    console.error('[API] PUT /api/admin/email-settings error:', error);

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

    if (error instanceof EmailSettingsError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update email settings' },
      { status: 500 }
    );
  }
}
