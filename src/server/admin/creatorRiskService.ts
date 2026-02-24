import { adminSettingsRepository } from './repositories';

export async function setCreatorRisk(creatorId: string, riskLevel: string = 'MEDIUM') {
  await adminSettingsRepository.upsertCreatorBalance(creatorId, { riskLevel: riskLevel as any });
  return { success: true, riskLevel };
}

export async function forceCreatorRisk(creatorId: string, riskLevel: string = 'HIGH') {
  await adminSettingsRepository.upsertCreatorBalance(creatorId, { riskLevel: riskLevel as any });
  return { success: true, riskLevel };
}

export async function capCreatorAllocation(creatorId: string, maxAllocation: number = 5000) {
  await adminSettingsRepository.upsertCreatorBalance(creatorId, { payoutDelayDays: 30 });
  return { success: true, capped: true, maxAllocation };
}

export async function unfreezeCreator(creatorId: string) {
  await adminSettingsRepository.upsertCreatorBalance(creatorId, { riskLevel: 'LOW' });
  return { success: true, unfrozen: true };
}
