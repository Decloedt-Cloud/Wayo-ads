'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Zap, 
  Loader2, 
  DollarSign, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Users, 
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';

interface VideoMetadata {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  durationSeconds: number;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  subscriberCount: number;
}

interface DerivedMetrics {
  viewsPerDay: number;
  engagementRate: number;
  subscriberPerformanceRatio: number;
  conversionRate: number;
  conversionValue: number;
}

interface PackagingScores {
  ctrScore: number;
  retentionScore: number;
}

interface ExpectedValueAnalysis {
  estimatedRPV1000: number;
  conversionScore: number;
  scalabilityScore: number;
  revenueDrivers: string[];
  revenueLimiters: string[];
  scalingSuggestions: string[];
}

function ExpectedValueContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [tokensInfo, setTokensInfo] = useState({ tokensCredits: 0, tokensUsed: 0 });
  const [loading, setLoading] = useState(true);
  
  const [videoId, setVideoId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [derivedMetrics, setDerivedMetrics] = useState<DerivedMetrics | null>(null);
  const [packagingScores, setPackagingScores] = useState<PackagingScores | null>(null);
  const [analysis, setAnalysis] = useState<ExpectedValueAnalysis | null>(null);
  const [historyResult, setHistoryResult] = useState<{ metadata: VideoMetadata; derivedMetrics: DerivedMetrics; packagingScores: PackagingScores; analysis: ExpectedValueAnalysis } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchTokensInfo();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('expectedValueHistory');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          setHistoryResult(parsed);
        } catch (e) {
          console.error('Error loading history:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    const vid = searchParams.get('videoId');
    if (vid) {
      setVideoId(vid);
    }
  }, [searchParams]);

  const fetchTokensInfo = async () => {
    try {
      const res = await fetch('/api/creator/ai/tokens');
      const data = await res.json();
      if (res.ok) {
        setTokensInfo({ tokensCredits: data.tokensCredits, tokensUsed: data.tokensUsed });
      }
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!videoId) {
      toast({
        title: 'No video selected',
        description: 'Select a video to analyze economic potential.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setVideoMetadata(null);
    setDerivedMetrics(null);
    setPackagingScores(null);

    try {
      const res = await fetch('/api/creator/ai/expected-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError(`Insufficient tokens: need ${data.required}, have ${data.available}`);
        } else {
          setError(data.error || 'Failed to analyze');
        }
        return;
      }

      setVideoMetadata(data.metadata);
      setDerivedMetrics(data.derivedMetrics);
      setPackagingScores(data.packagingScores);
      setAnalysis(data.analysis);
      
      const newHistory = {
        metadata: data.metadata,
        derivedMetrics: data.derivedMetrics,
        packagingScores: data.packagingScores,
        analysis: data.analysis,
      };
      setHistoryResult(newHistory);
      localStorage.setItem('expectedValueHistory', JSON.stringify(newHistory));
      
      setTokensInfo((prev) => ({
        tokensCredits: data.tokensRemaining,
        tokensUsed: prev.tokensUsed + data.tokensUsed,
      }));

      toast({
        title: 'Analysis complete!',
        description: `Used ${data.tokensUsed} tokens. ${data.tokensRemaining} remaining.`,
      });
    } catch (err) {
      setError('Failed to analyze video');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRPVTier = (rpv: number) => {
    if (rpv >= 30) return { label: 'High Value Traffic', color: 'text-green-600', bg: 'bg-green-100' };
    if (rpv >= 10) return { label: 'Medium Value', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Low Value', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getTranslatedTierLabel = (label: string) => {
    if (label === 'High Value Traffic') return t('expectedValue.highValue');
    if (label === 'Medium Value') return t('expectedValue.mediumValue');
    return t('expectedValue.lowValue');
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t('expectedValue.backToContentSpy')}
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('expectedValue.title')}</h1>
            <p className="text-gray-500">{t('expectedValue.subtitle')}</p>
          </div>
        </div>
        <Card className="min-w-[180px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{tokensInfo.tokensCredits}</span>
              <span className="text-gray-500 text-sm">{t('expectedValue.tokens')}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{tokensInfo.tokensUsed} {t('expectedValue.used')}</p>
          </CardContent>
        </Card>
      </div>

      {!videoId ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-orange-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold">{t('expectedValue.noVideo')}</h2>
            <p className="text-gray-500 max-w-md">
              {t('expectedValue.noVideoDesc')}
            </p>
            <Button onClick={() => router.push('/dashboard/creator/content-spy')}>
              {t('expectedValue.goToContentSpy')}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing || tokensInfo.tokensCredits < 8}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {analyzing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <DollarSign className="h-5 w-5" />
              )}
              {analyzing ? t('expectedValue.analyzing') : t('expectedValue.analyze')}
            </Button>
            
            {tokensInfo.tokensCredits < 8 && (
              <p className="text-xs text-center text-orange-500 mt-2">
                {t('expectedValue.needMoreTokens')}
              </p>
            )}
          </div>

          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {historyResult && !videoMetadata && (
            <Card className="mb-6 border-purple-200 bg-purple-50">
              <CardContent className="pt-4 flex flex-col items-center gap-3">
                <p className="text-purple-700">{t('expectedValue.previousResult')}</p>
                <Button
                  onClick={() => {
                    setVideoMetadata(historyResult.metadata);
                    setDerivedMetrics(historyResult.derivedMetrics);
                    setPackagingScores(historyResult.packagingScores);
                    setAnalysis(historyResult.analysis);
                  }}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('expectedValue.loadLastResult')}
                </Button>
              </CardContent>
            </Card>
          )}

          {videoMetadata && derivedMetrics && packagingScores && analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Economic Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <img 
                      src={videoMetadata.thumbnailUrl} 
                      alt={videoMetadata.title}
                      className="w-full aspect-video object-cover rounded-lg"
                    />
                    
                    <div>
                      <h3 className="font-semibold line-clamp-2">{videoMetadata.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{videoMetadata.channelName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-gray-400" />
                        <span>{formatNumber(videoMetadata.views)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4 text-gray-400" />
                        <span>{formatNumber(videoMetadata.likes)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-gray-400" />
                        <span>{formatNumber(videoMetadata.comments)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{formatNumber(videoMetadata.subscriberCount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{formatDuration(videoMetadata.durationSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(videoMetadata.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-sm mb-2">Performance Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Views/Day</span>
                          <span className="font-medium">{formatNumber(derivedMetrics.viewsPerDay)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Engagement Rate</span>
                          <span className="font-medium">{derivedMetrics.engagementRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sub Performance</span>
                          <span className="font-medium">{derivedMetrics.subscriberPerformanceRatio}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">CTR Score</span>
                          <span className="font-medium">{packagingScores.ctrScore}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Retention Score</span>
                          <span className="font-medium">{packagingScores.retentionScore}/100</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('expectedValue.dashboard')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{t('expectedValue.estimatedRPV')}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('expectedValue.estimatedRPVDesc')}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-4xl font-bold ${getScoreColor(analysis.estimatedRPV1000 * 3)}`}>
                            €{analysis.estimatedRPV1000.toFixed(2)}
                          </p>
                          <p className={`text-sm font-medium mt-1 ${getRPVTier(analysis.estimatedRPV1000).color}`}>
                            {getTranslatedTierLabel(getRPVTier(analysis.estimatedRPV1000).label)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{t('expectedValue.conversionStrength')}</p>
                        <p className={`text-2xl font-bold ${getScoreColor(analysis.conversionScore)}`}>
                          {analysis.conversionScore}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{t('expectedValue.scalabilityScore')}</p>
                        <p className={`text-2xl font-bold ${getScoreColor(analysis.scalabilityScore)}`}>
                          {analysis.scalabilityScore}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-3 text-sm">{t('expectedValue.economicTiers')}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-green-800">€30+ / 1K views</span>
                          <span className="text-green-600 font-medium">{t('expectedValue.highValue')}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                          <span className="text-yellow-800">€10-30 / 1K views</span>
                          <span className="text-yellow-600 font-medium">{t('expectedValue.mediumValue')}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="text-red-800">&lt;€10 / 1K views</span>
                          <span className="text-red-600 font-medium">{t('expectedValue.lowValue')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold text-green-800">{t('expectedValue.revenueDrivers')}</h4>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {analysis.revenueDrivers?.map((d, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-green-600">•</span>
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <h4 className="font-semibold text-red-800">{t('expectedValue.revenueLimiters')}</h4>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {analysis.revenueLimiters?.map((l, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-red-600">•</span>
                              {l}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg md:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-blue-800">Scaling Potential</h4>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {analysis.scalingSuggestions?.map((s, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-blue-600">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ExpectedValuePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ExpectedValueContent />
    </Suspense>
  );
}
