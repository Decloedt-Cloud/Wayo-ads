/**
 * Test Email API Route
 * 
 * POST: Send a test email to verify SMTP configuration
 * 
 * Requires SUPERADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import { sendTestEmail } from '@/server/admin/emailSettingsService';
import { z } from 'zod';

// Rate limiting (stricter for test emails)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3; // Only 3 test emails per minute

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

// Validation schema
const testEmailSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/admin/email-settings/test-email
 * Send a test email
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before sending another test email.', errorCode: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validated = testEmailSchema.parse(body);

    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await sendTestEmail(
      validated.email,
      user.id,
      { ipAddress: ip, userAgent }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] POST /api/admin/email-settings/test-email error:', error);

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
        { error: 'Invalid email address', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
