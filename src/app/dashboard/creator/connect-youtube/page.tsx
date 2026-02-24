'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChannelCard } from '@/components/cards/ChannelCard';
import { Youtube, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';

interface YouTubeChannel {
  id: string;
  channelName: string;
  channelHandle: string | null;
  channelAvatarUrl: string | null;
  videoCount: number;
  subscriberCount: number;
  lifetimeViews: number;
  averageViewsPerVideo: number;
  isPublic: boolean;
  platform: string;
}

export default function ConnectYouTubePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [youtubeChannel, setYoutubeChannel] = useState<YouTubeChannel | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchYouTubeChannel = async () => {
      try {
        const res = await fetch('/api/creator/youtube/channel');
        const data = await res.json();
        if (res.ok && data.channel) {
          setYoutubeChannel(data.channel);
        }
      } catch (err) {
        console.error('Failed to fetch YouTube channel:', err);
      } finally {
        setYoutubeLoading(false);
      }
    };

    if (session?.user) {
      fetchYouTubeChannel();
    }
  }, [session]);

  const handleConnectYouTube = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/creator/youtube/connect');
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to connect', variant: 'destructive' });
        setConnecting(false);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to connect', variant: 'destructive' });
      setConnecting(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    try {
      const res = await fetch('/api/creator/youtube/disconnect', { method: 'DELETE' });
      if (res.ok) {
        setYoutubeChannel(null);
        toast({ title: 'Disconnected', description: 'YouTube channel has been disconnected' });
      } else {
        toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const handleRefreshYouTube = async () => {
    try {
      const res = await fetch('/api/creator/youtube/refresh', { method: 'POST' });
      if (res.ok) {
        const channelRes = await fetch('/api/creator/youtube/channel');
        const channelData = await channelRes.json();
        setYoutubeChannel(channelData.channel);
        toast({ title: 'Refreshed', description: 'Channel data updated' });
      } else {
        toast({ title: 'Error', description: 'Failed to refresh', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to refresh', variant: 'destructive' });
    }
  };

  const handleVisibilityChange = async (isPublic: boolean) => {
    try {
      const res = await fetch('/api/creator/youtube/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      if (res.ok) {
        setYoutubeChannel({ ...youtubeChannel!, isPublic });
        toast({ title: 'Updated', description: `Channel is now ${isPublic ? 'public' : 'private'}` });
      } else {
        toast({ title: 'Error', description: 'Failed to update visibility', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update visibility', variant: 'destructive' });
    }
  };

  if (status === 'loading' || youtubeLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Connect YouTube</h1>
        <p className="text-gray-600">Link your YouTube channel to increase earnings and unlock higher trust scores</p>
      </div>

      {!youtubeChannel ? (
        <Card className="max-w-2xl bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8">
              <div className="p-4 bg-red-200 rounded-full mb-4">
                <Youtube className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-red-900 mb-2">Connect Your YouTube Channel</h2>
              <p className="text-red-700 mb-6 max-w-md">
                Connect your YouTube account to increase earnings! Get verified to unlock higher trust scores and better CPM rates.
              </p>
              <Button 
                className="bg-red-600 hover:bg-red-700" 
                onClick={handleConnectYouTube} 
                disabled={connecting}
                size="lg"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Youtube className="h-4 w-4 mr-2" />
                    Connect YouTube
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Card className="mb-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-200 rounded-full">
                    <Youtube className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-900">YouTube Channel Connected</h3>
                    <p className="text-sm text-red-700">
                      Your channel is linked to your creator account
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-200" onClick={handleDisconnectYouTube}>
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>

          <ChannelCard
            channel={youtubeChannel}
            isOwner={true}
            onRefresh={handleRefreshYouTube}
            onDisconnect={handleDisconnectYouTube}
            onVisibilityChange={handleVisibilityChange}
          />
        </div>
      )}
    </div>
  );
}
