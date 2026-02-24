import { adminSettingsRepository } from './repositories';
import { z } from 'zod';

export const companyBusinessInfoInputSchema = z.object({
  companyName: z.string().optional(),
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().optional(),
  legalEntityType: z.string().optional(),
  incorporationDate: z.string().optional().or(z.null()),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankSwift: z.string().optional(),
  bankIban: z.string().optional(),
});

export type CompanyBusinessInfoInput = z.infer<typeof companyBusinessInfoInputSchema>;

export async function getCompanyBusinessInfo() {
  let info = await adminSettingsRepository.findCompanyBusinessInfo();

  if (!info) {
    info = await adminSettingsRepository.createCompanyBusinessInfo({});
  }

  return info;
}

export async function updateCompanyBusinessInfo(
  data: CompanyBusinessInfoInput,
  userId: string
) {
  const existing = await adminSettingsRepository.findCompanyBusinessInfo();

  if (existing) {
    return adminSettingsRepository.updateCompanyBusinessInfo(existing.id, {
      ...data,
      incorporationDate: data.incorporationDate 
        ? new Date(data.incorporationDate) 
        : null,
      updatedByUserId: userId,
    });
  }

  return adminSettingsRepository.createCompanyBusinessInfo({
    ...data,
    incorporationDate: data.incorporationDate 
      ? new Date(data.incorporationDate) 
      : null,
    updatedByUserId: userId,
  });
}
