import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { business, payment, campaign } = body;

    console.log('Advertiser onboarding data:', {
      business,
      payment: payment ? { ...payment, cardNumber: '***' } : null,
      campaign,
      userId: session.user.id,
    });
    
    return NextResponse.json({ 
      message: 'Onboarding completed successfully',
      data: {
        business,
        paymentMethod: payment?.method,
        campaign: campaign.name,
      }
    });
  } catch (error) {
    console.error('Advertiser onboarding error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
