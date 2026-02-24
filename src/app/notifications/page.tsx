'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, AlertTriangle, AlertCircle, Info, Archive, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '../translations';

const NOTIFICATION_TYPES = [
  'PAYMENT_FAILED',
  'DEPOSIT_FAILED',
  'WALLET_CREDITED',
  'WITHDRAWAL_FAILED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REQUESTED',
  'PAYOUT_COMPLETED',
  'BUDGET_EXHAUSTED',
  'BUDGET_LOW',
  'CAMPAIGN_PAUSED',
  'CAMPAIGN_APPROVED',
  'CAMPAIGN_REJECTED',
  'CAMPAIGN_UNDER_REVIEW',
  'CAMPAIGN_AUTO_PAUSED',
  'CREATOR_APPLICATION_PENDING',
  'CREATOR_APPLICATION_APPROVED',
  'CREATOR_APPLICATION_REJECTED',
  'CREATOR_APPLIED',
  'VIDEO_SUBMITTED',
  'VIDEO_UPDATED',
  'VIDEO_APPROVED',
  'VIDEO_REJECTED',
  'EARNINGS_AVAILABLE',
  'TRACKING_DISABLED',
  'FRAUD_DETECTED',
  'SUSPICIOUS_ACTIVITY',
  'ACCOUNT_PENDING_APPROVAL',
  'ROLE_REQUEST_PENDING',
  'SYSTEM_ANNOUNCEMENT',
  'CREDENTIALS_INVALID',
  'TRUST_SCORE_DOWNGRADED',
  'TIER_CHANGED',
  'CREATOR_FLAGGED',
  'VELOCITY_SPIKE',
  'FRAUD_PATTERN',
  'RESERVE_LOCKED',
  'RESERVE_RELEASED',
  'YOUTUBE_DISCONNECTED',
  'STRIPE_PAYOUT_FAILURE',
  'CONFIDENCE_LOW',
] as const;

type NotificationTypeFilter = typeof NOTIFICATION_TYPES[number] | 'ALL';

interface Notification {
  id: string;
  type: string;
  priority: 'P0_CRITICAL' | 'P1_HIGH' | 'P2_NORMAL' | 'P3_LOW';
  title: string;
  message: string;
  actionUrl?: string;
  metadata: Record<string, unknown> | null;
  isImportant: boolean;
  createdAt: string;
  expiresAt?: string;
  delivery: {
    id: string;
    status: 'UNREAD' | 'READ' | 'ARCHIVED' | 'DISMISSED';
    readAt?: string;
    archivedAt?: string;
    dismissedAt?: string;
  } | null;
}

export default function NotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const fetchNotifications = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (!reset && cursor) {
        params.set('cursor', cursor);
      }
      if (activeTab === 'important') {
        params.set('important', '1');
      } else if (activeTab === 'archived') {
        params.set('status', 'ARCHIVED');
      } else if (activeTab === 'unread') {
        params.set('status', 'UNREAD');
      } else if (activeTab === 'all') {
      }

      if (typeFilter !== 'ALL') {
        params.set('type', typeFilter);
      }

      if (priorityFilter !== 'ALL') {
        params.set('priority', priorityFilter);
      }

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setNotifications(data.notifications || []);
        } else {
          setNotifications((prev) => [...prev, ...(data.notifications || [])]);
        }
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, cursor, typeFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    setCursor(undefined);
    setNotifications([]);
    fetchNotifications(true);
  }, [activeTab, typeFilter, priorityFilter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      fetchNotifications(true);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      fetchNotifications(true);
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      fetchNotifications(true);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      fetchNotifications(true);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'P0_CRITICAL':
        return 'border-l-4 border-l-red-500 bg-red-50';
      case 'P1_HIGH':
        return 'border-l-4 border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-4 border-l-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'P0_CRITICAL':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'P1_HIGH':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return t('notifications.yesterday');
    } else if (days < 7) {
      return `${days} ${t('notifications.daysAgo')}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const unreadCount = notifications.filter((n) => n.delivery?.status === 'UNREAD').length;
  const importantCount = notifications.filter((n) => n.isImportant && n.delivery?.status === 'UNREAD').length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} ${t('notifications.unread')}` : t('notifications.allCaughtUp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('notifications.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCursor(undefined);
                  setNotifications([]);
                  fetchNotifications(true);
                }
              }}
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationTypeFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('notifications.filterByType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('notifications.allTypes')}</SelectItem>
              {NOTIFICATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t('notifications.filterByPriority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('notifications.allPriorities')}</SelectItem>
              <SelectItem value="P0_CRITICAL">{t('notifications.critical')}</SelectItem>
              <SelectItem value="P1_HIGH">{t('notifications.highPriority')}</SelectItem>
              <SelectItem value="P2_NORMAL">{t('notifications.normal')}</SelectItem>
              <SelectItem value="P3_LOW">{t('notifications.low')}</SelectItem>
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead}>
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="gap-2">
            <Bell className="h-4 w-4" />
            {t('notifications.all')}
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="important" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('notifications.important')}
            {importantCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5">
                {importantCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            {t('notifications.archived')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {activeTab === 'all' && t('notifications.allNotifications')}
                {activeTab === 'important' && t('notifications.importantAlerts')}
                {activeTab === 'archived' && t('notifications.archivedNotifications')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">{t('notifications.loading')}</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('notifications.noNotifications')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border ${getPriorityStyles(notification.priority)} ${
                        notification.delivery?.status === 'UNREAD' ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{getPriorityIcon(notification.priority)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {notification.isImportant && (
                              <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                {t('notifications.important')}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {notification.priority === 'P0_CRITICAL' && t('notifications.critical')}
                              {notification.priority === 'P1_HIGH' && t('notifications.highPriority')}
                              {notification.priority === 'P2_NORMAL' && t('notifications.normal')}
                              {notification.priority === 'P3_LOW' && t('notifications.low')}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900">{notification.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDate(notification.createdAt)}
                            </span>
                            {notification.actionUrl && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() => router.push(notification.actionUrl!)}
                              >
                                {t('notifications.viewDetails')}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {notification.delivery?.status === 'UNREAD' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMarkAsRead(notification.id)}
                                title="Mark as read"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleArchive(notification.id)}
                                title="Archive"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDismiss(notification.id)}
                                title="Dismiss"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNotifications(false)}
                    disabled={isLoading}
                  >
                    {isLoading ? t('notifications.loading') : t('notifications.loadMore')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
