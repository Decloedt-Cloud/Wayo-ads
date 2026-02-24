'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChannelCard, ChannelCardSkeleton } from '@/components/cards/ChannelCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DollarSign,
  Eye,
  Users,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon,
  Copy,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Youtube,
  BarChart3,
  Video,
  FileText,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Application {
  id: string;
  status: string;
  message: string | null;
  campaign: {
    id: string;
    title: string;
    status: string;
    type: string;
    cpmCents: number;
    advertiser: {
      name: string | null;
      email: string;
    };
  };
  socialPosts: Array<{ id: string }>;
}

interface TrackingLink {
  id: string;
  slug: string;
  campaign: {
    id: string;
    title: string;
    status: string;
  };
  _count?: {
    visitEvents: number;
  };
}

interface CreatorStats {
  totalViews: number;
  totalEarnings: number;
  activeCampaigns: number;
  availableBalance?: number;
  dailyStats?: {
    dailyEarnings: { day: string; value: number }[];
    dailyViews: { day: string; value: number }[];
  };
}

interface TrustScoreData {
  trustScore: number;
  rawTrustScore?: number;
  tier: string;
  qualityMultiplier: number;
  rawQualityMultiplier?: number;
  verificationLevel?: string;
  isVerified?: boolean;
  potentialCpmIncrease?: string | null;
}

interface YouTubeChannel {
  id: string;
  channelName: string;
  channelHandle: string | null;
  channelAvatarUrl: string | null;
  videoCount: number;
  subscriberCount: number;
  lifetimeViews: number;
  averageViewsPerVideo: number;
  isPublic: boolean;
  platform: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function CreatorDashboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [applications, setApplications] = useState<Application[]>([]);
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState('');
  const [trustScore, setTrustScore] = useState<TrustScoreData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [performanceTab, setPerformanceTab] = useState<'earnings' | 'views' | 'quality'>('earnings');
  const [pipelineTab, setPipelineTab] = useState<'approved' | 'pending' | 'needs_video' | 'rejected'>('approved');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getLocalizedPath = (path: string) => path;

  const userRoles = session?.user?.roles || [];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch approved campaigns with tracking links
        const campaignsRes = await fetch('/api/campaigns?creatorOnly=true');
        const campaignsData = await campaignsRes.json();

        // Fetch all applications
        const appsRes = await fetch('/api/creator/applications');
        const appsData = await appsRes.json();

        // Fetch all tracking links
        const linksRes = await fetch('/api/creator/links');
        const linksData = await linksRes.json();

        // Fetch stats
        const statsRes = await fetch('/api/creator/stats');
        const statsData = await statsRes.json();

        // Fetch trust score
        const trustRes = await fetch('/api/creator/trust-score');
        if (trustRes.ok) {
          const trustData = await trustRes.json();
          setTrustScore(trustData);
        }

        // Fetch token balance
        const tokenRes = await fetch('/api/tokens/balance');
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          setTokenBalance(tokenData.balance?.balanceTokens || 0);
        }

        // Combine links from both campaigns API and dedicated links endpoint
        const allLinks: TrackingLink[] = [];
        
        // First add links from campaigns
        if (campaignsRes.ok) {
          campaignsData.campaigns.forEach((c: any) => {
            if (c.trackingLinks) {
              c.trackingLinks.forEach((link: any) => {
                allLinks.push({
                  ...link,
                  campaign: {
                    id: c.id,
                    title: c.title,
                    status: c.status,
                  },
                });
              });
            }
          });
        }
        
        // Then add links from the dedicated links endpoint
        if (linksRes.ok && linksData.links) {
          linksData.links.forEach((link: any) => {
            // Avoid duplicates
            if (!allLinks.find(l => l.id === link.id)) {
              allLinks.push(link);
            }
          });
        }
        
        setLinks(allLinks);

        if (appsRes.ok) {
          setApplications(appsData.applications || []);
        }

        if (statsRes.ok) {
          setStats(statsData);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);

        // Fetch profile image from API
        try {
          const profileRes = await fetch('/api/user/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setImagePreview(profileData.user.image || null);
          }
        } catch (profileErr) {
          console.warn('Failed to fetch profile image:', profileErr);
        }
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    toast({ title: 'Copied!', description: 'Link copied to clipboard' });
    setTimeout(() => setCopiedLink(''), 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 2MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      
      // Compress image
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedData = canvas.toDataURL('image/jpeg', 0.75);
        setImageData(compressedData);
        
        // Auto-save
        await saveProfileImage(compressedData);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const saveProfileImage = async (image: string) => {
    setImageUploading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Profile update response:', data);
        const newImage = data.user.image && data.user.image !== '' ? data.user.image : null;
        setImagePreview(newImage);
        setImageData(null);
        toast({ title: 'Success', description: 'Profile picture updated' });
        
        // Update session
        try {
          await update({ image: newImage });
        } catch (updateErr) {
          console.warn('Session update failed:', updateErr);
        }

        window.dispatchEvent(new Event('profile-updated'));
      } else {
        const errorData = await res.json();
        console.error('Profile update error:', errorData);
        toast({ title: 'Error', description: errorData.error || 'Failed to update profile picture', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update profile picture', variant: 'destructive' });
    } finally {
      setImageUploading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8 pb-24">
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('creator.creatorAccess')}</h2>
          <p className="text-gray-600 mb-4">
            {t('creator.creatorRole')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('creator.title')}</h1>
        <p className="text-gray-600">{t('creator.trackEarnings')}</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Link href={getLocalizedPath('/dashboard/creator/video-research')}>
          <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold">
            <Sparkles className="h-4 w-4" />
            Trends
          </Button>
        </Link>
        <Link href={getLocalizedPath('/dashboard/creator/content-spy')}>
          <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold">
            <Sparkles className="h-4 w-4" />
            Content Spy
          </Button>
        </Link>
        <Link href={getLocalizedPath('/dashboard/creator/connect-youtube')}>
          <Button variant="outline" className="gap-2">
            <Youtube className="h-4 w-4" />
            Connect YouTube
          </Button>
        </Link>
        <Link href={getLocalizedPath('/dashboard/creator/business')}>
          <Button variant="outline" className="gap-2">
            <Building className="h-4 w-4" />
            Business Info
          </Button>
        </Link>
        <Link href={getLocalizedPath('/dashboard/creator/wallet')}>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            Wallet
          </Button>
        </Link>
        <Link href={getLocalizedPath('/dashboard/creator/invoices')}>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </Button>
        </Link>
        <Link href={getLocalizedPath('/dashboard/creator/analytics')}>
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-violet-600" />
              <div className="text-sm font-medium text-violet-700">Trust Score</div>
              {trustScore?.isVerified !== undefined && (
                <Badge 
                  variant={trustScore.isVerified ? "default" : "outline"}
                  className={`ml-auto text-xs ${
                    trustScore.isVerified 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {trustScore.isVerified ? '✓ Verified' : 'Unverified'}
                </Badge>
              )}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-violet-800">
                  {trustScore?.trustScore ?? '--'}
                </div>
                <div className="text-xs text-violet-600 mt-1">
                  out of {trustScore?.isVerified ? '100' : '70 (capped)'}
                  {trustScore?.rawTrustScore && trustScore.rawTrustScore !== trustScore.trustScore && (
                    <span className="ml-1 text-amber-600">(raw: {trustScore.rawTrustScore})</span>
                  )}
                </div>
              </div>
              <Badge 
                className={`${
                  trustScore?.tier === 'GOLD' ? 'bg-yellow-500' : 
                  trustScore?.tier === 'SILVER' ? 'bg-gray-400' : 
                  'bg-orange-700'
                } text-white`}
              >
                {trustScore?.tier || 'NEW'}
              </Badge>
            </div>
            {trustScore && (
              <div className="mt-3 pt-3 border-t border-violet-200">
                <div className="text-xs text-violet-600">
                  Quality Multiplier: <span className="font-bold text-violet-800">×{trustScore.qualityMultiplier.toFixed(2)}</span>
                  {trustScore.rawQualityMultiplier && trustScore.rawQualityMultiplier !== trustScore.qualityMultiplier && (
                    <span className="ml-1 text-amber-600">(was ×{trustScore.rawQualityMultiplier.toFixed(2)})</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(stats?.availableBalance || 0)}
                  </div>
                  <div className="text-sm text-emerald-600">Available Balance</div>
                </div>
              </div>
              <Link href={getLocalizedPath('/dashboard/creator/wallet')}>
                <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-200">
                  Withdraw <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.totalEarnings || 0)}
                </div>
                <div className="text-sm text-gray-500">{t('creator.totalEarnings')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {(stats?.totalViews || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">{t('creator.totalViews')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-2xl font-bold">{stats?.activeCampaigns || 0}</div>
                <div className="text-sm text-gray-500">Active Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-primary transition-colors ${tokenBalance !== null && tokenBalance < 20 ? 'border-yellow-300 bg-yellow-50' : ''}`}>
          <Link href={getLocalizedPath('/dashboard/creator/tokens')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className={`h-5 w-5 ${tokenBalance !== null && tokenBalance < 20 ? 'text-yellow-600' : 'text-yellow-500'}`} />
                <div>
                  <div className="text-2xl font-bold">{tokenBalance ?? '--'}</div>
                  <div className="text-sm text-gray-500">AI Tokens</div>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Performance (Last 7 Days) */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Performance (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setPerformanceTab('earnings')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                performanceTab === 'earnings'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Earnings
            </button>
            <button
              onClick={() => setPerformanceTab('views')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                performanceTab === 'views'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Views
            </button>
            <button
              onClick={() => setPerformanceTab('quality')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                performanceTab === 'quality'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Quality
            </button>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3">
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.dailyStats ? (performanceTab === 'earnings' ? stats.dailyStats.dailyEarnings : stats.dailyStats.dailyViews) : [
                    { day: 'Mon', value: 0 },
                    { day: 'Tue', value: 0 },
                    { day: 'Wed', value: 0 },
                    { day: 'Thu', value: 0 },
                    { day: 'Fri', value: 0 },
                    { day: 'Sat', value: 0 },
                    { day: 'Sun', value: 0 },
                  ]}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={performanceTab === 'earnings' ? '#f97316' : performanceTab === 'views' ? '#9333ea' : '#eab308'}
                      strokeWidth={2}
                      dot={{ fill: performanceTab === 'earnings' ? '#f97316' : performanceTab === 'views' ? '#9333ea' : '#eab308', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <div className={`p-2 rounded-md ${performanceTab === 'earnings' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">This Week</div>
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {performanceTab === 'earnings' 
                    ? `€${(stats?.dailyStats?.dailyEarnings.reduce((sum, d) => sum + d.value, 0) || 0).toFixed(2)}`
                    : (stats?.dailyStats?.dailyViews.reduce((sum, d) => sum + d.value, 0) || 0).toLocaleString()}
                </div>
                <div className="text-xs text-green-600">
                  {performanceTab === 'earnings' ? 'Total' : 'Views'}
                </div>
              </div>
              <div className={`p-2 rounded-md ${performanceTab === 'views' ? 'bg-purple-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">Valid Views</div>
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                </div>
                <div className="text-lg font-bold text-gray-900">{stats?.totalViews?.toLocaleString() || 0}</div>
                <div className="text-xs text-green-600">All time</div>
              </div>
              <div className={`p-2 rounded-md ${performanceTab === 'quality' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">Quality</div>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                </div>
                <div className="text-lg font-bold text-gray-900">×{trustScore?.qualityMultiplier?.toFixed(2) || '1.00'}</div>
                <div className="text-xs text-gray-500">Multiplier</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Pipeline & Active Promotion Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Campaign Pipeline */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Campaign Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { key: 'approved', label: 'Approved', count: applications.filter(a => a.status === 'APPROVED').length, color: 'bg-green-500' },
                { key: 'pending', label: 'Pending', count: applications.filter(a => a.status === 'PENDING').length, color: 'bg-orange-500' },
                { key: 'needs_video', label: 'Needs Video', count: applications.filter(a => a.status === 'APPROVED' && a.campaign.type === 'VIDEO' && a.socialPosts.length === 0).length, color: 'bg-purple-500' },
                { key: 'rejected', label: 'Rejected', count: applications.filter(a => a.status === 'REJECTED').length, color: 'bg-red-500' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPipelineTab(tab.key as any)}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                    pipelineTab === tab.key
                      ? `${tab.color} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                  <span className={pipelineTab === tab.key ? 'text-white/80' : 'text-gray-500'}>
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>
            {applications.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No applications yet</p>
                <Link href={getLocalizedPath('/campaigns')}>
                  <Button size="sm" className="mt-2">Find Campaigns</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const filtered = applications.filter(a => {
                    if (pipelineTab === 'approved') return a.status === 'APPROVED';
                    if (pipelineTab === 'pending') return a.status === 'PENDING';
                    if (pipelineTab === 'needs_video') return a.status === 'APPROVED' && a.campaign.type === 'VIDEO' && a.socialPosts.length === 0;
                    if (pipelineTab === 'rejected') return a.status === 'REJECTED';
                    return false;
                  });
                  return filtered.length > 0 ? (
                    filtered.map((app) => (
                      <div key={app.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <Link href={`/campaigns/${app.campaign.id}`} className="font-medium text-sm hover:underline block truncate">
                              {app.campaign.title}
                            </Link>
                            <div className="text-xs text-gray-500 mt-1">
                              €{(app.campaign.cpmCents / 100).toFixed(2)} CPM
                            </div>
                          </div>
                          <Badge
                            variant={app.status === 'APPROVED' ? 'default' : app.status === 'REJECTED' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {app.status}
                          </Badge>
                        </div>
                        {pipelineTab === 'needs_video' && (
                          <Link href={`/campaigns/${app.campaign.id}`}>
                            <Button size="sm" className="mt-2 bg-purple-600 hover:bg-purple-700 w-full">
                              Submit Video
                            </Button>
                          </Link>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No {pipelineTab.replace('_', ' ')} applications</p>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Promotion Links */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Active Promotion Links</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div>
                <div className="text-2xl font-bold">{links.length}</div>
                <div className="text-xs text-gray-500">active links</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  +245
                </div>
                <div className="text-xs text-gray-500">views this week</div>
              </div>
            </div>
            {links.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No links yet</p>
                <Link href={getLocalizedPath('/campaigns')}>
                  <Button size="sm" className="mt-2">Find Campaigns</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {links.map((link) => {
                  const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/t/${link.slug}`;
                  return (
                    <div key={link.id} className="flex items-center justify-between p-2 border rounded-lg bg-gray-50">
                      <div className="flex-1 min-w-0 mr-2">
                        <Link href={`/campaigns/${link.campaign.id}`} className="font-medium text-xs hover:underline block truncate">
                          {link.campaign.title}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {link._count?.visitEvents || 0} views
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(fullUrl)}
                        className="h-6 w-6 p-0"
                      >
                        {copiedLink === fullUrl ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
