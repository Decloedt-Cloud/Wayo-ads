import { campaignRepository } from '@/server/campaigns/repositories';
import { DynamicCpmMode } from '@prisma/client';

export async function verifyCampaignAccess(campaignId: string, userId: string, userRoles: string[]) {
  const campaign = await campaignRepository.findByIdForAdvertiserAccess(campaignId);

  if (!campaign) {
    return { error: 'Campaign not found' };
  }

  const isOwner = campaign.advertiserId === userId;
  const isAdmin = userRoles.includes('SUPERADMIN');

  if (!isOwner && !isAdmin) {
    return { error: 'Forbidden' };
  }

  return { success: true };
}

export async function updateCpmBounds(campaignId: string, minCpmCents?: number, maxCpmCents?: number) {
  const campaign = await campaignRepository.findByIdWithCpm(campaignId);

  if (!campaign) {
    return { error: 'Campaign not found' };
  }

  const baseCpm = campaign.cpmCents;
  const newMinCpm = minCpmCents || Math.floor(baseCpm * 0.5);
  const newMaxCpm = maxCpmCents || Math.floor(baseCpm * 1.5);

  await campaignRepository.updateCpmBounds(campaignId, newMinCpm, newMaxCpm);

  return {
    minCpmCents: newMinCpm,
    maxCpmCents: newMaxCpm,
  };
}
