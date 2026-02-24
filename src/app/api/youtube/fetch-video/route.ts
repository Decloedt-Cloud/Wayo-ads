import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server-auth';
import { extractYouTubeVideoId, fetchYouTubeVideoData } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  try {
    await requireRole('CREATOR');
    
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Missing YouTube URL or video ID' },
        { status: 400 }
      );
    }

    const extractResult = extractYouTubeVideoId(url);
    
    if (!extractResult.success || !extractResult.videoId) {
      return NextResponse.json(
        { error: extractResult.error || 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    const videoData = await fetchYouTubeVideoData(extractResult.videoId);

    if (!videoData) {
      return NextResponse.json(
        { error: 'Video not found or unavailable' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      videoId: videoData.videoId,
      title: videoData.title,
      description: videoData.description,
      channelName: videoData.channelName,
      viewCount: videoData.viewCount,
      likeCount: videoData.likeCount,
      thumbnailUrl: videoData.thumbnailUrl,
      tags: videoData.tags,
      categoryId: videoData.categoryId,
      publishDate: videoData.publishDate,
    });
  } catch (error) {
    console.error('Error fetching YouTube video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video data' },
      { status: 500 }
    );
  }
}
