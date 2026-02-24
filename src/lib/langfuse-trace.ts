import { langfuse, isLangfuseEnabled } from './langfuse';
import {
  TraceMetadata,
  AIFeature,
  RequestType,
  buildIdentityContext,
  buildBusinessContext,
  buildEconomicContext,
  buildExecutionContext,
  buildSafetySignals,
  buildTraceMetadata,
  buildGenerationMetadata,
  normalizeError,
  ErrorContext,
  TokenUsage,
  UserRole,
} from './langfuse-schema';

export type { TraceMetadata, AIFeature, RequestType, ErrorContext, TokenUsage, UserRole };

export { buildIdentityContext, buildBusinessContext, buildEconomicContext, buildExecutionContext, buildSafetySignals, buildTraceMetadata, buildGenerationMetadata, normalizeError };

let currentTrace: ReturnType<typeof langfuse extends null ? never : typeof langfuse.trace> | null = null;

export function createLangfuseTrace(params: {
  feature: AIFeature;
  requestType?: RequestType;
  creatorId?: string;
  userRole?: UserRole;
  campaignId?: string;
  workspaceId?: string;
  safety?: { creatorTrustScoreSnapshot?: number; fraudScoreSnapshot?: number; throttled?: boolean };
}) {
  if (!isLangfuseEnabled() || !langfuse) {
    console.warn('[Langfuse] Not enabled - trace not created');
    return null;
  }

  const identity = buildIdentityContext({
    creatorId: params.creatorId,
    userRole: params.userRole,
  });

  const business = buildBusinessContext({
    feature: params.feature,
    requestType: params.requestType,
    campaignId: params.campaignId,
    workspaceId: params.workspaceId,
  });

  const safety = params.safety ? buildSafetySignals(params.safety) : undefined;

  const metadata = buildTraceMetadata({
    identity,
    business,
    safety,
  });

  currentTrace = langfuse.trace({
    name: params.feature,
    userId: params.creatorId,
    metadata,
  });

  return currentTrace;
}

export function getCurrentLangfuseTrace() {
  return currentTrace;
}

export function createLangfuseSpan(params: {
  name: 'input_preparation' | 'provider_request' | 'response_processing' | 'accounting_snapshot' | 'persistence';
  trace?: ReturnType<typeof langfuse extends null ? never : typeof langfuse.trace> | null;
  input?: unknown;
}) {
  if (!isLangfuseEnabled() || !langfuse) {
    return null;
  }

  let trace = params.trace || currentTrace;
  if (!trace) {
    trace = langfuse.trace({
      name: 'default-trace',
    });
    currentTrace = trace;
  }

  return trace.span({
    name: params.name,
    input: params.input,
  });
}

export async function endLangfuseSpan(span: ReturnType<ReturnType<typeof langfuse extends null ? never : typeof langfuse.trace>['span']> | null, params: {
  output?: unknown;
  status?: 'success' | 'error';
}) {
  if (span) {
    await span.end({
      output: params.output,
      ...(params.status && { level: params.status === 'error' ? 'ERROR' : 'DEFAULT' }),
    });
  }
}

export function createLangfuseGeneration(params: {
  trace?: ReturnType<typeof langfuse extends null ? never : typeof langfuse.trace> | null;
  model: string;
  input: string;
  temperature?: number;
}) {
  if (!isLangfuseEnabled() || !langfuse) {
    return null;
  }

  const trace = params.trace || currentTrace;
  if (!trace) {
    console.warn('[Langfuse] No trace available for generation');
    return null;
  }

  return trace.generation({
    name: 'llm-call',
    model: params.model,
    input: params.input,
    ...(params.temperature !== undefined && { temperature: params.temperature }),
  });
}

export async function endLangfuseGeneration(generation: ReturnType<ReturnType<typeof langfuse extends null ? never : typeof langfuse.trace>['generation']> | null, params: {
  output: string;
  tokenUsage: TokenUsage;
  internalTokensCharged: number;
  estimatedCostUsd: number;
  marginUsd: number;
  tokenRevenueUsd?: number;
  provider: string;
  model: string;
  error?: ErrorContext;
}) {
  if (!generation) return;

  const economic = buildEconomicContext({
    internalTokensCharged: params.internalTokensCharged,
    llmTokensTotal: params.tokenUsage.totalTokens,
    estimatedCostUsd: params.estimatedCostUsd,
    marginUsd: params.marginUsd,
    tokenRevenueUsd: params.tokenRevenueUsd,
  });

  const execution = buildExecutionContext({
    provider: params.provider,
    model: params.model,
  });

  const metadata = buildGenerationMetadata({
    tokenUsage: params.tokenUsage,
    economic,
    execution,
    error: params.error,
  });

  await generation.end({
    output: params.output,
    usage: {
      promptTokens: params.tokenUsage.promptTokens,
      completionTokens: params.tokenUsage.completionTokens,
    },
    metadata,
    ...(params.error && { level: 'ERROR' }),
  });
}

export async function flushLangfuse(): Promise<void> {
  if (isLangfuseEnabled() && langfuse) {
    await langfuse.flushAsync();
  }
}

export function isEnabled(): boolean {
  return isLangfuseEnabled();
}
