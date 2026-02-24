'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Megaphone, Loader2 } from 'lucide-react';
import { useLanguage } from '../../translations';

export default function SignUpPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CREATOR' | 'ADVERTISER'>('CREATOR');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getLocalizedPath = (path: string) => path;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[Signup] Registration failed:', data);
        setError(data.message || 'Registration failed');
        setIsLoading(false);
        return;
      }

      console.log('[Signup] Registration successful, attempting sign in...');

      const redirectUrl = role === 'CREATOR' ? '/onboarding' : '/dashboard';
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      
      try {
        await signIn('credentials', {
          email,
          redirect: true,
          callbackUrl: `${baseUrl}${redirectUrl}`,
        });
      } catch (signInError) {
        console.error('[Signup] Sign in error:', signInError);
        setError('Registration successful but sign in failed. Please try logging in.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[Signup] Unexpected error:', err);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={getLocalizedPath('/')} className="inline-flex items-center gap-2 mb-6">
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
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('signup.name')}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('signup.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('signup.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('signup.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('signup.selectRole')}</Label>
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

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <Button type="submit" className="w-full bg-[#F47A1F] hover:bg-[#F06423]" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('signup.creating')}
                  </>
                ) : (
                  t('signup.signUp')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-center text-gray-600">
          {t('signup.alreadyHaveAccount')}{' '}
          <Link href={getLocalizedPath('/auth/signin')} className="text-[#F47A1F] hover:underline font-medium">
            {t('signin.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
