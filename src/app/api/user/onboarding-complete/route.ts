import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { completeOnboarding } from '@/server/users';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userType = body.userType || 'advertiser';

    await completeOnboarding(session.user.id, userType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
      if (error.message.includes('not an advertiser') || error.message.includes('not a creator')) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
