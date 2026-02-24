/**
 * Admin API: Get email logs
 */

import { NextResponse } from 'next/server';
import { getEmailLogs } from '@/server/admin/emailService';

export async function GET() {
  const logs = await getEmailLogs(100);
  return NextResponse.json({ logs });
}
