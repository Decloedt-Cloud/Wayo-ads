import { NextRequest, NextResponse } from 'next/server';
import { searchYouTubeVideos } from '@/lib/youtube';
import { requireRole } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    await requireRole('CREATOR');

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const maxResults = parseInt(searchParams.get('maxResults') || '10', 10);
    const pageToken = searchParams.get('pageToken') || undefined;
    const searchType = searchParams.get('type') || 'all';
    const publishedAfter = searchParams.get('publishedAfter') || undefined;
    const regionCode = searchParams.get('regionCode') || undefined;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const results = await searchYouTubeVideos(
      query.trim(),
      Math.min(maxResults, 20),
      pageToken,
      searchType as 'all' | 'shorts' | 'videos',
      publishedAfter,
      regionCode
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('[YouTubeSearch] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search YouTube' },
      { status: 500 }
    );
  }
}
