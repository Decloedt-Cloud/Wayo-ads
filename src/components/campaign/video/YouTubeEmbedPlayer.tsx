'use client';

import { useState, useEffect } from 'react';
import { getYouTubeEmbedUrl, validateVideoId } from '@/lib/youtube';

interface YouTubeEmbedPlayerProps {
  videoId: string;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  showTitle?: boolean;
  title?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export function YouTubeEmbedPlayer({
  videoId,
  autoplay = false,
  muted = false,
  className = '',
  aspectRatio = '16:9',
  showTitle = false,
  title,
  onReady,
  onError,
}: YouTubeEmbedPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const isValid = validateVideoId(videoId);

  useEffect(() => {
    if (!isValid && onError) {
      onError(new Error('Invalid YouTube video ID'));
    }
  }, [isValid, onError]);

  if (!isValid) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-gray-500">Invalid video ID</p>
      </div>
    );
  }

  const embedUrl = getYouTubeEmbedUrl(videoId, autoplay, muted);

  const aspectRatioClass = {
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '1:1': 'aspect-square',
  }[aspectRatio];

  return (
    <div className={`relative rounded-lg overflow-hidden bg-black ${aspectRatioClass} ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-gray-700 rounded-full" />
            <div className="w-24 h-4 bg-gray-700 rounded" />
          </div>
        </div>
      )}
      <iframe
        src={embedUrl}
        title={title || 'YouTube video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        onLoad={() => {
          setIsLoaded(true);
          if (onReady) onReady();
        }}
      />
    </div>
  );
}

interface YouTubeThumbnailProps {
  videoId: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export function YouTubeThumbnail({ videoId, alt, className = '', onClick }: YouTubeThumbnailProps) {
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden ${className}`}
      disabled={!onClick}
    >
      <img
        src={thumbnailUrl}
        alt={alt || 'YouTube thumbnail'}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors flex items-center justify-center">
        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600 ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
