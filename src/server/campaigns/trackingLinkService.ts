import { campaignApplicationRepository, trackingLinkRepository } from './repositories';

export async function getCreatorTrackingLinks(campaignId: string, creatorId: string) {
  const application = await campaignApplicationRepository.findApprovedApplication(campaignId, creatorId);

  if (!application) {
    return { error: 'Not approved for this campaign' };
  }

  const links = await trackingLinkRepository.findByCampaignAndCreator(campaignId, creatorId);

  return { links };
}

export async function createTrackingLink(
  campaignId: string,
  creatorId: string,
  slug?: string
) {
  const application = await campaignApplicationRepository.findApprovedApplication(campaignId, creatorId);

  if (!application) {
    return { error: 'Not approved for this campaign' };
  }

  const { generateTrackingSlug } = await import('@/lib/tracking');
  
  const finalSlug = slug || generateTrackingSlug();

  const existingLink = await trackingLinkRepository.findBySlug(campaignId, creatorId, finalSlug);

  if (existingLink) {
    return { error: 'Link with this slug already exists' };
  }

  const link = await trackingLinkRepository.create({
    campaignId,
    creatorId,
    slug: finalSlug,
  });

  return { link };
}
