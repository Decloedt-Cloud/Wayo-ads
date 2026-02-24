'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChannelCardSkeleton } from '@/components/cards/ChannelCard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/translations';

interface FeaturedChannel {
  id: string;
  channelName: string;
  channelHandle: string | null;
  channelAvatarUrl: string | null;
  videoCount: number;
  subscriberCount: number;
  lifetimeViews: number;
  averageViewsPerVideo: number;
  topVideos: Array<{ videoId: string; title: string; thumbnailUrl: string; viewCount: number }> | null;
  isPublic: boolean;
  platform: string;
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

interface CreatorCardProps {
  creator: FeaturedChannel;
}

function CreatorCard({ creator }: CreatorCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col lg:flex-row">
        <div className="p-8 lg:w-2/5 bg-gradient-to-br from-orange-50 to-red-50">
          <div className="flex items-center gap-4 mb-6">
            <img 
              src={creator.channelAvatarUrl || '/placeholder-avatar.png'} 
              alt={creator.channelName}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
            />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{creator.channelName}</h3>
              {creator.channelHandle && (
                <p className="text-gray-500">@{creator.channelHandle}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-500 text-sm">Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(creator.subscriberCount)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-500 text-sm">Lifetime Views</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(creator.lifetimeViews)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-500 text-sm">Videos</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(creator.videoCount)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-gray-500 text-sm">Avg Views</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(creator.averageViewsPerVideo)}</p>
            </div>
          </div>
        </div>
        <div className="lg:w-3/5 p-8 bg-white">
          <p className="text-lg font-semibold text-gray-700 mb-4">Latest Videos</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {creator.topVideos && creator.topVideos.length > 0 ? (
              creator.topVideos.slice(0, 6).map((video) => (
                <a 
                  key={video.videoId}
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2 group-hover:text-orange-600 transition-colors duration-300">
                    {video.title}
                  </p>
                </a>
              ))
            ) : (
              <div className="col-span-3 text-center text-gray-400 py-8">
                No videos available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function fetchFeaturedCreators(): Promise<FeaturedChannel[]> {
  try {
    const response = await fetch('/api/creator/featured');
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.creators || [];
  } catch (error) {
    console.error('[FeaturedCreators] Error fetching creators:', error);
    return [];
  }
}

export function FeaturedCreators() {
  const { t } = useLanguage();
  const [creators, setCreators] = useState<FeaturedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadCreators = async () => {
      const data = await fetchFeaturedCreators();
      setCreators(data);
      setLoading(false);
    };
    loadCreators();
  }, []);

  useEffect(() => {
    if (creators.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % creators.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [creators.length]);

  if (loading) {
    return (
      <section id="creators" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('creators.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('creators.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <ChannelCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (creators.length === 0) {
    return (
      <section id="creators" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('creators.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('creators.subtitle')}
            </p>
          </div>
          <div className="text-center py-12 bg-white rounded-xl max-w-2xl mx-auto">
            <p className="text-gray-600 mb-6">
              Connect your YouTube channel to appear here and start monetizing your content.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="bg-[#F47A1F] hover:bg-[#F06423]">
                {t('hero.cta.creators')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="creators" className="py-20 bg-gray-50 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('creators.title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('creators.subtitle')}
          </p>
        </div>
        <div className="relative max-w-5xl mx-auto">
          {creators.length > 0 && (
            <div className="overflow-hidden w-full">
              <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {creators.map((creator) => (
                  <div key={creator.id} className="w-full flex-shrink-0">
                    <CreatorCard creator={creator} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {creators.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + creators.length) % creators.length)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % creators.length)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="flex justify-center gap-2 mt-6">
                {creators.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentIndex 
                        ? 'bg-orange-500 w-8' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
