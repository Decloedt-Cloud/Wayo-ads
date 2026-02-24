import { z } from 'zod';

export const BusinessType = {
  PERSONAL: 'PERSONAL',
  SOLE_PROPRIETOR: 'SOLE_PROPRIETOR',
  REGISTERED_COMPANY: 'REGISTERED_COMPANY',
} as const;

export type BusinessType = typeof BusinessType[keyof typeof BusinessType];

/**
 * Normalizes VAT number by trimming and uppercasing
 */
export const normalizeVat = (vat: string | null | undefined) => {
  if (!vat) return null;
  return vat.trim().toUpperCase();
};

/**
 * Base address schema
 */
const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  state: z.string().optional().nullable(),
  countryCode: z.string().length(2, 'Country code must be 2 characters (ISO)'),
});

/**
 * Creator Business Profile validation schema
 * Implements conditional validation based on businessType
 */
export const creatorBusinessProfileSchema = z.discriminatedUnion('businessType', [
  // PERSONAL: No VAT required, Address optional
  z.object({
    businessType: z.literal(BusinessType.PERSONAL),
    companyName: z.string().optional().nullable(),
    vatNumber: z.string().optional().nullable(),
    addressLine1: z.string().optional().nullable(),
    addressLine2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    countryCode: z.string().optional().nullable(),
  }),

  // SOLE_PROPRIETOR: Address required, VAT optional
  z.object({
    businessType: z.literal(BusinessType.SOLE_PROPRIETOR),
    companyName: z.string().optional().nullable(),
    vatNumber: z.string().optional().nullable().transform(normalizeVat),
    addressLine1: z.string().min(1, 'Address is required'),
    addressLine2: z.string().optional().nullable(),
    city: z.string().min(1, 'City is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    state: z.string().optional().nullable(),
    countryCode: z.string().length(2, 'Country code must be 2 characters'),
  }),

  // REGISTERED_COMPANY: All required
  z.object({
    businessType: z.literal(BusinessType.REGISTERED_COMPANY),
    companyName: z.string().min(1, 'Company name is required'),
    vatNumber: z.string().min(1, 'VAT number is required').transform(normalizeVat),
    addressLine1: z.string().min(1, 'Address is required'),
    addressLine2: z.string().optional().nullable(),
    city: z.string().min(1, 'City is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    state: z.string().optional().nullable(),
    countryCode: z.string().length(2, 'Country code must be 2 characters'),
  }),
]);

export type CreatorBusinessProfileInput = z.infer<typeof creatorBusinessProfileSchema>;
