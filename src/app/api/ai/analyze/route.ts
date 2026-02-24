import { NextRequest, NextResponse } from 'next/server';
import { analysisEngine, runAnalysis, getAnalysisHistory, invalidateVideoAnalysis } from '@/server/ai/analysisEngineService';
import { tokenService } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';
import { getVideoForAnalysis } from '@/server/ai/analysisService';

analysisEngine.setTokenService(tokenService);

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    
    const body = await request.json();
    const { videoId, promptKey, model, userVariables } = body;

    if (!videoId || !promptKey) {
      return NextResponse.json(
        { error: 'videoId and promptKey are required' },
        { status: 400 }
      );
    }

    const videoResult = await getVideoForAnalysis(videoId);
    if ('error' in videoResult) {
      return NextResponse.json(
        { error: videoResult.error },
        { status: 404 }
      );
    }

    const video = videoResult.video;

    const result = await runAnalysis(
      {
        videoId,
        transcript: video.transcript || '',
        metadata: (video.metadata as Record<string, unknown>) || {},
        userVariables,
      },
      promptKey,
      model || 'deepseek-chat',
      user.id
    );

    return NextResponse.json({
      cached: result.cached,
      result: result.result,
      tokenCost: result.tokenCost,
      promptVersion: result.promptVersion,
      model: result.model,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const promptKey = searchParams.get('promptKey');

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }

    const history = await getAnalysisHistory(videoId, promptKey || undefined);

    return NextResponse.json({
      history,
    });
  } catch (error) {
    console.error('Get analysis history error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get analysis history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');
    
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const promptKey = searchParams.get('promptKey');

    if (!videoId || !promptKey) {
      return NextResponse.json(
        { error: 'videoId and promptKey are required' },
        { status: 400 }
      );
    }

    await invalidateVideoAnalysis(videoId, promptKey);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Invalidate analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to invalidate analysis' },
      { status: 500 }
    );
  }
}
