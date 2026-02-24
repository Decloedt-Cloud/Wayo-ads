'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Trash2, Youtube } from 'lucide-react';

interface ChannelCardProps {
  channel: {
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
  };
  isOwner?: boolean;
  onRefresh?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  onVisibilityChange?: (isPublic: boolean) => Promise<void>;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function ChannelCard({
  channel,
  isOwner = false,
  onRefresh,
  onDisconnect,
  onVisibilityChange,
}: ChannelCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    setIsDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleVisibilityChange = async (checked: boolean) => {
    if (!onVisibilityChange) return;
    await onVisibilityChange(checked);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="h-16 w-16">
          <AvatarImage src={channel.channelAvatarUrl || undefined} alt={channel.channelName} />
          <AvatarFallback className="text-lg">
            {channel.channelName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg truncate">{channel.channelName}</h3>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Youtube className="h-3 w-3" />
              YouTube
            </Badge>
          </div>
          {channel.channelHandle && (
            <p className="text-sm text-muted-foreground">@{channel.channelHandle}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs">Subscribers</p>
          <p className="font-semibold text-lg">{formatNumber(channel.subscriberCount)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs">Lifetime Views</p>
          <p className="font-semibold text-lg">{formatNumber(channel.lifetimeViews)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs">Videos</p>
          <p className="font-semibold text-lg">{formatNumber(channel.videoCount)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs">Avg. Views/Video</p>
          <p className="font-semibold text-lg">{formatNumber(channel.averageViewsPerVideo)}</p>
        </div>
      </CardContent>

      {isOwner && (
        <CardFooter className="flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <Label htmlFor={`visibility-${channel.id}`} className="text-sm">
              Display on landing page
            </Label>
            <Switch
              id={`visibility-${channel.id}`}
              checked={channel.isPublic}
              onCheckedChange={handleVisibilityChange}
            />
          </div>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

export function ChannelCardSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
