import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { markAllAsRead } from '@/server/notifications/notificationService';

export async function POST() {
  try {
    const user = await requireAuth();
    const result = await markAllAsRead(user.id);
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark all as read' },
      { status: 500 }
    );
  }
}
