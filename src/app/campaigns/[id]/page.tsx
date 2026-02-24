'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoStatusBadge } from '@/components/VideoStatusBadge';
import {
  DollarSign,
  Eye,
  Users,
  Clock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Copy,
  FileText,
  Image,
  Video,
  FileIcon,
  TrendingUp,
  Wallet,
  Lock,
  PiggyBank,
  ExternalLink,
} from 'lucide-react';
import { SiYoutube, SiInstagram, SiTiktok, SiFacebook } from 'react-icons/si';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';
import { AssetAccessModal } from '@/components/campaign/video/AssetAccessModal';
import { VideoSubmissionForm } from '@/components/campaign/video/VideoSubmissionForm';

const PLATFORMS: Record<string, { label: string; icon: typeof SiYoutube; color: string }> = {
  YOUTUBE: { label: 'YouTube', icon: SiYoutube, color: 'text-red-600' },
  INSTAGRAM: { label: 'Instagram', icon: SiInstagram, color: 'text-pink-600' },
  TIKTOK: { label: 'TikTok', icon: SiTiktok, color: 'text-black' },
  FACEBOOK: { label: 'Facebook', icon: SiFacebook, color: 'text-blue-600' },
};

interface MyEarnings {
  campaign: {
    grossEarnings: number;
    platformFees: number;
    netEarnings: number;
    paidViews: number;
  };
  totalBalance: {
    availableCents: number;
    pendingCents: number;
    totalEarnedCents: number;
  };
}

interface FinanceInfo {
  totalBudgetCents: number;
  lockedBudgetCents: number;
  spentBudgetCents: number;
  remainingBudgetCents: number;
  validViews: number;
  cpmCents: number;
  payoutPerViewCents: number;
}

interface TopCreator {
  creatorId: string;
  creatorName: string | null;
  creatorEmail: string;
  creatorImage: string | null;
  validViews: number;
  paidViews: number;
  netEarnings: number;
  grossEarnings: number;
}

interface VideoRequirements {
  minDurationSeconds?: number;
  requiredPlatform?: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM';
  allowMultiplePosts?: boolean;
  dailyViewCap?: number;
  dailyBudget?: number;
}

interface MyVideo {
  id: string;
  platform: string;
  status: string;
  title: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  currentViews: number;
  totalValidatedViews: number;
  submittedAt: Date | string;
  rejectionReason: string | null;
  flagReason: string | null;
  cpmCents: number;
  youtubePrivacyStatus: string | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  type: string;
  landingUrl: string | null;
  assetsUrl: string | null;
  videoRequirements: Record<string, unknown> | null;
  platforms: string;
  totalBudgetCents: number;
  cpmCents: number;
  spentBudgetCents: number;
  status: string;
  notes: string | null;
  attributionWindowDays: number;
  advertiser: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  assets: Array<{
    id: string;
    type: string;
    url: string;
    title: string | null;
  }>;
  applications: Array<{
    id: string;
    status: string;
    message: string | null;
    creator: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      trustScore?: number;
      tier?: string;
      creatorChannels?: Array<{
        channelName: string;
        subscriberCount: number;
        videoCount: number;
        averageViewsPerVideo: number;
        isPublic: boolean;
      }>;
    };
    socialPosts?: Array<{
      id: string;
      platform: string;
      externalPostId: string;
      title: string | null;
      thumbnailUrl: string | null;
      videoUrl: string | null;
      status: string;
      rejectionReason: string | null;
      youtubePrivacyStatus: string | null;
    }>;
  }>;
  trackingLinks: Array<{
    id: string;
    slug: string;
    _count?: { visitEvents: number };
  }>;
  budgetLock?: {
    id: string;
    lockedCents: number;
  } | null;
  finance?: FinanceInfo;
  validViews: number;
  spentBudget: number;
  remainingBudget: number;
  approvedCreators: number;
  topCreators: TopCreator[];
  userApplication?: {
    id: string;
    status: string;
    message: string | null;
  };
  isOwner: boolean;
  isApproved: boolean;
  myEarnings?: MyEarnings;
  myVideos?: MyVideo[];
  advertiserWallet?: {
    availableCents: number;
    pendingCents: number;
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatCurrencyShort(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getAssetIcon(type: string) {
  switch (type) {
    case 'IMAGE':
      return Image;
    case 'VIDEO':
      return Video;
    case 'DOCUMENT':
      return FileText;
    case 'BRAND_GUIDELINES':
      return FileIcon;
    default:
      return FileIcon;
  }
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { language } = useLanguage() as { language: string };
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState('');
  const [platformFeePercent, setPlatformFeePercent] = useState(3);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);

  const campaignId = params.id as string;

  const getLocalizedPath = (path: string) => path;

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      const data = await response.json();
      if (response.ok) {
        setCampaign(data.campaign);
      } else {
        setError(data.error || 'Failed to load campaign');
      }
    } catch (err) {
      setError('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const response = await fetch('/api/platform/fees');
      const data = await response.json();
      if (response.ok && data.platformFeePercentage) {
        setPlatformFeePercent(data.platformFeePercentage);
      }
    } catch (err) {
      console.error('Failed to fetch platform settings');
    }
  };

  useEffect(() => {
    fetchCampaign();
    fetchPlatformSettings();
  }, [campaignId]);

  const handleApply = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: applyMessage }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Application Submitted',
          description: 'Your application has been submitted successfully.',
        });
        fetchCampaign();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to submit application',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/applications/${applicationId}`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Application Approved',
          description: 'The creator has been approved.',
        });
        fetchCampaign();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to approve application',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to approve application',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (applicationId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/applications/${applicationId}/reject`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Application Rejected',
          description: 'The creator has been rejected.',
        });
        fetchCampaign();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to reject application',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to reject application',
        variant: 'destructive',
      });
    }
  };

  const handleApproveContent = async (postId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/posts/${postId}/approve`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Content Approved',
          description: 'The video content has been approved.',
        });
        fetchCampaign();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to approve content',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to approve content',
        variant: 'destructive',
      });
    }
  };

  const handleRejectContent = async (postId: string) => {
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/posts/${postId}/reject`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Content Rejected',
          description: 'The video content has been rejected.',
        });
        fetchCampaign();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to reject content',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to reject content',
        variant: 'destructive',
      });
    }
  };

  const handleCreateLink = async () => {
    setIsCreatingLink(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/links`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Link Created',
          description: 'Your tracking link has been created.',
        });
        fetchCampaign();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create link',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create link',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    toast({ title: 'Copied!', description: 'Link copied to clipboard' });
    setTimeout(() => setCopiedLink(''), 2000);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign Not Found</h2>
          <p className="text-gray-600">{error || 'The campaign you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const videoSpent = campaign.myVideos && campaign.myVideos.length > 0
    ? campaign.myVideos.reduce((sum, v) => sum + (v.totalValidatedViews * v.cpmCents) / 1000, 0)
    : 0;
    
  const finance = campaign.finance || {
    totalBudgetCents: campaign.totalBudgetCents || 0,
    lockedBudgetCents: campaign.budgetLock?.lockedCents || videoSpent,
    spentBudgetCents: campaign.spentBudget || videoSpent,
    remainingBudgetCents: campaign.remainingBudget || Math.max(0, (campaign.totalBudgetCents || 0) - videoSpent),
    validViews: campaign.validViews || (campaign.myVideos?.reduce((sum, v) => sum + v.totalValidatedViews, 0) || 0),
    cpmCents: campaign.cpmCents || 0,
    payoutPerViewCents: Math.floor((campaign.cpmCents || 0) / 1000),
  };

  const budgetUsedPercent = finance.lockedBudgetCents > 0 
    ? (finance.spentBudgetCents / finance.lockedBudgetCents) * 100 
    : 0;
  const userRoles = (session?.user as any)?.roles || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Campaigns
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
              <Badge
                className={
                  campaign.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : campaign.status === 'DRAFT'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }
              >
                {campaign.status}
              </Badge>
              {campaign.type === 'VIDEO' && (
                <Badge variant="outline" className="text-xs border-purple-500 text-purple-700 bg-purple-50">
                  <Video className="h-3 w-3 mr-1" />
                  Video
                </Badge>
              )}
              {campaign.type === 'SHORTS' && (
                <Badge variant="outline" className="text-xs border-purple-500 text-purple-700 bg-purple-50">
                  <Video className="h-3 w-3 mr-1" />
                  Shorts
                </Badge>
              )}
              {campaign.type === 'LINK' && (
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 bg-blue-50">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Link
                </Badge>
              )}
            </div>
            <p className="text-gray-600 max-w-2xl">{campaign.description}</p>
            {/* Platform Badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              {campaign.platforms?.split(',').map((platform) => {
                const info = PLATFORMS[platform];
                const IconComponent = info?.icon;
                return (
                  <Badge key={platform} variant="outline" className="text-xs gap-1">
                    {IconComponent && <IconComponent className={`h-3 w-3 ${info?.color}`} />}
                    {info?.label}
                  </Badge>
                );
              })}
            </div>
          </div>
          {campaign.isOwner && (
            <Link href={`/dashboard/advertiser/campaigns/${campaign.id}/edit`}>
              <Button variant="outline">Edit Campaign</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrencyShort(finance.remainingBudgetCents)}
                    </div>
                    <div className="text-sm text-gray-500">Remaining</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{finance.validViews.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Valid Views</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#F47A1F]" />
                  <div>
                    <div className="text-2xl font-bold">{campaign.approvedCreators}</div>
                    <div className="text-sm text-gray-500">Creators</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#F47A1F]" />
                  <div>
                    <div className="text-2xl font-bold">{formatCurrencyShort(finance.cpmCents / 100)}</div>
                    <div className="text-sm text-gray-500">CPM</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Budget & Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Budget breakdown */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold">{formatCurrencyShort(finance.totalBudgetCents)}</div>
                    <div className="text-xs text-gray-500">Total Budget</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold">{formatCurrencyShort(finance.lockedBudgetCents)}</div>
                    <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                      <Lock className="h-3 w-3" /> Locked
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="text-lg font-semibold text-orange-600">{formatCurrencyShort(finance.spentBudgetCents)}</div>
                    <div className="text-xs text-gray-500">Spent</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <div className="text-lg font-semibold text-emerald-600">{formatCurrencyShort(finance.remainingBudgetCents)}</div>
                    <div className="text-xs text-gray-500">Remaining</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{formatCurrency(finance.spentBudgetCents)} spent</span>
                    <span>{formatCurrency(finance.lockedBudgetCents)} locked</span>
                  </div>
                  <Progress value={budgetUsedPercent} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Earnings Card - for approved creators */}
          {campaign.isApproved && campaign.myEarnings && (
            <Card className="border-emerald-200 bg-emerald-50/0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <PiggyBank className="h-5 w-5" />
                  My Earnings from This Campaign
                </CardTitle>
                <CardDescription>Your earnings breakdown for this campaign</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const ledgerEarnings = campaign.myEarnings.campaign.netEarnings;
                  const videoEarnings = campaign.myVideos && campaign.myVideos.length > 0
                    ? campaign.myVideos.reduce((sum, v) => sum + (v.totalValidatedViews * v.cpmCents) / 1000, 0)
                    : 0;
                  const displayEarnings = ledgerEarnings > 0 ? ledgerEarnings : videoEarnings;
                  const displayViews = campaign.myEarnings.campaign.paidViews > 0 
                    ? campaign.myEarnings.campaign.paidViews 
                    : (campaign.myVideos?.reduce((sum, v) => sum + v.totalValidatedViews, 0) || 0);
                  const platformFeeRate = platformFeePercent / 100;
                  const displayPlatformFees = campaign.myEarnings.campaign.platformFees > 0
                    ? campaign.myEarnings.campaign.platformFees
                    : displayEarnings * platformFeeRate;
                  
                  return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(displayEarnings)}
                    </div>
                    <div className="text-sm text-gray-500">Net Earnings</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">
                      {displayViews.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Validated Views</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-gray-600">
                      {formatCurrency(displayPlatformFees)}
                    </div>
                    <div className="text-sm text-gray-500">Platform Fee ({platformFeePercent}% ex VAT)</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-emerald-600">
                      {formatCurrency(campaign.myEarnings.totalBalance.availableCents)}
                    </div>
                    <div className="text-sm text-gray-500">Available Balance</div>
                  </div>
                </div>
                  );
                })()}
                
                {campaign.myEarnings.totalBalance.pendingCents > 0 && (
                  <div className="mt-4 pt-4 border-t border-emerald-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pending Clearance</span>
                      <span className="font-medium">{formatCurrency(campaign.myEarnings.totalBalance.pendingCents)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tabs for different views */}
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {campaign.isOwner && (
                <TabsTrigger value="applications" className="relative">
                  Applications
                  {campaign.applications.filter((a) => a.status === 'PENDING').length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {campaign.applications.filter((a) => a.status === 'PENDING').length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              {campaign.isApproved && <TabsTrigger value="assets">Assets</TabsTrigger>}
              {campaign.isApproved && <TabsTrigger value="links">Tracking Links</TabsTrigger>}
              {campaign.isOwner && <TabsTrigger value="top-creators">Top Creators</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-500">
                      {campaign.type === 'VIDEO' ? 'Creative Assets' : 'Landing URL'}
                    </Label>
                    {campaign.type === 'VIDEO' && campaign.assetsUrl ? (
                      <a
                        href={campaign.assetsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline max-w-full"
                      >
                        <span className="truncate">{campaign.assetsUrl}</span>
                        <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      </a>
                    ) : campaign.landingUrl ? (
                      <a
                        href={campaign.landingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline max-w-full"
                      >
                        <span className="truncate">{campaign.landingUrl}</span>
                        <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      </a>
                    ) : (
                      <p className="text-gray-400">Not provided</p>
                    )}
                  </div>
                  {campaign.notes && (
                    <div>
                      <Label className="text-gray-500">Instructions for Creators</Label>
                      <p className="text-gray-700 whitespace-pre-wrap mt-1">{campaign.notes}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-500">Advertiser</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={campaign.advertiser.image || ''} />
                        <AvatarFallback>
                          {campaign.advertiser.name?.charAt(0) || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{campaign.advertiser.name || campaign.advertiser.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {campaign.isOwner && (
              <TabsContent value="applications" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <CardTitle>Creator Applications</CardTitle>
                      {campaign.applications.filter((a) => a.status === 'PENDING').length > 0 && (
                        <span className="bg-red-100 text-red-700 text-sm px-2 py-1 rounded-full font-medium">
                          {campaign.applications.filter((a) => a.status === 'PENDING').length} pending
                        </span>
                      )}
                    </div>
                    <CardDescription>
                      Review and approve or reject creator applications
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {campaign.applications.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No applications yet</p>
                    ) : (
                      <div className="space-y-4">
                        {campaign.applications.map((app) => {
                          const youtubeChannel = app.creator.creatorChannels?.[0];
                          return (
                          <div
                            key={app.id}
                            className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 p-4 border rounded-lg"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Avatar>
                                <AvatarImage src={app.creator.image || ''} />
                                <AvatarFallback>
                                  {app.creator.name?.charAt(0) || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">
                                  {app.creator.name || app.creator.email}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                  {app.creator.trustScore !== undefined && (
                                    <span className={`font-medium ${
                                      app.creator.trustScore >= 70 ? 'text-green-600' : 
                                      app.creator.trustScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      Trust: {app.creator.trustScore}
                                    </span>
                                  )}
                                  {app.creator.tier && (
                                    <Badge variant="outline" className="text-xs">
                                      {app.creator.tier}
                                    </Badge>
                                  )}
                                  {youtubeChannel && (
                                    <span className="flex items-center gap-1">
                                      <span className="text-red-600">▶</span>
                                      {youtubeChannel.subscriberCount?.toLocaleString()} subs
                                      {youtubeChannel.channelName && (
                                        <span className="text-gray-600">• {youtubeChannel.channelName}</span>
                                      )}
                                      {youtubeChannel.averageViewsPerVideo !== undefined && (
                                        <span className="text-gray-500">• ~{youtubeChannel.averageViewsPerVideo.toLocaleString()} avg views</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                                {app.message && (
                                  <p className="text-sm text-gray-500 mt-1">{app.message}</p>
                                )}
                                {app.socialPosts && app.socialPosts.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <div className="text-xs font-medium text-gray-700">Submitted Content:</div>
                                    {app.socialPosts.map((post) => (
                                      <div key={post.id} className="flex items-start gap-3 p-2 border rounded-md bg-gray-50 flex-wrap sm:flex-nowrap">
                                        {post.thumbnailUrl && (
                                          <img 
                                            src={post.thumbnailUrl} 
                                            alt={post.title || 'Video thumbnail'}
                                            className="w-24 h-16 object-cover rounded flex-shrink-0"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium truncate">
                                            {post.title || 'Untitled video'}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {post.platform === 'YOUTUBE' && (
                                              <a 
                                                href={post.videoUrl || `https://youtube.com/watch?v=${post.externalPostId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline flex items-center gap-1"
                                              >
                                                <span className="text-red-600">▶</span> Watch on YouTube
                                              </a>
                                            )}
                                          </div>
                                          <div className="mt-1">
                                            <Badge 
                                              variant={post.status === 'ACTIVE' ? 'default' : post.status === 'REJECTED' ? 'destructive' : 'outline'}
                                              className="text-xs"
                                            >
                                              Content: {post.status === 'ACTIVE' ? 'Approved' : post.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                                            </Badge>
                                          </div>
                                          {post.platform === 'YOUTUBE' && (
                                            <div className="mt-1">
                                              <VideoStatusBadge 
                                                status={post.youtubePrivacyStatus as 'public' | 'unlisted' | 'private' | null} 
                                              />
                                              {post.youtubePrivacyStatus === 'private' && (
                                                <p className="text-xs text-red-600 mt-1">
                                                  Video must be Unlisted before approval.
                                                </p>
                                              )}
                                              {post.youtubePrivacyStatus === 'public' && (
                                                <p className="text-xs text-yellow-600 mt-1">
                                                  Already live on YouTube.
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-row sm:flex-col gap-1 flex-shrink-0">
                                          {post.status === 'PENDING' && campaign.type === 'VIDEO' && (
                                            <>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRejectContent(post.id)}
                                                className="h-6 text-xs"
                                              >
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Reject
                                              </Button>
                                              <Button 
                                                size="sm"
                                                onClick={() => handleApproveContent(post.id)}
                                                disabled={post.platform === 'YOUTUBE' && post.youtubePrivacyStatus === 'private'}
                                                className="h-6 text-xs"
                                                title={post.platform === 'YOUTUBE' && post.youtubePrivacyStatus === 'private' ? 'Cannot approve private videos' : undefined}
                                              >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Approve
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {app.status === 'PENDING' ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReject(app.id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                  <Button size="sm" onClick={() => handleApprove(app.id)}>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                </>
                              ) : (
                                <Badge
                                  variant={app.status === 'APPROVED' ? 'default' : 'destructive'}
                                >
                                  {app.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {campaign.isApproved && (
              <TabsContent value="assets" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Assets</CardTitle>
                    <CardDescription>
                      Download and use these assets for your promotions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {campaign.assets.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No assets available</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {campaign.assets.map((asset) => {
                          const Icon = getAssetIcon(asset.type);
                          return (
                            <div
                              key={asset.id}
                              className="border rounded-lg p-4 flex items-start gap-3"
                            >
                              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                                <Icon className="h-5 w-5 text-gray-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {asset.title || asset.type}
                                </div>
                                <a
                                  href={asset.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline truncate block"
                                >
                                  {asset.url}
                                </a>
                              </div>
                              <Button size="sm" variant="ghost" asChild>
                                <a href={asset.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {campaign.isApproved && (
              <TabsContent value="links" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Tracking Links</CardTitle>
                    <CardDescription>
                      Create tracking links to share with your audience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleCreateLink} disabled={isCreatingLink} className="mb-4">
                      {isCreatingLink ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <LinkIcon className="h-4 w-4 mr-2" />
                      )}
                      Create New Link
                    </Button>
                    {campaign.trackingLinks.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No tracking links yet. Create one to start tracking your views.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {campaign.trackingLinks.map((link) => {
                          const fullUrl = `${window.location.origin}/t/${link.slug}`;
                          return (
                            <div
                              key={link.id}
                              className="flex items-center justify-between p-3 border rounded-lg gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                                  /t/{link.slug}
                                </code>
                                <span className="text-sm text-gray-500 truncate">
                                  {link._count?.visitEvents || 0} views
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(fullUrl)}
                              >
                                {copiedLink === fullUrl ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {campaign.isOwner && (
              <TabsContent value="top-creators" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Creators</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {campaign.topCreators.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No creator data yet</p>
                    ) : (
                      <div className="space-y-3">
                        {campaign.topCreators.map((creator, index) => (
                          <div
                            key={creator.creatorId}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={creator.creatorImage || ''} />
                                <AvatarFallback>
                                  {creator.creatorName?.charAt(0) || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {creator.creatorName || creator.creatorEmail}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {creator.validViews.toLocaleString()} valid views · {creator.paidViews.toLocaleString()} paid
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-emerald-600">
                                {formatCurrency(creator.netEarnings)}
                              </div>
                              <div className="text-sm text-gray-500">net earnings</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Card - for creators who haven't applied */}
          {!campaign.isOwner &&
            !campaign.userApplication &&
            status === 'authenticated' &&
            userRoles.includes('CREATOR') && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {campaign.type === 'VIDEO' ? 'Apply for Video Campaign' : 'Apply to Campaign'}
                  </CardTitle>
                  <CardDescription>
                    {campaign.type === 'VIDEO' 
                      ? 'Submit your video content for review'
                      : 'Submit your application to promote this campaign'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="message">Message (optional)</Label>
                    <Textarea
                      id="message"
                      placeholder={campaign.type === 'VIDEO' 
                        ? 'Describe your video content idea...'
                        : 'Tell the advertiser why you\'re a good fit...'}
                      value={applyMessage}
                      onChange={(e) => setApplyMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleApply} disabled={isApplying} className="w-full">
                    {isApplying ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {campaign.type === 'VIDEO' ? 'Submit Video for Review' : 'Submit Application'}
                  </Button>
                </CardContent>
              </Card>
            )}

          {/* Application Status Card */}
          {campaign.userApplication && !campaign.isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Your Application</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={
                    campaign.userApplication.status === 'APPROVED'
                      ? 'default'
                      : campaign.userApplication.status === 'REJECTED'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="mb-2"
                >
                  {campaign.userApplication.status}
                </Badge>
                {campaign.userApplication.status === 'APPROVED' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      {campaign.type === 'VIDEO' 
                        ? campaign.myVideos && campaign.myVideos.length > 0
                          ? 'You have been approved! View your submitted videos below.'
                          : 'You have been approved! View the campaign assets and submit your video.'
                        : 'You have been approved! Go to the Assets and Tracking Links tabs to get started.'}
                    </p>
                    {campaign.type === 'VIDEO' && campaign.status === 'ACTIVE' && (!campaign.myVideos || campaign.myVideos.length === 0) && (
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAssetModal(true)}
                          disabled={!campaign.assetsUrl}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          View Campaign Assets
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => setShowVideoForm(true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Submit Video
                        </Button>
                      </div>
                    )}
                    {campaign.myVideos && campaign.myVideos.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <h4 className="font-medium text-sm">Your Submitted Videos</h4>
                        {campaign.myVideos.map((video) => (
                          <div key={video.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {video.thumbnailUrl && (
                                  <img 
                                    src={video.thumbnailUrl} 
                                    alt={video.title || 'Video thumbnail'}
                                    className="w-16 h-9 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-sm">{video.title || 'Untitled Video'}</p>
                                  <p className="text-xs text-gray-500">{video.platform}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <VideoStatusBadge status={video.status as any} />
                                {video.platform === 'YOUTUBE' && video.youtubePrivacyStatus && (
                                  <div className="flex items-center gap-1">
                                    <VideoStatusBadge status={video.youtubePrivacyStatus as 'public' | 'unlisted' | 'private' | null} />
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`/api/creator/submissions/${video.id}/refresh-youtube-status`, {
                                            method: 'POST'
                                          });
                                          if (res.ok) {
                                            fetchCampaign();
                                          }
                                        } catch (err) {
                                          console.error('Failed to refresh status');
                                        }
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Refresh YouTube status"
                                    >
                                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Views: {video.currentViews.toLocaleString()}</span>
                              <span>Validated: {video.totalValidatedViews.toLocaleString()}</span>
                              <span>Earnings: {formatCurrency((video.totalValidatedViews * video.cpmCents) / 1000)}</span>
                            </div>
                            {video.status === 'REJECTED' && video.rejectionReason && (
                              <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                Rejection reason: {video.rejectionReason}
                              </p>
                            )}
                            {video.status === 'FLAGGED' && video.flagReason && (
                              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                Flag reason: {video.flagReason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {campaign.userApplication.status === 'PENDING' && (
                  <p className="text-sm text-gray-600">
                    Your application is being reviewed by the advertiser.
                  </p>
                )}
                {campaign.userApplication.status === 'REJECTED' && (
                  <p className="text-sm text-gray-600">
                    Unfortunately, your application was not accepted.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Login Prompt */}
          {status !== 'authenticated' && (
            <Card>
              <CardHeader>
                <CardTitle>Want to Apply?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Sign in to apply for this campaign and start earning.
                </p>
                <Link href={getLocalizedPath('/auth/signin')}>
                  <Button className="w-full">Sign In</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Payout Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payout Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">CPM Rate</span>
                <span className="font-medium">{formatCurrency(finance.cpmCents / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Per View Payout</span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(finance.payoutPerViewCents / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Platform Fee</span>
                <span className="font-medium">{platformFeePercent}% ex VAT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Attribution Window</span>
                <span className="font-medium">{campaign.attributionWindowDays || 30} days</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {campaign.type === 'VIDEO' && campaign.userApplication?.status === 'APPROVED' && (
          <>
            <AssetAccessModal
              isOpen={showAssetModal}
              onClose={() => setShowAssetModal(false)}
              campaignTitle={campaign.title}
              assetsUrl={campaign.assetsUrl}
              description={campaign.description}
              notes={campaign.notes}
              videoRequirements={campaign.videoRequirements as VideoRequirements | null}
              cpmCents={campaign.cpmCents}
              campaignStatus={campaign.status}
            />
            {showVideoForm && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Submit Video</CardTitle>
                  <CardDescription>
                    Submit your video for review. Once approved, view tracking and payouts will begin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VideoSubmissionForm
                    campaignId={campaign.id}
                    videoRequirements={campaign.videoRequirements as VideoRequirements | null}
                    onSuccess={() => {
                      setShowVideoForm(false);
                      fetchCampaign();
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
