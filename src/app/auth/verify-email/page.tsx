'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Megaphone, Mail, Loader2, CheckCircle, LogOut } from 'lucide-react';
import { useLanguage } from '../../translations';

export default function VerifyEmailPage() {
  const { t } = useLanguage();
  const { data: session, update } = useSession();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [checkingVerification, setCheckingVerification] = useState(true);

  const handleCodeChange = (value: string) => {
    setCode(value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) return;
    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('verifyEmail.invalidCode'));
        return;
      }

      await update({ emailVerified: data.emailVerifiedAt });
      router.replace('/campaigns?welcome=1');
    } catch {
      setError(t('verifyEmail.invalidCode'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!session?.user?.email) return;
    setIsResending(true);
    setResent(false);
    setError(null);
    setCooldownSeconds(0);

    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResent(true);
        setError(null);
        setCooldownSeconds(60);
      } else {
        setError(data.error || t('verifyEmail.resendFailed'));
        if (typeof data.retry_after === 'number' && data.retry_after > 0) {
          setCooldownSeconds(data.retry_after);
        }
      }
    } catch {
      setError(t('verifyEmail.resendFailed'));
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0) setError(null);
        return next;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  useEffect(() => {
    if (!session?.user) {
      setCheckingVerification(false);
      return;
    }
    if ((session.user as any).emailVerified) {
      router.replace('/campaigns');
      return;
    }
    const checkWithServer = async () => {
      try {
        const res = await fetch('/api/auth/check-verification', { method: 'POST' });
        const data = await res.json();
        if (data.verified && data.emailVerifiedAt) {
          await update({ emailVerified: data.emailVerifiedAt });
          router.replace('/campaigns');
          return;
        }
      } catch {
        // ignore
      }
      setCheckingVerification(false);
    };
    checkWithServer();
  }, [session, router, update]);

  if (checkingVerification) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#F47A1F]" />
          <p className="text-sm text-gray-500">{t('verifyEmail.checking')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Megaphone className="h-8 w-8 text-[#F47A1F]" />
            <span className="font-bold text-2xl text-gray-900">Wayo Ads Market</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-[#F47A1F]" />
            </div>
            <CardTitle className="text-xl">{t('verifyEmail.title')}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t('verifyEmail.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session?.user?.email && (
              <div className="text-center text-sm font-medium text-gray-700 bg-gray-50 rounded-lg py-2 px-4">
                {session.user.email}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={code}
                  onChange={handleCodeChange}
                  disabled={isVerifying}
                  autoComplete="one-time-code"
                  containerClassName="gap-2"
                >
                  <InputOTPGroup className="flex items-center justify-center gap-2 sm:gap-3 *:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:text-xl *:data-[slot=input-otp-slot]:font-semibold *:data-[slot=input-otp-slot]:rounded-xl *:data-[slot=input-otp-slot]:border-2 *:data-[slot=input-otp-slot]:border-gray-200 *:data-[slot=input-otp-slot]:bg-white *:data-[active=true]:border-[#F47A1F] *:data-[active=true]:ring-2 *:data-[active=true]:ring-[#F47A1F]/20 *:aria-invalid:border-red-500 *:aria-invalid:ring-red-500/20">
                    <InputOTPSlot index={0} aria-invalid={!!error} />
                    <InputOTPSlot index={1} aria-invalid={!!error} />
                    <InputOTPSlot index={2} aria-invalid={!!error} />
                    <InputOTPSlot index={3} aria-invalid={!!error} />
                    <InputOTPSlot index={4} aria-invalid={!!error} />
                    <InputOTPSlot index={5} aria-invalid={!!error} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && cooldownSeconds <= 0 && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-4">
                  {error}
                </div>
              )}

              {resent && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg py-2 px-4">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  {t('verifyEmail.resent')}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#F47A1F] hover:bg-[#F06423] flex items-center justify-center gap-2"
                disabled={isVerifying || code.length !== 6}
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {t('verifyEmail.submit')}
              </Button>
            </form>

            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleResend}
              disabled={isResending || cooldownSeconds > 0}
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {isResending
                ? t('verifyEmail.resending')
                : cooldownSeconds > 0
                  ? `${t('verifyEmail.resend')} (${cooldownSeconds}s)`
                  : t('verifyEmail.resend')}
            </Button>

            <p className="text-xs text-center text-gray-500">
              {t('verifyEmail.checkSpam')}
            </p>

            <div className="pt-2 border-t">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
              >
                <LogOut className="h-3 w-3" />
                {t('verifyEmail.logout')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
