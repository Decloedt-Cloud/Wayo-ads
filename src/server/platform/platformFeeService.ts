import { adminSettingsRepository } from '@/server/admin/repositories';

export async function getPlatformFeeSettings() {
  const settings = await adminSettingsRepository.findPlatformSettings();

  return {
    platformFeePercentage: settings ? settings.platformFeeRate * 100 : 3,
    platformFeeDescription: settings?.platformFeeDescription || 'Platform fee',
  };
}
