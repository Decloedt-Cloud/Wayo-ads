'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Zap,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Crown,
  Rocket,
  Target,
  TrendingUp,
  Brain,
  Video,
  Palette,
  BarChart3,
  Layers,
  Clock,
  Star,
  ArrowRight,
  ZapOff,
} from 'lucide-react';

interface TokenBalance {
  balanceTokens: number;
  lifetimePurchasedTokens: number;
  lifetimeConsumedTokens: number;
  lifetimeGrantedTokens: number;
}

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  priceCents: number;
  bonusTokens?: number;
  isBestValue?: boolean;
  icon: React.ReactNode;
  gradient: string;
  features: string[];
}

const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 200,
    priceCents: 2999,
    icon: <Target className="h-8 w-8" />,
    gradient: 'from-blue-500 to-cyan-400',
    features: [
      '200 monthly tokens',
      'Core AI tools access',
      'Script generation',
      'Basic pattern analysis',
      'Standard generation priority',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tokens: 600,
    priceCents: 4499,
    bonusTokens: 50,
    icon: <Rocket className="h-8 w-8" />,
    gradient: 'from-purple-500 to-pink-400',
    features: [
      '600 monthly tokens',
      '+50 bonus tokens',
      'All advanced AI tools',
      'Priority script generation',
      'Medium generation speed',
      'Viral pattern library',
      'Thumbnail psychology',
      'Priority email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tokens: 1200,
    priceCents: 4999,
    bonusTokens: 200,
    isBestValue: true,
    icon: <Crown className="h-8 w-8" />,
    gradient: 'from-amber-400 to-orange-500',
    features: [
      '1,200 monthly tokens',
      '+200 bonus tokens',
      'Full AI engine access',
      'Top generation priority',
      '-20% token consumption',
      'Early feature access',
      'All tools included',
      '24/7 priority support',
      'Custom AI workflows',
    ],
  },
];

const TOKEN_FEATURES = [
  { icon: <Video className="h-5 w-5" />, name: 'Script Generation', tokens: 5 },
  { icon: <Brain className="h-5 w-5" />, name: 'Pattern Analysis', tokens: 10 },
  { icon: <TrendingUp className="h-5 w-5" />, name: 'Trend Analysis', tokens: 10 },
  { icon: <Palette className="h-5 w-5" />, name: 'Thumbnail Psychology', tokens: 5 },
  { icon: <BarChart3 className="h-5 w-5" />, name: 'Content Analysis', tokens: 5 },
  { icon: <Layers className="h-5 w-5" />, name: 'Viral Patterns', tokens: 15 },
  { icon: <Target className="h-5 w-5" />, name: 'Title Engine', tokens: 3 },
  { icon: <Sparkles className="h-5 w-5" />, name: 'Creator Intelligence', tokens: 8 },
];

export default function CreatorPricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [pspConfig, setPspConfig] = useState<{ isStripe: boolean; publishableKey: string | null; isTestMode: boolean } | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBalance();
      fetchPspConfig();
    } else {
      fetchPspConfig();
      setLoading(false);
    }
  }, [status]);

  const fetchPspConfig = async () => {
    try {
      const res = await fetch('/api/wallet/config');
      const data = await res.json();
      setPspConfig(data);
      if (data.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      }
    } catch (error) {
      console.error('Failed to fetch PSP config:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/tokens/balance');
      const data = await res.json();
      if (data.balance) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    await fetchBalance();
    setTimeout(async () => {
      await fetchBalance();
    }, 1000);
    setTimeout(async () => {
      await fetchBalance();
    }, 2500);
  };

  const handlePurchase = async (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setPurchasing(pkg.id);

    try {
      const res = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const data = await res.json();

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowPurchaseDialog(true);
      } else {
        toast({
          title: 'Demo Mode',
          description: 'Purchase simulation - tokens would be added after payment',
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate purchase',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  const getTotalTokens = (pkg: TokenPackage) => {
    return pkg.tokens + (pkg.bonusTokens || 0);
  };

  const getTokenPerEuro = (pkg: TokenPackage) => {
    return Math.round(getTotalTokens(pkg) / (pkg.priceCents / 100));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto p-6 space-y-12">
          <Skeleton className="h-16 w-96 mx-auto" />
          <Skeleton className="h-96 w-full max-w-5xl mx-auto" />
        </div>
      </div>
    );
  }

  const isLowBalance = balance && balance.balanceTokens < 20;
  const isZeroBalance = balance && balance.balanceTokens === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-purple-500/20 text-purple-200 border-purple-400/30 px-4 py-1">
            <Sparkles className="h-3 w-3 mr-1" />
            Simple, Fair Pricing
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-amber-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
            Your Magic Recipe to
            <br />
            Content that Performs
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto mb-8">
            Create high-performing content with our AI content scriptwriter and content spy tool — built for creators, social media managers, growth marketers, and agencies.
          </p>
          <div className="flex items-center justify-center gap-4 text-purple-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>100 free tokens on signup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>No credit card required</span>
            </div>
          </div>
        </div>

        {balance && (
          <Card className="max-w-md mx-auto mb-12 bg-white/10 backdrop-blur border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/20 rounded-full">
                    <Zap className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-purple-200 text-sm">Your Balance</p>
                    <p className="text-3xl font-bold text-white">{balance.balanceTokens}</p>
                  </div>
                </div>
                <Link href={session ? '/dashboard/creator/tokens' : '/auth/signin'}>
                  <Button variant="outline" className="border-white/30 bg-purple-800/50 text-white hover:bg-white/20 active:bg-white active:text-purple-900">
                    {session ? 'Manage Tokens' : 'Sign In'}
                  </Button>
                </Link>
              </div>
              {isZeroBalance && (
                <div className="mt-4 p-3 bg-red-500/20 rounded-lg flex items-center gap-2 text-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Tokens exhausted. Purchase tokens to continue.</span>
                </div>
              )}
              {isLowBalance && !isZeroBalance && (
                <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg flex items-center gap-2 text-yellow-200">
                  <ZapOff className="h-4 w-4" />
                  <span className="text-sm">Low balance: {balance.balanceTokens} tokens remaining</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {TOKEN_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative overflow-hidden bg-white/10 backdrop-blur border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 ${
                pkg.isBestValue ? 'ring-2 ring-amber-400/50' : ''
              }`}
            >
              {pkg.isBestValue && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-bl-xl flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    BEST VALUE
                  </div>
                </div>
              )}
              
              <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${pkg.gradient}`}></div>
              
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto p-4 rounded-full bg-gradient-to-br ${pkg.gradient} w-20 h-20 flex items-center justify-center mb-4 shadow-lg`}>
                  <div className="text-white">{pkg.icon}</div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">{pkg.name}</CardTitle>
                <CardDescription className="text-purple-200">
                  {pkg.id === 'starter' && 'Perfect for getting started'}
                  {pkg.id === 'growth' && 'For regular content creators'}
                  {pkg.id === 'pro' && 'For serious growth seekers'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">€{(pkg.priceCents / 100).toFixed(2)}</span>
                    <span className="text-purple-300">/mo</span>
                  </div>
                  <p className="text-sm text-purple-300 mt-2">
                    {getTotalTokens(pkg)} tokens + {pkg.bonusTokens || 0} bonus
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    {getTokenPerEuro(pkg)} tokens per euro
                  </p>
                </div>

                <ul className="space-y-3">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-purple-100">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full bg-gradient-to-r ${pkg.gradient} border-0 hover:opacity-90 text-white font-semibold`}
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing !== null}
                >
                  {purchasing === pkg.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : pkg.isBestValue ? (
                    <>
                      Get Started <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    'Choose Plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Token Economy</h2>
            <p className="text-purple-200">Understand how tokens power your AI tools</p>
          </div>
          
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {TOKEN_FEATURES.map((feature, idx) => (
                  <div key={idx} className="text-center">
                    <div className="p-3 bg-white/10 rounded-full w-fit mx-auto mb-2 text-purple-200">
                      {feature.icon}
                    </div>
                    <p className="text-white font-medium">{feature.name}</p>
                    <p className="text-purple-300 text-sm">{feature.tokens} tokens</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto text-center">
          <div className="p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-400/30">
            <h3 className="text-xl font-bold text-white mb-2">Never Run Out Mid-Creative Flow</h3>
            <ul className="text-purple-200 space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Tokens auto-renew every month
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Email & in-app alerts before tokens run low
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Instant top-ups via Stripe
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                No per-feature surprise charges
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-12 text-purple-300">
          <p className="text-sm">
            Questions? Contact us at{' '}
            <a href="mailto:support@wayo-ads.com" className="text-white underline">
              support@wayo-ads.com
            </a>
          </p>
        </div>

        <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Purchase</DialogTitle>
              <DialogDescription>
                {selectedPackage && (
                  <>
                    Purchasing {getTotalTokens(selectedPackage)} tokens for €
                    {(selectedPackage.priceCents / 100).toFixed(2)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {clientSecret && pspConfig?.isStripe && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <PaymentForm 
                  clientSecret={clientSecret}
                  onSuccess={async (paymentIntentId) => {
                    const tokens = selectedPackage ? selectedPackage.tokens + (selectedPackage.bonusTokens || 0) : 0;
                    try {
                      await fetch('/api/tokens/test-purchase', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          paymentIntentId,
                          tokens
                        }),
                      });
                    } catch (error) {
                      console.error('Failed to confirm purchase:', error);
                    }
                    toast({
                      title: 'Payment Successful!',
                      description: 'Your tokens have been added to your account.',
                    });
                    setShowPurchaseDialog(false);
                    setClientSecret(null);
                    refreshBalance();
                  }}
                  onCancel={() => setShowPurchaseDialog(false)}
                />
              </Elements>
            ) : (
              <div className="py-4">
                {pspConfig === null ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Demo Mode: Payment simulation
                    </p>
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm">
                        Package: <strong>{selectedPackage?.name}</strong>
                      </p>
                      <p className="text-sm">
                        Tokens: <strong>{selectedPackage ? getTotalTokens(selectedPackage) : 0}</strong>
                      </p>
                      <p className="text-sm">
                        Price: <strong>€{selectedPackage ? (selectedPackage.priceCents / 100).toFixed(2) : '0.00'}</strong>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
                Cancel
              </Button>
              {!pspConfig?.isStripe && selectedPackage && (
                <Button onClick={async () => {
                  try {
                    console.log('Simulating purchase for package:', selectedPackage.id);
                    const res = await fetch('/api/tokens/purchase', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        packageId: selectedPackage.id,
                        simulate: true 
                      }),
                    });
                    
                    const data = await res.json();
                    console.log('Purchase response:', data);
                    
                    if (res.ok && data.success) {
                      toast({
                        title: 'Demo Mode',
                        description: `Added ${data.tokens} tokens to your account!`,
                      });
                    } else {
                      toast({
                        title: 'Demo Mode',
                        description: 'Purchase simulation - tokens would be added after payment',
                      });
                    }
                  } catch (error) {
                    console.error('Demo purchase error:', error);
                    toast({
                      title: 'Demo Mode',
                      description: 'Purchase simulation - tokens would be added after payment',
                    });
                  }
                  setShowPurchaseDialog(false);
                  refreshBalance();
                }}>
                  Simulate Payment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntentId?: string) => void;
  onCancel: () => void;
}

function PaymentForm({ clientSecret, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const [cardholderName, setCardholderName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [emirate, setEmirate] = useState('');
  const [country, setCountry] = useState('AE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setProcessing(false);
      return;
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: cardholderName,
          email: undefined,
          phone: undefined,
          address: {
            line1: addressLine1,
            line2: addressLine2 || undefined,
            city: city,
            state: emirate,
            postal_code: undefined,
            country: country,
          },
        },
      },
    });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError('Payment was not completed');
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Nom du titulaire de la carte
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Nom complet"
            required
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-900"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Adresse de facturation
          </label>
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Ligne d'adresse n°1"
            required
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-900 mb-2"
          />
          <input
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Ligne d'adresse n°2"
            className="w-full px-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-900"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ville
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ville"
              required
              className="mt-1 w-full px-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Émirat
            </label>
            <select
              value={emirate}
              onChange={(e) => setEmirate(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-900"
            >
              <option value="">Sélectionner</option>
              <option value="Abu Dhabi">Abu Dhabi</option>
              <option value="Dubai">Dubai</option>
              <option value="Sharjah">Sharjah</option>
              <option value="Ajman">Ajman</option>
              <option value="Umm Al Quwain">Umm Al Quwain</option>
              <option value="Ras Al Khaimah">Ras Al Khaimah</option>
              <option value="Fujairah">Fujairah</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Pays
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-900"
          >
            <option value="AE">Émirats arabes unis</option>
          </select>
        </div>
      </div>

      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 mt-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
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
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || processing} className="flex-1">
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Secure payment powered by Stripe
      </p>
    </form>
  );
}
