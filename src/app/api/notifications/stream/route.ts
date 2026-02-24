import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        let lastCheck = new Date();
        
        const sendInitialData = async () => {
          const unreadCount = await db.notificationDelivery.count({
            where: {
              userId: user.id,
              status: 'UNREAD',
            },
          });
          
          const importantCount = await db.notificationDelivery.count({
            where: {
              userId: user.id,
              status: 'UNREAD',
              notification: {
                priority: { in: ['P0_CRITICAL', 'P1_HIGH'] },
              },
            },
          });
          
          sendEvent({
            type: 'unread_count',
            total: unreadCount,
            important: importantCount,
            timestamp: new Date().toISOString(),
          });
        };

        await sendInitialData();

        const checkInterval = setInterval(async () => {
          try {
            const newUnreadCount = await db.notificationDelivery.count({
              where: {
                userId: user.id,
                status: 'UNREAD',
                createdAt: { gt: lastCheck },
              },
            });

            if (newUnreadCount > 0) {
              lastCheck = new Date();
              await sendInitialData();
              
              sendEvent({
                type: 'new_notification',
                message: 'You have new notifications',
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error('Error in SSE interval:', error);
          }
        }, 10000);

        request.signal.addEventListener('abort', () => {
          clearInterval(checkInterval);
          controller.close();
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('SSE Error:', error);
    return NextResponse.json(
      { error: 'Failed to establish notification stream' },
      { status: 500 }
    );
  }
}
