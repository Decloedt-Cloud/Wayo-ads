'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Loader2, UserPlus } from 'lucide-react';
import { useLanguage } from '../../translations';

const AUTH_SERVER_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export default function SignUpPage() {
  const { t, language } = useLanguage();
  const [role, setRole] = useState<'CREATOR' | 'ADVERTISER'>('CREATOR');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = () => {
    setIsLoading(true);

    const callbackUrl = `${window.location.origin}/auth/connect`;

    const registerUrl = new URL(`${AUTH_SERVER_URL}/register`);
    registerUrl.searchParams.set('app', 'wayo_ads');
    registerUrl.searchParams.set('role', role);
    registerUrl.searchParams.set('callback_url', callbackUrl);
    registerUrl.searchParams.set('lang', language);

    window.location.href = registerUrl.toString();
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Megaphone className="h-8 w-8 text-[#F47A1F]" />
            <span className="font-bold text-2xl text-gray-900">Wayo Ads Market</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{t('signup.title')}</h1>
          <p className="text-gray-600 mt-2">{t('signup.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('signup.cardTitle')}</CardTitle>
            <CardDescription>
              {t('signup.cardDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('signup.selectRole')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('CREATOR')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    role === 'CREATOR'
                      ? 'border-[#F47A1F] bg-[#fff6ed]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{t('signup.creator')}</div>
                  <div className="text-xs text-gray-500">{t('signup.creatorDesc')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ADVERTISER')}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    role === 'ADVERTISER'
                      ? 'border-[#F47A1F] bg-[#fff6ed]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{t('signup.advertiser')}</div>
                  <div className="text-xs text-gray-500">{t('signup.advertiserDesc')}</div>
                </button>
              </div>
            </div>

            <Button
              className="w-full bg-[#F47A1F] hover:bg-[#F06423] flex items-center justify-center gap-2"
              onClick={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isLoading ? t('signup.creating') : t('signup.signUp')}
            </Button>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-center text-gray-600">
          {t('signup.alreadyHaveAccount')}{' '}
          <Link href="/auth/signin" className="text-[#F47A1F] hover:underline font-medium">
            {t('signin.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
