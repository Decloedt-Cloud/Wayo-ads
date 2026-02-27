'use client';

import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LayoutDashboard, LogOut, Megaphone, Plus, Users, Shield, Settings } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useLanguage } from '@/app/translations';
import { LanguageSelector } from '@/app/LanguageSelector';

export default function Navbar() {
  const { data: session, status } = useSession();
  const userRoles = (session?.user as any)?.roles || [];
  const { t, language } = useLanguage();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (status === 'authenticated') {
        try {
          const res = await fetch('/api/user/profile');
          if (res.ok) {
            const data = await res.json();
            setProfileImage(data.user.image || null);
          }
        } catch (err) {
          console.warn('Failed to fetch profile image:', err);
        }
      }
    };

    fetchProfileImage();

    const handleProfileUpdate = () => {
      fetchProfileImage();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [status]);

  const getLocalizedPath = (path: string) => {
    if (language && language !== 'en') {
      const isRootPath = path === '/';
      const hashIndex = path.indexOf('#');
      const basePath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
      const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
      const normalizedBase = isRootPath ? '' : basePath;
      return `/${language}${normalizedBase}${hash}`;
    }
    return path;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={getLocalizedPath('/')} className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-[#F47A1F]" />
          <span className="font-bold text-xl text-gray-900">Wayo Ads Market</span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href={getLocalizedPath('/#creators')}
              className="text-sm font-medium text-gray-600 hover:text-[#F47A1F] transition-colors"
            >
              {t('nav.creators')}
            </Link>
            <Link
              href={getLocalizedPath('/creator/pricing')}
              className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              ✨ Magic Content
            </Link>
            <Link
              href={getLocalizedPath('/pricing')}
              className="text-sm font-medium text-gray-600 hover:text-[#F47A1F] transition-colors"
            >
              {t('nav.pricing')}
            </Link>
            <Link
              href={getLocalizedPath('/how-it-works')}
              className="text-sm font-medium text-gray-600 hover:text-[#F47A1F] transition-colors"
            >
              {t('nav.howItWorks')}
            </Link>
            <Link
              href={getLocalizedPath('/#brands')}
              className="text-sm font-medium text-gray-600 hover:text-[#F47A1F] transition-colors"
            >
              {t('nav.brands')}
            </Link>
          </nav>

          <LanguageSelector />

          <Link
            href={getLocalizedPath('/campaigns')}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            {t('nav.browseCampaigns')}
          </Link>

          {status === 'authenticated' && userRoles.includes('ADVERTISER') && (
            <Link href={getLocalizedPath('/dashboard/advertiser')}>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('nav.createCampaign')}
              </Button>
            </Link>
          )}

          {status === 'loading' ? (
            <div className="h-9 w-20" />
          ) : status === 'authenticated' ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profileImage && profileImage !== '' ? profileImage : undefined} alt={session.user?.name || ''} />
                      <AvatarFallback>
                        {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                      <div className="flex gap-1 mt-2">
                        {userRoles.map((role: string) => (
                          <span
                            key={role}
                            className="text-xs bg-[#fff6ed] text-[#F47A1F] px-2 py-0.5 rounded-full"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userRoles.includes('ADVERTISER') && (
                    <DropdownMenuItem asChild>
                      <Link href={getLocalizedPath('/dashboard/advertiser')} className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Advertiser Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {userRoles.includes('CREATOR') && (
                    <DropdownMenuItem asChild>
                      <Link href={getLocalizedPath('/dashboard/creator')} className="cursor-pointer">
                        <Users className="mr-2 h-4 w-4" />
                        Creator Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {userRoles.includes('SUPERADMIN') && (
                    <DropdownMenuItem asChild>
                      <Link href={getLocalizedPath('/dashboard/admin')} className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getLocalizedPath('/settings')} className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { window.location.href = '/api/auth/federated-logout'; }}
                    className="cursor-pointer text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {status === 'authenticated' && session?.user?.id && (
                <NotificationBell userId={session.user.id} />
              )}
            </>
          ) : (
            <>
              <Link href={getLocalizedPath('/auth/signup')}>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex border-[#F47A1F] text-[#F47A1F] hover:bg-[#fff6ed]"
                >
                  {t('nav.getStarted')}
                </Button>
              </Link>
              <Button
                onClick={() => signIn(undefined, { callbackUrl: `${window.location.origin}/campaigns?welcome=1` })}
                size="sm"
                className="bg-[#F47A1F] hover:bg-[#F06423]"
              >
                {t('signin.signIn')}
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
