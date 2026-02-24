import { submittedVideoRepository } from '@/server/creators/repositories';

export async function updateVideoStatus(
  videoId: string,
  advertiserId: string,
  action: 'approve' | 'reject',
  rejectionReason?: string
) {
  const video = await submittedVideoRepository.findByIdWithCampaign(videoId);

  if (!video) {
    return { error: 'Video not found' };
  }

  if (video.campaign.advertiserId !== advertiserId) {
    return { error: 'Not authorized to modify this video' };
  }

  const updatedVideo = await submittedVideoRepository.update(videoId, {
    status: action === 'approve' ? 'APPROVED' : 'REJECTED',
    rejectionReason: action === 'reject' ? rejectionReason || 'Rejected by advertiser' : null,
  });

  return {
    success: true,
    video: {
      id: updatedVideo.id,
      status: updatedVideo.status,
      rejectionReason: updatedVideo.rejectionReason,
      updatedAt: updatedVideo.updatedAt,
    },
  };
}
