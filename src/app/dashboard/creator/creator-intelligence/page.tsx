'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Sparkles, Zap, Copy, Loader2, Lightbulb, Play, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const CONTENT_TYPES = ['YouTube Video', 'YouTube Shorts'];
const CONTENT_STYLES = ['Educational', 'Entertainment', 'Storytelling', 'Authority', 'Tutorial', 'Vlog', 'Review'];
const PRIMARY_GOALS = ['clicks', 'awareness', 'curiosity', 'leads', 'engagement'];
const TONE_CONSTRAINTS = ['subtle', 'bold', 'mysterious', 'disruptive', 'curiosity-driven', 'humorous', 'serious'];

function CreatorIntelligenceContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    creatorNiche: '',
    audienceType: '',
    contentStyle: '',
    contentType: '',
    campaignContext: '',
    primaryGoal: '',
    toneConstraint: '',
    inspirationTitle: '',
    inspirationConcept: '',
    inspirationWhy: '',
    videoId: '',
    videoTitle: '',
    channelName: '',
  });

  const [tokensInfo, setTokensInfo] = useState({ tokensCredits: 0, tokensUsed: 0, costPerRequest: 10 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchTokensInfo();
  }, []);

  useEffect(() => {
    const videoId = searchParams.get('videoId');
    const title = searchParams.get('title');
    const channel = searchParams.get('channel');
    const videoType = searchParams.get('videoType');

    if (title || videoId) {
      const contentType = videoType === 'SHORT' ? 'YouTube Shorts' : videoType === 'VIDEO' ? 'YouTube Video' : '';
      
      setFormData(prev => ({
        ...prev,
        contentType: contentType || prev.contentType,
        campaignContext: title || prev.campaignContext,
        inspirationTitle: title || prev.inspirationTitle,
        inspirationConcept: title || prev.inspirationConcept,
        videoId: videoId || prev.videoId,
        videoTitle: title || prev.videoTitle,
        channelName: channel || prev.channelName,
      }));

      if (title) {
        toast({
          title: 'Video selected',
          description: `Generating intelligence for: ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`,
        });
      }
    }
  }, [searchParams]);

  const fetchTokensInfo = async () => {
    try {
      const res = await fetch('/api/creator/ai/tokens');
      const data = await res.json();
      if (res.ok) {
        setTokensInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.creatorNiche || !formData.contentType || !formData.campaignContext || !formData.primaryGoal) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in: niche, content type, campaign context, and primary goal',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const res = await fetch('/api/creator/ai/creator-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
            description: data.error || 'Failed to generate strategy',
            variant: 'destructive',
          });
        }
        return;
      }

      setResult(data.response);
      setTokensInfo((prev) => ({
        ...prev,
        tokensCredits: data.tokensRemaining,
        tokensUsed: prev.tokensUsed + data.tokensUsed,
      }));

      toast({
        title: 'Strategy generated!',
        description: `Used ${data.tokensUsed} tokens. ${data.tokensRemaining} remaining.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to generate strategy',
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
        Back
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Creator Intelligence Engine</h1>
            <p className="text-gray-500">Viral strategy with pattern extraction</p>
          </div>
        </div>
        <Card className="min-w-[180px]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{tokensInfo.tokensCredits}</span>
              <span className="text-gray-500 text-sm">tokens</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{tokensInfo.tokensUsed} used</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Campaign & Creator Details
            </CardTitle>
            <CardDescription>Enter context to generate viral strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="creatorNiche">Creator Niche *</Label>
              <Input
                id="creatorNiche"
                placeholder="e.g., Tech reviews, Gaming, Fitness"
                value={formData.creatorNiche}
                onChange={(e) => setFormData({ ...formData, creatorNiche: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="audienceType">Audience Type</Label>
              <Input
                id="audienceType"
                placeholder="e.g., Gen Z, Professionals, Parents"
                value={formData.audienceType}
                onChange={(e) => setFormData({ ...formData, audienceType: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="contentStyle">Content Style</Label>
              <Select
                value={formData.contentStyle}
                onValueChange={(value) => setFormData({ ...formData, contentStyle: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_STYLES.map((style) => (
                    <SelectItem key={style} value={style.toLowerCase()}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contentType">Content Type *</Label>
              <Select
                value={formData.contentType}
                onValueChange={(value) => setFormData({ ...formData, contentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
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
              <Label htmlFor="campaignContext">Campaign Context *</Label>
              <Textarea
                id="campaignContext"
                placeholder="What are you promoting? What's the product/service?"
                value={formData.campaignContext}
                onChange={(e) => setFormData({ ...formData, campaignContext: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="primaryGoal">Primary Goal *</Label>
              <Select
                value={formData.primaryGoal}
                onValueChange={(value) => setFormData({ ...formData, primaryGoal: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  {PRIMARY_GOALS.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal.charAt(0).toUpperCase() + goal.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="toneConstraint">Tone</Label>
              <Select
                value={formData.toneConstraint}
                onValueChange={(value) => setFormData({ ...formData, toneConstraint: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_CONSTRAINTS.map((tone) => (
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
                <Label className="text-sm font-medium">Viral Inspiration (Optional)</Label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Enter a viral video to reverse-engineer its retention mechanics
              </p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="inspirationTitle" className="text-xs">Inspiration Video Title</Label>
                  <Input
                    id="inspirationTitle"
                    placeholder="Paste a viral video title"
                    value={formData.inspirationTitle}
                    onChange={(e) => setFormData({ ...formData, inspirationTitle: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="inspirationConcept" className="text-xs">Concept Summary</Label>
                  <Input
                    id="inspirationConcept"
                    placeholder="Brief description of that video"
                    value={formData.inspirationConcept}
                    onChange={(e) => setFormData({ ...formData, inspirationConcept: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="inspirationWhy" className="text-xs">Why It Works (Optional)</Label>
                  <Input
                    id="inspirationWhy"
                    placeholder="Your guess on why it's viral"
                    value={formData.inspirationWhy}
                    onChange={(e) => setFormData({ ...formData, inspirationWhy: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || tokensInfo.tokensCredits < 10}
              className="w-full gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Generate Strategy (10 tokens)
            </Button>

            {tokensInfo.tokensCredits < 10 && (
              <p className="text-xs text-center text-orange-500">
                You need more tokens to generate
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Viral Strategy Output
              </CardTitle>
              {result && (
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result)}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <CardDescription>
              {formData.inspirationTitle 
                ? 'Pattern extraction + viral strategy' 
                : 'Retention-focused content strategy'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                <p>Enter details and generate a viral strategy</p>
                {formData.inspirationTitle && (
                  <p className="text-xs mt-2 text-yellow-500">
                    Analyzing: {formData.inspirationTitle}
                  </p>
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {result}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CreatorIntelligencePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CreatorIntelligenceContent />
    </Suspense>
  );
}
