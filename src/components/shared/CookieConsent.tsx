'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/translations';

const COOKIE_NAME = 'cookie_consent';
const COOKIE_VALUE = 'accepted';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function subscribe() {
  return () => {};
}

export default function CookieConsent() {
  const isMounted = useSyncExternalStore(subscribe, () => false, () => false);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  if (!isMounted) {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-700 text-center sm:text-left">
              {t('cookie.message')}
            </p>
            <Button 
              onClick={() => {
                document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
                setIsVisible(true);
              }}
              className="bg-[#F47A1F] hover:bg-[#F06423] whitespace-nowrap"
            >
              {t('cookie.accept')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
