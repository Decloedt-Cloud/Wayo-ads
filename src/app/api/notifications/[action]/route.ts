import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import {
  markAsRead,
  markAsArchived,
  dismissNotification,
} from '@/server/notifications/notificationService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const user = await requireAuth();
    const { action } = await params;
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'read':
        result = await markAsRead({ userId: user.id, notificationId });
        break;
      case 'archive':
        result = await markAsArchived({ userId: user.id, notificationId });
        break;
      case 'dismiss':
        result = await dismissNotification({ userId: user.id, notificationId });
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: read, archive, or dismiss' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error performing notification action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform action' },
      { status: 500 }
    );
  }
}
