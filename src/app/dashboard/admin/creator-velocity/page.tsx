'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart 
} from 'recharts';
import { 
  Activity, AlertTriangle, ShieldAlert, ShieldCheck, 
  TrendingUp, TrendingDown, ArrowLeft, 
  Zap, Target, Clock, MousePointer, Lock, Unlock,
  BarChart3, Users
} from 'lucide-react';
import { useLanguage } from '@/app/translations';

interface VelocityDataPoint {
  timestamp: string;
  date: string;
  recordedViews: number;
  validatedViews: number;
  billableViews: number;
  fraudScoreAverage: number;
  spikePercent: number;
  anomalyScore: number;
}

interface VelocitySummary {
  currentVelocity: number;
  baselineVelocity: number;
  velocityChangePercent: number;
  spikePercent: number;
  validationRate: number;
  conversionRate: number;
  riskLevel: string;
  activeCampaigns: number;
  totalRecordedViews: number;
  totalValidatedViews: number;
}

interface Alert {
  type: 'red' | 'orange' | 'yellow' | 'none';
  message: string | null;
}

interface TopCreator {
  creatorId: string;
  creatorName: string;
  velocityChangePercent: number;
  trustScore: number | null;
  riskLevel: string;
}

interface CreatorVelocityResponse {
  creatorId: string | null;
  creatorName: string | null;
  trustScore: number | null;
  riskLevel: string;
  isFrozen: boolean;
  data: VelocityDataPoint[];
  summary: VelocitySummary | null;
  alerts: Alert[];
  topCreators?: TopCreator[];
}

export default function CreatorVelocityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CreatorVelocityResponse | null>(null);
  const [period, setPeriod] = useState('7d');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [allCreators, setAllCreators] = useState<Array<{ id: string; name: string }>>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCreators();
    }
  }, [status]);

  useEffect(() => {
    fetchVelocityData();
  }, [selectedCreatorId, period]);

  const fetchCreators = async () => {
    try {
      const res = await fetch('/api/admin/creators');
      if (res.ok) {
        const data = await res.json();
        setAllCreators(data.creators || []);
      }
    } catch (err) {
      console.error('Failed to fetch creators:', err);
    }
  };

  const fetchVelocityData = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/creator-velocity?period=${period}`;
      if (selectedCreatorId) {
        url += `&creatorId=${selectedCreatorId}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch velocity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, value?: string) => {
    if (!selectedCreatorId) return;
    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/creator-risk/${selectedCreatorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value }),
      });
      if (res.ok) {
        fetchVelocityData();
      }
    } catch (err) {
      console.error('Failed to perform action:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-orange-500';
      default: return 'bg-green-500';
    }
  };

  const getTrustBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">No Score</Badge>;
    if (score < 40) return <Badge variant="destructive">Low Trust</Badge>;
    if (score < 70) return <Badge variant="outline">Medium</Badge>;
    return <Badge className="bg-green-500">High Trust</Badge>;
  };

  const chartData = data?.data?.map(d => ({
    ...d,
    date: period === '24h' 
      ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.date,
  })) || [];

  const baselineValue = data?.summary?.baselineVelocity || 0;

  if (status === 'loading' || loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Creator Velocity Monitor
            </h1>
            <p className="text-gray-500">Real-time traffic acceleration and spike detection</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedCreatorId && data?.topCreators && data.topCreators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Top Creators by Velocity Change
            </CardTitle>
            <CardDescription>Creators with highest traffic acceleration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {data.topCreators.map((creator) => (
                <Card 
                  key={creator.creatorId} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setSelectedCreatorId(creator.creatorId);
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="font-medium">{creator.creatorName}</div>
                    <div className={`text-lg font-bold ${Math.abs(creator.velocityChangePercent) > 200 ? 'text-red-600' : Math.abs(creator.velocityChangePercent) > 100 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatPercent(creator.velocityChangePercent)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {getTrustBadge(creator.trustScore)}
                      <span className={`text-xs px-2 py-1 rounded ${getRiskColor(creator.riskLevel)} text-white`}>
                        {creator.riskLevel}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <Select value={selectedCreatorId || 'all'} onValueChange={(v) => {
          setSelectedCreatorId(v === 'all' ? null : v);
        }}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a creator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Creators Overview</SelectItem>
            {allCreators.map((creator) => (
              <SelectItem key={creator.id} value={creator.id}>
                {creator.name || creator.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, idx) => (
            <Alert 
              key={idx} 
              variant={alert.type === 'red' ? 'destructive' : alert.type === 'orange' ? 'default' : 'default'}
              className={alert.type === 'orange' ? 'border-orange-500 bg-orange-50' : ''}
            >
              {alert.type === 'red' && <ShieldAlert className="h-4 w-4" />}
              {alert.type === 'orange' && <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>
                {alert.type === 'red' ? 'Critical Alert' : alert.type === 'orange' ? 'Warning' : 'Notice'}
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {selectedCreatorId && data?.summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Zap className="h-4 w-4" />
                  Current Velocity
                </div>
                <div className="text-2xl font-bold">{formatNumber(data.summary.currentVelocity)}</div>
                <div className="text-xs text-gray-500">views/day</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Baseline (7d)
                </div>
                <div className="text-2xl font-bold">{formatNumber(data.summary.baselineVelocity)}</div>
                <div className="text-xs text-gray-500">avg views/day</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Activity className="h-4 w-4" />
                  Velocity Change
                </div>
                <div className={`text-2xl font-bold ${Math.abs(data.summary.velocityChangePercent) > 200 ? 'text-red-600' : Math.abs(data.summary.velocityChangePercent) > 100 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatPercent(data.summary.velocityChangePercent)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  Validation Rate
                </div>
                <div className="text-2xl font-bold">{(data.summary.validationRate * 100).toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Target className="h-4 w-4" />
                  Conversion Rate
                </div>
                <div className="text-2xl font-bold">{(data.summary.conversionRate * 100).toFixed(2)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Users className="h-4 w-4" />
                  Active Campaigns
                </div>
                <div className="text-2xl font-bold">{data.summary.activeCampaigns}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Traffic Velocity & Quality Analysis</CardTitle>
              <CardDescription>
                {data.creatorName || 'Creator'} - {period === '24h' ? 'Last 24 hours' : period === '7d' ? 'Last 7 days' : 'Last 30 days'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Validated Views</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 border-dashed border-2"></div>
                  <span className="text-sm">Baseline Average</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-300 rounded"></div>
                  <span className="text-sm">Fraud Score</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    interval={period === '24h' ? 3 : 0}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'Fraud Score') return [value.toFixed(1), name];
                      return [formatNumber(value), name];
                    }}
                  />
                  <Legend />
                  <ReferenceLine 
                    yAxisId="left"
                    y={baselineValue} 
                    stroke="#9CA3AF" 
                    strokeDasharray="5 5" 
                    label={{ value: 'Baseline', position: 'right', fill: '#6B7280', fontSize: 12 }}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="fraudScoreAverage" 
                    name="Fraud Score"
                    fill="#FCA5A5" 
                    opacity={0.6}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="validatedViews" 
                    name="Validated Views"
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6, fill: '#EF4444' }}
                  />
                  {chartData.filter(d => d.spikePercent > 50).map((entry, idx) => (
                    <ReferenceLine 
                      key={idx}
                      x={entry.date}
                      stroke="#EF4444"
                      strokeDasharray="3 3"
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Admin Action Panel
              </CardTitle>
              <CardDescription>Manage creator traffic and risk settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant={data.riskLevel === 'HIGH' ? 'destructive' : 'outline'}
                  className="h-auto py-3"
                  onClick={() => handleAction('force_risk', data.riskLevel === 'HIGH' ? 'LOW' : 'HIGH')}
                  disabled={actionLoading !== null}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {data.riskLevel === 'HIGH' ? 'Unfreeze Traffic' : 'Freeze Traffic'}
                </Button>
                <Button 
                  variant={data.riskLevel === 'HIGH' ? 'destructive' : 'outline'}
                  className="h-auto py-3"
                  onClick={() => handleAction('set_risk', data.riskLevel === 'HIGH' ? 'LOW' : 'HIGH')}
                  disabled={actionLoading !== null}
                >
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Force Risk {data.riskLevel === 'HIGH' ? 'LOW' : 'HIGH'}
                </Button>
                <Button 
                  variant="outline"
                  className="h-auto py-3"
                  onClick={() => handleAction('cap_allocation', '5000')}
                  disabled={actionLoading !== null}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Cap Allocation
                </Button>
                <Button 
                  variant="outline"
                  className="h-auto py-3"
                  onClick={() => router.push('/dashboard/creator/analytics')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Full Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Trust Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`text-4xl font-bold ${
                    (data.trustScore || 0) < 40 ? 'text-red-600' : 
                    (data.trustScore || 0) < 70 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {data.trustScore ?? 'N/A'}
                  </div>
                  {getTrustBadge(data.trustScore)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Current Risk Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-white font-medium ${getRiskColor(data.riskLevel)}`}>
                    {data.riskLevel}
                  </span>
                  <span className="text-gray-500">
                    {data.riskLevel === 'HIGH' ? 'High risk - payouts delayed' : 
                     data.riskLevel === 'MEDIUM' ? 'Medium risk - standard delays' : 
                     'Low risk - fast payouts'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!selectedCreatorId && !data?.topCreators && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Select a creator to view their velocity data</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
