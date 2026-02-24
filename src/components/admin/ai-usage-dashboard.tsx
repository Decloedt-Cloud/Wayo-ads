'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { DollarSign, Users, Activity, AlertTriangle, TrendingUp, Brain, Server, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminAIUsageData {
  period: string;
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalCostUsd: number;
    totalTokensCharged: number;
    avgCostPerRequest: number;
    uniqueCreators: number;
  };
  byModel: Array<{
    model: string;
    requests: number;
    totalTokens: number;
    costUsd: number;
    tokensCharged: number;
  }>;
  byFeature: Array<{
    feature: string;
    featureLabel: string;
    requests: number;
    totalTokens: number;
    costUsd: number;
    tokensCharged: number;
  }>;
  topCreators: Array<{
    creatorId: string;
    creator: { name: string | null; email: string | null };
    requests: number;
    costUsd: number;
    tokensCharged: number;
  }>;
  dailyCosts: Array<{
    date: string;
    requests: number;
    costUsd: number;
    tokensCharged: number;
    totalTokens: number;
  }>;
  anomalies: Array<{
    creatorId: string;
    totalCostUsd: number;
    requestCount: number;
    isAnomaly: boolean;
  }>;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export function AdminAIUsageDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminAIUsageData | null>(null);
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
      const res = await fetch(`/api/admin/ai/usage?period=${period}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch admin AI usage:', err);
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Platform AI Costs
          </CardTitle>
          <CardDescription>Monitor platform-wide AI usage and costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Server className="h-6 w-6" />
          Platform AI Costs
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.anomalies.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cost Anomalies Detected</AlertTitle>
          <AlertDescription>
            {data.anomalies.length} creators with unusually high AI usage detected.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-purple-200 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total Cost</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(data.summary.totalCostUsd)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-200 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Total Requests</span>
            </div>
            <p className="text-3xl font-bold">{formatNumber(data.summary.totalRequests)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-200 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Tokens Used</span>
            </div>
            <p className="text-3xl font-bold">{formatNumber(data.summary.totalTokens)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-600 to-orange-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-200 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Avg Cost/Req</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(data.summary.avgCostPerRequest)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-cyan-200 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Active Creators</span>
            </div>
            <p className="text-3xl font-bold">{formatNumber(data.summary.uniqueCreators)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-600 to-pink-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-pink-200 mb-1">
              <Brain className="h-4 w-4" />
              <span className="text-sm">Tokens Charged</span>
            </div>
            <p className="text-3xl font-bold">{formatNumber(data.summary.totalTokensCharged)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">By Model</TabsTrigger>
          <TabsTrigger value="features">By Feature</TabsTrigger>
          <TabsTrigger value="creators">Top Creators</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Cost Trend</CardTitle>
              <CardDescription>Platform AI costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyCosts}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      className="text-xs"
                    />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Cost']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="costUsd" 
                      stroke="#8b5cf6" 
                      fillOpacity={1} 
                      fill="url(#colorCost)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost by LLM Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byModel}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="model" className="text-xs" />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="costUsd" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {data.byModel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost (USD)</TableHead>
                    <TableHead className="text-right">% of Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byModel.map((model) => (
                    <TableRow key={model.model}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{model.model}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(model.requests)}</TableCell>
                      <TableCell className="text-right">{formatNumber(model.totalTokens)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(model.costUsd)}</TableCell>
                      <TableCell className="text-right">
                        {((model.costUsd / data.summary.totalCostUsd) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost by Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost (USD)</TableHead>
                    <TableHead className="text-right">% of Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byFeature.map((feature) => (
                    <TableRow key={feature.feature}>
                      <TableCell className="font-medium">
                        <Badge variant="secondary">{feature.featureLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(feature.requests)}</TableCell>
                      <TableCell className="text-right">{formatNumber(feature.totalTokens)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(feature.costUsd)}</TableCell>
                      <TableCell className="text-right">
                        {((feature.costUsd / data.summary.totalCostUsd) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Creators by AI Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Cost (USD)</TableHead>
                    <TableHead className="text-right">Tokens Charged</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topCreators.map((creator) => (
                    <TableRow key={creator.creatorId}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{creator.creator.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{creator.creator.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(creator.requests)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(creator.costUsd)}</TableCell>
                      <TableCell className="text-right">{formatNumber(creator.tokensCharged)}</TableCell>
                      <TableCell className="text-right">
                        {((creator.costUsd / data.summary.totalCostUsd) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Cell(props: any) {
  return <rect {...props} />;
}
