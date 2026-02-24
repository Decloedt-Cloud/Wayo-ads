'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, DollarSign, Eye, MousePointerClick, TrendingUp, Loader2, ArrowLeft, CreditCard, Settings, Mail, Building, ShieldAlert, Users, Activity, BookOpen, Youtube, Bell } from 'lucide-react';
import { useLanguage } from '@/app/translations';

interface Transaction {
  id: string;
  campaignId: string;
  creatorId: string;
  amountCents: number;
  reason: 'VIEW' | 'CONVERSION';
  refEventId: string | null;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    advertiser: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  creator: {
    id: string;
    name: string | null;
    email: string;
    trustScore?: number;
    tier?: string;
    creatorChannels?: Array<{
      channelName: string;
      subscriberCount: number;
    }>;
  };
}

interface Summary {
  totalAmountCents: number;
  totalTransactions: number;
  byReason: Array<{
    reason: string;
    _sum: { amountCents: number | null };
    _count: { id: number };
  }>;
  topCampaigns: Array<{
    campaignId: string;
    _sum: { amountCents: number | null };
    _count: { id: number };
    campaign?: { id: string; title: string };
  }>;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: Summary;
}

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { language } = useLanguage();
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [trafficQualityData, setTrafficQualityData] = useState<any>(null);
  const [trafficQualityLoading, setTrafficQualityLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState({ type: 'all', page: 1 });

  const getLocalizedPath = (path: string) => path;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      if (status !== 'authenticated') return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '50');
        if (filter !== 'all') {
          params.set('reason', filter);
        }

        const res = await fetch(`/api/admin/transactions?${params}`);

        if (res.status === 403) {
          setError('Access denied. Superadmin privileges required.');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch data');
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [status, page, filter]);

  useEffect(() => {
    async function fetchTrafficQualityData() {
      if (status !== 'authenticated') return;

      setTrafficQualityLoading(true);

      try {
        const res = await fetch('/api/admin/debug/tracking?type=creator-risk');
        if (res.ok) {
          const json = await res.json();
          setTrafficQualityData(json);
        }
      } catch (err) {
        console.error('Error fetching traffic quality data:', err);
      } finally {
        setTrafficQualityLoading(false);
      }
    }

    fetchTrafficQualityData();
  }, [status]);

  useEffect(() => {
    async function fetchLedgerData() {
      if (activeTab !== 'accounting') return;
      if (status !== 'authenticated') return;

      setLedgerLoading(true);

      try {
        const params = new URLSearchParams();
        params.set('page', ledgerFilter.page.toString());
        params.set('limit', '50');
        if (ledgerFilter.type !== 'all') {
          params.set('type', ledgerFilter.type);
        }

        const res = await fetch(`/api/admin/ledger?${params}`);
        
        if (res.ok) {
          const json = await res.json();
          setLedgerData(json);
        }
      } catch (err) {
        console.error('Error fetching ledger data:', err);
      } finally {
        setLedgerLoading(false);
      }
    }

    fetchLedgerData();
  }, [activeTab, ledgerFilter.page, ledgerFilter.type, status]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#F47A1F]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const viewStats = data?.summary.byReason.find(r => r.reason === 'VIEW');
  const conversionStats = data?.summary.byReason.find(r => r.reason === 'CONVERSION');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={getLocalizedPath('/')} className="flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-[#F47A1F]" />
                <span className="font-bold text-lg text-gray-900">Wayo Ads Market</span>
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-lg font-semibold text-gray-900">Superadmin Dashboard</h1>
            </div>
            <Link href={getLocalizedPath('/')}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="accounting" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Accounting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href={getLocalizedPath('/admin/settings/stripe')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <CreditCard className="h-8 w-8 text-[#F47A1F]" />
                <div>
                  <CardTitle className="text-lg">Stripe Settings</CardTitle>
                  <CardDescription>Configure payment provider credentials</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href={getLocalizedPath('/admin/settings/email')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <Mail className="h-8 w-8 text-[#F47A1F]" />
                <div>
                  <CardTitle className="text-lg">Email Settings</CardTitle>
                  <CardDescription>Configure SMTP for notifications</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href={getLocalizedPath('/notifications')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <Bell className="h-8 w-8 text-[#F47A1F]" />
                <div>
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <CardDescription>View and manage all notifications</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href={getLocalizedPath('/admin/emails')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <Mail className="h-8 w-8 text-blue-500" />
                <div>
                  <CardTitle className="text-lg">Email Management</CardTitle>
                  <CardDescription>Preview templates and send test emails</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href={getLocalizedPath('/admin/settings/platform')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <Settings className="h-8 w-8 text-[#F47A1F]" />
                <div>
                  <CardTitle className="text-lg">Platform Settings</CardTitle>
                  <CardDescription>Configure fees, currency, and limits</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href={getLocalizedPath('/dashboard/admin/creator-velocity')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <Activity className="h-8 w-8 text-red-500" />
                <div>
                  <CardTitle className="text-lg">Creator Velocity</CardTitle>
                  <CardDescription>Monitor traffic spikes and anomalies</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href={getLocalizedPath('/dashboard/admin/youtube-monitoring')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <Youtube className="h-8 w-8 text-red-500" />
                <div>
                  <CardTitle className="text-lg">YouTube Monitoring</CardTitle>
                  <CardDescription>Monitor YouTube post performance and view validation</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href={getLocalizedPath('/admin/settings/business')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <Building className="h-8 w-8 text-[#F47A1F]" />
                <div>
                  <CardTitle className="text-lg">Legal & Business Info</CardTitle>
                  <CardDescription>Manage company legal details, tax info, and banking</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href={getLocalizedPath('/admin/withdrawals')}>
            <Card className="hover:border-[#F47A1F] transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <CreditCard className="h-8 w-8 text-[#F47A1F]" />
                <div>
                  <CardTitle className="text-lg">Creator Withdrawals</CardTitle>
                  <CardDescription>Review and process creator payout requests</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Traffic Quality Monitoring */}
        <Card className="mb-8 border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-500" />
              <div>
                <CardTitle>Traffic Quality Monitoring</CardTitle>
                <CardDescription>Creator traffic anomaly detection and risk assessment</CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              disabled={trafficQualityLoading}
              onClick={async () => {
                setTrafficQualityLoading(true);
                try {
                  const daysToAnalyze = 7;
                  for (let i = 0; i < daysToAnalyze; i++) {
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() - i);
                    await fetch('/api/admin/jobs/aggregate-creator-metrics', { 
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ targetDate: targetDate.toISOString() })
                    });
                  }
                  const res = await fetch('/api/admin/debug/tracking?type=creator-risk');
                  if (res.ok) {
                    const json = await res.json();
                    setTrafficQualityData(json);
                  }
                } catch (err) {
                  console.error('Failed to trigger aggregation:', err);
                } finally {
                  setTrafficQualityLoading(false);
                }
              }}
            >
              <Activity className="h-4 w-4 mr-2" />
              Run Analysis (7 Days)
            </Button>
          </CardHeader>
          <CardContent>
            {trafficQualityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#F47A1F]" />
              </div>
            ) : trafficQualityData ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Flagged Creators</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">{trafficQualityData.flaggedCreators}</p>
                    <p className="text-xs text-amber-600">out of {trafficQualityData.totalCreators} total</p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Avg Validation Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {trafficQualityData.creators.length > 0 
                        ? Math.round(trafficQualityData.creators.reduce((acc: number, c: any) => acc + (c.validationRate || 0), 0) / trafficQualityData.creators.length * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-blue-600">across all creators</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">High Risk Score</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {trafficQualityData.creators.length > 0 
                        ? Math.max(...trafficQualityData.creators.map((c: any) => c.anomalyScore || 0), 0)
                        : 0}
                    </p>
                    <p className="text-xs text-green-600">max anomaly score</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Avg Fraud Score</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      {trafficQualityData.creators.length > 0 
                        ? Math.round(trafficQualityData.creators.reduce((acc: number, c: any) => acc + (c.avgFraudScore || 0), 0) / trafficQualityData.creators.length)
                        : 0}
                    </p>
                    <p className="text-xs text-purple-600">lower is better</p>
                  </div>
                </div>

                {/* Flagged Creators Table */}
                {trafficQualityData.flaggedCreators > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      Flagged Creators Requiring Review
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-amber-50">
                            <TableHead className="text-amber-800">Creator ID</TableHead>
                            <TableHead className="text-amber-800">Anomaly Score</TableHead>
                            <TableHead className="text-amber-800">Validation Rate</TableHead>
                            <TableHead className="text-amber-800">Fraud Score</TableHead>
                            <TableHead className="text-amber-800">Flag Reason</TableHead>
                            <TableHead className="text-amber-800">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trafficQualityData.creators
                            .filter((c: any) => c.flagged)
                            .slice(0, 10)
                            .map((creator: any) => (
                              <TableRow key={creator.creatorId}>
                                <TableCell className="font-mono text-xs">{creator.creatorId.slice(0, 8)}...</TableCell>
                                <TableCell>
                                  <Badge variant={creator.anomalyScore >= 7 ? 'destructive' : creator.anomalyScore >= 5 ? 'default' : 'secondary'}>
                                    {creator.anomalyScore}
                                  </Badge>
                                </TableCell>
                                <TableCell>{(creator.validationRate * 100).toFixed(1)}%</TableCell>
                                <TableCell>{creator.avgFraudScore.toFixed(1)}</TableCell>
                                <TableCell className="text-xs max-w-[200px]">
                                  {creator.flagReasons ? JSON.parse(creator.flagReasons).join(', ') : '-'}
                                </TableCell>
                                <TableCell>
                                  <Link 
                                    href={`/api/admin/debug/tracking?type=creator-risk&creatorId=${creator.creatorId}`}
                                    target="_blank"
                                  >
                                    <Button variant="outline" size="sm">
                                      View Details
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No flagged creators. Traffic quality looks healthy.</p>
                  </div>
                )}

                {/* Traffic Trend Mini Chart (Last 7 Days) */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Traffic Trends (Total Recorded Views)</h4>
                  <div className="flex items-end justify-between h-32 gap-1">
                    {(() => {
                      const dailyStats = trafficQualityData.dailyStats || [];
                      const maxViews = Math.max(...dailyStats.map((d: any) => d.totalRecorded), 1);
                      return Array.from({ length: 7 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        const dateStr = date.toISOString().split('T')[0];
                        const dayData = dailyStats.find((d: any) => d.date.split('T')[0] === dateStr);
                        const totalViews = dayData?.totalRecorded || 0;
                        const barHeight = Math.round((totalViews / maxViews) * 100);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div 
                              className={`w-full rounded-t ${totalViews > 0 ? 'bg-[#F47A1F]' : 'bg-gray-200'}`}
                              style={{ height: `${Math.max(barHeight, 4)}px` }}
                              title={`${date.toLocaleDateString()}: ${totalViews} views`}
                            />
                            <span className="text-xs text-gray-500 mt-1">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No traffic quality data available.</p>
                <p className="text-sm">Run the analysis to generate metrics.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
              <DollarSign className="h-4 w-4 text-[#F47A1F]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data?.summary.totalAmountCents || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {data?.summary.totalTransactions || 0} total transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">View Payouts</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(viewStats?._sum.amountCents || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {viewStats?._count.id || 0} view transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Payouts</CardTitle>
              <MousePointerClick className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(conversionStats?._sum.amountCents || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {conversionStats?._count.id || 0} conversion transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.summary.topCampaigns.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Campaigns with payouts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Campaigns */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Campaigns by Payout</CardTitle>
            <CardDescription>Campaigns with the highest total payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.summary.topCampaigns.map((campaign, index) => (
                <div key={campaign.campaignId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div>
                      <p className="font-medium">{campaign.campaign?.title || 'Unknown Campaign'}</p>
                      <p className="text-sm text-gray-500">{campaign._count.id} transactions</p>
                    </div>
                  </div>
                  <span className="font-semibold text-[#F47A1F]">
                    {formatCurrency(campaign._sum.amountCents || 0)}
                  </span>
                </div>
              ))}
              {(!data?.summary.topCampaigns.length) && (
                <p className="text-gray-500 text-center py-4">No campaigns with payouts yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>
                  Complete payout history across all campaigns and creators
                </CardDescription>
              </div>
              <Select value={filter} onValueChange={(value) => { setFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="VIEW">Views Only</SelectItem>
                  <SelectItem value="CONVERSION">Conversions Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Advertiser</TableHead>
                    <TableHead>Creator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.reason === 'VIEW' ? 'default' : 'secondary'}
                          className={tx.reason === 'VIEW' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                          {tx.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-[#F47A1F]">
                        {formatCurrency(tx.amountCents)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/campaigns/${tx.campaignId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {tx.campaign.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.campaign.advertiser.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{tx.campaign.advertiser.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.creator.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{tx.creator.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {tx.creator.trustScore !== undefined && (
                              <span className={`text-xs font-medium ${
                                tx.creator.trustScore >= 70 ? 'text-green-600' : 
                                tx.creator.trustScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                Trust: {tx.creator.trustScore}
                              </span>
                            )}
                            {tx.creator.tier && (
                              <Badge variant="outline" className="text-xs py-0 h-5">
                                {tx.creator.tier}
                              </Badge>
                            )}
                            {tx.creator.creatorChannels?.[0] && (
                              <span className="text-xs text-red-600 flex items-center gap-1">
                                ▶ {tx.creator.creatorChannels[0].subscriberCount?.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.transactions.length) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, data.pagination.total)} of {data.pagination.total} transactions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="accounting">
            <Card>
              <CardHeader>
                <CardTitle>Ledger Entries</CardTitle>
                <CardDescription>View all creator payouts and platform fees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <Select 
                    value={ledgerFilter.type} 
                    onValueChange={(value) => setLedgerFilter(f => ({ ...f, type: value, page: 1 }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="VIEW_PAYOUT">View Payout</SelectItem>
                      <SelectItem value="CONVERSION_PAYOUT">Conversion Payout</SelectItem>
                      <SelectItem value="PLATFORM_FEE">Platform Fee</SelectItem>
                      <SelectItem value="REVERSAL">Reversal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ledgerLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#F47A1F]" />
                  </div>
                ) : ledgerData ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                        <div className="text-sm font-medium text-emerald-700">Total Payouts</div>
                        <p className="text-2xl font-bold text-emerald-700">
                          {formatCurrency(ledgerData.summary?.totalAmount || 0)}
                        </p>
                      </div>
                      {ledgerData.summary?.byType?.map((item: any) => (
                        <div key={item.type} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="text-sm font-medium text-gray-600">{item.type.replace('_', ' ')}</div>
                          <p className="text-xl font-bold">{formatCurrency(item.amountCents)}</p>
                          <p className="text-xs text-gray-500">{item.count} entries</p>
                        </div>
                      ))}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerData.entries?.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(entry.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={entry.type === 'REVERSAL' ? 'destructive' : 'default'}>
                                {entry.type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {entry.campaign?.title || entry.campaignId}
                            </TableCell>
                            <TableCell>
                              {entry.creator?.name || entry.creator?.email || entry.creatorId}
                            </TableCell>
                            <TableCell className={entry.amountCents < 0 ? 'text-red-600' : 'text-emerald-600'}>
                              {formatCurrency(entry.amountCents)}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-gray-500">
                              {entry.description || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {ledgerData.entries?.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No ledger entries found
                      </div>
                    )}

                    {ledgerData.pagination && ledgerData.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLedgerFilter(f => ({ ...f, page: f.page - 1 }))}
                          disabled={ledgerFilter.page === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-500">
                          Page {ledgerData.pagination.page} of {ledgerData.pagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLedgerFilter(f => ({ ...f, page: f.page + 1 }))}
                          disabled={ledgerFilter.page === ledgerData.pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Select "Accounting" tab to load ledger data
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
