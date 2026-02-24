import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { listUserNotifications } from '@/server/notifications/notificationService';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || undefined;
    const importantOnly = searchParams.get('important') === '1';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;
    const type = searchParams.get('type') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await listUserNotifications({
      userId: user.id,
      status: status as 'UNREAD' | 'READ' | 'ARCHIVED' | 'DISMISSED' | undefined,
      importantOnly,
      limit,
      cursor,
      type: type as any,
      priority: priority as any,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing notifications:', error);
    return NextResponse.json(
      {
        notifications: [],
        nextCursor: null,
        error: error instanceof Error ? error.message : 'Failed to list notifications',
      },
      { status: 200 }
    );
  }
}
