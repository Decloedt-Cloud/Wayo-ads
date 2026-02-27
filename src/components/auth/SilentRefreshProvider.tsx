'use client';

import { useSession, signIn } from 'next-auth/react';
import { useCallback, useEffect, useRef } from 'react';

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // 5 min avant expiration
const CHECK_INTERVAL_MS = 60 * 1000; // vérifier toutes les minutes
const MIN_ATTEMPT_INTERVAL_MS = 60000; // min 1 min entre tentatives

/**
 * Tente un rafraîchissement silencieux de la session via OAuth prompt=none.
 * Si l'utilisateur a encore une session active sur le serveur d'auth, la session
 * est renouvelée sans redirection visible.
 */
export function SilentRefreshProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const isRefreshingRef = useRef(false);
  const lastRefreshAttempt = useRef<number>(0);

  const trySilentRefresh = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user) return;
    if (isRefreshingRef.current) return;
    if (Date.now() - lastRefreshAttempt.current < MIN_ATTEMPT_INTERVAL_MS) return;

    lastRefreshAttempt.current = Date.now();
    isRefreshingRef.current = true;

    try {
      const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/';
      const result = await signIn(
        'wayo-auth',
        { callbackUrl, redirect: false },
        { prompt: 'none' }
      );

      if (result?.url) {
        const iframe = document.createElement('iframe');
        iframe.style.cssText =
          'position:absolute;width:0;height:0;border:0;visibility:hidden';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);

        const onLoad = () => {
          try {
            update();
          } finally {
            iframe.remove();
            isRefreshingRef.current = false;
          }
        };

        iframe.onload = onLoad;
        iframe.onerror = () => {
          iframe.remove();
          isRefreshingRef.current = false;
        };
        iframe.src = result.url;
      } else {
        isRefreshingRef.current = false;
      }
    } catch {
      isRefreshingRef.current = false;
    }
  }, [session, status, update]);

  useEffect(() => {
    if (status !== 'authenticated' || !session) return;

    const checkAndRefresh = () => {
      const expires = (session as { expires?: string }).expires;
      if (typeof expires === 'string') {
        const expMs = new Date(expires).getTime();
        if (expMs - Date.now() < REFRESH_BEFORE_EXPIRY_MS) {
          trySilentRefresh();
        }
      }
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [session, status, trySilentRefresh]);

  return <>{children}</>;
}
