/**
 * Admin API: Get all email templates
 */

import { NextResponse } from 'next/server';
import { getAllTemplates } from '@/server/email';

export async function GET() {
  const templates = getAllTemplates();

  return NextResponse.json({
    templates,
  });
}
