import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOnboardingStatus } from '@/server/users';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { completed: false },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('type') || 'advertiser';

    const completed = await getOnboardingStatus(session.user.id, userType as 'advertiser' | 'creator');

    return NextResponse.json({ completed });
  } catch (error) {
    console.error('Onboarding status error:', error);
    return NextResponse.json(
      { completed: false },
      { status: 500 }
    );
  }
}
