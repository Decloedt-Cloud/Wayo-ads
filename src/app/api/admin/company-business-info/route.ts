/**
 * Admin API: Company Business Info Management
 * 
 * GET  /api/admin/company-business-info - Get company business info
 * PUT  /api/admin/company-business-info - Update company business info
 * 
 * Requires SUPERADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import {
  getCompanyBusinessInfo,
  updateCompanyBusinessInfo,
  companyBusinessInfoInputSchema,
} from '@/server/admin/companyBusinessInfoService';

export async function GET(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();

    const info = await getCompanyBusinessInfo();

    return NextResponse.json({
      info: {
        id: info.id,
        companyName: info.companyName,
        registrationNumber: info.registrationNumber,
        vatNumber: info.vatNumber,
        contactEmail: info.contactEmail,
        contactPhone: info.contactPhone,
        addressLine1: info.addressLine1,
        addressLine2: info.addressLine2,
        city: info.city,
        state: info.state,
        postalCode: info.postalCode,
        countryCode: info.countryCode,
        legalEntityType: info.legalEntityType,
        incorporationDate: info.incorporationDate?.toISOString() || null,
        bankName: info.bankName,
        bankAccountNumber: info.bankAccountNumber,
        bankSwift: info.bankSwift,
        bankIban: info.bankIban,
        createdAt: info.createdAt.toISOString(),
        updatedAt: info.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching company business info:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Access denied. Superadmin privileges required.' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch company business info' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    
    const body = await request.json();
    const validatedData = companyBusinessInfoInputSchema.parse(body);

    const info = await updateCompanyBusinessInfo(validatedData, user.id);

    return NextResponse.json({
      info: {
        id: info.id,
        companyName: info.companyName,
        registrationNumber: info.registrationNumber,
        vatNumber: info.vatNumber,
        contactEmail: info.contactEmail,
        contactPhone: info.contactPhone,
        addressLine1: info.addressLine1,
        addressLine2: info.addressLine2,
        city: info.city,
        state: info.state,
        postalCode: info.postalCode,
        countryCode: info.countryCode,
        legalEntityType: info.legalEntityType,
        incorporationDate: info.incorporationDate?.toISOString() || null,
        bankName: info.bankName,
        bankAccountNumber: info.bankAccountNumber,
        bankSwift: info.bankSwift,
        bankIban: info.bankIban,
        createdAt: info.createdAt.toISOString(),
        updatedAt: info.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating company business info:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (error.message === 'Forbidden') {
      return NextResponse.json(
        { error: 'Access denied. Superadmin privileges required.' },
        { status: 403 }
      );
    }
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update company business info' },
      { status: 500 }
    );
  }
}
