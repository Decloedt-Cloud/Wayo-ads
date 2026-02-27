'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';

export function WelcomeToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { t } = useLanguage();
  const shownRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user || shownRef.current) return;
    if (searchParams.get('welcome') !== '1') return;

    shownRef.current = true;
    const firstName = session.user.name?.split(/\s+/)[0] || session.user.email?.split('@')[0] || '';
    const title = firstName ? (
      <>
        {t('welcome.welcomeName').split('{name}')[0]}
        <span className="text-[#F47A1F] font-semibold">{firstName}</span>
        {t('welcome.welcomeName').split('{name}')[1]}
      </>
    ) : (
      t('welcome.welcome')
    );

    toast({
      title,
      variant: 'default',
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete('welcome');
    const next = params.toString() ? `${pathname}?${params}` : pathname;
    // Délai pour laisser le toast s'afficher avant de retirer welcome de l'URL
    const timer = setTimeout(() => {
      router.replace(next, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [status, session, searchParams, pathname, router, toast, t]);

  return null;
}
