'use client';

import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  DollarSign,
  Eye,
  Users,
  MoreVertical,
  AlertCircle,
  Loader2,
  ExternalLink,
  Wallet,
  FileText,
  ArrowUpRight,
  PiggyBank,
  Lock,
  Building,
  Gauge,
  Link as LinkIcon,
  Video,
  Clock,
} from 'lucide-react';
import { SiYoutube, SiInstagram, SiTiktok, SiFacebook } from 'react-icons/si';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency as formatCurrencyUtil } from '@/lib/currency';
import { useLanguage } from '@/app/translations';
const GeoTargeting = lazy(() => import('@/components/campaign/GeoTargetingSection').then(mod => ({ default: mod.GeoTargeting })));

const PLATFORMS = [
  { id: 'YOUTUBE', label: 'YouTube', icon: SiYoutube, color: 'text-red-600' },
  { id: 'INSTAGRAM', label: 'Instagram', icon: SiInstagram, color: 'text-pink-600' },
  { id: 'TIKTOK', label: 'TikTok', icon: SiTiktok, color: 'text-black' },
  { id: 'FACEBOOK', label: 'Facebook', icon: SiFacebook, color: 'text-blue-600' },
] as const;

type PlatformType = typeof PLATFORMS[number]['id'];

interface CampaignFormData {
  type: 'LINK' | 'VIDEO' | 'SHORTS';
  title: string;
  description: string;
  landingUrl: string;
  assetsUrl: string;
  totalBudget: string;
  cpm: string;
  notes: string;
  platforms: PlatformType[];
  isGeoTargeted: boolean;
  targetingType: 'city' | 'country';
  targetCity: string | null;
  targetCountryCode: string | null;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetRadiusKm: number;
  dynamicCpmEnabled: boolean;
  dynamicCpmMode: 'CONSERVATIVE' | 'AUTO' | 'AGGRESSIVE';
  minCpm: string;
  maxCpm: string;
  pacingEnabled: boolean;
  pacingMode: 'EVEN' | 'ACCELERATED' | 'CONSERVATIVE';
  dailyBudget: string;
  videoRequiredPlatform: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | null;
  videoMinDuration: string;
  videoDailyViewCap: string;
  videoAllowMultiplePosts: boolean;
  shortsPlatform: 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | null;
  shortsMaxDurationSeconds: string;
  shortsRequireVertical: boolean;
  shortsRequireHashtag: string;
  shortsRequireLinkInBio: boolean;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  type: string;
  landingUrl: string | null;
  assetsUrl: string | null;
  platforms: string;
  totalBudgetCents: number;
  cpmCents: number;
  spentBudgetCents: number;
  status: string;
  validViews: number;
  remainingBudget: number;
  lockedBudget: number;
  approvedCreators: number;
  pendingVideos: number;
  pacingEnabled: boolean;
  pacingMode: string | null;
  dailyBudgetCents: number | null;
  deliveryProgressPercent: number;
  isOverDelivering: boolean;
  isUnderDelivering: boolean;
  _count?: {
    applications: number;
  };
}

interface WalletInfo {
  availableCents: number;
  pendingCents: number;
  currency?: string;
}

function formatCurrency(cents: number, currency: string = 'EUR'): string {
  return formatCurrencyUtil(cents, currency);
}

export default function AdvertiserDashboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getLocalizedPath = (path: string) => path;

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

  // Form state
  const [formData, setFormData] = useState<CampaignFormData>({
    type: 'LINK',
    title: '',
    description: '',
    landingUrl: '',
    assetsUrl: '',
    totalBudget: '',
    cpm: '',
    notes: '',
    platforms: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK'],
    isGeoTargeted: false,
    targetingType: 'city',
    targetCity: null,
    targetCountryCode: null,
    targetLatitude: null,
    targetLongitude: null,
    targetRadiusKm: 50,
    dynamicCpmEnabled: false,
    dynamicCpmMode: 'AUTO',
    minCpm: '',
    maxCpm: '',
    pacingEnabled: false,
    pacingMode: 'EVEN',
    dailyBudget: '',
    videoRequiredPlatform: null,
    videoMinDuration: '',
    videoDailyViewCap: '',
    videoAllowMultiplePosts: false,
    shortsPlatform: null,
    shortsMaxDurationSeconds: '20',
    shortsRequireVertical: true,
    shortsRequireHashtag: '',
    shortsRequireLinkInBio: false,
  });

  const userRoles = (session?.user as any)?.roles || [];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch campaigns and wallet in parallel
        const [campaignsRes, walletRes] = await Promise.all([
          fetch('/api/campaigns?advertiserOnly=true'),
          fetch('/api/wallet'),
        ]);

        if (campaignsRes.ok) {
          const data = await campaignsRes.json();
          setCampaigns(data.campaigns);
        }

        if (walletRes.ok) {
          const data = await walletRes.json();
          setWallet(data.wallet);
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

  const budgetCents = formData.totalBudget ? Math.round(parseFloat(formData.totalBudget) * 100) : 0;
  const hasInsufficientFunds = !!(wallet && budgetCents > 0 && wallet.availableCents < budgetCents);
  const shortfall = hasInsufficientFunds ? budgetCents - (wallet?.availableCents || 0) : 0;

  const handleCreateCampaign = async () => {
    if (!formData.title || !formData.totalBudget || !formData.cpm) {
      toast({
        title: t('advertiser.missingFieldsToast'),
        description: t('advertiser.fillRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'LINK' && !formData.landingUrl) {
      toast({
        title: 'Landing URL Required',
        description: 'Please enter a landing URL for link campaigns',
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'VIDEO' && !formData.assetsUrl) {
      toast({
        title: 'Assets URL Required',
        description: 'Please enter a Google Drive or OneDrive link for video campaigns',
        variant: 'destructive',
      });
      return;
    }

    if (formData.platforms.length === 0) {
      toast({
        title: t('advertiser.platformsToast'),
        description: t('advertiser.selectPlatform'),
        variant: 'destructive',
      });
      return;
    }

    if (hasInsufficientFunds) {
      toast({
        title: t('advertiser.insufficientFundsToast'),
        description: `${t('advertiser.needMoreFunds')} ${formatCurrency(shortfall)} ${t('advertiser.moreInWallet')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const videoRequirements = formData.type === 'VIDEO' ? {
        minDurationSeconds: formData.videoMinDuration ? parseInt(formData.videoMinDuration) : undefined,
        requiredPlatform: formData.videoRequiredPlatform || undefined,
        allowMultiplePosts: formData.videoAllowMultiplePosts,
        dailyViewCap: formData.videoDailyViewCap ? parseInt(formData.videoDailyViewCap) : undefined,
      } : undefined;

      const shortsMaxDuration = formData.shortsMaxDurationSeconds ? parseInt(formData.shortsMaxDurationSeconds) : 20;

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          description: formData.description || undefined,
          landingUrl: formData.type === 'LINK' ? formData.landingUrl : null,
          assetsUrl: formData.type === 'VIDEO' || formData.type === 'SHORTS' ? formData.assetsUrl : undefined,
          platforms: formData.platforms.join(','),
          totalBudgetCents: budgetCents,
          cpmCents: Math.round(parseFloat(formData.cpm) * 100),
          notes: formData.notes || undefined,
          status: 'DRAFT',
          isGeoTargeted: formData.isGeoTargeted,
          targetCity: formData.isGeoTargeted ? formData.targetCity : null,
          targetCountryCode: formData.isGeoTargeted ? formData.targetCountryCode : null,
          targetLatitude: formData.isGeoTargeted ? formData.targetLatitude : null,
          targetLongitude: formData.isGeoTargeted ? formData.targetLongitude : null,
          targetRadiusKm: formData.isGeoTargeted ? formData.targetRadiusKm : null,
          videoRequirements,
          shortsPlatform: formData.type === 'SHORTS' ? formData.shortsPlatform : null,
          shortsMaxDurationSeconds: formData.type === 'SHORTS' ? shortsMaxDuration : null,
          shortsRequireVertical: formData.type === 'SHORTS' ? formData.shortsRequireVertical : null,
          shortsRequireHashtag: formData.type === 'SHORTS' && formData.shortsRequireHashtag ? formData.shortsRequireHashtag : null,
          shortsRequireLinkInBio: formData.type === 'SHORTS' ? formData.shortsRequireLinkInBio : null,
          dynamicCpmEnabled: formData.dynamicCpmEnabled,
          dynamicCpmMode: formData.dynamicCpmEnabled ? formData.dynamicCpmMode : null,
          minCpmCents: formData.dynamicCpmEnabled && formData.minCpm ? Math.round(parseFloat(formData.minCpm) * 100) : null,
          maxCpmCents: formData.dynamicCpmEnabled && formData.maxCpm ? Math.round(parseFloat(formData.maxCpm) * 100) : null,
          pacingEnabled: formData.pacingEnabled,
          pacingMode: formData.pacingEnabled ? formData.pacingMode : null,
          dailyBudgetCents: formData.pacingEnabled && formData.dailyBudget ? Math.round(parseFloat(formData.dailyBudget) * 100) : null,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: t('advertiser.campaignCreated'),
          description: t('advertiser.campaignSuccess'),
        });
        setCampaigns([data.campaign, ...campaigns]);
        setDialogOpen(false);
        setFormData({
          type: 'LINK',
          title: '',
          description: '',
          landingUrl: '',
          assetsUrl: '',
          totalBudget: '',
          cpm: '',
          notes: '',
          platforms: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK'],
          isGeoTargeted: false,
          targetingType: 'city',
          targetCity: null,
          targetCountryCode: null,
          targetLatitude: null,
          targetLongitude: null,
          targetRadiusKm: 50,
          dynamicCpmEnabled: false,
          dynamicCpmMode: 'AUTO',
          minCpm: '',
          maxCpm: '',
          pacingEnabled: false,
          pacingMode: 'EVEN',
          dailyBudget: '',
          videoRequiredPlatform: null,
          videoMinDuration: '',
          videoDailyViewCap: '',
          videoAllowMultiplePosts: false,
          shortsPlatform: null,
          shortsMaxDurationSeconds: '20',
          shortsRequireVertical: true,
          shortsRequireHashtag: '',
          shortsRequireLinkInBio: false,
        });
        if (data.walletBalance !== undefined) {
          setWallet(prev => prev ? { ...prev, availableCents: data.walletBalance } : prev);
        }
      } else {
        toast({
          title: t('common.error'),
          description: data.error || t('common.error'),
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: t('common.error'),
        description: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: t('advertiser.statusUpdated'),
          description: `${t('advertiser.statusChanged')} ${newStatus}`,
        });
        setCampaigns(
          campaigns.map((c) => (c.id === campaignId ? { ...c, status: newStatus } : c))
        );
        // Update wallet balance if returned
        if (data.walletBalance !== undefined) {
          setWallet(prev => prev ? { ...prev, availableCents: data.walletBalance } : prev);
        }
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update status',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!userRoles.includes('ADVERTISER')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('advertiser.accessRequired')}</h2>
          <p className="text-gray-600 mb-4">
            {t('advertiser.advertiserRole')}
          </p>
        </div>
      </div>
    );
  }

  const totalBudget = campaigns.reduce((sum, c) => sum + c.totalBudgetCents, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spentBudgetCents, 0);
  const totalLocked = campaigns.reduce((sum, c) => sum + (c.lockedBudget || 0), 0);
  const totalViews = campaigns.reduce((sum, c) => sum + (c.validViews || 0), 0);
  const totalCreators = campaigns.reduce((sum, c) => sum + (c.approvedCreators || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('advertiser.title')}</h1>
            <p className="text-gray-600">{t('advertiser.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={getLocalizedPath('/dashboard/advertiser/business')}>
            <Button variant="outline" className="gap-2">
              <Building className="h-4 w-4" />
              {t('advertiser.businessInfo')}
            </Button>
          </Link>
          <Link href={getLocalizedPath('/dashboard/advertiser/wallet')}>
            <Button variant="outline" className="gap-2">
              <Wallet className="h-4 w-4" />
              {t('advertiser.wallet')}
            </Button>
          </Link>
          <Link href={getLocalizedPath('/dashboard/advertiser/invoices')}>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('advertiser.invoices')}
            </Button>
          </Link>
          <Link href={getLocalizedPath('/dashboard/advertiser/pacing')}>
            <Button variant="outline" className="gap-2">
              <Gauge className="h-4 w-4" />
              Pacing
            </Button>
          </Link>
          <Link href={getLocalizedPath('/dashboard/advertiser/video-reviews')}>
            <Button variant="outline" className="gap-2">
              <Video className="h-4 w-4" />
              Video Reviews
            </Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('advertiser.newCampaign')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('advertiser.createCampaign')}</DialogTitle>
                <DialogDescription>
                  {t('advertiser.campaignDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {/* Wallet Balance Info */}
                {wallet && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium">{t('advertiser.availableBalance')}</span>
                      </div>
                      <span className="text-xl font-bold text-emerald-600">
                        {formatCurrency(wallet.availableCents)}
                      </span>
                    </div>
                    {wallet.pendingCents > 0 && (
                      <div className="text-sm text-gray-500 mt-1">
                        + {formatCurrency(wallet.pendingCents)} {t('advertiser.pending')}
                      </div>
                    )}
                  </div>
                )}

                {/* Insufficient Funds Warning */}
                {hasInsufficientFunds && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Insufficient Funds</AlertTitle>
                    <AlertDescription>
                      You need {formatCurrency(shortfall)} more.{' '}
                      <Link href={getLocalizedPath('/dashboard/advertiser/wallet')} className="underline font-medium">
                        Deposit funds →
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="title">{t('advertiser.campaignTitle')} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Summer Product Launch"
                  />
                </div>

                {/* Campaign Type Selector */}
                <div>
                  <Label>Campaign Type *</Label>
                  <div className="flex gap-4 mt-2">
                    <div
                      className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.type === 'LINK' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData((prev) => ({ 
                        ...prev, 
                        type: 'LINK',
                        landingUrl: prev.landingUrl,
                        assetsUrl: '',
                      }))}
                    >
                      <div className="flex items-center gap-2">
                        <LinkIcon className={`h-5 w-5 ${formData.type === 'LINK' ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className={`font-medium ${formData.type === 'LINK' ? 'text-blue-700' : 'text-gray-700'}`}>
                          Link Campaign
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Pays creators for validated tracked link traffic
                      </p>
                    </div>
                    <div
                      className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.type === 'VIDEO' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData((prev) => ({ 
                        ...prev, 
                        type: 'VIDEO',
                        landingUrl: '',
                      }))}
                    >
                      <div className="flex items-center gap-2">
                        <Video className={`h-5 w-5 ${formData.type === 'VIDEO' ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`font-medium ${formData.type === 'VIDEO' ? 'text-red-700' : 'text-gray-700'}`}>
                          Video Campaign
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Pays creators for validated public video views
                      </p>
                    </div>
                    <div
                      className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.type === 'SHORTS' 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData((prev) => ({ 
                        ...prev, 
                        type: 'SHORTS',
                        landingUrl: '',
                      }))}
                    >
                      <div className="flex items-center gap-2">
                        <Video className={`h-5 w-5 ${formData.type === 'SHORTS' ? 'text-purple-500' : 'text-gray-400'}`} />
                        <span className={`font-medium ${formData.type === 'SHORTS' ? 'text-purple-700' : 'text-gray-700'}`}>
                          Shorts Campaign
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Short vertical video optimized for short-form platforms. Default: 20 seconds.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">{t('advertiser.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your campaign..."
                    rows={3}
                  />
                </div>
                {formData.type === 'LINK' && (
                <div>
                  <Label htmlFor="landingUrl">{t('advertiser.landingUrl')} *</Label>
                  <Input
                    id="landingUrl"
                    type="url"
                    value={formData.landingUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, landingUrl: e.target.value }))}
                    onBlur={(e) => {
                      let url = e.target.value.trim();
                      if (url && !url.match(/^https?:\/\//i)) {
                        url = 'https://' + url;
                        setFormData((prev) => ({ ...prev, landingUrl: url }));
                      }
                    }}
                    placeholder="your-landing-page.com"
                  />
                </div>
                )}
                {formData.type === 'VIDEO' && (
                <div>
                  <Label htmlFor="assetsUrl">Creative Assets URL *</Label>
                  <Input
                    id="assetsUrl"
                    type="url"
                    value={formData.assetsUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, assetsUrl: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Google Drive, OneDrive, or SharePoint link containing creative assets
                  </p>
                </div>
                )}
                <div>
                  <Label>{t('advertiser.targetPlatforms')} *</Label>
                  <p className="text-sm text-gray-500 mb-3">{t('advertiser.selectPlatforms')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PLATFORMS.map((platform) => {
                      const IconComponent = platform.icon;
                      return (
                        <div key={platform.id} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            const newPlatforms = formData.platforms.includes(platform.id)
                              ? formData.platforms.filter((p) => p !== platform.id)
                              : [...formData.platforms, platform.id];
                            setFormData((prev) => ({ ...prev, platforms: newPlatforms }));
                          }}
                        >
                          <Checkbox
                            id={platform.id}
                            checked={formData.platforms.includes(platform.id)}
                            onCheckedChange={() => {
                              const newPlatforms = formData.platforms.includes(platform.id)
                                ? formData.platforms.filter((p) => p !== platform.id)
                                : [...formData.platforms, platform.id];
                              setFormData((prev) => ({ ...prev, platforms: newPlatforms }));
                            }}
                          />
                          <label htmlFor={platform.id} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                            <IconComponent className={`h-4 w-4 ${platform.color}`} />
                            {platform.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {formData.type === 'VIDEO' && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-4">
                  <h4 className="font-medium text-red-800">Video Campaign Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Required Platform</Label>
                      <Select
                        value={formData.videoRequiredPlatform || ''}
                        onValueChange={(value) => setFormData((prev) => ({ 
                          ...prev, 
                          videoRequiredPlatform: value as 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YOUTUBE">YouTube</SelectItem>
                          <SelectItem value="TIKTOK">TikTok</SelectItem>
                          <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="videoMinDuration">Min Duration (seconds)</Label>
                      <Input
                        id="videoMinDuration"
                        type="number"
                        value={formData.videoMinDuration}
                        onChange={(e) => setFormData((prev) => ({ ...prev, videoMinDuration: e.target.value }))}
                        placeholder="30"
                        min="5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="videoDailyViewCap">Daily View Cap</Label>
                      <Input
                        id="videoDailyViewCap"
                        type="number"
                        value={formData.videoDailyViewCap}
                        onChange={(e) => setFormData((prev) => ({ ...prev, videoDailyViewCap: e.target.value }))}
                        placeholder="10000"
                        min="100"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="videoAllowMultiplePosts"
                        checked={formData.videoAllowMultiplePosts}
                        onCheckedChange={(checked) => setFormData((prev) => ({ 
                          ...prev, 
                          videoAllowMultiplePosts: checked as boolean 
                        }))}
                      />
                      <label htmlFor="videoAllowMultiplePosts" className="text-sm font-medium">
                        Allow Multiple Posts
                      </label>
                    </div>
                  </div>
                </div>
                )}
                {formData.type === 'SHORTS' && (
                <div>
                  <Label htmlFor="assetsUrl">Creative Assets URL *</Label>
                  <Input
                    id="assetsUrl"
                    type="url"
                    value={formData.assetsUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, assetsUrl: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Google Drive, OneDrive, or SharePoint link containing creative assets
                  </p>
                </div>
                )}
                {formData.type === 'SHORTS' && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-4">
                  <h4 className="font-medium text-purple-800">Shorts Campaign Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Platform *</Label>
                      <Select
                        value={formData.shortsPlatform || ''}
                        onValueChange={(value) => setFormData((prev) => ({ 
                          ...prev, 
                          shortsPlatform: value as 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK'
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YOUTUBE">YouTube</SelectItem>
                          <SelectItem value="TIKTOK">TikTok</SelectItem>
                          <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="shortsMaxDuration">Max Duration (seconds)</Label>
                      <Input
                        id="shortsMaxDuration"
                        type="number"
                        value={formData.shortsMaxDurationSeconds}
                        onChange={(e) => setFormData((prev) => ({ ...prev, shortsMaxDurationSeconds: e.target.value }))}
                        placeholder="20"
                        min="5"
                        max="60"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: 20, Max: 60</p>
                    </div>
                    <div>
                      <Label htmlFor="shortsRequireHashtag">Required Hashtag</Label>
                      <Input
                        id="shortsRequireHashtag"
                        value={formData.shortsRequireHashtag}
                        onChange={(e) => setFormData((prev) => ({ ...prev, shortsRequireHashtag: e.target.value }))}
                        placeholder="#MyBrand"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shortsRequireVertical"
                        checked={formData.shortsRequireVertical}
                        onCheckedChange={(checked) => setFormData((prev) => ({ 
                          ...prev, 
                          shortsRequireVertical: checked as boolean 
                        }))}
                      />
                      <label htmlFor="shortsRequireVertical" className="text-sm font-medium">
                        Require Vertical Video
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shortsRequireLinkInBio"
                        checked={formData.shortsRequireLinkInBio}
                        onCheckedChange={(checked) => setFormData((prev) => ({ 
                          ...prev, 
                          shortsRequireLinkInBio: checked as boolean 
                        }))}
                      />
                      <label htmlFor="shortsRequireLinkInBio" className="text-sm font-medium">
                        Require Link in Bio
                      </label>
                    </div>
                  </div>
                </div>
                )}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <Label htmlFor="totalBudget">{t('advertiser.totalBudget')} (€)*</Label>
                    <Input
                      id="totalBudget"
                      type="number"
                      value={formData.totalBudget}
                      onChange={(e) => setFormData((prev) => ({ ...prev, totalBudget: e.target.value }))}
                      placeholder="10000"
                      className={hasInsufficientFunds ? 'border-red-300' : ''}
                    />
                    {budgetCents > 0 && (
                      <p className={`text-xs mt-1 ${hasInsufficientFunds ? 'text-red-600' : 'text-gray-500'}`}>
                        Required: {formatCurrency(budgetCents)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="cpm">{t('advertiser.cpmRate')} (€)*</Label>
                    <Input
                      id="cpm"
                      type="number"
                      value={formData.cpm}
                      onChange={(e) => setFormData((prev) => ({ ...prev, cpm: e.target.value }))}
                      placeholder="15"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.cpm && !isNaN(parseFloat(formData.cpm)) ? `${((parseFloat(formData.cpm) * 100) / 1000).toFixed(2)}€ per view` : '€ per 1000 views'}
                    </p>
                  </div>
                </div>

                {/* Dynamic CPM Section */}
                <div className="border rounded-lg p-6 space-y-4 bg-slate-50 my-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Dynamic CPM</Label>
                      <p className="text-xs text-gray-500">Adjust CPM based on creator trust score</p>
                    </div>
                    <Switch
                      checked={formData.dynamicCpmEnabled}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, dynamicCpmEnabled: checked }))}
                    />
                  </div>

                  {formData.dynamicCpmEnabled && (
                    <div className="space-y-6 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Adjustment Mode</Label>
                        <Select
                          value={formData.dynamicCpmMode}
                          onValueChange={(value: 'CONSERVATIVE' | 'AUTO' | 'AGGRESSIVE') => 
                            setFormData((prev) => ({ ...prev, dynamicCpmMode: value }))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONSERVATIVE">
                              <div>
                                <div className="font-medium">Conservative</div>
                                <div className="text-xs text-gray-500">Small adjustments (±10%)</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="AUTO">
                              <div>
                                <div className="font-medium">Auto</div>
                                <div className="text-xs text-gray-500">Balanced adjustments (±25%)</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="AGGRESSIVE">
                              <div>
                                <div className="font-medium">Aggressive</div>
                                <div className="text-xs text-gray-500">Large adjustments (±50%)</div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="minCpm">Min CPM (€)</Label>
                          <Input
                            id="minCpm"
                            type="number"
                            value={formData.minCpm}
                            onChange={(e) => setFormData((prev) => ({ ...prev, minCpm: e.target.value }))}
                            placeholder={formData.cpm ? (parseFloat(formData.cpm) * 0.5).toFixed(2) : '7.5'}
                          />
                          <p className="text-xs text-gray-500 mt-1">Lower bound for adjustments</p>
                        </div>
                        <div>
                          <Label htmlFor="maxCpm">Max CPM (€)</Label>
                          <Input
                            id="maxCpm"
                            type="number"
                            value={formData.maxCpm}
                            onChange={(e) => setFormData((prev) => ({ ...prev, maxCpm: e.target.value }))}
                            placeholder={formData.cpm ? (parseFloat(formData.cpm) * 1.5).toFixed(2) : '22.5'}
                          />
                          <p className="text-xs text-gray-500 mt-1">Upper bound for adjustments</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pacing Section */}
                <div className="border rounded-lg p-6 space-y-4 bg-slate-50 my-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Campaign Pacing</Label>
                      <p className="text-xs text-gray-500">Control budget burn rate across campaign duration</p>
                    </div>
                    <Switch
                      checked={formData.pacingEnabled}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, pacingEnabled: checked }))}
                    />
                  </div>

                  {formData.pacingEnabled && (
                    <div className="space-y-6 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Pacing Mode</Label>
                        <Select
                          value={formData.pacingMode}
                          onValueChange={(value: 'EVEN' | 'ACCELERATED' | 'CONSERVATIVE') => 
                            setFormData((prev) => ({ ...prev, pacingMode: value }))
                          }
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EVEN">
                              <div>
                                <div className="font-medium">Even</div>
                                <div className="text-xs text-gray-500">Smooth spend across duration</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="ACCELERATED">
                              <div>
                                <div className="font-medium">Accelerated</div>
                                <div className="text-xs text-gray-500">Faster burn if performance high</div>
                              </div>
                            </SelectItem>
                            <SelectItem value="CONSERVATIVE">
                              <div>
                                <div className="font-medium">Conservative</div>
                                <div className="text-xs text-gray-500">Strict daily cap, no over-delivery</div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="dailyBudget">Daily Budget (€)</Label>
                        <Input
                          id="dailyBudget"
                          type="number"
                          value={formData.dailyBudget}
                          onChange={(e) => setFormData((prev) => ({ ...prev, dailyBudget: e.target.value }))}
                          placeholder={formData.totalBudget ? (parseFloat(formData.totalBudget) / 30).toFixed(2) : '33.33'}
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum daily spend limit</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">{t('advertiser.instructions')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any specific instructions for creators..."
                    rows={3}
                  />
                </div>

                {/* Geographic Targeting Section */}
                <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading...</div>}>
                  <GeoTargeting
                    isGeoTargeted={formData.isGeoTargeted}
                    onIsGeoTargetedChange={(value) => setFormData((prev) => ({ ...prev, isGeoTargeted: value }))}
                    targetingType={formData.targetingType}
                    onTargetingTypeChange={(value) => setFormData((prev) => ({ ...prev, targetingType: value }))}
                    targetCity={formData.targetCity}
                    onTargetCityChange={(value) => setFormData((prev) => ({ ...prev, targetCity: value }))}
                    targetCountryCode={formData.targetCountryCode}
                    onTargetCountryCodeChange={(value) => setFormData((prev) => ({ ...prev, targetCountryCode: value }))}
                    targetLatitude={formData.targetLatitude ?? undefined}
                    onTargetLatitudeChange={(value) => setFormData((prev) => ({ ...prev, targetLatitude: value }))}
                    targetLongitude={formData.targetLongitude ?? undefined}
                    onTargetLongitudeChange={(value) => setFormData((prev) => ({ ...prev, targetLongitude: value }))}
                    targetRadiusKm={formData.targetRadiusKm}
                    onTargetRadiusKmChange={(value) => setFormData((prev) => ({ ...prev, targetRadiusKm: value }))}
                  />
                </Suspense>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('advertiser.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateCampaign}
                    disabled={isCreating || hasInsufficientFunds}
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {t('advertiser.createAsDraft')}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(wallet?.availableCents || 0)}
                </div>
                <div className="text-sm text-gray-500">Available</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalLocked)}</div>
                <div className="text-sm text-gray-500">Locked</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                <div className="text-sm text-gray-500">Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
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
                <div className="text-2xl font-bold">{totalCreators}</div>
                <div className="text-sm text-gray-500">Creators</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('advertiser.yourCampaigns')}</CardTitle>
          <CardDescription>
            {t('advertiser.manageCampaigns')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">{t('advertiser.startFirstCampaign')}</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('advertiser.createFirstCampaign')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const lockedBudget = campaign.lockedBudget || 0;
                const spentBudget = campaign.spentBudgetCents || 0;
                const budgetPercent = lockedBudget > 0 ? (spentBudget / lockedBudget) * 100 : 0;
                return (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="font-semibold text-lg hover:underline"
                        >
                          {campaign.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              campaign.status === 'ACTIVE'
                                ? 'default'
                                : campaign.status === 'DRAFT'
                                ? 'secondary'
                                : campaign.status === 'CANCELLED'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {campaign.status}
                          </Badge>
                          {campaign.type === 'VIDEO' && (
                            <>
                              <Badge variant="outline" className="text-xs border-red-500 text-red-600">
                                <Video className="h-3 w-3 mr-1" />
                                Video
                              </Badge>
                            </>
                          )}
                          {campaign.type === 'SHORTS' && (
                            <>
                              <Badge variant="outline" className="text-xs border-purple-500 text-purple-600">
                                <Video className="h-3 w-3 mr-1" />
                                Shorts
                              </Badge>
                            </>
                          )}
                          {campaign.type === 'LINK' && (
                            <>
                              <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                                <LinkIcon className="h-3 w-3 mr-1" />
                                Link
                              </Badge>
                            </>
                          )}
                          {campaign.pendingVideos > 0 && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600 bg-yellow-50">
                              <Clock className="h-3 w-3 mr-1" />
                              {campaign.pendingVideos} Pending
                            </Badge>
                          )}
                          {campaign.pacingEnabled && campaign.status === 'ACTIVE' && (
                            <>
                              {campaign.isOverDelivering && (
                                <Badge variant="destructive" className="text-xs">
                                  Over-delivering
                                </Badge>
                              )}
                              {campaign.isUnderDelivering && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                  Under-delivering
                                </Badge>
                              )}
                              {!campaign.isOverDelivering && !campaign.isUnderDelivering && (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                  On Track
                                </Badge>
                              )}
                            </>
                          )}
                          <span className="text-sm text-gray-500">
                            {campaign.approvedCreators || 0} {t('advertiser.creators')} • {(campaign.validViews || 0)} {t('advertiser.validViews')}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {campaign.platforms?.split(',').map((platform: string) => {
                            const platformInfo = PLATFORMS.find(p => p.id === platform);
                            const IconComponent = platformInfo?.icon;
                            return (
                              <Badge key={platform} variant="outline" className="text-xs gap-1">
                                {IconComponent && <IconComponent className={`h-3 w-3 ${platformInfo?.color}`} />}
                                {platformInfo?.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => updateCampaignStatus(campaign.id, 'ACTIVE')}
                          >
                            {t('advertiser.activate')}
                          </Button>
                        )}
                        {campaign.status === 'ACTIVE' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCampaignStatus(campaign.id, 'PAUSED')}
                            >
                              {t('advertiser.pause')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Are you sure? This will release any remaining budget.')) {
                                  updateCampaignStatus(campaign.id, 'CANCELLED');
                                }
                              }}
                            >
                              {t('advertiser.cancel')}
                            </Button>
                          </>
                        )}
                        {campaign.status === 'PAUSED' && (
                          <Button
                            size="sm"
                            onClick={() => updateCampaignStatus(campaign.id, 'ACTIVE')}
                          >
                            {t('advertiser.resume')}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/dashboard/advertiser/campaigns/${campaign.id}/edit`}>
                            <FileText className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/campaigns/${campaign.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          {t('advertiser.budgetLocked')} {formatCurrency(lockedBudget)})
                        </span>
                        <span>
                          {formatCurrency(spentBudget)} /{' '}
                          {formatCurrency(campaign.totalBudgetCents)}
                        </span>
                      </div>
                      <Progress value={budgetPercent} className="h-2" />
                    </div>
                    <div className="flex gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500">{t('advertiser.cpm')}:</span>{' '}
                        <span className="font-medium">{formatCurrency(campaign.cpmCents / 100)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('advertiser.applications')}:</span>{' '}
                        <span className="font-medium">{campaign._count?.applications || 0}</span>
                      </div>
                      {campaign.status === 'ACTIVE' && lockedBudget > spentBudget && (
                        <div>
                          <span className="text-gray-500">{t('advertiser.remaining')}:</span>{' '}
                          <span className="font-medium text-emerald-600">
                            {formatCurrency(lockedBudget - spentBudget)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
