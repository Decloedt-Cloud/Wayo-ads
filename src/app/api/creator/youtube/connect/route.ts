import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkYouTubeConnection } from '@/server/creators/youtubeService';
import { PKCE_COOKIE_NAME, PKCE_COOKIE_MAX_AGE } from '@/lib/security/oauth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const result = await checkYouTubeConnection(session.user.id);
    
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    const response = NextResponse.json({ authUrl: result.authUrl });

    response.cookies.set(PKCE_COOKIE_NAME, result.codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PKCE_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('[YouTube Connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
