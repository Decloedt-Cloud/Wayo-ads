import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/server-auth';
import { grantUserRole, UserRole } from '@/server/users';

const grantRoleSchema = z.object({
  role: z.enum(['ADVERTISER', 'CREATOR']),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = grantRoleSchema.parse(body);

    const roles = await grantUserRole(user.id, validated.role as UserRole);

    return NextResponse.json({ 
      success: true,
      roles,
    });
  } catch (error) {
    console.error('Error granting role:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to grant role' }, { status: 500 });
  }
}
