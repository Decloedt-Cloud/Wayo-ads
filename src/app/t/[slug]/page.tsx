import { db } from '@/lib/db';
import { generateVisitorId } from '@/lib/tracking';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TrackingPageClient from './TrackingPageClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TrackingPage({ params }: PageProps) {
  const { slug } = await params;

  // Resolve the tracking link
  const link = await db.creatorTrackingLink.findUnique({
    where: { slug },
    include: {
      campaign: {
        select: {
          id: true,
          landingUrl: true,
          title: true,
          status: true,
        },
      },
      creator: {
        select: { id: true, name: true },
      },
    },
  });

  if (!link || !link.campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-600">This tracking link doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Get the creator's video URL for this campaign (fallback if no landingUrl)
  let videoUrl: string | null = null;
  if (!link.campaign.landingUrl) {
    const socialPost = await db.socialPost.findFirst({
      where: {
        campaignApplication: {
          campaignId: link.campaign.id,
          creatorId: link.creatorId,
        },
        platform: 'YOUTUBE',
      },
      select: {
        videoUrl: true,
        youtubeVideoId: true,
      },
    });
    
    if (socialPost) {
      if (socialPost.youtubeVideoId) {
        videoUrl = `https://www.youtube.com/watch?v=${socialPost.youtubeVideoId}`;
      } else if (socialPost.videoUrl) {
        videoUrl = socialPost.videoUrl;
      }
    }
  }

  // Get or create visitor ID from cookies
  const cookieStore = await cookies();
  let visitorId = cookieStore.get('visitor_id')?.value;

  if (!visitorId) {
    visitorId = generateVisitorId();
  }

  // Determine redirect URL: use landingUrl if available, otherwise use video URL
  const redirectUrl = link.campaign.landingUrl || videoUrl || '';

  const trackingData = {
    campaignId: link.campaign.id,
    creatorId: link.creatorId,
    linkId: link.id,
    visitorId,
    landingUrl: redirectUrl,
    campaignTitle: link.campaign.title,
    creatorName: link.creator.name,
    campaignStatus: link.campaign.status,
  };

  return <TrackingPageClient data={trackingData} />;
}
