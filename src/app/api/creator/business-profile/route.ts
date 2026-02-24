import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server-auth';
import { creatorBusinessProfileSchema } from '@/lib/validation/business-profile';
import { getCreatorBusinessProfile, createOrUpdateBusinessProfile } from '@/server/creators';

/**
 * GET /api/creator/business-profile
 * Fetches the current user's business profile
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getCreatorBusinessProfile(user.id);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/creator/business-profile
 * Updates or creates the current user's business profile
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const validatedData = creatorBusinessProfileSchema.parse(body);

    const profile = await createOrUpdateBusinessProfile(user.id, validatedData as any);

    return NextResponse.json({ 
      success: true, 
      profile,
      message: 'Business profile updated successfully' 
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: (error as any).errors 
      }, { status: 400 });
    }

    console.error('Error updating business profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
