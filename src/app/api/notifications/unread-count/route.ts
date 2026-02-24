import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { getUnreadCount } from '@/server/notifications/notificationService';

export async function GET() {
  try {
    const user = await requireAuth();
    const counts = await getUnreadCount(user.id);
    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error getting unread count:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get unread count' },
      { status: 500 }
    );
  }
}
