'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Activity,
  ArrowLeft,
  RefreshCw,
  Zap,
  Gauge
} from 'lucide-react';
import { useLanguage } from '@/app/translations';

interface PacingStatus {
  campaignId: string;
  campaignTitle: string;
  pacingEnabled: boolean;
  pacingMode: string;
  status: string;
  totalBudgetCents: number;
  spentBudgetCents: number;
  dailyBudgetCents: number;
  campaignDurationHours: number;
  targetSpendPerHourCents: number;
  actualSpendPerHourCents: number;
  deliveryProgressPercent: number;
  isOverDelivering: boolean;
  isUnderDelivering: boolean;
  hoursElapsed: number;
  hoursRemaining: number;
  predictedExhaustionDate: string | null;
  recommendedAction: 'BOOST' | 'MAINTAIN' | 'REDUCE' | 'NONE';
}

export default function AdvertiserPacingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [pacingData, setPacingData] = useState<PacingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchPacingData();
  }, [status]);

  async function fetchPacingData() {
    if (status !== 'authenticated') return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/advertiser/pacing');
      
      if (res.status === 403 || res.status === 401) {
        setError('Access denied. Advertiser privileges required.');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch pacing data');
      }

      const data = await res.json();
      setPacingData(data.campaigns || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  }

  function getStatusBadge(status: PacingStatus) {
    if (status.isOverDelivering) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Over-delivering
        </Badge>
      );
    }
    if (status.isUnderDelivering) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
          <TrendingDown className="h-3 w-3" />
          Under-delivering
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        On Track
      </Badge>
    );
  }

  function getActionBadge(action: string) {
    switch (action) {
      case 'BOOST':
        return <Badge variant="secondary" className="bg-blue-600">Boost</Badge>;
      case 'REDUCE':
        return <Badge variant="destructive">Reduce</Badge>;
      case 'MAINTAIN':
        return <Badge variant="outline" className="border-green-500 text-green-600">Maintain</Badge>;
      default:
        return <Badge variant="outline">None</Badge>;
    }
  }

  function getModeBadge(mode: string) {
    switch (mode) {
      case 'EVEN':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Even</Badge>;
      case 'ACCELERATED':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Accelerated</Badge>;
      case 'CONSERVATIVE':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Conservative</Badge>;
      default:
        return <Badge variant="outline">{mode}</Badge>;
    }
  }

  const overDeliveringCount = pacingData.filter(c => c.isOverDelivering).length;
  const underDeliveringCount = pacingData.filter(c => c.isUnderDelivering).length;
  const onTrackCount = pacingData.length - overDeliveringCount - underDeliveringCount;
  const totalSpend = pacingData.reduce((sum, c) => sum + c.spentBudgetCents, 0);
  const totalBudget = pacingData.reduce((sum, c) => sum + c.totalBudgetCents, 0);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading pacing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/advertiser')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Campaign Pacing</h1>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/advertiser')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Campaign Pacing</h1>
            <p className="text-sm text-muted-foreground">
              Monitor your campaign burn rates and delivery progress
              {lastUpdated && <span> • Last updated: {lastUpdated.toLocaleTimeString()}</span>}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchPacingData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pacingData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onTrackCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over-delivering</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overDeliveringCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under-delivering</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{underDeliveringCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0 ? ((totalSpend / totalBudget) * 100).toFixed(1) : 0}% of budget
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Campaign Pacing Status</CardTitle>
          <CardDescription>
            Real-time pacing status for your active campaigns with pacing enabled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pacingData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active campaigns with pacing enabled</p>
              <p className="text-sm mt-2">Enable pacing when creating or editing a campaign to see it here</p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/advertiser">Go to Campaigns</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Spend Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Predicted End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacingData.map((campaign) => (
                  <TableRow key={campaign.campaignId}>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/campaigns/${campaign.campaignId}`}
                        className="hover:underline"
                      >
                        {campaign.campaignTitle}
                      </Link>
                    </TableCell>
                    <TableCell>{getModeBadge(campaign.pacingMode)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-secondary rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              campaign.isOverDelivering ? 'bg-red-600' : 
                              campaign.isUnderDelivering ? 'bg-orange-500' : 'bg-green-600'
                            }`}
                            style={{ width: `${Math.min(100, campaign.deliveryProgressPercent)}%` }}
                          />
                        </div>
                        <span className="text-sm">{campaign.deliveryProgressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {campaign.hoursElapsed.toFixed(1)}h / {campaign.campaignDurationHours.toFixed(1)}h
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatCurrency(campaign.spentBudgetCents)}</div>
                      <div className="text-xs text-muted-foreground">
                        of {formatCurrency(campaign.totalBudgetCents)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {formatCurrency(campaign.actualSpendPerHourCents)}/hr
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        target: {formatCurrency(campaign.targetSpendPerHourCents)}/hr
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign)}</TableCell>
                    <TableCell>{getActionBadge(campaign.recommendedAction)}</TableCell>
                    <TableCell className="text-sm">
                      {campaign.predictedExhaustionDate ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDate(campaign.predictedExhaustionDate)}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
