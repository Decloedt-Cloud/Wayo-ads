'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ExternalLink,
  DollarSign,
  Eye,
  Users,
  Clock,
  AlertCircle,
  ArrowRight,
  MapPin,
  Globe,
  Video,
  Link as LinkIcon,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { SiYoutube, SiInstagram, SiTiktok, SiFacebook } from 'react-icons/si';
import { useLanguage } from '../translations';

const PLATFORMS: Record<string, { label: string; icon: typeof SiYoutube; color: string }> = {
  YOUTUBE: { label: 'YouTube', icon: SiYoutube, color: 'text-red-600' },
  INSTAGRAM: { label: 'Instagram', icon: SiInstagram, color: 'text-pink-600' },
  TIKTOK: { label: 'TikTok', icon: SiTiktok, color: 'text-black' },
  FACEBOOK: { label: 'Facebook', icon: SiFacebook, color: 'text-blue-600' },
};

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  type: string;
  landingUrl: string;
  platforms: string;
  totalBudgetCents: number;
  cpmCents: number;
  spentBudgetCents: number;
  status: string;
  isGeoTargeted: boolean;
  targetCity: string | null;
  targetCountryCode: string | null;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetRadiusKm: number | null;
  advertiser: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  applications?: Array<{
    id: string;
    status: string;
    message: string | null;
  }>;
  _count?: {
    applications: number;
  };
  validViews: number;
  remainingBudget: number;
  approvedCreators: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function CampaignsPage() {
  const { data: session, status: authStatus } = useSession();
  const { t, language } = useLanguage();

  const getLocalizedPath = (path: string) => path;
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/campaigns');
        const data = await response.json();
        if (response.ok) {
          setCampaigns(data.campaigns);
        } else {
          setError(data.error || 'Failed to load campaigns');
        }
      } catch (err) {
        setError('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-full max-w-2xl" />
        </div>
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('campaigns.errorLoading')}</h2>
          <p className="text-gray-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4 bg-[#F47A1F] hover:bg-[#F06423]">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {t('campaigns.pageTitle')}
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl">
          {t('campaigns.pageSubtitle')}
        </p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>{t('campaigns.howItWorks1')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>{t('campaigns.howItWorks2')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>{t('campaigns.howItWorks3')}</span>
          </div>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span className="font-medium">{t('campaigns.legendBudget').split('→')[0]}</span>
              <span>→</span>
              <span className="text-gray-500">{t('campaigns.legendBudget').split('→')[1]}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">CPM</span>
              <span>→</span>
              <span className="text-gray-500">{t('campaigns.legendCPM').split('→')[1]}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">{t('campaigns.legendViews').split('→')[0]}</span>
              <span>→</span>
              <span className="text-gray-500">{t('campaigns.legendViews').split('→')[1]}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">{t('campaigns.legendCreators').split('→')[0]}</span>
              <span>→</span>
              <span className="text-gray-500">{t('campaigns.legendCreators').split('→')[1]}</span>
            </span>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('campaigns.noCampaigns')}</h2>
          <p className="text-gray-600 mb-4">
            {t('campaigns.noCampaignsDesc')}
          </p>
          {authStatus !== 'authenticated' && (
            <Link href={getLocalizedPath('/auth/signin')}>
              <Button className="bg-[#F47A1F] hover:bg-[#F06423]">Sign In to Get Started</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => {
            const userApplication = campaign.applications?.[0];
            const budgetUsedPercent = (campaign.spentBudgetCents / campaign.totalBudgetCents) * 100;

            return (
              <Card key={campaign.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{campaign.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        {campaign.type === 'VIDEO' && (
                          <Badge variant="outline" className="text-xs border-purple-500 text-purple-700 bg-purple-50">
                            <Video className="h-3 w-3 mr-1" />
                            Video
                            <span className="ml-1 text-purple-400">|</span>
                            <span className="ml-1 text-purple-600 font-normal">{t('campaigns.typeVideo')}</span>
                          </Badge>
                        )}
                        {campaign.type === 'SHORTS' && (
                          <Badge variant="outline" className="text-xs border-purple-500 text-purple-700 bg-purple-50">
                            <Video className="h-3 w-3 mr-1" />
                            Shorts
                            <span className="ml-1 text-purple-400">|</span>
                            <span className="ml-1 text-purple-600 font-normal">{t('campaigns.typeShorts')}</span>
                          </Badge>
                        )}
                        {campaign.type === 'LINK' && (
                          <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 bg-blue-50">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Link
                            <span className="ml-1 text-blue-400">|</span>
                            <span className="ml-1 text-blue-600 font-normal">{t('campaigns.typeLink')}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-lg font-bold text-green-600">
                        €{(campaign.cpmCents / 100).toFixed(2)} / 1K
                      </span>
                      <span className="text-xs text-gray-500">
                        {campaign.validViews > 0 ? campaign.validViews.toLocaleString() : '0'} views
                      </span>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {campaign.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-1">
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

                    {campaign.isGeoTargeted && campaign.targetCity && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 gap-1">
                          <MapPin className="h-3 w-3" />
                          {campaign.targetCity}
                          {campaign.targetRadiusKm && ` + ${campaign.targetRadiusKm}km`}
                        </Badge>
                      </div>
                    )}
                    {!campaign.isGeoTargeted && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Globe className="h-3 w-3" />
                          Global
                        </Badge>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 font-medium">{t('campaigns.remainingBudget')}</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(campaign.remainingBudget)}
                        </span>
                      </div>
                      <Progress value={100 - budgetUsedPercent} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{t('campaigns.budgetSpent')}: {formatCurrency(campaign.spentBudgetCents)}</span>
                        <span>{t('campaigns.budgetTotal')}: {formatCurrency(campaign.totalBudgetCents)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(campaign.cpmCents / 100)}
                        </div>
                        <div className="text-xs text-gray-500" title={t('campaigns.earningsPer1000')}>
                          CPM
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {campaign.validViews > 0 
                            ? campaign.validViews.toLocaleString() 
                            : t('campaigns.noViewsYet')}
                        </div>
                        <div className="text-xs text-gray-500">{t('campaigns.validatedViews')}</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {campaign.approvedCreators > 0 
                            ? campaign.approvedCreators 
                            : t('campaigns.noCreatorsYet')}
                        </div>
                        <div className="text-xs text-gray-500">{t('campaigns.activeCreators')}</div>
                      </div>
                    </div>

                    {userApplication && (
                      <div className="pt-2 border-t">
                        <Badge
                          variant={
                            userApplication.status === 'APPROVED'
                              ? 'default'
                              : userApplication.status === 'REJECTED'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {userApplication.status === 'APPROVED'
                            ? '✓ Approved'
                            : userApplication.status === 'REJECTED'
                            ? '✕ Rejected'
                            : '⏳ Pending'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex flex-col gap-2">
                  <Link href={`/campaigns/${campaign.id}`} className="w-full group">
                    <Button className="w-full gap-2 bg-[#F47A1F] hover:bg-[#F06423]">
                      View Details
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-400 text-center">
                    {t('campaigns.applyGuidance')}
                  </p>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
