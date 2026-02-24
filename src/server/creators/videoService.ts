import { submittedVideoRepository, campaignMinRepository, creatorTrackingLinkRepository, campaignApplicationMinRepository } from './repositories';
import { extractYouTubeVideoId, fetchYouTubeMetadata } from '@/lib/youtube';

export interface SubmitVideoInput {
  campaignId: string;
  creatorId: string;
  youtubeUrl: string;
}

export interface SubmittedVideo {
  id: string;
  videoId: string;
  videoType: string;
  titleSnapshot: string;
  thumbnailUrl: string | null;
  status: string;
}

export async function submitVideo(input: SubmitVideoInput): Promise<{ success: boolean; video?: SubmittedVideo; error?: string }> {
  const { campaignId, creatorId, youtubeUrl } = input;

  const campaign = await campaignMinRepository.findById(campaignId);

  if (!campaign) {
    return { success: false, error: 'Campaign not found' };
  }

  const extractResult = extractYouTubeVideoId(youtubeUrl);
  
  if (!extractResult.success || !extractResult.videoId) {
    return { success: false, error: extractResult.error || 'Invalid YouTube URL' };
  }

  const existingVideo = await submittedVideoRepository.findByCampaignAndCreator(campaignId, creatorId, extractResult.videoId);

  if (existingVideo) {
    return { success: false, error: 'Video already submitted for this campaign' };
  }

  const metadata = await fetchYouTubeMetadata(extractResult.videoId);

  const video = await submittedVideoRepository.create({
    campaignId,
    creatorId,
    videoId: extractResult.videoId,
    videoType: extractResult.videoType || 'VIDEO',
    titleSnapshot: metadata?.title || 'YouTube Video',
    thumbnailUrl: metadata?.thumbnailUrl || null,
    channelName: metadata?.channelName || null,
    durationSeconds: metadata?.durationSeconds || null,
    visibility: 'UNLISTED',
    status: 'PENDING',
  });

  return {
    success: true,
    video: {
      id: video.id,
      videoId: video.videoId,
      videoType: video.videoType,
      titleSnapshot: video.titleSnapshot,
      thumbnailUrl: video.thumbnailUrl,
      status: video.status,
    },
  };
}

export interface AdvertiserVideoQuery {
  campaignId?: string;
  status?: string;
}

export async function getAdvertiserVideos(
  advertiserId: string,
  query: AdvertiserVideoQuery
) {
  const campaigns = await campaignMinRepository.findByAdvertiserId(advertiserId);

  const campaignIds = campaigns.map((c) => c.id);

  const videos = await submittedVideoRepository.findByCampaignIds(campaignIds, query.status);

  return videos.map((video) => ({
    id: video.id,
    videoId: video.videoId,
    videoType: video.videoType,
    titleSnapshot: video.titleSnapshot,
    thumbnailUrl: video.thumbnailUrl,
    channelName: video.channelName,
    durationSeconds: video.durationSeconds,
    visibility: video.visibility,
    status: video.status,
    rejectionReason: video.rejectionReason,
    campaign: video.campaign,
    creator: video.creator,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  }));
}

export async function getCreatorApplications(creatorId: string) {
  const applications = await campaignApplicationMinRepository.findByCreatorId(creatorId);

  return applications;
}

export async function getCreatorLinks(creatorId: string) {
  const links = await creatorTrackingLinkRepository.findByCreatorId(creatorId);

  return links;
}
