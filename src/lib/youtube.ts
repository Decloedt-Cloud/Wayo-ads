const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
];

export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  durationSeconds: number | null;
  videoType: 'VIDEO' | 'SHORT';
}

export interface YouTubeExtractResult {
  success: boolean;
  videoId?: string;
  videoType?: 'VIDEO' | 'SHORT';
  error?: string;
}

export function extractYouTubeVideoId(url: string): YouTubeExtractResult {
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'Invalid URL provided' };
  }

  const trimmedUrl = url.trim();

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      
      if (!YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
        return { success: false, error: 'Invalid YouTube video ID format' };
      }

      const isShorts = trimmedUrl.includes('/shorts/');
      
      return {
        success: true,
        videoId,
        videoType: isShorts ? 'SHORT' : 'VIDEO',
      };
    }
  }

  if (YOUTUBE_VIDEO_ID_REGEX.test(trimmedUrl)) {
    return {
      success: true,
      videoId: trimmedUrl,
      videoType: 'VIDEO',
    };
  }

  return { success: false, error: 'Could not extract YouTube video ID from URL' };
}

export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeVideoMetadata | null> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('YouTube Data API key not configured, using fallback data');
    return getFallbackMetadata(videoId);
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return getFallbackMetadata(videoId);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const snippet = item.snippet;
    const contentDetails = item.contentDetails;

    let durationSeconds: number | null = null;
    if (contentDetails?.duration) {
      durationSeconds = parseDuration(contentDetails.duration);
    }

    const isShorts = videoId.length === 11 && durationSeconds !== null && durationSeconds <= 60;

    return {
      videoId,
      title: snippet.title,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
      channelName: snippet.channelTitle,
      durationSeconds,
      videoType: isShorts ? 'SHORT' : 'VIDEO',
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return getFallbackMetadata(videoId);
  }
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  durationSeconds: number | null;
  videoType: 'VIDEO' | 'SHORT';
  publishedAt: string;
  viewCount: string | null;
  likeCount: string | null;
  commentCount: string | null;
  tags: string[];
}

export interface YouTubeSearchResponse {
  videos: YouTubeSearchResult[];
  nextPageToken?: string;
  totalResults: number;
}

export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 10,
  pageToken?: string,
  searchType: 'all' | 'shorts' | 'videos' = 'all',
  publishedAfter?: string,
  regionCode?: string
): Promise<YouTubeSearchResponse> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('YouTube Data API key not configured');
    return { videos: [], totalResults: 0 };
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      order: 'viewCount',
      key: apiKey,
    });

    if (searchType === 'shorts') {
      params.set('q', `${query} #shorts`);
    } else if (searchType === 'videos') {
      params.set('videoDuration', 'medium');
    } else {
      params.set('videoDuration', 'any');
    }

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    if (publishedAfter) {
      params.set('publishedAfter', publishedAfter);
    }

    if (regionCode) {
      params.set('regionCode', regionCode);
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      console.error('YouTube Search API error:', response.status);
      return { videos: [], totalResults: 0 };
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return { videos: [], totalResults: 0 };
    }

    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&part=contentDetails,snippet,statistics&key=${apiKey}`,
      { next: { revalidate: 300 } }
    );

    const detailsData = await detailsResponse.json();
    const detailsMap = new Map<string, { duration?: string; viewCount?: string; likeCount?: string; commentCount?: string; tags?: string[] }>(
      (detailsData.items || []).map((item: any) => [
        item.id,
        {
          duration: item.contentDetails?.duration,
          viewCount: item.statistics?.viewCount,
          likeCount: item.statistics?.likeCount,
          commentCount: item.statistics?.commentCount,
          tags: item.snippet?.tags || [],
        }
      ])
    );

    const videos: YouTubeSearchResult[] = data.items.map((item: any) => {
      const videoId = item.id.videoId;
      const details = detailsMap.get(videoId) || { duration: undefined, viewCount: undefined, likeCount: undefined, commentCount: undefined, tags: [] };
      const durationSeconds = details.duration ? parseDuration(details.duration) : null;
      const isShorts = durationSeconds !== null && durationSeconds <= 60;

      return {
        videoId,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
        channelName: item.snippet.channelTitle,
        durationSeconds,
        videoType: isShorts ? 'SHORT' : 'VIDEO',
        publishedAt: item.snippet.publishedAt,
        viewCount: details.viewCount || null,
        likeCount: details.likeCount || null,
        commentCount: details.commentCount || null,
        tags: details.tags || [],
      };
    });

    return {
      videos,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo?.totalResults || 0,
    };
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return { videos: [], totalResults: 0 };
  }
}

function parseDuration(duration: string): number | null {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) return null;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

function getFallbackMetadata(videoId: string): YouTubeVideoMetadata {
  return {
    videoId,
    title: 'YouTube Video',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    channelName: 'Unknown Channel',
    durationSeconds: null,
    videoType: 'VIDEO',
  };
}

export function getYouTubeEmbedUrl(videoId: string, autoplay: boolean = false, muted: boolean = false): string {
  const params = new URLSearchParams();
  
  if (autoplay) {
    params.set('autoplay', '1');
  }
  
  if (muted) {
    params.set('mute', '1');
  }

  const queryString = params.toString();
  return queryString 
    ? `https://www.youtube.com/embed/${videoId}?${queryString}`
    : `https://www.youtube.com/embed/${videoId}`;
}

export function getYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

export function validateVideoId(videoId: string): boolean {
  return YOUTUBE_VIDEO_ID_REGEX.test(videoId);
}

export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  
  const urlLower = url.toLowerCase();
  return (
    urlLower.includes('youtube.com') ||
    urlLower.includes('youtu.be')
  );
}

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  channelName: string;
  viewCount: number;
  likeCount: number;
  publishDate: string;
  thumbnailUrl: string;
  transcript: string;
}

export async function fetchYouTubeVideoData(videoId: string): Promise<YouTubeVideoData | null> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.warn('YouTube Data API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('YouTube API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const snippet = item.snippet;
    const statistics = item.statistics;
    const contentDetails = item.contentDetails;

    return {
      videoId,
      title: snippet.title || '',
      description: snippet.description || '',
      tags: snippet.tags || [],
      categoryId: snippet.categoryId || '',
      channelName: snippet.channelTitle || '',
      viewCount: parseInt(statistics?.viewCount || '0'),
      likeCount: parseInt(statistics?.likeCount || '0'),
      publishDate: snippet.publishedAt || '',
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || getYouTubeThumbnailUrl(videoId),
      transcript: '',
    };
  } catch (error) {
    console.error('Error fetching YouTube video data:', error);
    return null;
  }
}
