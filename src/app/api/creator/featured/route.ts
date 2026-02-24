import { NextResponse } from 'next/server';
import { getFeaturedCreators } from '@/server/creators/featuredService';

export async function GET() {
  try {
    const creators = await getFeaturedCreators(12);
    return NextResponse.json({ creators });
  } catch (error) {
    console.error('[Featured Creators] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured creators' },
      { status: 500 }
    );
  }
}
