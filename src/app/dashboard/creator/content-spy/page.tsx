'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  Search, 
  Loader2, 
  Sparkles,
  Palette,
  Target,
  Clock,
  Layers,
  TrendingUp,
  DollarSign,
  Bookmark,
  X,
  ChevronDown,
  ChevronRight,
  Wand2,
  Plus,
  GitCompare,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';

interface SavedVideo {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  videoType: string;
  viewCount?: number;
  durationSeconds?: number;
  savedAt: string;
}

interface SpyVideo {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  tags: string[];
  views: number;
  likes: number;
  publishDate: string;
  transcript?: string;
}

interface CompareResult {
  videos: { id: string; title: string; thumbnail: string }[];
  features: Record<string, Record<string, unknown>>;
  tokensUsed: number;
  analyzedAt: string;
}

const aiFeatures = [
  { id: 'title-thumbnail', name: 'Title & Thumbnail', description: 'Generate optimized titles', icon: Palette, color: 'bg-pink-500', href: '/dashboard/creator/title-thumbnail' },
  { id: 'ctr-prediction', name: 'CTR Prediction', description: 'Predict click-through rate', icon: Target, color: 'bg-blue-500', href: '/dashboard/creator/ctr-probability' },
  { id: 'retention-analysis', name: 'Retention Analysis', description: 'Predict viewer retention', icon: Clock, color: 'bg-purple-500', href: '/dashboard/creator/retention-probability' },
  { id: 'expected-value', name: 'Expected Value', description: 'Calculate revenue potential', icon: DollarSign, color: 'bg-green-500', href: '/dashboard/creator/expected-value' },
  { id: 'viral-mechanics', name: 'Viral Mechanics', description: 'Analyze viral patterns', icon: TrendingUp, color: 'bg-red-500', href: '/dashboard/creator/viral-patterns' },
  { id: 'pattern-fusion', name: 'Pattern Fusion', description: 'Blend viral patterns', icon: Layers, color: 'bg-indigo-500', href: '/dashboard/creator/pattern-blending' },
];

function ContentSpyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const getFeatureName = (id: string) => {
    const keys: Record<string, string> = {
      'title-thumbnail': 'contentSpy.feature.titleThumbnail',
      'ctr-prediction': 'contentSpy.feature.ctrPrediction',
      'retention-analysis': 'contentSpy.feature.retentionAnalysis',
      'expected-value': 'contentSpy.feature.expectedValue',
      'viral-mechanics': 'contentSpy.feature.viralMechanics',
      'pattern-fusion': 'contentSpy.feature.patternFusion',
    };
    return t(keys[id] || id);
  };
  
  const getFeatureDescription = (id: string) => {
    const keys: Record<string, string> = {
      'title-thumbnail': 'contentSpy.feature.titleThumbnailDesc',
      'ctr-prediction': 'contentSpy.feature.ctrPredictionDesc',
      'retention-analysis': 'contentSpy.feature.retentionAnalysisDesc',
      'expected-value': 'contentSpy.feature.expectedValueDesc',
      'viral-mechanics': 'contentSpy.feature.viralMechanicsDesc',
      'pattern-fusion': 'contentSpy.feature.patternFusionDesc',
    };
    return t(keys[id] || id);
  };
  
  const [urlInput, setUrlInput] = useState('');
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingVideo, setLoadingVideo] = useState(false);
  
  const [currentVideo, setCurrentVideo] = useState<SpyVideo | null>(null);
  const [showCompareMode, setShowCompareMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<SpyVideo[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareResults, setCompareResults] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'select' | 'results'>('select');

  useEffect(() => {
    function loadSavedVideos() {
      try {
        const stored = localStorage.getItem('vaultVideos');
        if (stored) setSavedVideos(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading saved videos:', error);
      } finally {
        setLoadingSaved(false);
      }
    }
    loadSavedVideos();
  }, []);

  useEffect(() => {
    const videoId = searchParams.get('videoId');
    const source = searchParams.get('source');
    if (videoId && source === 'content-spy') {
      const found = savedVideos.find(v => v.videoId === videoId);
      if (found) handleVideoSelect(found);
    }
  }, [searchParams, savedVideos]);

  useEffect(() => {
    const stored = localStorage.getItem('contentSpyCurrentVideo');
    if (stored) {
      try { setCurrentVideo(JSON.parse(stored)); } catch (e) { console.error('Error loading current video:', e); }
    }
  }, []);

  useEffect(() => {
    if (currentVideo) {
      localStorage.setItem('contentSpyCurrentVideo', JSON.stringify(currentVideo));
    } else {
      localStorage.removeItem('contentSpyCurrentVideo');
    }
  }, [currentVideo]);

  const extractVideoId = (url: string): string | null => {
    const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/, /^([a-zA-Z0-9_-]{11})$/];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleAddVideo = async () => {
    const videoId = extractVideoId(urlInput);
    if (!videoId) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid YouTube URL', variant: 'destructive' });
      return;
    }
    setLoadingVideo(true);
    try {
      const newVideo: SpyVideo = { id: videoId, title: `YouTube Video ${videoId}`, thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, description: '', tags: [], views: 0, likes: 0, publishDate: new Date().toISOString() };
      setCurrentVideo(newVideo);
      setUrlInput('');
      toast({ title: 'Video loaded', description: 'Video added successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load video', variant: 'destructive' });
    } finally {
      setLoadingVideo(false);
    }
  };

  const handleVideoSelect = (video: SavedVideo) => {
    const newVideo: SpyVideo = { id: video.videoId, title: video.title, thumbnail: video.thumbnailUrl, description: '', tags: [], views: video.viewCount || 0, likes: 0, publishDate: video.savedAt };
    setCurrentVideo(newVideo);
    setShowSavedDropdown(false);
  };

  const handleAddToCompare = () => {
    if (!currentVideo) return;
    if (selectedVideos.length >= 3) {
      toast({ title: 'Maximum reached', description: 'You can compare up to 3 videos', variant: 'destructive' });
      return;
    }
    if (selectedVideos.find(v => v.id === currentVideo.id)) {
      toast({ title: 'Already added', description: 'Video already in comparison list', variant: 'destructive' });
      return;
    }
    setSelectedVideos([...selectedVideos, currentVideo]);
    toast({ title: 'Added to comparison', description: 'Video added to compare list' });
  };

  const handleRemoveFromCompare = (videoId: string) => {
    setSelectedVideos(selectedVideos.filter(v => v.id !== videoId));
  };

  const handleClearAll = () => {
    setSelectedVideos([]);
    setSelectedFeatures([]);
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => prev.includes(featureId) ? prev.filter(f => f !== featureId) : [...prev, featureId]);
  };

  const toggleFeatureExpanded = (featureId: string) => {
    setExpandedFeatures(prev => ({ ...prev, [featureId]: !prev[featureId] }));
  };

  const handleCompare = async () => {
    if (selectedVideos.length === 0) {
      toast({ title: 'No videos selected', description: 'Please select at least one video', variant: 'destructive' });
      return;
    }
    if (selectedFeatures.length === 0) {
      toast({ title: 'No features selected', description: 'Please select at least one feature to analyze', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/creator/ai/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videos: selectedVideos, features: selectedFeatures }) });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Analysis failed'); }
      const data = await response.json();
      setCompareResults(data);
      setIsComparing(true);
      setViewMode('results');
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Analysis failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderFeatureContent = (featureId: string, videoId: string) => {
    if (!compareResults?.features?.[featureId]?.[videoId]) return <p className="text-sm text-gray-500">{t('contentSpy.noDataAvailable')}</p>;
    const data = compareResults.features[featureId][videoId] as Record<string, unknown>;
    
    if (featureId === 'title-thumbnail') return (
      <div className="space-y-2 text-sm">
        <div><span className="font-medium">{t('contentSpy.hookType')}</span> {(data.hookType as string) || '-'}</div>
        <div><span className="font-medium">{t('contentSpy.titleFormula')}</span> {(data.titleFormula as string) || '-'}</div>
        <div><span className="font-medium">{t('contentSpy.emotionalTrigger')}</span> {(data.emotionalTrigger as string) || '-'}</div>
        <div><span className="font-medium">{t('contentSpy.thumbnailStyle')}</span> {(data.thumbnailStyle as string) || '-'}</div>
      </div>
    );
    if (featureId === 'ctr-prediction') {
      const ctrFactors = data.ctrFactors as Record<string, string> | undefined;
      return (
        <div className="space-y-2 text-sm">
          <div><span className="font-medium">{t('contentSpy.predictedCTR')}</span> {data.predictedCTR ? `${data.predictedCTR}%` : '-'}</div>
          <div><span className="font-medium">{t('contentSpy.confidence')}</span> {data.confidenceScore ? `${data.confidenceScore}%` : '-'}</div>
          {ctrFactors && <div className="text-xs">{Object.entries(ctrFactors).map(([k, v]) => <div key={k}><span className="font-medium">{k}:</span> {v}</div>)}</div>}
        </div>
      );
    }
    if (featureId === 'retention-analysis') return (
      <div className="space-y-2 text-sm">
        <div><span className="font-medium">{t('contentSpy.hookStrength')}</span> {(data.hookStrength as string) || '-'}</div>
        <div><span className="font-medium">{t('contentSpy.dropoffRisk')}</span> {(data.dropOffRisk as string) || '-'}</div>
        <div><span className="font-medium">{t('contentSpy.curve')}</span> {(data.retentionCurve as string) || '-'}</div>
        <div><span className="font-medium">{t('contentSpy.pacing')}</span> {(data.pacingAssessment as string) || '-'}</div>
      </div>
    );
    if (featureId === 'expected-value') {
      const revenueFactors = data.revenueFactors as Record<string, string> | undefined;
      return (
        <div className="space-y-2 text-sm">
          <div><span className="font-medium">{t('contentSpy.estimatedRPM')}</span> {data.estimatedRPM ? `$${data.estimatedRPM}` : '-'}</div>
          <div><span className="font-medium">{t('contentSpy.confidence')}</span> {data.confidenceScore ? `${data.confidenceScore}%` : '-'}</div>
          {revenueFactors && <div className="text-xs">{Object.entries(revenueFactors).map(([k, v]) => <div key={k}><span className="font-medium">{k}:</span> {v}</div>)}</div>}
        </div>
      );
    }
    if (featureId === 'viral-mechanics') {
      const viralTriggers = data.viralTriggers as string[] | undefined;
      return (
        <div className="space-y-2 text-sm">
          <div><span className="font-medium">{t('contentSpy.viralScore')}</span> {data.viralScore ? String(data.viralScore) : '-'}</div>
          <div><span className="font-medium">{t('contentSpy.rewatchPotential')}</span> {(data.rewatchPotential as string) || '-'}</div>
          {viralTriggers && <div className="flex flex-wrap gap-1 mt-1">{viralTriggers.map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}</div>}
        </div>
      );
    }
    if (featureId === 'pattern-fusion') {
      const patternWeights = data.patternWeights as Record<string, string | number> | undefined;
      return (
        <div className="space-y-2 text-sm">
          <div><span className="font-medium">{t('contentSpy.dominant')}</span> {(data.dominantPattern as string) || '-'}</div>
          {patternWeights && <div className="text-xs">{Object.entries(patternWeights).map(([k, v]) => <div key={k}><span className="font-medium">{k}:</span> {String(v)}</div>)}</div>}
        </div>
      );
    }
    return null;
  };

  if (isComparing && compareResults) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Button variant="ghost" onClick={() => router.push('/dashboard/creator')} className="mb-4 gap-2"><ArrowLeft className="h-4 w-4" />{t('contentSpy.backToDashboard')}</Button>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-purple-600" />{t('contentSpy.comparisonResults')}</h2>
            <Button variant="outline" onClick={() => setIsComparing(false)}>{t('contentSpy.backToVideo')}</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {compareResults.videos.map((video) => (<Card key={video.id} className="overflow-hidden"><img src={video.thumbnail} alt={video.title} className="w-full aspect-video object-cover" /><CardContent className="p-3"><p className="font-medium text-sm truncate">{video.title}</p><a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">{t('contentSpy.watchOnYouTube')}</a></CardContent></Card>))}
          </div>
          <div className="space-y-4">
            {selectedFeatures.map((featureId) => {
              const feature = aiFeatures.find(f => f.id === featureId);
              if (!feature) return null;
              return (
                <Collapsible key={featureId} open={expandedFeatures[featureId]} onOpenChange={() => toggleFeatureExpanded(featureId)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${feature.color}`}>
                              <feature.icon className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle>{getFeatureName(feature.id)}</CardTitle>
                          </div>
                          {expandedFeatures[featureId] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className={`grid gap-4 ${compareResults.videos.length === 1 ? 'grid-cols-1' : compareResults.videos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {compareResults.videos.map((video) => (
                            <div key={video.id} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                <img src={video.thumbnail} alt={video.title} className="w-12 h-8 object-cover rounded" />
                                <span className="text-sm font-medium truncate">{video.title}</span>
                              </div>
                              {renderFeatureContent(featureId, video.id)}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Button variant="ghost" onClick={() => router.push('/dashboard/creator')} className="mb-4 gap-2"><ArrowLeft className="h-4 w-4" />{t('contentSpy.backToDashboard')}</Button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3"><Sparkles className="h-8 w-8 text-purple-600" />{t('contentSpy.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('contentSpy.subtitle')}</p>
        </div>

        {!showCompareMode ? (
          <div className="space-y-6">
            {currentVideo && (
              <div className="border-2 border-purple-500 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={currentVideo.thumbnail} alt={currentVideo.title} className="w-24 h-14 object-cover rounded" />
                    <div>
                      <h3 className="font-semibold">{t('contentSpy.currentlySpying')}</h3>
                      <p className="text-sm text-gray-500 truncate max-w-md">{currentVideo.title}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentVideo(null)} className="text-purple-600"><X className="h-4 w-4 mr-1" />{t('contentSpy.clear')}</Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      {t('contentSpy.addVideo')}
                    </CardTitle>
                    <CardDescription>{t('contentSpy.loadFromVault')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          placeholder={t('contentSpy.enterUrl')} 
                          value={urlInput} 
                          onChange={(e) => setUrlInput(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                          className="pl-10 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                      <Button 
                        onClick={handleAddVideo} 
                        disabled={loadingVideo}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {loadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : t('contentSpy.add')}
                      </Button>
                    </div>
                    <Popover open={showSavedDropdown} onOpenChange={setShowSavedDropdown}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full gap-2 border-dashed border-2 hover:border-purple-300 hover:bg-purple-50">
                          <Bookmark className="h-4 w-4 text-purple-500" />
                          {t('contentSpy.loadFromVault')}
                          <ChevronDown className="h-4 w-4 ml-auto text-gray-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 max-h-64 overflow-y-auto p-2">
                        {loadingSaved ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : savedVideos.length > 0 ? (
                          <div className="space-y-1">
                            {savedVideos.map((video) => (
                              <button 
                                key={video.videoId} 
                                onClick={() => handleVideoSelect(video)} 
                                className="flex items-center gap-3 w-full p-2 hover:bg-purple-50 rounded-lg transition-colors text-left"
                              >
                                <img src={video.thumbnailUrl} alt={video.title} className="w-16 h-10 object-cover rounded" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{video.title}</p>
                                  <p className="text-xs text-gray-500">{video.channelName}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center p-4">{t('contentSpy.noSavedVideos')}</p>
                        )}
                      </PopoverContent>
                    </Popover>
                    {currentVideo && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-sm text-gray-500">{t('contentSpy.videoId')} {currentVideo.id}</p>
                        <Button variant="outline" size="sm" onClick={handleAddToCompare} className="gap-1 border-purple-200 text-purple-600 hover:bg-purple-50">
                          <Plus className="h-4 w-4" />{t('contentSpy.addToCompare')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {currentVideo && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-600" />{t('contentSpy.deepAIAnalysis')}</CardTitle><CardDescription>{t('contentSpy.aiFeaturesForVideo')}</CardDescription></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiFeatures.map((feature) => (<Link key={feature.id} href={`${feature.href}?videoId=${currentVideo.id}&source=content-spy`}><div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer border"><div className={`p-2 rounded-lg ${feature.color}`}><feature.icon className="h-4 w-4 text-white" /></div><div className="flex-1"><p className="font-medium text-sm">{getFeatureName(feature.id)}</p><p className="text-xs text-gray-500">{getFeatureDescription(feature.id)}</p></div><ChevronRight className="h-4 w-4 text-gray-400" /></div></Link>))}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {currentVideo && selectedVideos.length === 0 && (
                  <Card className="border-2 border-purple-500 p-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                          <Play className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold text-purple-600">{t('contentSpy.preview')}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="h-[400px] rounded-lg overflow-hidden bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=0`}
                          title={currentVideo.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedVideos.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2"><GitCompare className="h-4 w-4" />{t('contentSpy.compareQueue')} ({selectedVideos.length})</CardTitle>
                        <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs h-7">{t('contentSpy.clear')}</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedVideos.map((video) => (<div key={video.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"><img src={video.thumbnail} alt={video.title} className="w-16 h-10 object-cover rounded" /><span className="flex-1 text-sm font-medium truncate">{video.title}</span><button onClick={() => handleRemoveFromCompare(video.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X className="h-3 w-3" /></button></div>))}
                      <Button onClick={() => setShowCompareMode(true)} className="w-full mt-2 gap-2 bg-purple-600 hover:bg-purple-700"><GitCompare className="h-4 w-4" />{t('contentSpy.openCompareMode')}</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2"><GitCompare className="h-5 w-5" />{t('contentSpy.multiVideoComparison')}</h2>
              <Button variant="outline" onClick={() => setShowCompareMode(false)} className="gap-2"><ArrowLeft className="h-4 w-4" />{t('contentSpy.backToSingleVideo')}</Button>
            </div>

            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  {t('contentSpy.addVideosToCompare')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      placeholder={t('contentSpy.pasteUrl')} 
                      value={urlInput} 
                      onChange={(e) => setUrlInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                      className="pl-9 bg-gray-50 border-gray-200"
                    />
                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <Button 
                    onClick={handleAddVideo} 
                    disabled={loadingVideo}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : t('contentSpy.add')}
                  </Button>
                </div>
                <Popover open={showSavedDropdown} onOpenChange={setShowSavedDropdown}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2 border-dashed border-2 hover:border-purple-300 hover:bg-purple-50">
                      <Bookmark className="h-4 w-4 text-purple-500" />
                      {t('contentSpy.loadFromSaved')}
                      <ChevronDown className="h-4 w-4 ml-auto text-gray-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 max-h-64 overflow-y-auto p-2">
                    {loadingSaved ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : savedVideos.length > 0 ? (
                      <div className="space-y-1">
                        {savedVideos.map((video) => (
                          <button 
                            key={video.videoId} 
                            onClick={() => handleVideoSelect(video)} 
                            className="flex items-center gap-3 w-full p-2 hover:bg-purple-50 rounded-lg transition-colors text-left"
                          >
                            <img src={video.thumbnailUrl} alt={video.title} className="w-16 h-10 object-cover rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{video.title}</p>
                              <p className="text-xs text-gray-500">{video.channelName}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center p-4">{t('contentSpy.noSavedVideos')}</p>
                    )}
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            {selectedVideos.length > 0 && (
              <Card>
                <CardHeader><CardTitle>{t('contentSpy.selectedVideos')} ({selectedVideos.length}/3)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {selectedVideos.map((video) => (<div key={video.id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-2"><img src={video.thumbnail} alt={video.title} className="w-24 h-14 object-cover rounded" /><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{video.title}</p></div><button onClick={() => handleRemoveFromCompare(video.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><X className="h-4 w-4" /></button></div>))}
                    {selectedVideos.length < 3 && currentVideo && !selectedVideos.find(v => v.id === currentVideo.id) && (<button onClick={() => setSelectedVideos([...selectedVideos, currentVideo])} className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"><Plus className="h-5 w-5 text-gray-400" /><span className="text-sm text-gray-500">{t('contentSpy.addCurrent')}</span></button>)}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit mx-auto">
              <button
                onClick={() => setViewMode('select')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'select' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {t('contentSpy.selectFeatures')}
              </button>
              <button
                onClick={() => setViewMode('results')}
                disabled={!compareResults}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'results' ? 'bg-white dark:bg-gray-700 shadow-sm text-purple-600' : !compareResults ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {t('contentSpy.showResults')}
              </button>
            </div>

            {viewMode === 'select' ? (
            <Card>
              <CardHeader><CardTitle>{t('contentSpy.selectFeaturesToCompare')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {aiFeatures.map((feature) => (<div key={feature.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"><Checkbox id={`feature-${feature.id}`} checked={selectedFeatures.includes(feature.id)} onCheckedChange={() => toggleFeature(feature.id)} /><label htmlFor={`feature-${feature.id}`} className="flex items-center gap-2 flex-1 cursor-pointer"><div className={`p-1.5 rounded ${feature.color}`}><feature.icon className="h-4 w-4 text-white" /></div><span className="font-medium">{getFeatureName(feature.id)}</span></label></div>))}
                </div>
                <Button onClick={handleCompare} disabled={isLoading || selectedVideos.length === 0 || selectedFeatures.length === 0} className="w-full mt-4 gap-2 bg-purple-600 hover:bg-purple-700">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {t('contentSpy.compare')} ({selectedVideos.length} {t('contentSpy.videos')} × {selectedFeatures.length} {t('contentSpy.features')} = {selectedVideos.length * selectedFeatures.length * 3} {t('contentSpy.tokens')})
                </Button>
              </CardContent>
            </Card>
            ) : (
              <div className="space-y-4">
                {selectedFeatures.map((featureId) => {
                  const feature = aiFeatures.find(f => f.id === featureId);
                  if (!feature || !compareResults) return null;
                  return (
                    <Collapsible key={featureId} open={expandedFeatures[featureId]} onOpenChange={() => toggleFeatureExpanded(featureId)}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${feature.color}`}>
                                  <feature.icon className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle>{getFeatureName(feature.id)}</CardTitle>
                              </div>
                              {expandedFeatures[featureId] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent>
                            <div className={`grid gap-4 ${compareResults.videos.length === 1 ? 'grid-cols-1' : compareResults.videos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                              {compareResults.videos.map((video) => (
                                <div key={video.id} className="border rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                    <img src={video.thumbnail} alt={video.title} className="w-12 h-8 object-cover rounded" />
                                    <span className="text-sm font-medium truncate">{video.title}</span>
                                  </div>
                                  {renderFeatureContent(featureId, video.id)}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContentSpyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ContentSpyContent />
    </Suspense>
  );
}
