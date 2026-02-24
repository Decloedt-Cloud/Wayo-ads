'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Target,
  RefreshCw,
  BarChart3,
  Wallet,
  Activity
} from 'lucide-react';
import { formatCurrency as formatCurrencyUtil } from '@/lib/currency';

interface CampaignFinancialSummary {
  campaignId: string;
  campaignTitle: string;
  campaignStatus: string;
  
  totalBudget: number;
  lockedBudget: number;
  spentBillable: number;
  paidToCreators: number;
  pendingPayouts: number;
  reservedAmount: number;
  underReviewAmount: number;
  remainingBudget: number;
  
  effectiveCPM: number;
  effectiveCPA: number | null;
  validationRate: number;
  fraudBlockRate: number;
  
  confidenceScore: number;
  confidenceBadge: 'HEALTHY' | 'MONITOR' | 'RISK';
  
  totalViews: number;
  validatedViews: number;
  billableViews: number;
  conversions: number;
  
  creatorRiskBreakdown: {
    low: number;
    medium: number;
    high: number;
    flagged: number;
  };
  
  dailySpend: Array<{
    date: string;
    spend: number;
    views: number;
    conversions: number;
  }>;
}

export default function CampaignFinancialHealthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [financials, setFinancials] = useState<CampaignFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (campaignId && session) {
      fetchFinancials();
    }
  }, [campaignId, session]);

  const fetchFinancials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/advertiser/campaigns/${campaignId}/financial-summary`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch financials');
      }
      
      const data = await response.json();
      setFinancials(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => formatCurrencyUtil(cents, 'EUR');

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const getConfidenceColor = (badge: string) => {
    switch (badge) {
      case 'HEALTHY': return 'bg-green-100 text-green-800 border-green-200';
      case 'MONITOR': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'RISK': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceIcon = (badge: string) => {
    switch (badge) {
      case 'HEALTHY': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'MONITOR': return <Clock className="h-4 w-4 text-amber-600" />;
      case 'RISK': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!financials) return null;

  const spentPercent = financials.totalBudget > 0 
    ? (financials.spentBillable / financials.totalBudget) * 100 
    : 0;
  const pendingPercent = financials.totalBudget > 0 
    ? (financials.pendingPayouts / financials.totalBudget) * 100 
    : 0;
  const reservePercent = financials.totalBudget > 0 
    ? (financials.reservedAmount / financials.totalBudget) * 100 
    : 0;
  const remainingPercent = 100 - spentPercent - pendingPercent - reservePercent;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Financial Health</h1>
          <p className="text-muted-foreground mt-1">{financials.campaignTitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className={getConfidenceColor(financials.confidenceBadge)}>
            {getConfidenceIcon(financials.confidenceBadge)}
            <span className="ml-1">{financials.confidenceBadge}</span>
            <span className="ml-2 font-semibold">{financials.confidenceScore}/100</span>
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchFinancials}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{formatCurrency(financials.totalBudget)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spent (Billable)</p>
                <p className="text-2xl font-bold">{formatCurrency(financials.spentBillable)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{formatPercent(spentPercent)} of budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(financials.pendingPayouts)}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{formatPercent(pendingPercent)} of budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reserved</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(financials.reservedAmount)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{formatPercent(reservePercent)} of budget</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Budget Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Remaining: {formatCurrency(financials.remainingBudget)}</span>
              <span>{formatPercent(remainingPercent)}</span>
            </div>
            <Progress 
              value={spentPercent + pendingPercent + reservePercent} 
              className="h-3"
            />
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span>Spent ({formatPercent(spentPercent)})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span>Pending ({formatPercent(pendingPercent)})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Reserved ({formatPercent(reservePercent)})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 rounded"></div>
                <span>Remaining ({formatPercent(remainingPercent)})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Validation Rate</span>
              <div className="flex items-center gap-2">
                <Progress value={financials.validationRate} className="w-24 h-2" />
                <span className="font-medium">{formatPercent(financials.validationRate)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Fraud Block Rate</span>
              <div className="flex items-center gap-2">
                <Progress value={financials.fraudBlockRate} className="w-24 h-2" />
                <span className="font-medium text-red-600">{formatPercent(financials.fraudBlockRate)}</span>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-lg font-semibold">{financials.totalViews.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billable Views</p>
                  <p className="text-lg font-semibold text-emerald-600">{financials.billableViews.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Effective CPM</p>
                  <p className="text-lg font-semibold">{formatCurrency(financials.effectiveCPM)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-lg font-semibold">{financials.conversions.toLocaleString()}</p>
                </div>
                {financials.effectiveCPA && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Effective CPA</p>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(financials.effectiveCPA)}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Creator Risk Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Low Risk</span>
              </div>
              <span className="font-semibold">{financials.creatorRiskBreakdown.low}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm">Medium Risk</span>
              </div>
              <span className="font-semibold">{financials.creatorRiskBreakdown.medium}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">High Risk</span>
              </div>
              <span className="font-semibold">{financials.creatorRiskBreakdown.high}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Flagged</span>
              </div>
              <span className="font-semibold text-red-600">{financials.creatorRiskBreakdown.flagged}</span>
            </div>
            
            {financials.confidenceBadge === 'RISK' && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-800">Action Required</p>
                    <p className="text-red-700">Consider pausing this campaign or restricting to LOW risk creators.</p>
                  </div>
                </div>
              </div>
            )}
            
            {financials.confidenceBadge === 'MONITOR' && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Monitor</p>
                    <p className="text-amber-700">Keep an eye on flagged creators and consider reviewing your CPM settings.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            7-Day Spend Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end gap-2">
            {financials.dailySpend.map((day, index) => {
              const maxSpend = Math.max(...financials.dailySpend.map(d => d.spend), 1);
              const height = day.spend > 0 ? (day.spend / maxSpend) * 100 : 0;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                    style={{ height: `${height}%`, minHeight: day.spend > 0 ? '4px' : '0' }}
                    title={formatCurrency(day.spend)}
                  ></div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-muted-foreground">Total 7-day spend:</span>
            <span className="font-semibold">
              {formatCurrency(financials.dailySpend.reduce((sum, d) => sum + d.spend, 0))}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
