'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Sparkles, Zap, Copy, Loader2, MousePointer, Image as ImageIcon, Lightbulb, RefreshCw, Link as LinkIcon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';

const CONTENT_TYPES = ['YouTube Video', 'YouTube Shorts'];
const TONE_STYLES = ['bold', 'mysterious', 'authority', 'controversial', 'humorous', 'curiosity-driven', 'disruptive'];

const TARGET_AUDIENCES = [
  { value: '13-17', label: 'Ages 13-17 (Teens)' },
  { value: '18-24', label: 'Ages 18-24 (Young adults)' },
  { value: '25-34', label: 'Ages 25-34 (Millennials)' },
  { value: '35-44', label: 'Ages 35-44 (Gen X)' },
  { value: '45-54', label: 'Ages 45-54' },
  { value: '55-64', label: 'Ages 55-64' },
  { value: '65+', label: 'Ages 65+' },
];

function TitleThumbnailContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    contentType: '',
    creatorNiche: '',
    targetAudience: [] as string[],
    coreVideoIdea: '',
    toneStyle: '',
    inspirationTitle: '',
    inspirationConcept: '',
    inspirationWhy: '',
    videoId: '',
    videoTitle: '',
    channelName: '',
  });

  const [tokensInfo, setTokensInfo] = useState({ tokensCredits: 0, tokensUsed: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [fetchingVideo, setFetchingVideo] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [result, setResult] = useState<{
    patternExtracted: string[];
    titles: string[];
    thumbnailText: string[];
    thumbnailConcepts: string[];
    rawResponse?: string;
  } | null>(null);
  const [historyResult, setHistoryResult] = useState<typeof result>(null);

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
      const savedHistory = localStorage.getItem('titleThumbnailHistory');
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          setHistoryResult(parsed);
        } catch (e) {
          console.error('Error loading history:', e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    
    const videoId = searchParams.get('videoId');
    const title = searchParams.get('title');
    const channel = searchParams.get('channel');
    const videoType = searchParams.get('videoType');

    if (title || videoId) {
      const contentType = videoType === 'SHORT' ? 'YouTube Shorts' : videoType === 'VIDEO' ? 'YouTube Video' : '';
      
      setFormData(prev => ({
        ...prev,
        contentType: contentType || prev.contentType,
        coreVideoIdea: title || prev.coreVideoIdea,
        inspirationTitle: title || prev.inspirationTitle,
        videoId: videoId || prev.videoId,
        videoTitle: title || prev.videoTitle,
        channelName: channel || prev.channelName,
      }));

      if (title) {
        toast({
          title: 'Video selected',
          description: `Generating titles for: ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`,
        });
      }
    }
  }, [searchParams, isLoaded]);

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

  const fetchYouTubeVideo = async (urlOrId: string) => {
    if (!urlOrId.trim()) return;
    
    setFetchingVideo(true);
    try {
      const res = await fetch(`/api/youtube/fetch-video?url=${encodeURIComponent(urlOrId)}`);
      const data = await res.json();
      
      if (!res.ok) {
        toast({
          title: 'Error fetching video',
          description: data.error || 'Failed to fetch video',
          variant: 'destructive',
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        videoId: data.videoId || '',
        inspirationTitle: data.title || prev.inspirationTitle,
        inspirationConcept: data.description ? data.description.substring(0, 200) : prev.inspirationConcept,
        channelName: data.channelName || prev.channelName,
      }));

      if (data.thumbnailUrl) {
        setVideoThumbnail(data.thumbnailUrl);
      }

      toast({
        title: 'Video fetched!',
        description: `Analyzing: ${data.title?.substring(0, 50)}...`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to fetch video data',
        variant: 'destructive',
      });
    } finally {
      setFetchingVideo(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.contentType || !formData.creatorNiche || !formData.coreVideoIdea) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in: content type, niche, and core video idea',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch('/api/creator/ai/title-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          targetAudience: formData.targetAudience.join(','),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          toast({
            title: 'Insufficient tokens',
            description: `You need ${data.required} tokens but only have ${data.available}`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to generate',
            variant: 'destructive',
          });
        }
        return;
      }

      const newResult = {
        patternExtracted: data.patternExtracted || [],
        titles: data.titles || [],
        thumbnailText: data.thumbnailText || [],
        thumbnailConcepts: data.thumbnailConcepts || [],
        rawResponse: data.rawResponse,
      };
      
      setResult(newResult);
      setHistoryResult(newResult);
      localStorage.setItem('titleThumbnailHistory', JSON.stringify(newResult));
      
      setTokensInfo((prev) => ({
        tokensCredits: data.tokensRemaining,
        tokensUsed: prev.tokensUsed + data.tokensUsed,
      }));

      toast({
        title: 'Generated!',
        description: `Used ${data.tokensUsed} tokens. ${data.tokensRemaining} remaining.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to generate',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t('titleThumbnail.back')}
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('titleThumbnail.title')}</h1>
            <p className="text-gray-500">{t('titleThumbnail.subtitle')}</p>
          </div>
        </div>
        <Card className="min-w-[180px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{tokensInfo.tokensCredits}</span>
              <span className="text-gray-500 text-sm">{t('titleThumbnail.tokens')}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{tokensInfo.tokensUsed} {t('titleThumbnail.used')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {t('titleThumbnail.videoDetails')}
            </CardTitle>
            <CardDescription>{t('titleThumbnail.videoDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contentType">{t('titleThumbnail.contentType')} *</Label>
              <Select
                value={formData.contentType}
                onValueChange={(value) => setFormData({ ...formData, contentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('titleThumbnail.selectContentType')} />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase().replace(' ', '-')}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="creatorNiche">{t('titleThumbnail.creatorNiche')} *</Label>
              <Input
                id="creatorNiche"
                placeholder={t('titleThumbnail.creatorNichePlaceholder')}
                value={formData.creatorNiche}
                onChange={(e) => setFormData({ ...formData, creatorNiche: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="targetAudience">{t('titleThumbnail.targetAudience')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-auto min-h-[40px]"
                  >
                    {formData.targetAudience.length === 0 ? (
                      t('titleThumbnail.selectTargetAudience')
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {formData.targetAudience.slice(0, 2).map((value) => {
                          const label = TARGET_AUDIENCES.find(a => a.value === value)?.label || value;
                          return (
                            <Badge key={value} variant="secondary" className="text-xs">
                              {label}
                            </Badge>
                          );
                        })}
                        {formData.targetAudience.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{formData.targetAudience.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <div className="max-h-[250px] overflow-y-auto p-2">
                    <div
                      className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer border-b mb-1"
                      onClick={() => {
                        if (formData.targetAudience.length === TARGET_AUDIENCES.length) {
                          setFormData({ ...formData, targetAudience: [] });
                        } else {
                          setFormData({
                            ...formData,
                            targetAudience: TARGET_AUDIENCES.map(a => a.value),
                          });
                        }
                      }}
                    >
                      <Checkbox
                        checked={formData.targetAudience.length === TARGET_AUDIENCES.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              targetAudience: TARGET_AUDIENCES.map(a => a.value),
                            });
                          } else {
                            setFormData({ ...formData, targetAudience: [] });
                          }
                        }}
                      />
                      <label className="text-sm cursor-pointer flex-1 font-medium">
                        {t('titleThumbnail.selectAll')}
                      </label>
                    </div>
                    {TARGET_AUDIENCES.map((audience) => (
                      <div
                        key={audience.value}
                        className="flex items-center space-x-2 py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <Checkbox
                          id={`audience-${audience.value}`}
                          checked={formData.targetAudience.includes(audience.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                targetAudience: [...formData.targetAudience, audience.value],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                targetAudience: formData.targetAudience.filter(
                                  (a) => a !== audience.value
                                ),
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={`audience-${audience.value}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {audience.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="coreVideoIdea">{t('titleThumbnail.coreVideoIdea')} *</Label>
              <Textarea
                id="coreVideoIdea"
                placeholder={t('titleThumbnail.coreVideoIdeaPlaceholder')}
                value={formData.coreVideoIdea}
                onChange={(e) => setFormData({ ...formData, coreVideoIdea: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="toneStyle">{t('titleThumbnail.toneStyle')}</Label>
              <Select
                value={formData.toneStyle}
                onValueChange={(value) => setFormData({ ...formData, toneStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('titleThumbnail.selectTone')} />
                </SelectTrigger>
                <SelectContent>
                  {TONE_STYLES.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <Label className="text-sm font-medium">{t('titleThumbnail.viralInspiration')}</Label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {t('titleThumbnail.viralInspirationDesc')}
              </p>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">YouTube Video</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {videoThumbnail ? (
                      <div className="relative group">
                        <img
                          src={videoThumbnail}
                          alt="Video thumbnail"
                          className="w-32 h-18 object-cover rounded-md border"
                        />
                        <button
                          onClick={() => {
                            setVideoThumbnail('');
                            setFormData(prev => ({
                              ...prev,
                              videoId: '',
                              inspirationTitle: '',
                              inspirationConcept: '',
                              channelName: '',
                            }));
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-18 bg-gray-100 rounded-md border flex items-center justify-center">
                        <span className="text-xs text-gray-400">{t('titleThumbnail.noVideo')}</span>
                      </div>
                    )}
                    {formData.videoId && (
                      <a
                        href={`https://youtube.com/watch?v=${formData.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                      >
                        <LinkIcon className="h-3 w-3" />
                        {t('titleThumbnail.watch')}
                      </a>
                    )}
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder={t('titleThumbnail.pasteUrl')}
                        value={formData.videoId}
                        onChange={(e) => {
                          const value = e.target.value;
                          const match = value.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
                          if (match) {
                            setFormData({ ...formData, videoId: match[1] });
                          } else if (value.length <= 11 && /^[a-zA-Z0-9_-]*$/.test(value)) {
                            setFormData({ ...formData, videoId: value });
                          }
                        }}
                        className="w-48"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fetchYouTubeVideo(formData.videoId)}
                        disabled={fetchingVideo || !formData.videoId}
                      >
                        {fetchingVideo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {t('titleThumbnail.refresh')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.inspirationTitle && videoThumbnail && (
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                    <p className="text-xs font-medium text-purple-700">{t('titleThumbnail.videoFetched')}</p>
                    <p className="text-sm text-gray-700 mt-1">{formData.inspirationTitle}</p>
                    {formData.channelName && (
                      <p className="text-xs text-gray-500 mt-1">{t('titleThumbnail.channel')} {formData.channelName}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="inspirationTitle" className="text-xs">{t('titleThumbnail.inspirationTitle')}</Label>
                  <Input
                    id="inspirationTitle"
                    placeholder={t('titleThumbnail.inspirationTitlePlaceholder')}
                    value={formData.inspirationTitle}
                    onChange={(e) => setFormData({ ...formData, inspirationTitle: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="inspirationConcept" className="text-xs">{t('titleThumbnail.conceptSummary')}</Label>
                  <Input
                    id="inspirationConcept"
                    placeholder={t('titleThumbnail.conceptPlaceholder')}
                    value={formData.inspirationConcept}
                    onChange={(e) => setFormData({ ...formData, inspirationConcept: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="inspirationWhy" className="text-xs">{t('titleThumbnail.whyItWorks')}</Label>
                  <Input
                    id="inspirationWhy"
                    placeholder={t('titleThumbnail.whyItWorksPlaceholder')}
                    value={formData.inspirationWhy}
                    onChange={(e) => setFormData({ ...formData, inspirationWhy: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || tokensInfo.tokensCredits < 5}
              className="w-full gap-2 bg-pink-600 hover:bg-pink-700"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {t('titleThumbnail.generateTokens')}
            </Button>

            {tokensInfo.tokensCredits < 5 && (
              <p className="text-xs text-center text-orange-500">
                {t('titleThumbnail.needMoreTokens')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('titleThumbnail.output')}</CardTitle>
              {result && (
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.rawResponse || '')}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <CardDescription>
              {formData.inspirationTitle 
                ? t('titleThumbnail.patternExtraction')
                : t('titleThumbnail.highCtrTitles')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <MousePointer className="h-12 w-12 mb-4 opacity-50" />
                <p>{t('titleThumbnail.enterDetails')}</p>
                {formData.inspirationTitle && (
                  <p className="text-xs mt-2 text-yellow-500">
                    {t('titleThumbnail.analyzing')} {formData.inspirationTitle}
                  </p>
                )}
                {historyResult && (
                  <Button
                    type="button"
                    onClick={() => setResult(historyResult)}
                    className="mt-4 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Sparkles className="h-4 w-4" />
                    {t('titleThumbnail.loadLastResult')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {result.patternExtracted && result.patternExtracted.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      {t('titleThumbnail.viralPatterns')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {result.patternExtracted.map((pattern, i) => (
                        <li key={i}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.titles && result.titles.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {t('titleThumbnail.highCtrTitlesResult')}
                    </h3>
                    <ul className="space-y-2">
                      {result.titles.map((title, i) => (
                        <li key={i} className="text-sm bg-orange-50 p-2 rounded border border-orange-100">
                          {title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.thumbnailText && result.thumbnailText.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      {t('titleThumbnail.thumbnailText')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.thumbnailText.map((text, i) => (
                        <span key={i} className="text-sm bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.thumbnailConcepts && result.thumbnailConcepts.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t('titleThumbnail.thumbnailConcepts')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {result.thumbnailConcepts.map((concept, i) => (
                        <li key={i}>{concept}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TitleThumbnailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <TitleThumbnailContent />
    </Suspense>
  );
}
