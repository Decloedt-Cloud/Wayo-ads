'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { VideoStatusBadge } from '@/components/campaign/video/VideoStatusBadge';
import { ExternalLink, Check, X, Loader2 } from 'lucide-react';

interface Creator {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface CampaignApplication {
  id: string;
  status: string;
  creator: Creator;
}

interface VideoSubmission {
  id: string;
  platform: string;
  status: string;
  title: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  submittedAt: Date | string;
  currentViews: number;
  totalValidatedViews: number;
  rejectionReason: string | null;
  flagReason: string | null;
  cpmCents: number;
  campaignApplication: CampaignApplication;
}

interface VideoSubmissionsManagerProps {
  campaignId: string;
  videoSubmissions: VideoSubmission[];
  onRefresh: () => void;
}

export function VideoSubmissionsManager({ campaignId, videoSubmissions, onRefresh }: VideoSubmissionsManagerProps) {
  const { toast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState<VideoSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const pendingVideos = videoSubmissions.filter(v => v.status === 'PENDING');
  const activeVideos = videoSubmissions.filter(v => v.status === 'ACTIVE');
  const rejectedVideos = videoSubmissions.filter(v => v.status === 'REJECTED');
  const flaggedVideos = videoSubmissions.filter(v => v.status === 'FLAGGED');

  const handleApprove = async (videoId: string) => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/posts/${videoId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast({ title: 'Video approved', description: 'The video is now active and tracking.' });
        onRefresh();
        setSelectedVideo(null);
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to approve video', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to approve video', variant: 'destructive' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (videoId: string) => {
    if (!rejectionReason.trim()) {
      toast({ title: 'Error', description: 'Please provide a rejection reason', variant: 'destructive' });
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/posts/${videoId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        toast({ title: 'Video rejected', description: 'The video has been rejected.' });
        onRefresh();
        setSelectedVideo(null);
        setRejectionReason('');
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to reject video', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to reject video', variant: 'destructive' });
    } finally {
      setIsRejecting(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderVideoCard = (video: VideoSubmission) => (
    <div
      key={video.id}
      className={`border rounded-lg p-4 space-y-3 cursor-pointer transition-all ${
        selectedVideo?.id === video.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
      }`}
      onClick={() => setSelectedVideo(video)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.title || 'Video'} className="w-24 h-14 object-cover rounded" />
          ) : (
            <div className="w-24 h-14 bg-gray-200 rounded flex items-center justify-center">
              <Video className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium">{video.title || 'Untitled Video'}</p>
            <p className="text-sm text-gray-500">{video.platform}</p>
            <p className="text-xs text-gray-400">
              by {video.campaignApplication.creator.name || video.campaignApplication.creator.email}
            </p>
          </div>
        </div>
        <VideoStatusBadge status={video.status as any} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-4 text-gray-500">
          <span>Views: {video.currentViews.toLocaleString()}</span>
          <span>Validated: {video.totalValidatedViews.toLocaleString()}</span>
        </div>
        <div className="font-medium text-green-600">
          {formatCurrency((video.totalValidatedViews * video.cpmCents) / 1000)}
        </div>
      </div>

      {video.status === 'REJECTED' && video.rejectionReason && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">Reason: {video.rejectionReason}</p>
      )}
      {video.status === 'FLAGGED' && video.flagReason && (
        <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">Flag: {video.flagReason}</p>
      )}

      <p className="text-xs text-gray-400">Submitted: {formatDate(video.submittedAt)}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Submissions</CardTitle>
        <CardDescription>
          Review and approve video submissions from creators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 flex-wrap">
          <Badge variant="outline" className="px-3 py-1">
            Pending: {pendingVideos.length}
          </Badge>
          <Badge className="bg-green-500 hover:bg-green-600 px-3 py-1">
            Active: {activeVideos.length}
          </Badge>
          <Badge variant="destructive" className="px-3 py-1">
            Rejected: {rejectedVideos.length}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 border-orange-500 text-orange-600">
            Flagged: {flaggedVideos.length}
          </Badge>
        </div>

        {videoSubmissions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No video submissions yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {videoSubmissions.map(renderVideoCard)}
            </div>

            {selectedVideo && (
              <div className="border rounded-lg p-4 space-y-4 sticky top-4">
                <div>
                  <h4 className="font-medium text-lg">{selectedVideo.title || 'Untitled Video'}</h4>
                  <p className="text-sm text-gray-500">{selectedVideo.platform}</p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedVideo.campaignApplication.creator.image ? (
                    <img
                      src={selectedVideo.campaignApplication.creator.image}
                      alt="Creator"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {selectedVideo.campaignApplication.creator.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedVideo.campaignApplication.creator.email}
                    </p>
                  </div>
                </div>

                {selectedVideo.videoUrl && (
                  <a
                    href={selectedVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Video
                  </a>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Views</p>
                    <p className="font-medium">{selectedVideo.currentViews.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Validated Views</p>
                    <p className="font-medium">{selectedVideo.totalValidatedViews.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">CPM</p>
                    <p className="font-medium">{formatCurrency(selectedVideo.cpmCents / 100)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Potential Earnings</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency((selectedVideo.totalValidatedViews * selectedVideo.cpmCents) / 1000)}
                    </p>
                  </div>
                </div>

                {selectedVideo.status === 'PENDING' && (
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Rejection Reason (optional for rejection)
                      </label>
                      <Textarea
                        placeholder="Enter reason if rejecting..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(selectedVideo.id)}
                        disabled={isApproving}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isApproving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(selectedVideo.id)}
                        disabled={isRejecting}
                        variant="destructive"
                        className="flex-1"
                      >
                        {isRejecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selectedVideo.status === 'ACTIVE' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-green-600 font-medium">
                      This video is active and tracking views.
                    </p>
                  </div>
                )}

                {selectedVideo.status === 'REJECTED' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-red-600">
                      <strong>Rejected:</strong> {selectedVideo.rejectionReason}
                    </p>
                  </div>
                )}

                {selectedVideo.status === 'FLAGGED' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-orange-600">
                      <strong>Flagged:</strong> {selectedVideo.flagReason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Video({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  );
}
