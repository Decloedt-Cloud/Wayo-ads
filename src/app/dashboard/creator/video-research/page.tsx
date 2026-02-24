'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  Loader2, 
  Clock, 
  Eye, 
  Sparkles,
  Target,
  TrendingUp,
  Brain,
  Heart,
  MessageCircle,
  Calendar,
  Lightbulb,
  Bookmark,
  ChevronRight,
  CheckCircle,
  MousePointerClick,
  Repeat,
  DollarSign,
  FileText,
  Dna,
  GitMerge,
  Package,
  Megaphone,
  Volume2,
  Users,
  Zap as ZapIcon,
  Wand2,
  FileEdit,
  TrendingUp as TrendingUpIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';
import ReactMarkdown from 'react-markdown';

interface SavedVideo extends YouTubeVideo {
  savedAt: string;
  status: 'pending' | 'analyzing' | 'completed';
  analysisData?: Record<string, unknown>;
}

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  durationSeconds: number | null;
  videoType: 'VIDEO' | 'SHORT';
  publishedAt: string;
  viewCount: string | null;
  likeCount: string | null;
  commentCount: string | null;
  tags: string[];
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViewCount(count: string | null): string {
  if (!count) return 'N/A';
  const num = parseInt(count);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return count;
}

function formatLikeCount(count: string | null): string {
  if (!count) return 'N/A';
  const num = parseInt(count);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return count;
}

function formatCommentCount(count: string | null): string {
  if (!count) return 'N/A';
  const num = parseInt(count);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return count;
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 365) return `${Math.floor(diffDays / 365)}y ago`;
  if (diffDays > 30) return `${Math.floor(diffDays / 30)}mo ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  return 'Today';
}

function generatePatternTags(video: YouTubeVideo): string[] {
  const tags: string[] = [];
  const title = video.title.toLowerCase();
  const viewCount = parseInt(video.viewCount || '0');
  const likeCount = parseInt(video.likeCount || '0');
  
  if (viewCount > 1000000) tags.push('viral');
  else if (viewCount > 100000) tags.push('trending');
  
  if (likeCount > 0 && viewCount > 0) {
    const likeRatio = likeCount / viewCount;
    if (likeRatio > 0.1) tags.push('highEngagement');
  }
  
  if (title.includes('how to') || title.includes('tutorial') || title.includes('learn')) {
    tags.push('educational');
  }
  if (title.includes('secret') || title.includes('hidden') || title.includes('never')) {
    tags.push('curiosityHook');
  }
  if (title.includes('worst') || title.includes('never') || title.includes('stop')) {
    tags.push('painPoint');
  }
  if (title.includes('!') || title.includes('??') || title.includes('wait')) {
    tags.push('strongHook');
  }
  if (title.includes('story') || title.includes('my') || title.includes('i ')) {
    tags.push('storyFormat');
  }
  if (video.videoType === 'SHORT') {
    tags.push('Shorts');
  }
  
  return tags.slice(0, 3);
}

function generateInsights(video: YouTubeVideo): string[] {
  const insights: string[] = [];
  const title = video.title.toLowerCase();
  const viewCount = parseInt(video.viewCount || '0');
  const likeCount = parseInt(video.likeCount || '0');
  const commentCount = parseInt(video.commentCount || '0');
  
  if (title.startsWith('how') || title.startsWith('why') || title.startsWith('what')) {
    insights.push('Opens with a question to spark curiosity');
  } else if (title.includes('!')) {
    insights.push('Uses exclamation for emotional emphasis');
  } else if (title.includes('secret') || title.includes('hidden')) {
    insights.push('Creates curiosity gap with "secret" framing');
  } else if (title.includes('worst') || title.includes('best')) {
    insights.push('Contrarian angle drives engagement');
  } else {
    insights.push('Clear, benefit-driven title');
  }
  
  if (video.videoType === 'SHORT') {
    insights.push('Short form captures attention quickly');
  } else if (video.durationSeconds && video.durationSeconds < 300) {
    insights.push('Optimal length for retention');
  }
  
  if (likeCount > 0 && viewCount > 0) {
    const likeRatio = likeCount / viewCount;
    if (likeRatio > 0.1) {
      insights.push('High like-to-view ratio suggests strong value');
    }
  }
  
  if (commentCount > 1000) {
    insights.push('High comments indicate audience engagement');
  }
  
  return insights.slice(0, 3);
}

export default function VideoResearchPage() {
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [activeTab, setActiveTab] = useState('search');
  const [previousTab, setPreviousTab] = useState('search');
  const [analysisMode, setAnalysisMode] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [tokenBalance, setTokenBalance] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<Record<string, string>>({});
  const [analyzingCard, setAnalyzingCard] = useState<string | null>(null);

  useEffect(() => {
    if (videoError) {
      const timer = setTimeout(() => setVideoError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [videoError]);
  const [activeAnalysisCard, setActiveAnalysisCard] = useState<string | null>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [generatingScripts, setGeneratingScripts] = useState(false);
  const [generatedHooks, setGeneratedHooks] = useState<string>('');
  const [generatedScripts, setGeneratedScripts] = useState<string>('');
  const [searchType, setSearchType] = useState<'all' | 'shorts' | 'videos'>('all');
  const [hasLoadedTrending, setHasLoadedTrending] = useState(false);
  const [hookType, setHookType] = useState<string>('');
  const [videoStyle, setVideoStyle] = useState<string>('');
  const [insightVideoId, setInsightVideoId] = useState<string | null>(null);
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<YouTubeVideo[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const saved = localStorage.getItem('vaultVideos');
    if (saved) {
      try {
        setSavedVideos(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved videos', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vaultVideos', JSON.stringify(savedVideos));
  }, [savedVideos]);

  useEffect(() => {
    if (!hasLoadedTrending && status === 'authenticated') {
      setHasLoadedTrending(true);
      loadTrendingContent();
    }
  }, [status, hasLoadedTrending]);

  const loadTrendingContent = async (pageToken?: string) => {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    
    const languageMap: Record<string, string> = {
      en: 'English',
      fr: 'French',
      es: 'Spanish',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      ar: 'Arabic',
    };
    
    const langName = languageMap[language] || 'English';
    const trendingQuery = `viral trending ${langName} ${month} ${year}`;
    
    if (!pageToken) {
      setSearching(true);
      setNextPageToken(null);
    } else {
      setLoadingMore(true);
    }

    let regionCode = 'US';
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.country_code) {
          regionCode = ipData.country_code;
        }
      }
    } catch (err) {
      console.error('Failed to get location:', err);
    }

    const publishedAfter = `${year}-01-01T00:00:00Z`;

    try {
      const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : '';
      const res = await fetch(
        `/api/creator/youtube/search?q=${encodeURIComponent(trendingQuery)}&maxResults=12&publishedAfter=${encodeURIComponent(publishedAfter)}&regionCode=${regionCode}${pageTokenParam}`
      );
      const data = await res.json();

      if (res.ok && data.videos) {
        if (pageToken) {
          setVideos(prev => [...prev, ...data.videos]);
        } else {
          setVideos(data.videos);
        }
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error('Trending search error:', err);
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  };

  const handleSearchInternal = async (pageToken?: string) => {
    if (!searchQuery.trim()) return;

    if (!pageToken) {
      setSearching(true);
      setNextPageToken(null);
    } else {
      setLoadingMore(true);
    }
    setSelectedVideo(null);

    let enhancedQuery = searchQuery;
    if (hookType) {
      enhancedQuery += ` ${hookType} hook`;
    }
    if (videoStyle) {
      enhancedQuery += ` ${videoStyle}`;
    }

    try {
      const typeParam = searchType !== 'all' ? `&type=${searchType}` : '';
      const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : '';
      const res = await fetch(`/api/creator/youtube/search?q=${encodeURIComponent(enhancedQuery)}&maxResults=12${typeParam}${pageTokenParam}`);
      const data = await res.json();

      if (res.ok && data.videos) {
        if (pageToken) {
          setVideos(prev => [...prev, ...data.videos]);
        } else {
          setVideos(data.videos);
        }
        setNextPageToken(data.nextPageToken || null);
        if (!pageToken && data.videos.length === 0) {
          toast({
            title: t('videoResearch.noResults'),
            description: t('videoResearch.tryDifferentTerm'),
            variant: 'default',
          });
        }
      } else {
        toast({
          title: t('videoResearch.searchFailed'),
          description: data.error || t('videoResearch.somethingWentWrong'),
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      toast({
        title: t('videoResearch.searchFailed'),
        description: t('videoResearch.unableToSearch'),
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  };

  const loadMoreVideos = () => {
    if (nextPageToken && !loadingMore) {
      const currentYear = new Date().getFullYear().toString();
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      if (searchQuery.includes(currentYear) && searchQuery.includes(currentMonth)) {
        loadTrendingContent(nextPageToken);
      } else {
        handleSearchInternal(nextPageToken);
      }
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        handleSearchInternal();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchType, hookType, videoStyle]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchInternal();
  };

  const handleSelectVideo = (video: YouTubeVideo) => {
    setPreviousTab(activeTab);
    setSelectedVideo(video);
    setActiveTab('features');
  };

  const fetchTokenBalance = async () => {
    try {
      const res = await fetch('/api/creator/ai/tokens');
      const data = await res.json();
      setTokenBalance(data.tokensCredits || 0);
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
    }
  };

  const runAnalysis = async (cardType: string, prompt: string, systemPrompt: string) => {
    if (!selectedVideo) {
      setVideoError(t('common.pleaseSelectVideo'));
      return;
    }
    
    if (tokenBalance < 3) {
      setVideoError(t('error.insufficientTokens'));
      return;
    }

    setAnalyzingCard(cardType);
    setVideoError('');

    try {
      const res = await fetch('/api/creator/ai/video-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemPrompt,
          feature: cardType,
          videoData: {
            title: selectedVideo.title,
            channelName: selectedVideo.channelName,
            videoId: selectedVideo.videoId,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysisResults(prev => ({ ...prev, [cardType]: data.result }));
      setTokenBalance(data.available || tokenBalance - 15);
    } catch (error: any) {
      console.error('Analysis error:', error);
      setVideoError(error.message || t('videoResearch.failedToRunAnalysis'));
    } finally {
      setAnalyzingCard(null);
    }
  };

  const generateHooks = async () => {
    if (!selectedVideo) {
      setVideoError(t('common.pleaseSelectVideo'));
      return;
    }

    if (tokenBalance < 3) {
      setVideoError(t('error.insufficientTokens'));
      return;
    }

    setGeneratingHooks(true);
    setVideoError('');

    try {
      const res = await fetch('/api/creator/ai/generate-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: selectedVideo.title,
          hookType: 'curiosity',
          energyLevel: 'high',
          structureType: 'story',
          detectedNiche: 'general',
          language: 'en',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate hooks');
      }

      let hooksText = '';
      try {
        const parsed = JSON.parse(data.response);
        if (parsed.hooks && Array.isArray(parsed.hooks)) {
          hooksText = parsed.hooks.map((h: string) => `"${h}"`).join('\n');
        } else {
          hooksText = data.response;
        }
      } catch {
        hooksText = data.response;
      }
      setGeneratedHooks(hooksText);
      setTokenBalance(data.tokensRemaining || tokenBalance - 3);
    } catch (error: any) {
      console.error('Generate hooks error:', error);
      setVideoError(error.message || t('videoResearch.failedToRunAnalysis'));
    } finally {
      setGeneratingHooks(false);
    }
  };

  const generateScripts = async () => {
    if (!selectedVideo) {
      setVideoError(t('common.pleaseSelectVideo'));
      return;
    }

    if (tokenBalance < 10) {
      setVideoError(t('error.insufficientTokens'));
      return;
    }

    setGeneratingScripts(true);
    setVideoError('');

    try {
      const res = await fetch('/api/creator/ai/creator-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorNiche: 'general',
          audienceType: 'general',
          contentStyle: 'entertaining',
          contentType: selectedVideo.videoType === 'SHORT' ? 'SHORTS' : 'VIDEO',
          campaignContext: 'Content marketing',
          primaryGoal: 'Engagement',
          toneConstraint: 'casual',
          inspirationTitle: selectedVideo.title,
          inspirationConcept: 'viral content',
          inspirationWhy: 'high engagement potential',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate scripts');
      }

      setGeneratedScripts(data.response || '');
      setTokenBalance(data.tokensRemaining || tokenBalance - 10);
    } catch (error: any) {
      console.error('Generate scripts error:', error);
      setVideoError(error.message || t('videoResearch.failedToRunAnalysis'));
    } finally {
      setGeneratingScripts(false);
    }
  };

  useEffect(() => {
    if (analysisMode) {
      fetchTokenBalance();
    }
  }, [analysisMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/creator')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg blur-lg opacity-50"></div>
              <Brain className="h-8 w-8 text-purple-600 relative z-10" />
            </div>
            {t('videoResearch.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('videoResearch.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <form onSubmit={handleSearch} className="flex gap-3 relative">
              <Input
                type="text"
                placeholder={t('videoResearch.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={searching || !searchQuery.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white border-0"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('common.analyze')}
                  </>
                )}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  if (!selectedVideo) {
                    setVideoError(t('common.pleaseSelectVideoAI'));
                    return;
                  }
                  setVideoError('');
                  setAnalysisMode(true);
                }}
                className="border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0"
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Workspace
              </Button>
              {videoError && (
                <div className="absolute top-full mt-2 right-0 w-max max-w-xs bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg shadow-sm text-sm animate-fade-in">
                  {videoError}
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {['viral trending', 'most viewed', 'popular shorts', 'top trending', 'viral hits 2026'].map((term) => (
            <Button
              key={term}
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery(term)}
              className="text-xs"
            >
              {term}
            </Button>
          ))}
          <span className="text-sm text-gray-500 ml-auto flex items-center">{t('videoResearch.sortBy')}</span>
          <Button
            variant={activeTab === 'vault' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectedVideo(null);
              if (activeTab === 'features') {
                setPreviousTab('vault');
                setActiveTab('vault');
              } else {
                setPreviousTab(activeTab);
                setActiveTab(activeTab === 'vault' ? 'search' : 'vault');
              }
            }}
            className="gap-1"
          >
            <Bookmark className="h-4 w-4" />
            <span className="text-purple-600 dark:text-purple-400 font-medium">{t('videoResearch.saved')}</span>
            {savedVideos.length > 0 && <span className="text-purple-600 dark:text-purple-400">({savedVideos.length})</span>}
          </Button>
        </div>

        {selectedVideos.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold">{t('videoResearch.selectedVideos')} ({selectedVideos.length})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedVideos([])}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {selectedVideos.map((video) => (
                <Card 
                  key={video.videoId} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group border-2 border-purple-500"
                  onClick={() => handleSelectVideo(video)}
                >
                  <div className="aspect-video relative">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    {video.durationSeconds && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                        {formatDuration(video.durationSeconds)}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVideos(prev => prev.filter(v => v.videoId !== video.videoId));
                      }}
                      className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full hover:bg-black/90 transition-colors z-20"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVideo(video);
                        }}
                        className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white border-0 gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Analyze
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{video.channelName}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {videos.length === 0 && !searching && hasLoadedTrending && (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('videoResearch.discoverTrending')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('common.searchForTopic')}
              </p>
            </CardContent>
          </Card>
        )}

            {searching && (
              <div className="mt-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            )}

            {activeTab === 'vault' && savedVideos.length === 0 && (
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab('search')}
                  className="gap-2 mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.backToSearch')}
                </Button>
                <Card className="mb-6">
                  <CardContent className="py-8 text-center">
                    <Bookmark className="h-12 w-12 mx-auto text-purple-600 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('videoResearch.emptySaved')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {t('common.saveVideos')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {(activeTab === 'search' && videos.length > 0) && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">
                  {hasLoadedTrending && searchQuery.includes(new Date().getFullYear().toString()) 
                    ? `${t('common.trending')} ${new Date().toLocaleString(language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long' })} Marketing` 
                    : `${t('common.searchResults')} (${videos.length})`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {videos.map((video) => (
                    <Card 
                      key={video.videoId} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => handleSelectVideo(video)}
                    >
                      <div className="aspect-video relative">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        {video.durationSeconds && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                            {formatDuration(video.durationSeconds)}
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {generatePatternTags(video).map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium"
                            >
                              {t(`videoResearch.${tag}`)}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVideos(prev => {
                              const exists = prev.some(v => v.videoId === video.videoId);
                              if (exists) {
                                return prev.filter(v => v.videoId !== video.videoId);
                              }
                              return [...prev, video];
                            });
                          }}
                          className={`absolute top-2 left-2 bg-black/70 p-1.5 rounded-full hover:bg-black/90 transition-colors z-20 ${selectedVideos.some(v => v.videoId === video.videoId) ? 'bg-purple-600' : ''}`}
                        >
                          <CheckCircle className={`h-4 w-4 ${selectedVideos.some(v => v.videoId === video.videoId) ? 'text-white fill-white' : 'text-white'}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSavedVideos(prev => {
                              const exists = prev.some(sv => sv.videoId === video.videoId);
                              if (exists) {
                                return prev.filter(sv => sv.videoId !== video.videoId);
                              }
                              return [...prev, { ...video, savedAt: new Date().toISOString(), status: 'pending' as const }];
                            });
                          }}
                          className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full hover:bg-black/90 transition-colors z-20"
                        >
                          <Bookmark className={`h-4 w-4 ${savedVideos.some(sv => sv.videoId === video.videoId) ? 'text-purple-400 fill-purple-400' : 'text-white'}`} />
                        </button>
                        {insightVideoId === video.videoId && (
                          <div 
                            className="absolute left-0 right-0 mx-2 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="font-semibold mb-1 text-yellow-400">{t('videoResearch.whyItWorks')}</p>
                            <ul className="space-y-1">
                              {generateInsights(video).map((insight, idx) => (
                                <li key={idx}>• {insight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectVideo(video);
                            }}
                            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white border-0 gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Analyze
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{video.channelName}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {video.viewCount && (
                            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                              <Eye className="h-3.5 w-3.5" />
                              <span>{formatViewCount(video.viewCount)}</span>
                            </div>
                          )}
                          {video.likeCount && (
                            <div className="flex items-center gap-1.5 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 px-2 py-1 rounded-full text-xs font-medium">
                              <Heart className="h-3.5 w-3.5" />
                              <span>{formatLikeCount(video.likeCount)}</span>
                            </div>
                          )}
                          {video.commentCount && (
                            <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full text-xs font-medium">
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>{formatCommentCount(video.commentCount)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDuration(video.durationSeconds)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(video.publishedAt)}</span>
                          </div>
                        </div>
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {video.tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-purple-600">
                                #{tag}
                              </span>
                            ))}
                            {video.tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{video.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {activeTab === 'search' && nextPageToken && (
                  <div className="mt-6 flex justify-center">
                    <Button 
                      onClick={loadMoreVideos} 
                      disabled={loadingMore}
                      className="gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vault' && savedVideos.length > 0 && (
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setActiveTab('search')}
                  className="gap-2 mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.backToSearch')}
                </Button>
                <h2 className="text-xl font-semibold mb-4">
                  <span className="text-purple-600 dark:text-purple-400">Saved ({savedVideos.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {savedVideos.map((video) => (
                    <Card 
                      key={video.videoId} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => handleSelectVideo(video)}
                    >
                      <div className="aspect-video relative">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        {video.durationSeconds && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                            {formatDuration(video.durationSeconds)}
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {generatePatternTags(video).map((tag, idx) => (
                            <span 
                              key={idx} 
                              className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium"
                            >
                              {t(`videoResearch.${tag}`)}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVideos(prev => {
                              const exists = prev.some(v => v.videoId === video.videoId);
                              if (exists) {
                                return prev.filter(v => v.videoId !== video.videoId);
                              }
                              return [...prev, video];
                            });
                          }}
                          className={`absolute top-2 left-2 bg-black/70 p-1.5 rounded-full hover:bg-black/90 transition-colors z-20 ${selectedVideos.some(v => v.videoId === video.videoId) ? 'bg-purple-600' : ''}`}
                        >
                          <CheckCircle className={`h-4 w-4 ${selectedVideos.some(v => v.videoId === video.videoId) ? 'text-white fill-white' : 'text-white'}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSavedVideos(prev => {
                              const exists = prev.some(sv => sv.videoId === video.videoId);
                              if (exists) {
                                return prev.filter(sv => sv.videoId !== video.videoId);
                              }
                              return [...prev, { ...video, savedAt: new Date().toISOString(), status: 'pending' as const }];
                            });
                          }}
                          className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full hover:bg-black/90 transition-colors z-20"
                        >
                          <Bookmark className={`h-4 w-4 ${savedVideos.some(sv => sv.videoId === video.videoId) ? 'text-purple-400 fill-purple-400' : 'text-white'}`} />
                        </button>
                        {insightVideoId === video.videoId && (
                          <div 
                            className="absolute left-0 right-0 mx-2 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="font-semibold mb-1 text-yellow-400">{t('videoResearch.whyItWorks')}</p>
                            <ul className="space-y-1">
                              {generateInsights(video).map((insight, idx) => (
                                <li key={idx}>• {insight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectVideo(video);
                            }}
                            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white border-0 gap-2"
                          >
                            <Sparkles className="h-4 w-4" />
                            Analyze
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{video.channelName}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {activeTab === 'vault' && 'status' in video && (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                              video.status === 'completed' ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400' :
                              video.status === 'analyzing' ? 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400' :
                              'bg-gray-50 dark:bg-gray-950/30 text-gray-600 dark:text-gray-400'
                            }`}>
                              {video.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> :
                               video.status === 'analyzing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                               <Clock className="h-3.5 w-3.5" />}
                              <span>{video.status === 'completed' ? t('videoResearch.analyzed') : video.status === 'analyzing' ? t('videoResearch.analyzing') : t('videoResearch.pending')}</span>
                            </div>
                          )}
                          {video.viewCount && (
                            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs font-medium">
                              <Eye className="h-3.5 w-3.5" />
                              <span>{formatViewCount(video.viewCount)}</span>
                            </div>
                          )}
                          {video.likeCount && (
                            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full text-xs font-medium">
                              <Heart className="h-3.5 w-3.5" />
                              <span>{formatViewCount(video.likeCount)}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

          {selectedVideo && (
            <div className="space-y-6">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedVideo(null);
                  setActiveTab(previousTab);
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {previousTab === 'vault' ? t('videoResearch.backToSaved') : t('videoResearch.backToSearch')}
              </Button>
              <Card className="border-2 border-purple-500 shadow-lg shadow-purple-100 dark:shadow-purple-900/30">
                <CardHeader>
                  <CardTitle className="text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    {t('videoResearch.selectedVideo')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                      <div className="w-80 flex-shrink-0">
                        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                          <iframe
                            src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=0`}
                            title={selectedVideo.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{selectedVideo.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{selectedVideo.channelName}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant={selectedVideo.videoType === 'SHORT' ? 'destructive' : 'default'}>
                            {selectedVideo.videoType}
                          </Badge>
                          {selectedVideo.viewCount && (
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {formatViewCount(selectedVideo.viewCount)} {t('common.views')}
                            </span>
                          )}
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(selectedVideo.durationSeconds)}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4 gap-2"
                          onClick={() => {
                            setSavedVideos(prev => {
                              const exists = prev.some(sv => sv.videoId === selectedVideo.videoId);
                              if (exists) {
                                return prev.filter(sv => sv.videoId !== selectedVideo.videoId);
                              }
                              return [...prev, { ...selectedVideo, savedAt: new Date().toISOString(), status: 'pending' as const }];
                            });
                          }}
                        >
                          <Bookmark className={`h-4 w-4 ${savedVideos.some(sv => sv.videoId === selectedVideo.videoId) ? 'fill-purple-600 text-purple-600' : ''}`} />
                          {savedVideos.some(sv => sv.videoId === selectedVideo.videoId) ? t('videoResearch.saved') : t('videoResearch.save')}
                        </Button>
                        <Button 
                          className="mt-4 ml-2 bg-purple-600 hover:bg-purple-700 gap-2 shadow-lg shadow-purple-200"
                          size="lg"
                          onClick={() => setAnalysisMode(true)}
                        >
                          <Sparkles className="h-5 w-5" />
                          {t('common.openAIWorkspace')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {!analysisMode && (
                  <Card className="p-8 text-center">
                    <CardContent>
                      <Brain className="h-16 w-16 mx-auto text-purple-300 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('common.aiAnalysisReady')}</h3>
                      <p className="text-gray-500 mb-4">{t('videoResearch.clickToAnalyze')}</p>
                    </CardContent>
                  </Card>
                )}

                {analysisMode && (
                  <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
                    <div className="min-h-screen">
                      <div className="bg-white border-b border-gray-200 px-6 py-3">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            <span className="font-semibold text-gray-900">{t('common.aiAnalysisWorkspace')}</span>
                            {selectedVideo && (
                              <>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-600 text-sm">{t('common.video')} {selectedVideo.title}</span>
                              </>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setAnalysisMode(false)}
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          >
                            Exit Workspace
                            <X className="h-4 w-4 ml-2" />
                          </Button>
                          <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
                            <span className="text-purple-600 text-sm font-medium">{t('videoResearch.tokens')}</span>
                            <span className="text-purple-700 font-bold">{tokenBalance}</span>
                          </div>
                        </div>
                      </div>

                      {!selectedVideo && (
                        <div className="flex flex-col items-center justify-center py-20">
                          <Brain className="h-20 w-20 text-purple-200 mb-6" />
                          <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('videoResearch.noVideoSelected')}</h2>
                          <p className="text-gray-500 mb-6 text-center max-w-md">
                            {t('common.searchAndSelect')}
                          </p>
                          <Button onClick={() => setAnalysisMode(false)} className="bg-purple-600 hover:bg-purple-700 text-white">
                            {t('common.searchVideos')}
                          </Button>
                        </div>
                      )}

                      <div className="max-w-7xl mx-auto p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                             <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-lg">
                              <iframe
                                src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=0`}
                                title={selectedVideo.title}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">{selectedVideo.title}</h3>
                              <p className="text-gray-600">{selectedVideo.channelName}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Eye className="h-4 w-4" />
                                  {selectedVideo.viewCount ? formatViewCount(selectedVideo.viewCount) : '0'} {t('common.views')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {selectedVideo.durationSeconds ? formatDuration(selectedVideo.durationSeconds) : '0:00'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  6 months ago
                                </span>
                              </div>
                            </div>
                      <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <TrendingUpIcon className="h-5 w-5 text-purple-500" />
                          Performance Intelligence
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                          <Card 
                            className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'contentPotential' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                            onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'contentPotential' ? null : 'contentPotential')}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${activeAnalysisCard === 'contentPotential' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                                  <Target className={`h-5 w-5 ${activeAnalysisCard === 'contentPotential' ? 'text-purple-600' : 'text-purple-600'}`} />
                                </div>
                                <CardTitle className="text-base">{t('analysis.predictContentPotential')}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <Button
                                size="sm"
                                variant={analysisResults.contentPotential ? "outline" : "default"}
                                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={analyzingCard === 'contentPotential'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runAnalysis(
                                    'contentPotential',
                                    `Analyze the content potential of this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide insights on content quality, value proposition, and viral potential.`,
                                    'You are a YouTube content strategist. Analyze the video and predict its content potential, including content quality, audience value, and viral characteristics.'
                                  );
                                }}
                              >
                                {analyzingCard === 'contentPotential' ? (
                                  <>
                                    <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                  </>
                                ) : analysisResults.contentPotential ? (
                                  t('videoResearch.viewAnalysis')
                                ) : (
                                  <>
                                    Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                          <Card 
                            className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'clickProbability' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                            onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'clickProbability' ? null : 'clickProbability')}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${activeAnalysisCard === 'clickProbability' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                  <MousePointerClick className={`h-5 w-5 ${activeAnalysisCard === 'clickProbability' ? 'text-purple-600' : 'text-blue-600'}`} />
                                </div>
                                <CardTitle className="text-base">{t('analysis.clickProbability')}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <Button
                                size="sm"
                                variant={analysisResults.clickProbability ? "outline" : "default"}
                                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={analyzingCard === 'clickProbability'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runAnalysis(
                                    'clickProbability',
                                    `Analyze the click probability of this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide a detailed analysis of what makes people click or not click on this video.`,
                                    'You are a YouTube optimization expert. Analyze the video and provide detailed insights about click probability, including strengths, weaknesses, and improvement opportunities.'
                                  );
                                }}
                              >
                                {analyzingCard === 'clickProbability' ? (
                                  <>
                                    <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                  </>
                                ) : analysisResults.clickProbability ? (
                                  t('videoResearch.viewAnalysis')
                                ) : (
                                  <>
                                    Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                          <Card 
                            className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'retentionStrength' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                            onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'retentionStrength' ? null : 'retentionStrength')}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${activeAnalysisCard === 'retentionStrength' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                                  <Repeat className={`h-5 w-5 ${activeAnalysisCard === 'retentionStrength' ? 'text-purple-600' : 'text-green-600'}`} />
                                </div>
                                <CardTitle className="text-base">{t('analysis.retentionStrength')}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <Button
                                size="sm"
                                variant={analysisResults.retentionStrength ? "outline" : "default"}
                                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={analyzingCard === 'retentionStrength'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runAnalysis(
                                    'retentionStrength',
                                    `Analyze the retention strength of this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide insights on what keeps viewers watching and where they might drop off.`,
                                    'You are a YouTube retention expert. Analyze the video and predict viewer retention patterns, including watch time factors, engagement hooks, and drop-off points.'
                                  );
                                }}
                              >
                                {analyzingCard === 'retentionStrength' ? (
                                  <>
                                    <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                  </>
                                ) : analysisResults.retentionStrength ? (
                                  t('videoResearch.viewAnalysis')
                                ) : (
                                  <>
                                    Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                          <Card 
                            className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'revenuePotential' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                            onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'revenuePotential' ? null : 'revenuePotential')}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${activeAnalysisCard === 'revenuePotential' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                                  <DollarSign className={`h-5 w-5 ${activeAnalysisCard === 'revenuePotential' ? 'text-purple-600' : 'text-purple-600'}`} />
                                </div>
                                <CardTitle className="text-base">{t('analysis.revenuePotential')}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <Button
                                size="sm"
                                variant={analysisResults.revenuePotential ? "outline" : "default"}
                                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={analyzingCard === 'revenuePotential'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runAnalysis(
                                    'revenuePotential',
                                    `Analyze the revenue potential of this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide insights on monetization opportunities, ad revenue potential, and sponsorship value.`,
                                    'You are a YouTube monetization expert. Analyze the video and predict its revenue potential, including ad revenue, sponsorship opportunities, and monetization strategies.'
                                  );
                                }}
                              >
                                {analyzingCard === 'revenuePotential' ? (
                                  <>
                                    <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                  </>
                                ) : analysisResults.revenuePotential ? (
                                  t('videoResearch.viewAnalysis')
                                ) : (
                                  <>
                                    Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                  </>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {activeAnalysisCard === 'clickProbability' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <MousePointerClick className="h-5 w-5 text-purple-600" />
                              Click Probability Analysis
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.clickProbability ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.clickProbability}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'contentPotential' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <Target className="h-5 w-5 text-purple-600" />
                              Content Potential Analysis
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.contentPotential ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.contentPotential}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'retentionStrength' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <Repeat className="h-5 w-5 text-purple-600" />
                              Retention Strength Analysis
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.retentionStrength ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.retentionStrength}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'revenuePotential' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <DollarSign className="h-5 w-5 text-purple-600" />
                              Revenue Potential Analysis
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.revenuePotential ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.revenuePotential}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <ZapIcon className="h-5 w-5 text-purple-500" />
                        Viral Mechanics
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <Card 
                          className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'whyThisWorks' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                          onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'whyThisWorks' ? null : 'whyThisWorks')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeAnalysisCard === 'whyThisWorks' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                                <Lightbulb className={`h-5 w-5 ${activeAnalysisCard === 'whyThisWorks' ? 'text-purple-600' : 'text-yellow-600'}`} />
                              </div>
                              <CardTitle className="text-base">{t('analysis.whyThisWorks')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              size="sm"
                              variant={analysisResults.whyThisWorks ? "outline" : "default"}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                              disabled={analyzingCard === 'whyThisWorks'}
                              onClick={(e) => {
                                e.stopPropagation();
                                runAnalysis(
                                  'whyThisWorks',
                                  `Analyze why this YouTube video works and what makes it successful. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Identify the key success factors, viral elements, and what resonates with the audience.`,
                                  'You are a YouTube analytics expert. Analyze the video to explain why it works, identifying success factors, audience appeal, and viral elements.'
                                );
                              }}
                            >
                              {analyzingCard === 'whyThisWorks' ? (
                                <>
                                  <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                </>
                              ) : analysisResults.whyThisWorks ? (
                                t('videoResearch.viewAnalysis')
                              ) : (
                                <>
                                  Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                        <Card 
                          className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'hookStructure' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                          onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'hookStructure' ? null : 'hookStructure')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeAnalysisCard === 'hookStructure' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-pink-100 dark:bg-pink-900/30'}`}>
                                <FileText className={`h-5 w-5 ${activeAnalysisCard === 'hookStructure' ? 'text-purple-600' : 'text-pink-600'}`} />
                              </div>
                              <CardTitle className="text-base">{t('analysis.hookStructure')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              size="sm"
                              variant={analysisResults.hookStructure ? "outline" : "default"}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                              disabled={analyzingCard === 'hookStructure'}
                              onClick={(e) => {
                                e.stopPropagation();
                                runAnalysis(
                                  'hookStructure',
                                  `Analyze the hook and structure of this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide a detailed breakdown of the opening hook, pacing, sections, and closing.`,
                                  'You are a YouTube content structure expert. Analyze the video hook and structure, providing insights on opening, pacing, content flow, and closing.'
                                );
                              }}
                            >
                              {analyzingCard === 'hookStructure' ? (
                                <>
                                  <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                </>
                              ) : analysisResults.hookStructure ? (
                                t('videoResearch.viewAnalysis')
                              ) : (
                                <>
                                  Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                        <Card 
                          className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'contentDna' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                          onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'contentDna' ? null : 'contentDna')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeAnalysisCard === 'contentDna' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-cyan-100 dark:bg-cyan-900/30'}`}>
                                <Dna className={`h-5 w-5 ${activeAnalysisCard === 'contentDna' ? 'text-purple-600' : 'text-cyan-600'}`} />
                              </div>
                              <CardTitle className="text-base">{t('analysis.contentDna')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              size="sm"
                              variant={analysisResults.contentDna ? "outline" : "default"}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                              disabled={analyzingCard === 'contentDna'}
                              onClick={(e) => {
                                e.stopPropagation();
                                runAnalysis(
                                  'contentDna',
                                  `Analyze the content DNA patterns of this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Identify recurring themes, storytelling techniques, and content patterns that make this video unique.`,
                                  'You are a YouTube content patterns expert. Analyze the video to identify content DNA, recurring themes, storytelling approaches, and unique content patterns.'
                                );
                              }}
                            >
                              {analyzingCard === 'contentDna' ? (
                                <>
                                  <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                </>
                              ) : analysisResults.contentDna ? (
                                t('videoResearch.viewAnalysis')
                              ) : (
                                <>
                                  Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                        <Card 
                          className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'patternFusion' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                          onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'patternFusion' ? null : 'patternFusion')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeAnalysisCard === 'patternFusion' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>
                                <GitMerge className={`h-5 w-5 ${activeAnalysisCard === 'patternFusion' ? 'text-purple-600' : 'text-indigo-600'}`} />
                              </div>
                              <CardTitle className="text-base">{t('analysis.patternFusion')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              size="sm"
                              variant={analysisResults.patternFusion ? "outline" : "default"}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                              disabled={analyzingCard === 'patternFusion'}
                              onClick={(e) => {
                                e.stopPropagation();
                                runAnalysis(
                                  'patternFusion',
                                  `Analyze the pattern fusion techniques used in this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Identify how different content elements, formats, and trends are combined to create unique content.`,
                                  'You are a YouTube content innovation expert. Analyze how the video combines different patterns, formats, and trends to create something unique and engaging.'
                                );
                              }}
                            >
                              {analyzingCard === 'patternFusion' ? (
                                <>
                                  <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                </>
                              ) : analysisResults.patternFusion ? (
                                t('videoResearch.viewAnalysis')
                              ) : (
                                <>
                                  Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </div>

                      {activeAnalysisCard === 'whyThisWorks' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <Lightbulb className="h-5 w-5 text-purple-600" />
                              Why This Works Analysis
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.whyThisWorks ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.whyThisWorks}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'hookStructure' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <FileText className="h-5 w-5 text-purple-600" />
                              Hook & Structure Breakdown
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.hookStructure ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.hookStructure}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'contentDna' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <Dna className="h-5 w-5 text-purple-600" />
                              Content DNA Patterns
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.contentDna ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.contentDna}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'patternFusion' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <GitMerge className="h-5 w-5 text-purple-600" />
                              Pattern Fusion Analysis
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.patternFusion ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.patternFusion}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-purple-500" />
                        Creative Optimization
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <Card 
                          className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'packagingOptimizer' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                          onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'packagingOptimizer' ? null : 'packagingOptimizer')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeAnalysisCard === 'packagingOptimizer' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-teal-100 dark:bg-teal-900/30'}`}>
                                <Package className={`h-5 w-5 ${activeAnalysisCard === 'packagingOptimizer' ? 'text-purple-600' : 'text-teal-600'}`} />
                              </div>
                              <CardTitle className="text-base">{t('analysis.packagingOptimizer')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              size="sm"
                              variant={analysisResults.packagingOptimizer ? "outline" : "default"}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                              disabled={analyzingCard === 'packagingOptimizer'}
                              onClick={(e) => {
                                e.stopPropagation();
                                runAnalysis(
                                  'packagingOptimizer',
                                  `Optimize the video packaging (thumbnail, title, description) for this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide recommendations for thumbnail, title, tags, and description to maximize click-through rate.`,
                                  'You are a YouTube SEO and thumbnail expert. Analyze the video packaging and provide optimization recommendations for titles, thumbnails, descriptions, and tags.'
                                );
                              }}
                            >
                              {analyzingCard === 'packagingOptimizer' ? (
                                <>
                                  <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                </>
                              ) : analysisResults.packagingOptimizer ? (
                                t('videoResearch.viewAnalysis')
                              ) : (
                                <>
                                  Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                        <Card 
                          className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'improveHookCta' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                          onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'improveHookCta' ? null : 'improveHookCta')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeAnalysisCard === 'improveHookCta' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                <Megaphone className={`h-5 w-5 ${activeAnalysisCard === 'improveHookCta' ? 'text-purple-600' : 'text-red-600'}`} />
                              </div>
                              <CardTitle className="text-base">{t('analysis.improveHookCta')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              size="sm"
                              variant={analysisResults.improveHookCta ? "outline" : "default"}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                              disabled={analyzingCard === 'improveHookCta'}
                              onClick={(e) => {
                                e.stopPropagation();
                                runAnalysis(
                                  'improveHookCta',
                                  `Improve the hook and call-to-action for this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide specific suggestions to make the opening more compelling and the CTA more effective.`,
                                  'You are a YouTube engagement expert. Analyze the video hook and CTA, then provide specific improvements to increase viewer retention and action.'
                                );
                              }}
                            >
                              {analyzingCard === 'improveHookCta' ? (
                                <>
                                  <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                </>
                              ) : analysisResults.improveHookCta ? (
                                t('videoResearch.viewAnalysis')
                              ) : (
                                <>
                                  Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                        <Card 
                          className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'adjustTone' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                          onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'adjustTone' ? null : 'adjustTone')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeAnalysisCard === 'adjustTone' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-violet-100 dark:bg-violet-900/30'}`}>
                                <Volume2 className={`h-5 w-5 ${activeAnalysisCard === 'adjustTone' ? 'text-purple-600' : 'text-violet-600'}`} />
                              </div>
                              <CardTitle className="text-base">{t('analysis.adjustTone')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              size="sm"
                              variant={analysisResults.adjustTone ? "outline" : "default"}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                              disabled={analyzingCard === 'adjustTone'}
                              onClick={(e) => {
                                e.stopPropagation();
                                runAnalysis(
                                  'adjustTone',
                                  `Analyze and suggest improvements for the tone and energy of this YouTube video. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide recommendations on voice, pacing, energy levels, and emotional tone to better connect with the target audience.`,
                                  'You are a YouTube presentation expert. Analyze the video tone and energy, then provide specific suggestions to improve delivery and audience connection.'
                                );
                              }}
                            >
                              {analyzingCard === 'adjustTone' ? (
                                <>
                                  <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                </>
                              ) : analysisResults.adjustTone ? (
                                t('videoResearch.viewAnalysis')
                              ) : (
                                <>
                                  Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                        <Card 
                          className={`hover:shadow-md transition-all cursor-pointer border-2 ${activeAnalysisCard === 'creatorStrategy' ? 'border-purple-500 shadow-lg shadow-purple-100' : 'border-transparent'}`}
                          onClick={() => setActiveAnalysisCard(activeAnalysisCard === 'creatorStrategy' ? null : 'creatorStrategy')}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeAnalysisCard === 'creatorStrategy' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                <Users className={`h-5 w-5 ${activeAnalysisCard === 'creatorStrategy' ? 'text-purple-600' : 'text-amber-600'}`} />
                              </div>
                              <CardTitle className="text-base">{t('analysis.creatorStrategy')}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Button
                              size="sm"
                              variant={analysisResults.creatorStrategy ? "outline" : "default"}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                              disabled={analyzingCard === 'creatorStrategy'}
                              onClick={(e) => {
                                e.stopPropagation();
                                runAnalysis(
                                  'creatorStrategy',
                                  `Develop a comprehensive creator strategy for this YouTube video and channel. Video title: "${selectedVideo?.title}". Channel: "${selectedVideo?.channelName}". Provide recommendations for content strategy, audience growth, posting schedule, and long-term channel development.`,
                                  'You are a YouTube growth strategist. Analyze the channel and video, then provide comprehensive creator strategy recommendations for growth and sustainability.'
                                );
                              }}
                            >
                              {analyzingCard === 'creatorStrategy' ? (
                                <>
                                  <span className="animate-pulse mr-1">{t('videoResearch.analyzing')}</span>
                                </>
                              ) : analysisResults.creatorStrategy ? (
                                t('videoResearch.viewAnalysis')
                              ) : (
                                <>
                                  Analyze <span className="ml-1 text-purple-200">(3 tokens)</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </div>

                      {activeAnalysisCard === 'packagingOptimizer' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <Package className="h-5 w-5 text-purple-600" />
                              Packaging Optimizer
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.packagingOptimizer ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.packagingOptimizer}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'improveHookCta' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <Megaphone className="h-5 w-5 text-purple-600" />
                              Improve Hook & CTA
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.improveHookCta ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.improveHookCta}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'adjustTone' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <Volume2 className="h-5 w-5 text-purple-600" />
                              Adjust Tone & Energy
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.adjustTone ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.adjustTone}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAnalysisCard === 'creatorStrategy' && (
                        <div className="mt-4 bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                            <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                              <Users className="h-5 w-5 text-purple-600" />
                              Creator Strategy Engine
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {analysisResults.creatorStrategy ? (
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{analysisResults.creatorStrategy}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4">{t('videoResearch.clickToGenerate')}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-1">
                      <div className="sticky top-4 space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Brain className="h-4 w-4 text-purple-600" />
                          Video Intelligence
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-1.5 border-b border-gray-100">
                            <span className="text-gray-500">{t('videoResearch.hookType')}</span>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">{t('videoResearch.curiosity')}</Badge>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-gray-100">
                            <span className="text-gray-500">{t('videoResearch.energyLevel')}</span>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">{t('videoResearch.high')}</Badge>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-gray-100">
                            <span className="text-gray-500">{t('videoResearch.structure')}</span>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">{t('videoResearch.storyFormat')}</Badge>
                          </div>
                          <div className="flex justify-between py-1.5">
                            <span className="text-gray-500">{t('videoResearch.ctaStrength')}</span>
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">{t('videoResearch.potential')}</Badge>
                          </div>
                        </div>
                      </div>

                      <Card className="border border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-purple-600" />
                            Quick Actions
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button 
                            className="w-full bg-purple-600 hover:bg-purple-700 text-sm" 
                            size="sm"
                            disabled={generatingHooks}
                            onClick={() => {
                              if (!selectedVideo) {
                                setVideoError(t('common.pleaseSelectVideo'));
                                return;
                              }
                              generateHooks();
                              setActiveQuickAction('hooks');
                            }}
                          >
                            {generatingHooks ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileEdit className="h-4 w-4 mr-2" />}
                            {t('quickActions.generateHooks')}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full text-sm" 
                            size="sm"
                            disabled={generatingScripts}
                            onClick={() => {
                              if (!selectedVideo) {
                                setVideoError(t('common.pleaseSelectVideo'));
                                return;
                              }
                              generateScripts();
                              setActiveQuickAction('scripts');
                            }}
                          >
                            <Wand2 className="h-4 w-4 mr-2" />
                            {t('quickActions.generateScripts')}
                          </Button>
                        </CardContent>
                      </Card>

                      {activeQuickAction === 'hooks' && (
                        <div className="bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-3 py-2">
                            <h4 className="font-semibold text-purple-900 text-sm flex items-center gap-2">
                              <FileEdit className="h-4 w-4" />
                              {t('quickActions.hooksGenerated')}
                            </h4>
                          </div>
                          <div className="p-3">
                            {generatingHooks ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                <span className="ml-2 text-sm text-gray-500">{t('common.generating')}</span>
                              </div>
                            ) : generatedHooks ? (
                              <ReactMarkdown>{generatedHooks}</ReactMarkdown>
                            ) : (
                              <div className="text-sm text-gray-500 text-center py-2">
                                {t('common.noResults')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeQuickAction === 'scripts' && (
                        <div className="bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
                          <div className="bg-purple-50 border-b border-purple-100 px-3 py-2">
                            <h4 className="font-semibold text-purple-900 text-sm flex items-center gap-2">
                              <Wand2 className="h-4 w-4" />
                              {t('quickActions.scriptGenerated')}
                            </h4>
                          </div>
                          <div className="p-3">
                            {generatingScripts ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                <span className="ml-2 text-sm text-gray-500">{t('common.generating')}</span>
                              </div>
                            ) : generatedScripts ? (
                              <ReactMarkdown>{generatedScripts}</ReactMarkdown>
                            ) : (
                              <div className="text-sm text-gray-500 text-center py-2">
                                {t('common.noResults')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
                )}
              </div>
            )}
      </div>
    </div>
  );
}
