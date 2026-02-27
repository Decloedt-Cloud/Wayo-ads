'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../translations';

export default function ConnectPage() {
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();

  useEffect(() => {
    const callbackUrl = searchParams.get('callbackUrl') || '/campaigns';
    signIn('wayo-auth', { callbackUrl }, { lang: language });
  }, [searchParams, language]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#F47A1F]" />
        <p className="text-sm text-muted-foreground">{t('auth.connect.connecting')}</p>
      </div>
    </div>
  );
}
