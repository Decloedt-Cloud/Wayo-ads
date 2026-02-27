'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Minimal page: fetches verification status, updates session, redirects.
 * Used when middleware detects verified user but JWT has stale emailVerified.
 */
export default function SessionUpdatePage() {
  const { update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/campaigns';

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/auth/check-verification', { method: 'POST' });
        const data = await res.json();
        if (data.verified && data.emailVerifiedAt) {
          await update({ emailVerified: data.emailVerifiedAt });
        }
      } catch {
        // ignore
      }
      router.replace(redirect);
    };
    run();
  }, [redirect, router, update]);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#F47A1F]" />
        <p className="text-sm text-gray-500">Redirection...</p>
      </div>
    </div>
  );
}
