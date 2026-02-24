import { campaignRepository, socialPostRepository } from './repositories';

export async function approvePost(postId: string, campaignId: string, advertiserId: string) {
  const campaign = await campaignRepository.findByIdSelect(campaignId, { advertiserId: true });

  if (!campaign) {
    return { error: 'Campaign not found' };
  }

  if (campaign.advertiserId !== advertiserId) {
    return { error: 'Forbidden' };
  }

  const post = await socialPostRepository.updateStatus(postId, 'ACTIVE');

  return { post };
}

export async function rejectPost(postId: string, campaignId: string, advertiserId: string, reason?: string) {
  const campaign = await campaignRepository.findByIdSelect(campaignId, { advertiserId: true });

  if (!campaign) {
    return { error: 'Campaign not found' };
  }

  if (campaign.advertiserId !== advertiserId) {
    return { error: 'Forbidden' };
  }

  const post = await socialPostRepository.updateStatus(postId, 'REJECTED', reason || 'Content does not meet campaign requirements');

  return { post };
}
