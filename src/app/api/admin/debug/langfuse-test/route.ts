import { NextRequest, NextResponse } from 'next/server';
import { langfuse, isLangfuseEnabled } from '@/lib/langfuse';

export async function GET(request: NextRequest) {
  const results: {
    envCheck: { passed: boolean; error?: string };
    clientCheck: { passed: boolean; enabled: boolean; error?: string };
    traceTest: { passed: boolean; traceId?: string; error?: string };
    spanTest: { passed: boolean; error?: string };
    generationTest: { passed: boolean; error?: string };
    flushTest: { passed: boolean; error?: string };
  } = {
    envCheck: { passed: false },
    clientCheck: { passed: false, enabled: false },
    traceTest: { passed: false },
    spanTest: { passed: false },
    generationTest: { passed: false },
    flushTest: { passed: false },
  };

  try {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const baseUrl = process.env.LANGFUSE_BASE_URL;

    if (!publicKey || !secretKey || !baseUrl) {
      results.envCheck.error = `Missing env vars: publicKey=${!!publicKey}, secretKey=${!!secretKey}, baseUrl=${!!baseUrl}`;
      return NextResponse.json({ success: false, results }, { status: 400 });
    }

    if (!publicKey.startsWith('pk-') || !secretKey.startsWith('sk-')) {
      results.envCheck.error = 'Invalid key format - must start with pk- and sk-';
      return NextResponse.json({ success: false, results }, { status: 400 });
    }

    results.envCheck.passed = true;
  } catch (error) {
    results.envCheck.error = String(error);
    return NextResponse.json({ success: false, results }, { status: 500 });
  }

  try {
    const enabled = isLangfuseEnabled();
    results.clientCheck.enabled = enabled;
    
    if (!langfuse) {
      results.clientCheck.error = 'Langfuse client is null';
      return NextResponse.json({ success: false, results }, { status: 500 });
    }

    results.clientCheck.passed = true;
  } catch (error) {
    results.clientCheck.error = String(error);
    return NextResponse.json({ success: false, results }, { status: 500 });
  }

  if (!isLangfuseEnabled()) {
    return NextResponse.json({
      success: true,
      message: 'Langfuse is disabled (missing env vars)',
      results,
    });
  }

  try {
    const trace = langfuse!.trace({
      name: 'debug-langfuse-test',
      metadata: {
        source: 'api/admin/debug/langfuse-test',
        timestamp: new Date().toISOString(),
      },
    });

    results.traceTest.passed = true;
    results.traceTest.traceId = trace.id;
  } catch (error) {
    results.traceTest.error = String(error);
    return NextResponse.json({ success: false, results }, { status: 500 });
  }

  try {
    const span = langfuse!.trace({ name: 'test-trace' }).span({
      name: 'test-span',
      input: { test: 'data' },
    });

    await span.end({
      output: { result: 'success' },
    });

    results.spanTest.passed = true;
  } catch (error) {
    results.spanTest.error = String(error);
    return NextResponse.json({ success: false, results }, { status: 500 });
  }

  try {
    const generation = langfuse!.trace({ name: 'test-gen-trace' }).generation({
      name: 'test-generation',
      model: 'deepseek-chat',
      input: 'test input',
    });

    await generation.end({
      output: 'test output',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
      },
      metadata: {
        test: true,
      },
    });

    results.generationTest.passed = true;
  } catch (error) {
    results.generationTest.error = String(error);
    return NextResponse.json({ success: false, results }, { status: 500 });
  }

  try {
    await langfuse!.flushAsync();
    results.flushTest.passed = true;
  } catch (error) {
    results.flushTest.error = String(error);
    return NextResponse.json({ success: false, results }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Langfuse integration verified successfully',
    results,
  });
}
