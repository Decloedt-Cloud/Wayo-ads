import { NextResponse } from 'next/server';
import { getPlatformFeeSettings } from '@/server/platform/platformFeeService';

export async function GET() {
  try {
    const result = await getPlatformFeeSettings();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Platform fees GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform fees' },
      { status: 500 }
    );
  }
}
