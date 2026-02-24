'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Zap, Loader2, Layers, Eye, Clock, Target, TrendingUp, MousePointerClick, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';

interface VideoMetadata {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  channelId: string;
  durationSeconds: number;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  subscriberCount: number;
  tags: string[];
  description: string;
}

interface PatternScore {
  name: string;
  score: number;
  explanation: string;
}

interface PackagingScores {
  ctrScore: number;
  retentionScore: number;
  conversionScore: number;
  estimatedRPV: number;
}

interface BlendAnalysis {
  currentBlendProfile: {
    dominantCluster: string;
    blendStrength: number;
    imbalanceAreas: string[];
  };
  recommendedBlends: Array<{
    name: string;
    patterns: string[];
    strategicPurpose: string;
    expectedImpact: string;
  }>;
  psychologicalStack: string[];
  structuralUpgradePlan: {
    hookUpgrade: string;
    retentionUpgrade: string;
    conversionUpgrade: string;
  };
  monetizationImpact: {
    ctrLiftPotential: string;
    retentionLiftPotential: string;
    revenueImpactEstimate: string;
  };
}

const ATTENTION_DRIVERS = ['Curiosity Gap', 'Cognitive Dissonance', 'Surprise', 'Fear / Loss', 'Identity Hook'];
const RETENTION_DRIVERS = ['Open Loop', 'Micro-Narrative', 'Escalation', 'Progressive Revelation'];
const CONVERSION_DRIVERS = ['Outcome Reinforcement', 'Authority', 'Specificity', 'Risk Reversal', 'Payoff'];

function PatternBlendingContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [videoId, setVideoId] = useState<string>('');
  const [tokensInfo, setTokensInfo] = useState({ tokensCredits: 0, tokensUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [videoType, setVideoType] = useState<string>('');
  const [packagingScores, setPackagingScores] = useState<PackagingScores | null>(null);
  const [patternScores, setPatternScores] = useState<PatternScore[]>([]);
  const [analysis, setAnalysis] = useState<BlendAnalysis | null>(null);
  const [historyResult, setHistoryResult] = useState<{ metadata: VideoMetadata; videoType: string; packagingScores: PackagingScores; patternScores: PatternScore[]; analysis: BlendAnalysis } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchTokensInfo();
  }, []);

  useEffect(() => {
    const videoIdParam = searchParams.get('videoId');
    const title = searchParams.get('title');

    if (videoIdParam) {
      setVideoId(videoIdParam);
      if (title) {
        toast({
          title: 'Video selected',
          description: `Analyzing patterns for: ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`,
        });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('patternBlendingHistory');
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
        description: 'Select a video to analyze pattern blending.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setMetadata(null);
    setPackagingScores(null);
    setPatternScores([]);

    try {
      const res = await fetch('/api/creator/ai/pattern-blending', {
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

      setMetadata(data.metadata);
      setVideoType(data.videoType);
      setPackagingScores(data.packagingScores);
      setPatternScores(data.patternScores);
      setAnalysis(data.analysis);
      
      const newHistory = {
        metadata: data.metadata,
        videoType: data.videoType,
        packagingScores: data.packagingScores,
        patternScores: data.patternScores,
        analysis: data.analysis,
      };
      setHistoryResult(newHistory);
      localStorage.setItem('patternBlendingHistory', JSON.stringify(newHistory));
      
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

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
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
        {t('patternBlending.backToContentSpy')}
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('patternBlending.title')}</h1>
            <p className="text-gray-500">{t('patternBlending.subtitle')}</p>
          </div>
        </div>
        <Card className="min-w-[180px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{tokensInfo.tokensCredits}</span>
              <span className="text-gray-500 text-sm">{t('patternBlending.tokens')}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{tokensInfo.tokensUsed} {t('patternBlending.used')}</p>
          </CardContent>
        </Card>
      </div>

      {!videoId ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Layers className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('patternBlending.noVideo')}</h2>
            <p className="text-gray-500 mb-4">{t('patternBlending.noVideoDesc')}</p>
            <Button onClick={() => router.push('/dashboard/creator/spy')}>
              {t('patternBlending.goToContentSpy')}
            </Button>
          </CardContent>
        </Card>
      ) : !metadata ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Layers className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('patternBlending.readyToAnalyze')}</h2>
            <p className="text-gray-500 mb-4">{t('patternBlending.readyToAnalyzeDesc')}</p>
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {analyzing ? t('patternBlending.analyzing') : t('patternBlending.analyze')}
            </Button>
            {error && (
              <p className="text-red-500 mt-4">{error}</p>
            )}
            {historyResult && (
              <Button
                onClick={() => {
                  setMetadata(historyResult.metadata);
                  setVideoType(historyResult.videoType);
                  setPackagingScores(historyResult.packagingScores);
                  setPatternScores(historyResult.patternScores);
                  setAnalysis(historyResult.analysis);
                }}
                className="mt-4 gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4" />
                {t('patternBlending.loadLastResult')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-4">
            <div className="flex items-center gap-6">
              {metadata.thumbnailUrl && (
                <img 
                  src={metadata.thumbnailUrl} 
                  alt={metadata.title}
                  className="w-32 h-18 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg line-clamp-2">{metadata.title}</h3>
                <p className="text-gray-500 text-sm">{metadata.channelName}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>{formatNumber(metadata.views)} views</span>
                  <span>{formatNumber(metadata.likes)} likes</span>
                  <span>{formatNumber(metadata.comments)} comments</span>
                  <span>{formatDuration(metadata.durationSeconds)}</span>
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                    {videoType}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {packagingScores && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">CTR Score</span>
                    <Eye className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(packagingScores.ctrScore)}`}>
                    {packagingScores.ctrScore}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Retention</span>
                    <Clock className="h-4 w-4 text-green-500" />
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(packagingScores.retentionScore)}`}>
                    {packagingScores.retentionScore}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Conversion</span>
                    <Target className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(packagingScores.conversionScore)}`}>
                    {packagingScores.conversionScore}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Est. RPV</span>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    €{packagingScores.estimatedRPV}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {analysis && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {t('patternBlending.dashboard')}
                    </CardTitle>
                    <CardDescription>{t('patternBlending.patternStrengths')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold">ATTENTION DRIVERS</span>
                        </div>
                        <div className="space-y-2">
                          {ATTENTION_DRIVERS.map(pattern => {
                            const patternData = patternScores.find(p => p.name === pattern);
                            const score = patternData?.score || 0;
                            return (
                              <div key={pattern} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{pattern}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-medium w-8 ${getScoreColor(score)}`}>{score}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                          <Clock className="h-4 w-4 text-green-500" />
                          <span className="font-semibold">RETENTION DRIVERS</span>
                        </div>
                        <div className="space-y-2">
                          {RETENTION_DRIVERS.map(pattern => {
                            const patternData = patternScores.find(p => p.name === pattern);
                            const score = patternData?.score || 0;
                            return (
                              <div key={pattern} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{pattern}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-medium w-8 ${getScoreColor(score)}`}>{score}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                          <MousePointerClick className="h-4 w-4 text-orange-500" />
                          <span className="font-semibold">CONVERSION DRIVERS</span>
                        </div>
                        <div className="space-y-2">
                          {CONVERSION_DRIVERS.map(pattern => {
                            const patternData = patternScores.find(p => p.name === pattern);
                            const score = patternData?.score || 0;
                            return (
                              <div key={pattern} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{pattern}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-medium w-8 ${getScoreColor(score)}`}>{score}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Current Blend Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500">Dominant Cluster</span>
                      <p className="font-semibold">{analysis.currentBlendProfile.dominantCluster}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Blend Strength</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-violet-500"
                            style={{ width: `${analysis.currentBlendProfile.blendStrength}%` }}
                          />
                        </div>
                        <span className="font-medium">{analysis.currentBlendProfile.blendStrength}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Imbalance Areas</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {analysis.currentBlendProfile.imbalanceAreas.map((area, i) => (
                          <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Expected Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                      <span className="text-sm text-blue-700">CTR Lift Potential</span>
                      <span className="font-semibold text-blue-700">{analysis.monetizationImpact.ctrLiftPotential}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                      <span className="text-sm text-green-700">Retention Lift Potential</span>
                      <span className="font-semibold text-green-700">{analysis.monetizationImpact.retentionLiftPotential}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                      <span className="text-sm text-purple-700">Revenue Impact</span>
                      <span className="font-semibold text-purple-700">{analysis.monetizationImpact.revenueImpactEstimate}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recommended Blends</CardTitle>
                  <CardDescription>High-performance pattern combinations specific to this video</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.recommendedBlends.map((blend, index) => (
                      <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{blend.name}</span>
                          <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded">
                            {blend.expectedImpact}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {blend.patterns.map((pattern, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                              {pattern}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">{blend.strategicPurpose}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Structural Upgrade Plan</CardTitle>
                  <CardDescription>Specific recommendations to optimize each layer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-800">Hook Upgrade</span>
                      </div>
                      <p className="text-sm text-gray-700">{analysis.structuralUpgradePlan.hookUpgrade}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-800">Retention Upgrade</span>
                      </div>
                      <p className="text-sm text-gray-700">{analysis.structuralUpgradePlan.retentionUpgrade}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold text-orange-800">Conversion Upgrade</span>
                      </div>
                      <p className="text-sm text-gray-700">{analysis.structuralUpgradePlan.conversionUpgrade}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {analysis.psychologicalStack.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Psychological Stack</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.psychologicalStack.map((item, index) => (
                        <span key={index} className="px-3 py-1 bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 rounded-full text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PatternBlendingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PatternBlendingContent />
    </Suspense>
  );
}
