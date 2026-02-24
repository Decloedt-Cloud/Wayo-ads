'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  DollarSign,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowDownToLine,
  TrendingUp,
  ExternalLink,
  X,
  FileText,
  Lock,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '@/lib/currency';

interface Balance {
  availableCents: number;
  pendingCents: number;
  totalEarnedCents: number;
  currency: string;
  availableBalanceCents: number;
  pendingBalanceCents: number;
  lockedReserveCents: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  payoutDelayDays: number;
}

interface Withdrawal {
  id: string;
  amountCents: number;
  platformFeeCents: number | null;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  psReference: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

const MIN_WITHDRAWAL_CENTS = 1000; // €10 minimum

function formatCurrency(cents: number, currency: string = 'EUR'): string {
  return formatCurrencyUtil(cents, currency);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'PENDING':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'PROCESSING':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'PAID':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'CANCELLED':
      return <X className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PAID':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'FAILED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function CreatorWalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [balance, setBalance] = useState<Balance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<{
    stripeAccountId: string | null;
    stripeOnboardingCompleted: boolean;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
    stripeDetailsSubmitted?: boolean;
    stripeAccountStatus?: string;
    requirementsDue?: boolean;
    requirements?: {
      currently_due?: string[];
      past_due?: string[];
      disabled_reason?: string;
    };
  } | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  const getLocalizedPath = (path: string) => path;

  const userRoles = (session?.user as any)?.roles || [];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [withdrawalRes, stripeRes] = await Promise.all([
          fetch('/api/creator/withdrawal'),
          fetch('/api/creator/stripe-connect/onboard').catch(() => ({ ok: false, json: () => ({}) }))
        ]);

        const withdrawalData = await withdrawalRes.json();
        const stripeData = stripeRes.ok ? await stripeRes.json() as typeof stripeConnectStatus : null;

        if (withdrawalRes.ok) {
          setBalance(withdrawalData.balance);
          setWithdrawals(withdrawalData.withdrawals || []);
        } else {
          console.error('Failed to fetch wallet data:', withdrawalData.error);
        }

        if (stripeData) {
          setStripeConnectStatus(stripeData);
        }
      } catch (err) {
        console.error('Failed to fetch wallet data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const handleWithdraw = async () => {
    const amountCents = Math.round(parseFloat(withdrawAmount) * 100);

    if (isNaN(amountCents) || amountCents < MIN_WITHDRAWAL_CENTS) {
      toast({
        title: 'Invalid amount',
        description: `Minimum withdrawal is ${formatCurrency(MIN_WITHDRAWAL_CENTS)}`,
        variant: 'destructive',
      });
      return;
    }

    if (balance && amountCents > balance.availableCents) {
      toast({
        title: 'Insufficient balance',
        description: 'You cannot withdraw more than your available balance',
        variant: 'destructive',
      });
      return;
    }

    setWithdrawing(true);

    try {
      const res = await fetch('/api/creator/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents }),
      });

      const data = await res.json();

      if (res.ok) {
        const withdrawal = data.withdrawal;
        const feeText = withdrawal.platformFeeCents 
          ? ` (Fee: ${formatCurrency(withdrawal.platformFeeCents)})`
          : '';
        toast({
          title: 'Withdrawal requested',
          description: `Your withdrawal of ${formatCurrency(amountCents)} is being processed. You will receive ${formatCurrency(withdrawal.amountCents)}${feeText}.`,
        });

        // Refresh data
        setBalance((prev) =>
          prev ? { ...prev, availableCents: data.newAvailableCents } : prev
        );
        setWithdrawals((prev) => [data.withdrawal, ...prev]);
        setWithdrawDialogOpen(false);
        setWithdrawAmount('');
      } else {
        toast({
          title: 'Withdrawal failed',
          description: data.error || 'Could not process your request',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await fetch('/api/creator/stripe-connect/onboard', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to start Stripe onboarding',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to start Stripe onboarding:', err);
      toast({
        title: 'Error',
        description: 'Failed to start Stripe onboarding',
        variant: 'destructive',
      });
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleLoginStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await fetch('/api/creator/stripe-connect/login', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to access Stripe dashboard',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to access Stripe dashboard:', err);
      toast({
        title: 'Error',
        description: 'Failed to access Stripe dashboard',
        variant: 'destructive',
      });
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId: string) => {
    setCancellingId(withdrawalId);

    try {
      const res = await fetch(`/api/creator/withdrawal?id=${withdrawalId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Withdrawal cancelled',
          description: 'The funds have been returned to your available balance',
        });

        // Update withdrawal status
        setWithdrawals((prev) =>
          prev.map((w) =>
            w.id === withdrawalId ? { ...w, status: 'CANCELLED' as const } : w
          )
        );

        // Update balance
        if (data.newAvailableCents !== undefined) {
          setBalance((prev) =>
            prev ? { ...prev, availableCents: data.newAvailableCents } : prev
          );
        }
      } else {
        toast({
          title: 'Cancel failed',
          description: data.error || 'Could not cancel withdrawal',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!userRoles.includes('CREATOR')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Creator Access Required</h2>
          <p className="text-gray-600 mb-4">
            You need CREATOR role to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/dashboard/creator">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creator Wallet</h1>
          <p className="text-gray-600">Manage your earnings and withdrawals</p>
        </div>
        <Link href={getLocalizedPath('/dashboard/creator/invoices')}>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </Button>
        </Link>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Available Balance</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(balance?.availableBalanceCents || balance?.availableCents || 0, balance?.currency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Pending</div>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(balance?.pendingBalanceCents || balance?.pendingCents || 0, balance?.currency)}
                </div>
                <div className="text-xs text-gray-400">Release in {balance?.payoutDelayDays || 3} days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Lock className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Reserve (30-day)</div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(balance?.lockedReserveCents || 0, balance?.currency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${balance?.riskLevel === 'HIGH' ? 'bg-red-100' : balance?.riskLevel === 'MEDIUM' ? 'bg-amber-100' : 'bg-green-100'}`}>
                <Shield className={`h-6 w-6 ${balance?.riskLevel === 'HIGH' ? 'text-red-600' : balance?.riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'}`} />
              </div>
              <div>
                <div className="text-sm text-gray-500">Risk Level</div>
                <Badge variant={balance?.riskLevel === 'HIGH' ? 'destructive' : balance?.riskLevel === 'MEDIUM' ? 'default' : 'secondary'}>
                  {balance?.riskLevel || 'MEDIUM'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdraw Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Withdraw Funds
            </CardTitle>
            <CardDescription>
              Withdraw your earnings to your bank account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Available to withdraw</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(balance?.availableCents || 0, balance?.currency)}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>• Minimum withdrawal: {formatCurrency(MIN_WITHDRAWAL_CENTS)}</p>
                <p>• Processing time: 2-5 business days</p>
                <p>• No withdrawal fees</p>
              </div>

              {!stripeConnectStatus?.stripeOnboardingCompleted ? (
                <div className="space-y-3">
                  {stripeConnectStatus?.stripeAccountId && stripeConnectStatus?.requirementsDue ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 mb-2">
                        <strong>Verification pending</strong>
                      </p>
                      <p className="text-xs text-amber-700 mb-2">
                        Your Stripe account requires additional verification. Please complete the required steps.
                      </p>
                      {stripeConnectStatus.requirements?.currently_due && stripeConnectStatus.requirements.currently_due.length > 0 && (
                        <p className="text-xs text-amber-700">
                          <strong>Required:</strong>{' '}
                          {stripeConnectStatus.requirements.currently_due.map((req: string) => {
                            if (req.includes('company_license')) return 'Business license document';
                            if (req.includes('passport')) return 'Passport verification';
                            if (req.includes('verification.document')) return 'Identity verification';
                            return req;
                          }).join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 mb-2">
                        <strong>Connect your bank account</strong> to receive payouts
                      </p>
                      <p className="text-xs text-amber-700">
                        You need to complete Stripe onboarding before you can withdraw your earnings.
                      </p>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                  >
                    {connectingStripe ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {stripeConnectStatus?.stripeAccountId ? 'Complete Verification' : 'Connect Bank Account'}
                      </>
                    )}
                  </Button>
                  {stripeConnectStatus?.stripeOnboardingCompleted && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={handleLoginStripe}
                      disabled={connectingStripe}
                    >
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Access Stripe Dashboard
                      </>
                    </Button>
                  )}
                </div>
              ) : (
                <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      disabled={!balance || balance.availableCents < MIN_WITHDRAWAL_CENTS}
                    >
                      Request Withdrawal
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Withdrawal</DialogTitle>
                    <DialogDescription>
                      Enter the amount you wish to withdraw. Funds will be sent to your connected bank account.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ({balance?.currency || 'EUR'})</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        min={MIN_WITHDRAWAL_CENTS / 100}
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500">
                        Available: {formatCurrency(balance?.availableCents || 0, balance?.currency)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount('10')}
                      >
                        {formatCurrency(1000, balance?.currency)}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount('50')}
                      >
                        {formatCurrency(5000, balance?.currency)}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (balance) {
                            setWithdrawAmount((balance.availableCents / 100).toFixed(2));
                          }
                        }}
                      >
                        All
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleWithdraw} disabled={withdrawing}>
                      {withdrawing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Withdraw'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              )}

              {balance && balance.availableCents < MIN_WITHDRAWAL_CENTS && (
                <p className="text-sm text-amber-600">
                  You need at least {formatCurrency(MIN_WITHDRAWAL_CENTS)} to request a withdrawal.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
            <CardDescription>
              Track your withdrawal requests and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No withdrawal requests yet</p>
                <p className="text-sm text-gray-400">
                  Your withdrawal history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(withdrawal.status)}
                      <div>
                        <div className="font-medium">
                          {formatCurrency(withdrawal.amountCents, withdrawal.currency)}
                        </div>
                        {withdrawal.platformFeeCents && withdrawal.platformFeeCents > 0 && (
                          <div className="text-xs text-gray-500">
                            Platform fee: {formatCurrency(withdrawal.platformFeeCents, withdrawal.currency)}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {formatDate(withdrawal.createdAt)}
                        </div>
                        {withdrawal.failureReason && (
                          <div className="text-sm text-red-500 mt-1">
                            {withdrawal.failureReason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(withdrawal.status)}>
                        {withdrawal.status}
                      </Badge>
                      {withdrawal.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelWithdrawal(withdrawal.id)}
                          disabled={cancellingId === withdrawal.id}
                        >
                          {cancellingId === withdrawal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Back to Dashboard */}
      <div className="mt-6">
        <Link href={getLocalizedPath('/dashboard/creator')}>
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
