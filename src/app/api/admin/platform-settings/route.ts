/**
 * Admin API: Platform Settings Management
 * 
 * GET  /api/admin/platform-settings - Get current settings
 * PUT  /api/admin/platform-settings - Update settings
 * 
 * Requires SUPERADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import {
  getPlatformSettings,
  updatePlatformSettings,
  platformSettingsInputSchema,
  PlatformSettingsError,
  PlatformSettingsErrorCodes,
} from '@/server/admin/platformSettingsService';

// Rate limiting (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Require SUPERADMIN
    const user = await requireSuperAdmin();

    // Get settings
    const settings = await getPlatformSettings();

    return NextResponse.json({
      settings: {
        ...settings,
        platformFeePercentage: settings.platformFeeRate * 100, // For display
      },
      updatedBy: user,
    });
  } catch (error) {
    console.error('[API] Platform settings GET error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Forbidden: Requires SUPERADMIN role' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve platform settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Require SUPERADMIN
    const user = await requireSuperAdmin();

    // Parse body
    const body = await request.json();

    // Convert percentage to rate if needed
    if (typeof body.platformFeePercentage === 'number') {
      body.platformFeeRate = body.platformFeePercentage / 100;
      delete body.platformFeePercentage;
    }

    // Validate input
    const validated = platformSettingsInputSchema.parse(body);

    // Update settings
    const settings = await updatePlatformSettings(validated, user.id);

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        platformFeePercentage: settings.platformFeeRate * 100,
      },
    });
  } catch (error) {
    console.error('[API] Platform settings PUT error:', error);

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Forbidden: Requires SUPERADMIN role' },
        { status: 403 }
      );
    }

    if (error instanceof PlatformSettingsError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update platform settings' },
      { status: 500 }
    );
  }
}
