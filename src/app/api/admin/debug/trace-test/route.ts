import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testPrompt, systemPrompt } = body;

    const response = await callLLM({
      prompt: testPrompt || 'Say "Hello from Langfuse!" in 5 words or less.',
      systemPrompt: systemPrompt || 'You are a helpful assistant.',
      model: 'deepseek-chat',
      temperature: 0.7,
      feature: 'title-thumbnail',
      creatorId: 'test-creator-123',
      metadata: {
        testMode: true,
        timestamp: new Date().toISOString(),
        source: 'api/admin/debug/trace-test',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Langfuse trace created successfully',
      response,
      traceInfo: {
        feature: 'title-thumbnail',
        creatorId: 'test-creator-123',
      },
    });
  } catch (error) {
    console.error('Trace test error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
