'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertTriangle, AlertCircle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportantNotification {
  id: string;
  type: string;
  priority: 'P0_CRITICAL' | 'P1_HIGH';
  title: string;
  message: string;
  actionUrl?: string;
  isImportant: boolean;
  delivery?: {
    status: 'UNREAD' | 'READ' | 'ARCHIVED' | 'DISMISSED';
  };
}

const SESSION_KEY = 'shown_important_notifications';
const MAX_PER_SESSION = 3;

export default function ImportantAlertBanner() {
  const [notifications, setNotifications] = useState<ImportantNotification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const { status } = useSession();

  const getShownIds = (): string[] => {
    if (typeof window === 'undefined') return [];
    const session = sessionStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : [];
  };

  const addToShownIds = (ids: string[]) => {
    if (typeof window === 'undefined') return;
    const current = getShownIds();
    const updated = [...new Set([...current, ...ids])].slice(-10);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    
    const fetchImportantNotifications = async () => {
      try {
        const res = await fetch('/api/notifications?important=1&limit=3');
        if (res.ok) {
          const data = await res.json();
          const important = (data.notifications || []).filter(
            (n: ImportantNotification) => n.isImportant && n.delivery?.status === 'UNREAD'
          );
          
          if (important.length > 0) {
            const shownIds = getShownIds();
            const filtered = important.filter(
              (n: ImportantNotification) => !shownIds.includes(n.id)
            );
            
            if (filtered.length > 0) {
              setNotifications(filtered);
              addToShownIds(filtered.slice(0, MAX_PER_SESSION).map(n => n.id));
              setIsVisible(true);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching important notifications:', error);
      }
    };

    fetchImportantNotifications();
  }, []);

  const handleDismiss = async () => {
    if (notifications[currentIndex]) {
      try {
        await fetch('/api/notifications/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notifications[currentIndex].id }),
        });
      } catch (error) {
        console.error('Error dismissing notification:', error);
      }
    }

    if (currentIndex < notifications.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsVisible(false);
    }
  };

  const handleViewAll = () => {
    router.push('/notifications?tab=important');
    setIsVisible(false);
  };

  const handleActionClick = () => {
    const notification = notifications[currentIndex];
    if (notification?.actionUrl) {
      router.push(notification.actionUrl);
    } else {
      router.push('/notifications?tab=important');
    }
    setIsVisible(false);
  };

  if (!isVisible || notifications.length === 0) return null;

  const currentNotification = notifications[currentIndex];
  if (!currentNotification) return null;

  const isCritical = currentNotification.priority === 'P0_CRITICAL';

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`${
          isCritical
            ? 'bg-red-600 text-white'
            : 'bg-orange-500 text-white'
        }`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isCritical ? (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{currentNotification.title}</p>
                <p className="text-xs opacity-90 truncate">{currentNotification.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentNotification.actionUrl && (
                <Button
                  size="sm"
                  variant="secondary"
                  className={`${
                    isCritical
                      ? 'bg-white text-red-600 hover:bg-red-50'
                      : 'bg-white text-orange-600 hover:bg-orange-50'
                  }`}
                  onClick={handleActionClick}
                >
                  View
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {notifications.length > 1 && (
            <div className="flex justify-center gap-1 mt-2">
              {notifications.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white w-6' : 'bg-white/40 w-2'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
