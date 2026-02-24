'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  Copy,
  Check,
  Video,
  Clock,
  Target,
  DollarSign,
  AlertCircle,
  FileText,
  Eye,
} from 'lucide-react';

interface VideoRequirements {
  minDurationSeconds?: number;
  requiredPlatform?: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM';
  allowMultiplePosts?: boolean;
  dailyViewCap?: number;
  dailyBudget?: number;
}

interface AssetAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignTitle: string;
  assetsUrl: string | null;
  description: string | null;
  notes: string | null;
  videoRequirements: VideoRequirements | null;
  cpmCents: number;
  campaignStatus: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDuration(seconds?: number): string {
  if (!seconds) return 'Not specified';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

function maskUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.pathname.length > 20) {
      return `${urlObj.origin}${urlObj.pathname.substring(0, 20)}...`;
    }
    return url;
  } catch {
    return url.substring(0, 30) + '...';
  }
}

export function AssetAccessModal({
  isOpen,
  onClose,
  campaignTitle,
  assetsUrl,
  description,
  notes,
  videoRequirements,
  cpmCents,
  campaignStatus,
}: AssetAccessModalProps) {
  const [copied, setCopied] = useState(false);
  const isPaused = campaignStatus !== 'ACTIVE';
  const displayUrl = isPaused && assetsUrl ? maskUrl(assetsUrl) : assetsUrl;

  const handleCopy = async () => {
    if (assetsUrl) {
      await navigator.clipboard.writeText(assetsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Campaign Assets
          </DialogTitle>
          <DialogDescription>
            {campaignTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {isPaused && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                This campaign is currently paused. Asset access is limited.
              </span>
            </div>
          )}

          {assetsUrl ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Creative Assets Link</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="flex-1 text-sm font-mono break-all">
                  {displayUrl || 'Loading...'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isPaused}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  disabled={isPaused}
                >
                  <a
                    href={isPaused ? '#' : assetsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => isPaused && e.preventDefault()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Click the copy button to copy the link, or click the external link to open in a new tab.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border text-center text-gray-500">
              No assets available for this campaign.
            </div>
          )}

          {description && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign Description</label>
              <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                {description}
              </p>
            </div>
          )}

          {notes && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Guidelines</label>
              <p className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg border border-blue-100">
                {notes}
              </p>
            </div>
          )}

          {videoRequirements && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Video Requirements</label>
              <div className="grid grid-cols-2 gap-3">
                {videoRequirements.minDurationSeconds !== undefined && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      <span className="font-medium">Min Duration:</span>{' '}
                      {formatDuration(videoRequirements.minDurationSeconds)}
                    </span>
                  </div>
                )}
                {videoRequirements.requiredPlatform && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      <span className="font-medium">Platform:</span>{' '}
                      {videoRequirements.requiredPlatform}
                    </span>
                  </div>
                )}
                {videoRequirements.dailyViewCap && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      <span className="font-medium">Daily Cap:</span>{' '}
                      {videoRequirements.dailyViewCap.toLocaleString()} views
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <span className="font-medium">CPM:</span>{' '}
                    {formatCurrency(cpmCents)}
                  </span>
                </div>
              </div>
              {videoRequirements.allowMultiplePosts !== undefined && (
                <p className="text-xs text-gray-500">
                  {videoRequirements.allowMultiplePosts
                    ? 'Multiple video submissions are allowed.'
                    : 'Only one video submission allowed.'}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ViewAssetsButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ViewAssetsButton({ onClick, disabled }: ViewAssetsButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      <Video className="h-4 w-4 mr-2" />
      View Campaign Assets
    </Button>
  );
}
