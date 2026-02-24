'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet,
  Plus,
  Loader2,
  History,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency as formatCurrencyUtil } from '@/lib/currency';

interface WalletInfo {
  id: string;
  availableCents: number;
  pendingCents: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amountCents: number;
  currency: string;
  description: string | null;
  createdAt: string;
  referenceType: string | null;
  referenceId: string | null;
   invoiceId?: string | null;
}

interface DepositIntent {
  intentId: string;
  clientSecret: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface PspConfig {
  pspMode: string;
  isStripe: boolean;
  publishableKey: string | null;
  isTestMode: boolean;
}

interface WalletState {
  wallet: WalletInfo | null;
  transactions: Transaction[];
  canSimulate: boolean;
}

function formatCurrency(cents: number, currency: string = 'EUR'): string {
  return formatCurrencyUtil(cents, currency);
}

interface DepositFormProps {
  pendingIntent: DepositIntent;
  onSuccess: () => void;
  onCancel: () => void;
  canSimulate?: boolean;
  onSimulate?: () => Promise<void> | void;
  isMockMode?: boolean;
}

function DepositForm({ pendingIntent, onSuccess, onCancel, canSimulate, onSimulate, isMockMode }: DepositFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMockMode) {
      return;
    }
  }, [isMockMode]);

  const handleMockPayment = async () => {
    if (!onSimulate) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      await onSimulate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
    setIsProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMockMode || !stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setIsProcessing(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      pendingIntent.clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    }
  };

  return (
    <form onSubmit={isMockMode ? handleMockPayment : handleSubmit} className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-blue-800">Deposit Pending</span>
          <Badge variant="secondary">{pendingIntent.status}</Badge>
        </div>
        <div className="text-2xl font-bold text-blue-900 mb-2">
          {formatCurrency(pendingIntent.amountCents, pendingIntent.currency)}
        </div>
      </div>

      {!isMockMode ? (
        <div className="p-4 md:p-6 border border-gray-200 rounded-lg min-w-0">
          <Label className="mb-2 block text-base">Card Details</Label>
          <div className="p-4 border border-gray-300 rounded-md bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '18px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
          Mock payment mode - Click the button below to complete your deposit
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={((!isMockMode && !stripe) || isProcessing)}
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Pay {formatCurrency(pendingIntent.amountCents, pendingIntent.currency)}
        </Button>
        {canSimulate && onSimulate && (
          <Button
            type="button"
            variant="secondary"
            onClick={onSimulate}
            disabled={isProcessing}
            className="flex-1"
          >
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Simulate Payment
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function WalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<DepositIntent | null>(null);
  const [pspConfig, setPspConfig] = useState<PspConfig | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [canSimulate, setCanSimulate] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchPspConfig = async () => {
      try {
        const res = await fetch('/api/wallet/config');
        const data = await res.json();
        setPspConfig(data);
        
        if (data.isStripe && data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (error) {
        console.error('Failed to fetch PSP config:', error);
      }
    };
    fetchPspConfig();
  }, []);

  useEffect(() => {
    if (session) {
      fetchWallet();
    }
  }, [session]);

  const fetchWallet = async () => {
    try {
      const walletRes = await fetch('/api/wallet');
      const walletData = await walletRes.json();

      setWallet(walletData.wallet);
      setTransactions(walletData.transactions || []);
      setCanSimulate(walletData.canSimulate || false);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 0.5) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum deposit is €0.50',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingIntent(true);

    try {
      const response = await fetch('/api/wallet/deposit-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(amount * 100),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPendingIntent(data.intent);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create deposit intent',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create deposit intent',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!pendingIntent) return;

    try {
      const response = await fetch('/api/wallet/confirm-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: pendingIntent.intentId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Deposit Successful',
          description: `Your wallet has been credited with ${formatCurrency(pendingIntent.amountCents)}`,
        });
      } else {
        toast({
          title: 'Warning',
          description: data.error || 'Payment completed but could not update wallet',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error confirming deposit:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm deposit',
        variant: 'destructive',
      });
    }

    setPendingIntent(null);
    setDepositAmount('');
    fetchWallet();
  };

  const handleSimulatePayment = async () => {
    if (!pendingIntent) return;

    try {
      const response = await fetch('/api/webhooks/psp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: pendingIntent.intentId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Payment Simulated',
          description: `Your wallet has been credited with ${formatCurrency(pendingIntent.amountCents)}`,
        });
      } else {
        toast({
          title: 'Simulation Failed',
          description: data.error || 'Failed to simulate payment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error simulating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to simulate payment',
        variant: 'destructive',
      });
    }

    setPendingIntent(null);
    setDepositAmount('');
    fetchWallet();
  };

  const handlePaymentCancel = () => {
    setPendingIntent(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="h-48 lg:col-span-3" />
          <Skeleton className="h-48 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/advertiser">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Wallet className="h-8 w-8 text-orange-500" />
        <h1 className="text-2xl font-bold">Wallet</h1>
        {pspConfig?.isStripe && (
          <Badge variant={pspConfig.isTestMode ? 'secondary' : 'default'}>
            {pspConfig.isTestMode ? 'Stripe Test Mode' : 'Stripe'}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Wallet Balance Card */}
        <Card className="lg:col-span-3 lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Balance
            </CardTitle>
            <CardDescription>Your available funds</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingIntent && stripePromise ? (
              <Elements stripe={stripePromise}>
                <DepositForm
                  pendingIntent={pendingIntent}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                  canSimulate={canSimulate}
                  onSimulate={handleSimulatePayment}
                  isMockMode={false}
                />
              </Elements>
            ) : pendingIntent && !stripePromise ? (
              <DepositForm
                pendingIntent={pendingIntent}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                canSimulate={canSimulate}
                onSimulate={handleSimulatePayment}
                isMockMode={true}
              />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <div className="text-sm text-emerald-600 mb-1">Available</div>
                  <div className="text-3xl font-bold text-emerald-700">
                    {formatCurrency(wallet?.availableCents || 0, wallet?.currency)}
                  </div>
                </div>

                {wallet && wallet.pendingCents > 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm text-yellow-600 mb-1">Pending</div>
                    <div className="text-lg font-semibold text-yellow-700">
                      {formatCurrency(wallet.pendingCents, wallet.currency)}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="amount">Amount ({wallet?.currency || 'EUR'})</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.50"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum deposit: {formatCurrency(50, wallet?.currency)}</p>
                </div>

                <Button
                  onClick={handleCreateDeposit}
                  disabled={isCreatingIntent || !depositAmount}
                  className="w-full"
                >
                  {isCreatingIntent ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Deposit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>Recent wallet activity</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{tx.description || tx.type}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {tx.invoiceId && (
                        <a
                          href={`/api/invoices/${tx.invoiceId}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Invoice
                          </Button>
                        </a>
                      )}
                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            tx.amountCents >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {tx.amountCents >= 0 ? '+' : ''}
                          {formatCurrency(tx.amountCents, tx.currency)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {tx.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
