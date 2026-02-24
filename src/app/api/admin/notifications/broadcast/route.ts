import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import { createGlobalBroadcast, createRoleBroadcast, createUserNotification } from '@/server/notifications/notificationService';

export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    const body = await request.json();
    
    const { scope, toUserId, toRole, type, priority, title, message, actionUrl, metadata, expiresAt, dedupeKey } = body;

    let notification;
    const notificationType = type || 'SYSTEM_ANNOUNCEMENT';
    const notificationPriority = priority || 'P2_NORMAL';
    
    if (scope === 'USER' && toUserId) {
      notification = await createUserNotification({
        scope: 'USER',
        toUserId,
        type: notificationType,
        priority: notificationPriority,
        deliveryType: 'IN_APP',
        title,
        message,
        actionUrl,
        metadata,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        dedupeKey,
      });
    } else if (scope === 'ROLE' && toRole) {
      notification = await createRoleBroadcast({
        scope: 'ROLE',
        toRole,
        type: notificationType,
        priority: notificationPriority,
        deliveryType: 'IN_APP',
        title,
        message,
        actionUrl,
        metadata,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        dedupeKey,
      });
    } else {
      notification = await createGlobalBroadcast({
        scope: 'GLOBAL',
        createdByUserId: user.id,
        type: notificationType,
        priority: notificationPriority,
        deliveryType: 'IN_APP',
        title,
        message,
        actionUrl,
        metadata,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        dedupeKey,
      });
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create broadcast' },
      { status: 500 }
    );
  }
}
