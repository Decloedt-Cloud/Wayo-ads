'use client';

import { useState, useEffect, useCallback } from 'react';

interface UnreadCounts {
  total: number;
  unread: number;
  important: number;
}

export function useNotificationCount(pollIntervalMs = 30000) {
  const [counts, setCounts] = useState<UnreadCounts>({ total: 0, unread: 0, important: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setCounts(data);
      }
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();

    const interval = setInterval(fetchCounts, pollIntervalMs);

    const handleFocus = () => {
      fetchCounts();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchCounts, pollIntervalMs]);

  return { counts, isLoading, refetch: fetchCounts };
}

export function useUnreadNotificationCount(pollIntervalMs = 30000) {
  const { counts, isLoading, refetch } = useNotificationCount(pollIntervalMs);
  return { count: counts.unread, isLoading, refetch };
}
