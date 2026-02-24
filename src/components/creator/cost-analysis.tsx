'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, Activity, Receipt, Calculator } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface CostAnalysisData {
  period: string;
  summary: {
    totalSpendUsd: number;
    totalRequests: number;
    totalTokensCharged: number;
    avgCostPerRequest: number;
  };
  costByFeature: Array<{
    feature: string;
    featureLabel: string;
    requests: number;
    totalCostUsd: number;
    totalTokensCharged: number;
    avgCostPerRequest: number;
    avgTokensPerRequest: number;
    percentageOfSpend: number;
  }>;
  recentTransactions: Array<{
    id: string;
    feature: string;
    featureLabel: string;
    model: string;
    tokens: number;
    costUsd: number;
    tokensCharged: number;
    createdAt: string;
  }>;
}

export function CreatorCostAnalysis() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CostAnalysisData | null>(null);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creator/ai/usage/cost-analysis?period=${period}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch cost analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (usd: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(usd);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data || data.summary.totalRequests === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Analysis
          </CardTitle>
          <CardDescription>Understand AI feature profitability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No cost data yet</p>
            <p className="text-sm">Start using AI features to see cost analysis here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Cost Analysis
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Total Spend</span>
            </div>
            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
              {formatCurrency(data.summary.totalSpendUsd)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Total Requests</span>
            </div>
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              {formatNumber(data.summary.totalRequests)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Tokens Charged</span>
            </div>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">
              {formatNumber(data.summary.totalTokensCharged)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
              <Receipt className="h-4 w-4" />
              <span className="text-sm font-medium">Avg Cost/Request</span>
            </div>
            <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
              {formatCurrency(data.summary.avgCostPerRequest)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost by Feature</CardTitle>
          <CardDescription>Breakdown of AI costs per feature</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Cost (USD)</TableHead>
                <TableHead className="text-right">Tokens Charged</TableHead>
                <TableHead className="text-right">Avg Cost/Req</TableHead>
                <TableHead className="text-right">% of Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.costByFeature.map((feature) => (
                <TableRow key={feature.feature}>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{feature.featureLabel}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(feature.requests)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(feature.totalCostUsd)}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(feature.totalTokensCharged)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(feature.avgCostPerRequest)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 rounded-full" 
                          style={{ width: `${feature.percentageOfSpend}%` }}
                        />
                      </div>
                      <span className="text-sm">{feature.percentageOfSpend.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest AI feature usage</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Charged</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentTransactions.slice(0, 10).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{tx.featureLabel}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tx.model}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(tx.tokens)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(tx.costUsd)}</TableCell>
                  <TableCell className="text-right">{formatNumber(tx.tokensCharged)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
