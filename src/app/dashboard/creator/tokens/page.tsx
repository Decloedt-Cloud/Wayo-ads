'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Zap, ShoppingCart, Clock, CheckCircle, AlertTriangle, Sparkles, Brain, Video, Target, Palette, Layers, BarChart3, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreatorAIUsageAnalytics } from '@/components/creator/ai-usage-analytics';
import { CreatorCostAnalysis } from '@/components/creator/cost-analysis';

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
}

const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 200,
    priceCents: 2999,
  },
  {
    id: 'growth',
    name: 'Growth',
    tokens: 600,
    priceCents: 4499,
    bonusTokens: 50,
  },
  {
    id: 'pro',
    name: 'Pro',
    tokens: 1200,
    priceCents: 4999,
    bonusTokens: 200,
    isBestValue: true,
  },
];

export default function TokensPage() {
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
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchBalance();
      fetchPspConfig();
    }
  }, [status, router]);

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
    setClientSecret(null);

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
          title: 'Error',
          description: data.error || 'Failed to initiate purchase',
          variant: 'destructive',
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

  const getPricePerToken = (pkg: TokenPackage) => {
    const total = getTotalTokens(pkg);
    return ((pkg.priceCents / 100) / total).toFixed(3);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const isLowBalance = balance && balance.balanceTokens < 20;
  const isZeroBalance = balance && balance.balanceTokens === 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            AI Tokens
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your tokens for AI-powered features
          </p>
        </div>
      </div>

      {isZeroBalance && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400">
                  Tokens Exhausted
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Your tokens are depleted. Purchase more to continue using AI features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLowBalance && !isZeroBalance && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                  Low Token Balance
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  You have {balance?.balanceTokens} tokens remaining. Consider topping up.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
          <CardDescription>Your available tokens for AI features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">{balance?.balanceTokens || 0}</span>
            <span className="text-xl text-muted-foreground">tokens</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Purchased</p>
              <p className="font-semibold">{balance?.lifetimePurchasedTokens || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Used</p>
              <p className="font-semibold">{balance?.lifetimeConsumedTokens || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Granted</p>
              <p className="font-semibold">{balance?.lifetimeGrantedTokens || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Purchase Tokens
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOKEN_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative ${
                pkg.isBestValue
                  ? 'border-primary ring-2 ring-primary/20'
                  : ''
              }`}
            >
              {pkg.isBestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Best Value
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>
                  {getTotalTokens(pkg)} tokens
                  {pkg.bonusTokens && (
                    <span className="text-green-600">
                      {' '}
                      (+{pkg.bonusTokens} bonus)
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    €{(pkg.priceCents / 100).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  €{getPricePerToken(pkg)} per token
                </p>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing !== null}
                >
                  {purchasing === pkg.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShoppingCart className="h-4 w-4 mr-2" />
                  )}
                  Purchase
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600">
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5" />
            AI Features Preview
          </CardTitle>
          <CardDescription className="text-purple-100">See what each AI feature can create for you</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-4 bg-white/90 dark:bg-black/80 rounded-lg shadow-lg max-w-[90%]">
                    <p className="text-xs text-purple-600 font-medium mb-1">Script Generation</p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-300 line-clamp-4">"Hey guys! Today I'm sharing my secret strategy for going viral..."</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-purple-600 text-white">5 tokens</Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-purple-900 dark:text-purple-100">Script Generation</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">AI-powered video scripts</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-800/20 border border-blue-200 dark:border-blue-800">
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-3 bg-white/90 dark:bg-black/80 rounded-lg shadow-lg">
                    <div className="w-16 h-10 bg-gradient-to-r from-red-600 to-orange-500 rounded flex items-center justify-center text-white text-[8px] font-bold">VIRAL</div>
                    <p className="text-[10px] text-center mt-1 text-gray-600 dark:text-gray-300">10M views</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-blue-600 text-white">3 tokens</Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-blue-900 dark:text-blue-100">Title Engine</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Click-worthy titles</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-800/20 border border-orange-200 dark:border-orange-800">
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-amber-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-black/80 rounded-lg shadow-lg p-2">
                    <div className="w-16 h-10 bg-gradient-to-r from-purple-600 to-pink-500 rounded flex items-center justify-center">
                      <span className="text-white text-[8px]">Thumbnail</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-white" />
                      <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white -ml-2" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-orange-600 text-white">5 tokens</Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-orange-900 dark:text-orange-100">Thumbnail Psychology</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">High-Click thumbnails</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-800/20 border border-red-200 dark:border-red-800">
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-black/80 rounded-lg shadow-lg p-3 w-[90%]">
                    <div className="flex gap-2">
                      <div className="h-8 w-1 bg-green-500 rounded-full" />
                      <div className="h-12 w-1 bg-blue-500 rounded-full" />
                      <div className="h-6 w-1 bg-purple-500 rounded-full" />
                      <div className="h-10 w-1 bg-red-500 rounded-full" />
                    </div>
                    <p className="text-[8px] text-center mt-1 text-gray-500">Viral Pattern #1: "The Loop"</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-red-600 text-white">15 tokens</Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-red-900 dark:text-red-100">Viral Patterns</p>
                <p className="text-xs text-red-600 dark:text-red-400">Proven viral structures</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-800/20 border border-cyan-200 dark:border-cyan-800">
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-teal-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-black/80 rounded-lg shadow-lg p-3 w-[90%]">
                    <p className="text-[8px] text-purple-600 font-bold">CREATOR INSIGHTS</p>
                    <div className="mt-2 space-y-1">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      <div className="h-2 bg-purple-500/50 rounded w-full" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-cyan-600 text-white">8 tokens</Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-cyan-900 dark:text-cyan-100">Creator Intelligence</p>
                <p className="text-xs text-cyan-600 dark:text-cyan-400">Deep audience insights</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-800/20 border border-indigo-200 dark:border-indigo-800">
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-black/80 rounded-lg shadow-lg p-3">
                    <p className="text-[8px] text-gray-500 mb-1">Content Score</p>
                    <div className="flex items-end gap-1">
                      <div className="w-3 h-8 bg-gray-300 rounded" />
                      <div className="w-3 h-12 bg-gray-300 rounded" />
                      <div className="w-3 h-16 bg-indigo-500 rounded" />
                      <div className="w-3 h-20 bg-green-500 rounded" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-indigo-600 text-white">5 tokens</Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-indigo-900 dark:text-indigo-100">Content Analysis</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Performance predictions</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-800/20 border border-yellow-200 dark:border-yellow-800">
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-black/80 rounded-lg shadow-lg p-2 w-[90%]">
                    <div className="flex gap-1 mb-2">
                      <span className="text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">#viral</span>
                      <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">#trending</span>
                    </div>
                    <div className="h-6 w-full bg-gradient-to-r from-yellow-400 to-red-500 rounded opacity-50" />
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-yellow-600 text-white">10 tokens</Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">Trend Analysis</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Rising topics & hashtags</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-800/20 border border-purple-200 dark:border-purple-800">
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-black/80 rounded-lg shadow-lg p-2 w-[90%]">
                    <p className="text-[8px] text-purple-600 font-bold mb-1">PATTERN FOUND</p>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="h-6 bg-purple-200 rounded" />
                      <div className="h-6 bg-pink-200 rounded" />
                      <div className="h-6 bg-purple-200 rounded" />
                    </div>
                    <p className="text-[8px] text-center mt-1 text-gray-500">87% match</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-purple-600 text-white">10 tokens</Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-purple-900 dark:text-purple-100">Pattern Analysis</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Find winning formulas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="usage">
          <CreatorAIUsageAnalytics />
        </TabsContent>
        
        <TabsContent value="costs">
          <CreatorCostAnalysis />
        </TabsContent>
      </Tabs>

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
