'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Zap, 
  Loader2, 
  TrendingUp, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Users, 
  Clock,
  Calendar,
  Target,
  Heart,
  Share2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface PackagingScores {
  ctrScore: number;
  retentionScore: number;
}

interface PatternScore {
  name: string;
  score: number;
  explanation: string;
}

interface Blueprint {
  hookStrategy: string;
  retentionMechanism: string;
  emotionalStacking: string;
  amplificationStrategy: string;
}

interface ViralTaxonomyAnalysis {
  dominantPattern: string;
  patternScores: PatternScore[];
  structureType: string;
  emotionalProfile: string[];
  viralLevers: string[];
  weakPoints: string[];
  optimizationSuggestions: string[];
  blueprint: Blueprint;
}

const TAXONOMY_SECTIONS = [
  {
    title: 'Attention Acquisition',
    icon: Eye,
    color: 'blue',
    patterns: ['Cognitive Dissonance', 'Curiosity Gap', 'Outcome-First', 'Identity & Ego'],
  },
  {
    title: 'Retention Engine',
    icon: Clock,
    color: 'green',
    patterns: ['Open Loop', 'Micro-Narrative', 'Escalation', 'Pattern Interrupt'],
  },
  {
    title: 'Emotional Activation',
    icon: Heart,
    color: 'red',
    patterns: ['Fear / Loss', 'Surprise', 'Validation', 'Status'],
  },
  {
    title: 'Virality Amplification',
    icon: Share2,
    color: 'purple',
    patterns: ['Debate', 'Tribal', 'Rewatch'],
  },
];

function ViralPatternsContent() {
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
  const [packagingScores, setPackagingScores] = useState<PackagingScores | null>(null);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [analysis, setAnalysis] = useState<ViralTaxonomyAnalysis | null>(null);
  const [historyResult, setHistoryResult] = useState<{ metadata: VideoMetadata; packagingScores: PackagingScores; hasTranscript: boolean; analysis: ViralTaxonomyAnalysis } | null>(null);
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
      const savedHistory = localStorage.getItem('viralPatternsHistory');
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
        description: 'Select a video to analyze viral taxonomy.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setVideoMetadata(null);
    setPackagingScores(null);
    setHasTranscript(false);

    try {
      const res = await fetch('/api/creator/ai/viral-patterns', {
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
      setPackagingScores(data.packagingScores);
      setHasTranscript(data.hasTranscript);
      setAnalysis(data.analysis);
      
      const newHistory = {
        metadata: data.metadata,
        packagingScores: data.packagingScores,
        hasTranscript: data.hasTranscript,
        analysis: data.analysis,
      };
      setHistoryResult(newHistory);
      localStorage.setItem('viralPatternsHistory', JSON.stringify(newHistory));
      
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
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSectionColor = (color: string): string => {
    const colors: Record<string, string> = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      red: 'border-red-200 bg-red-50',
      purple: 'border-purple-200 bg-purple-50',
    };
    return colors[color] || 'border-gray-200 bg-gray-50';
  };

  const getSectionIconColor = (color: string): string => {
    const colors: Record<string, string> = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      red: 'text-red-600',
      purple: 'text-purple-600',
    };
    return colors[color] || 'text-gray-600';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t('viralPatterns.backToContentSpy')}
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('viralPatterns.title')}</h1>
            <p className="text-gray-500">{t('viralPatterns.subtitle')}</p>
          </div>
        </div>
        <Card className="min-w-[180px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{tokensInfo.tokensCredits}</span>
              <span className="text-gray-500 text-sm">{t('viralPatterns.tokens')}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{tokensInfo.tokensUsed} {t('viralPatterns.used')}</p>
          </CardContent>
        </Card>
      </div>

      {!videoId ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-purple-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold">{t('viralPatterns.noVideo')}</h2>
            <p className="text-gray-500 max-w-md">
              {t('viralPatterns.noVideoDesc')}
            </p>
            <Button onClick={() => router.push('/dashboard/creator/content-spy')}>
              {t('viralPatterns.goToContentSpy')}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing || tokensInfo.tokensCredits < 10}
              className="w-full gap-2 bg-red-600 hover:bg-red-700"
              size="lg"
            >
              {analyzing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              {analyzing ? t('viralPatterns.analyzing') : t('viralPatterns.analyze')}
            </Button>
            
            {tokensInfo.tokensCredits < 10 && (
              <p className="text-xs text-center text-purple-500 mt-2">
                {t('viralPatterns.needMoreTokens')}
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
                <p className="text-purple-700">{t('viralPatterns.previousResult')}</p>
                <Button
                  onClick={() => {
                    setVideoMetadata(historyResult.metadata);
                    setPackagingScores(historyResult.packagingScores);
                    setHasTranscript(historyResult.hasTranscript);
                    setAnalysis(historyResult.analysis);
                  }}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('viralPatterns.loadLastResult')}
                </Button>
              </CardContent>
            </Card>
          )}

          {videoMetadata && packagingScores && analysis && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('viralPatterns.videoSnapshot')}</CardTitle>
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
                        <h4 className="font-medium text-sm mb-2">Packaging Scores</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">CTR Score</span>
                            <span className={`font-medium ${getScoreTextColor(packagingScores.ctrScore)}`}>
                              {packagingScores.ctrScore}/100
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Retention Score</span>
                            <span className={`font-medium ${getScoreTextColor(packagingScores.retentionScore)}`}>
                              {packagingScores.retentionScore}/100
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Transcript</span>
                            <span className={`font-medium ${hasTranscript ? 'text-green-600' : 'text-gray-400'}`}>
                              {hasTranscript ? 'Available' : 'Not available'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-3 space-y-6">
                  <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-600" />
                        {t('viralPatterns.dominantPattern')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-purple-100 rounded-xl">
                          <Sparkles className="h-8 w-8 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-700">{analysis.dominantPattern}</p>
                          <p className="text-sm text-gray-600 mt-1">Structure: {analysis.structureType}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">{t('viralPatterns.taxonomyClassification')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {TAXONOMY_SECTIONS.map((section) => {
                        const SectionIcon = section.icon;
                        const sectionPatterns = analysis.patternScores.filter(p => 
                          section.patterns.some(sp => p.name.toLowerCase().includes(sp.toLowerCase().split(' ')[0]))
                        );
                        
                        return (
                          <Card key={section.title} className={`border-2 ${getSectionColor(section.color)}`}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <SectionIcon className={`h-4 w-4 ${getSectionIconColor(section.color)}`} />
                                {section.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {sectionPatterns.length > 0 ? (
                                sectionPatterns.map((pattern, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`p-2 rounded-lg ${
                                      pattern.name === analysis.dominantPattern 
                                        ? 'bg-white border-2 border-purple-300 shadow-sm' 
                                        : 'bg-white/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-sm">{pattern.name}</span>
                                      <Badge className={getScoreColor(pattern.score)}>
                                        {pattern.score}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-2">{pattern.explanation}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-500">No patterns detected</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Emotional Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.emotionalProfile?.map((emotion, i) => (
                        <Badge key={i} variant="outline" className="bg-red-50 text-red-700">
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      {t('viralPatterns.viralLevers')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.viralLevers?.map((lever, i) => (
                        <Badge key={i} variant="outline" className="bg-green-50 text-green-700">
                          {lever}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Weak Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.weakPoints?.map((weak, i) => (
                        <Badge key={i} variant="outline" className="bg-yellow-50 text-yellow-700">
                          {weak}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Execution Blueprint
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Hook Strategy</h4>
                    <p className="text-sm text-blue-700">{analysis.blueprint?.hookStrategy}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Retention Mechanism</h4>
                    <p className="text-sm text-green-700">{analysis.blueprint?.retentionMechanism}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Emotional Stacking</h4>
                    <p className="text-sm text-red-700">{analysis.blueprint?.emotionalStacking}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">Amplification Strategy</h4>
                    <p className="text-sm text-purple-700">{analysis.blueprint?.amplificationStrategy}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Optimization Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.optimizationSuggestions?.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ViralPatternsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ViralPatternsContent />
    </Suspense>
  );
}
