'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const userRoles = (session.user as any)?.roles || [];
      
      if (userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN')) {
        router.push('/dashboard/admin');
      } else if (userRoles.includes('ADVERTISER')) {
        router.push('/dashboard/advertiser');
      } else if (userRoles.includes('CREATOR')) {
        router.push('/dashboard/creator');
      } else {
        router.push('/');
      }
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  return null;
}
