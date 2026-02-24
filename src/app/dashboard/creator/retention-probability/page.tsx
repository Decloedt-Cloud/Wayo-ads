'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Zap, 
  Loader2, 
  Clock, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Users, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
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
  tags: string[];
  description: string;
}

interface DerivedMetrics {
  viewsPerDay: number;
  engagementRate: number;
  commentToViewRatio: number;
  likeToViewRatio: number;
  subscriberPerformanceRatio: number;
  titleLength: number;
  durationClassification: 'Short-form' | 'Long-form';
}

interface RetentionAnalysis {
  openingScore: number;
  pacingScore: number;
  curiosityScore: number;
  payoffScore: number;
  authorityScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  improvements: string[];
}

function RetentionProbabilityContent() {
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
  const [analysis, setAnalysis] = useState<RetentionAnalysis | null>(null);
  const [historyResult, setHistoryResult] = useState<{ metadata: VideoMetadata; derivedMetrics: DerivedMetrics; analysis: RetentionAnalysis } | null>(null);
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
      const savedHistory = localStorage.getItem('retentionProbabilityHistory');
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
        description: 'Select a video to analyze retention strength.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setVideoMetadata(null);
    setDerivedMetrics(null);

    try {
      const res = await fetch('/api/creator/ai/retention-audit', {
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
      setAnalysis(data.analysis);
      
      const newHistory = {
        metadata: data.metadata,
        derivedMetrics: data.derivedMetrics,
        analysis: data.analysis,
      };
      setHistoryResult(newHistory);
      localStorage.setItem('retentionProbabilityHistory', JSON.stringify(newHistory));
      
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
        {t('retentionProbability.backToContentSpy')}
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('retentionProbability.title')}</h1>
            <p className="text-gray-500">{t('retentionProbability.subtitle')}</p>
          </div>
        </div>
        <Card className="min-w-[180px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{tokensInfo.tokensCredits}</span>
              <span className="text-gray-500 text-sm">{t('retentionProbability.tokens')}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{tokensInfo.tokensUsed} {t('retentionProbability.used')}</p>
          </CardContent>
        </Card>
      </div>

      {!videoId ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-orange-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold">{t('retentionProbability.noVideo')}</h2>
            <p className="text-gray-500 max-w-md">
              {t('retentionProbability.noVideoDesc')}
            </p>
            <Button onClick={() => router.push('/dashboard/creator/content-spy')}>
              {t('retentionProbability.goToContentSpy')}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing || tokensInfo.tokensCredits < 6}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              {analyzing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              {analyzing ? t('retentionProbability.analyzing') : t('retentionProbability.analyze')}
            </Button>
            
            {tokensInfo.tokensCredits < 6 && (
              <p className="text-xs text-center text-orange-500 mt-2">
                {t('retentionProbability.needMoreTokens')}
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
                <p className="text-purple-700">{t('retentionProbability.previousResult')}</p>
                <Button
                  onClick={() => {
                    setVideoMetadata(historyResult.metadata);
                    setDerivedMetrics(historyResult.derivedMetrics);
                    setAnalysis(historyResult.analysis);
                  }}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('retentionProbability.loadLastResult')}
                </Button>
              </CardContent>
            </Card>
          )}

          {videoMetadata && derivedMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('retentionProbability.videoSnapshot')}</CardTitle>
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
                      <h4 className="font-medium text-sm mb-2">{t('retentionProbability.performanceMetrics')}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('retentionProbability.viewsPerDay')}</span>
                          <span className="font-medium">{formatNumber(derivedMetrics.viewsPerDay)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('retentionProbability.engagementRate')}</span>
                          <span className="font-medium">{derivedMetrics.engagementRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('retentionProbability.likeView')}</span>
                          <span className="font-medium">{derivedMetrics.likeToViewRatio}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('retentionProbability.commentView')}</span>
                          <span className="font-medium">{derivedMetrics.commentToViewRatio}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('retentionProbability.subPerformance')}</span>
                          <span className="font-medium">{derivedMetrics.subscriberPerformanceRatio}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('retentionProbability.contentType')}</span>
                          <span className="font-medium">{derivedMetrics.durationClassification}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('retentionProbability.dashboard')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border">
                      <div>
                        <p className="text-sm text-gray-600">{t('retentionProbability.overallScore')}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('retentionProbability.overallScoreDesc')}</p>
                      </div>
                      <div className={`text-5xl font-bold ${getScoreColor(analysis?.overallScore || 0)}`}>
                        {analysis?.overallScore || 0}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{t('retentionProbability.opening')}</p>
                        <p className={`text-2xl font-bold ${getScoreColor(analysis?.openingScore || 0)}`}>
                          {analysis?.openingScore || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{t('retentionProbability.pacing')}</p>
                        <p className={`text-2xl font-bold ${getScoreColor(analysis?.pacingScore || 0)}`}>
                          {analysis?.pacingScore || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{t('retentionProbability.curiosity')}</p>
                        <p className={`text-2xl font-bold ${getScoreColor(analysis?.curiosityScore || 0)}`}>
                          {analysis?.curiosityScore || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{t('retentionProbability.payoff')}</p>
                        <p className={`text-2xl font-bold ${getScoreColor(analysis?.payoffScore || 0)}`}>
                          {analysis?.payoffScore || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{t('retentionProbability.authority')}</p>
                        <p className={`text-2xl font-bold ${getScoreColor(analysis?.authorityScore || 0)}`}>
                          {analysis?.authorityScore || 0}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold text-green-800">{t('retentionProbability.strengths')}</h4>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {analysis?.strengths?.map((s, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-green-600">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <h4 className="font-semibold text-red-800">{t('retentionProbability.weaknesses')}</h4>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {analysis?.weaknesses?.map((w, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-red-600">•</span>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-orange-600" />
                          <h4 className="font-semibold text-orange-800">{t('retentionProbability.dropoffRisks')}</h4>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {analysis?.risks?.map((r, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-orange-600">•</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-blue-800">Optimizations</h4>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {analysis?.improvements?.map((imp, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-blue-600">•</span>
                              {imp}
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

export default function RetentionProbabilityPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <RetentionProbabilityContent />
    </Suspense>
  );
}
