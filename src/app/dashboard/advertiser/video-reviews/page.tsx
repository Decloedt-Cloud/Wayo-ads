'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Video, Loader2, Check, X, ExternalLink, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { YouTubeEmbedPlayer } from '@/components/campaign/video/YouTubeEmbedPlayer';

interface SubmittedVideo {
  id: string;
  videoId: string;
  videoType: string;
  titleSnapshot: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  durationSeconds: number | null;
  visibility: string;
  status: string;
  rejectionReason: string | null;
  campaign: {
    id: string;
    title: string;
    status: string;
  };
  creator: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: string;
}

export default function AdvertiserVideoReviewsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [videos, setVideos] = useState<SubmittedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('PENDING');
  const [selectedVideo, setSelectedVideo] = useState<SubmittedVideo | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchVideos();
    }
  }, [status, filter]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/advertiser/videos?status=${filter}`);
      const data = await res.json();
      if (res.ok) {
        setVideos(data.videos);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (videoId: string) => {
    setProcessing(videoId);
    try {
      const res = await fetch(`/api/advertiser/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: 'Erreur',
          description: data.error || 'Échec de l\'approbation',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Succès',
        description: 'Vidéo approuvée',
      });

      fetchVideos();
      setSelectedVideo(null);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Échec de l\'approbation',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (videoId: string, reason: string) => {
    setProcessing(videoId);
    try {
      const res = await fetch(`/api/advertiser/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: 'Erreur',
          description: data.error || 'Échec du rejet',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Succès',
        description: 'Vidéo rejetée',
      });

      fetchVideos();
      setSelectedVideo(null);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Échec du rejet',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">En attente</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-500">Approuvé</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-500">Rejeté</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
        Retour
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Révision des Vidéos</h1>
            <p className="text-gray-500">Examinez les soumissions des créateurs</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="gap-2"
          >
            {status === 'PENDING' && 'En attente'}
            {status === 'APPROVED' && 'Approuvées'}
            {status === 'REJECTED' && 'Rejetées'}
            <Badge variant="secondary" className="ml-1">
              {videos.filter((v) => v.status === status).length}
            </Badge>
          </Button>
        ))}
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune vidéo en révision</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <YouTubeEmbedPlayer
                  videoId={video.videoId}
                  className="rounded-t-lg"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{video.titleSnapshot}</h3>
                <p className="text-sm text-gray-500 truncate">{video.campaign.title}</p>
                <div className="flex items-center gap-2 mt-2 mb-3">
                  {getStatusBadge(video.status)}
                  {video.videoType === 'SHORT' && (
                    <Badge className="bg-purple-500">Shorts</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                      {video.creator.name?.[0] || '?'}
                    </div>
                    <span className="text-sm text-gray-600">
                      {video.creator.name || 'Creator'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">{selectedVideo.titleSnapshot}</h2>
              <Button variant="ghost" onClick={() => setSelectedVideo(null)}>
                ✕
              </Button>
            </div>
            <div className="p-4">
              <YouTubeEmbedPlayer
                videoId={selectedVideo.videoId}
                className="rounded-lg"
                aspectRatio="16:9"
              />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Créateur</p>
                  <p className="font-medium">{selectedVideo.creator.name || 'Creator'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Campagne</p>
                  <p className="font-medium">{selectedVideo.campaign.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge>{selectedVideo.videoType}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut actuel</p>
                  {getStatusBadge(selectedVideo.status)}
                </div>
              </div>

              {selectedVideo.status === 'PENDING' && (
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={() => handleApprove(selectedVideo.id)}
                    disabled={!!processing}
                    className="flex-1 gap-2"
                  >
                    {processing === selectedVideo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approuver
                  </Button>
                  <Button
                    onClick={() => {
                      const reason = prompt('Raison du rejet (optionnel):');
                      handleReject(selectedVideo.id, reason || 'Rejeté par l\'annonceur');
                    }}
                    disabled={!!processing}
                    variant="destructive"
                    className="flex-1 gap-2"
                  >
                    {processing === selectedVideo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Rejeter
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
