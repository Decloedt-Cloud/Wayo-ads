export type UserRole = 'creator' | 'advertiser' | 'admin' | 'system';
export type Environment = 'dev' | 'preprod' | 'prod';
export type RequestType = 'analysis' | 'generation' | 'prediction' | 'validation';
export type ExecutionStatus = 'success' | 'error' | 'rejected';
export type ErrorCategory = 'provider' | 'validation' | 'budget' | 'tokens' | 'security' | 'unknown';

export const FEATURE_NAMES = {
  'script-generation': 'Script Generation',
  'thumbnail-analysis': 'Thumbnail Analysis',
  'hook-optimizer': 'Hook Optimizer',
  'title-generation': 'Title Generation',
  'retention-analysis': 'Retention Analysis',
  'ctr-prediction': 'CTR Prediction',
  'pattern-blending': 'Pattern Blending',
  'viral-prediction': 'Viral Prediction',
  'expected-value': 'Expected Value',
  'creator-intelligence': 'Creator Intelligence',
  'video-research': 'Video Research',
  'script-outline': 'Script Outline',
  'thumbnail-generation': 'Thumbnail Generation',
  'title-thumbnail': 'Title & Thumbnail',
} as const;

export type AIFeature = keyof typeof FEATURE_NAMES;

export interface IdentityContext {
  creatorId?: string;
  userRole: UserRole;
  environment: Environment;
}

export interface BusinessContext {
  feature: AIFeature;
  requestType: RequestType;
  campaignId?: string;
  workspaceId?: string;
}

export interface EconomicContext {
  internalTokensCharged: number;
  llmTokensTotal: number;
  estimatedCostUsd: number;
  marginUsd: number;
  tokenRevenueUsd?: number;
}

export interface ExecutionContext {
  provider: string;
  model: string;
  latencyMs?: number;
  temperature?: number;
}

export interface SafetySignals {
  creatorTrustScoreSnapshot?: number;
  fraudScoreSnapshot?: number;
  throttled: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ErrorContext {
  status: ExecutionStatus;
  errorCode?: string;
  errorCategory: ErrorCategory;
  errorMessage: string;
}

export interface TraceMetadata {
  identity: IdentityContext;
  business: BusinessContext;
  economic?: EconomicContext;
  execution?: ExecutionContext;
  safety?: SafetySignals;
}

export function buildIdentityContext(params: {
  creatorId?: string;
  userRole?: UserRole;
}): IdentityContext {
  return {
    creatorId: params.creatorId,
    userRole: params.userRole || 'creator',
    environment: (process.env.NODE_ENV as Environment) || 'dev',
  };
}

export function buildBusinessContext(params: {
  feature: AIFeature;
  requestType?: RequestType;
  campaignId?: string;
  workspaceId?: string;
}): BusinessContext {
  return {
    feature: params.feature,
    requestType: params.requestType || 'generation',
    campaignId: params.campaignId,
    workspaceId: params.workspaceId,
  };
}

export function buildEconomicContext(params: {
  internalTokensCharged: number;
  llmTokensTotal: number;
  estimatedCostUsd: number;
  marginUsd: number;
  tokenRevenueUsd?: number;
}): EconomicContext {
  return {
    internalTokensCharged: params.internalTokensCharged,
    llmTokensTotal: params.llmTokensTotal,
    estimatedCostUsd: params.estimatedCostUsd,
    marginUsd: params.marginUsd,
    tokenRevenueUsd: params.tokenRevenueUsd,
  };
}

export function buildExecutionContext(params: {
  provider: string;
  model: string;
  latencyMs?: number;
  temperature?: number;
}): ExecutionContext {
  return {
    provider: params.provider,
    model: params.model,
    latencyMs: params.latencyMs,
    temperature: params.temperature,
  };
}

export function buildSafetySignals(params: {
  creatorTrustScoreSnapshot?: number;
  fraudScoreSnapshot?: number;
  throttled?: boolean;
}): SafetySignals {
  return {
    creatorTrustScoreSnapshot: params.creatorTrustScoreSnapshot,
    fraudScoreSnapshot: params.fraudScoreSnapshot,
    throttled: params.throttled || false,
  };
}

export function buildTraceMetadata(params: {
  identity: IdentityContext;
  business: BusinessContext;
  economic?: EconomicContext;
  execution?: ExecutionContext;
  safety?: SafetySignals;
}): TraceMetadata {
  return {
    identity: params.identity,
    business: params.business,
    economic: params.economic,
    execution: params.execution,
    safety: params.safety,
  };
}

export function normalizeError(error: unknown): ErrorContext {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  let errorCategory: ErrorCategory = 'unknown';
  let errorCode = 'UNKNOWN_ERROR';
  
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('api key') || lowerMessage.includes('unauthorized') || lowerMessage.includes('auth')) {
    errorCategory = 'provider';
    errorCode = 'AUTH_ERROR';
  } else if (lowerMessage.includes('rate limit') || lowerMessage.includes('quota')) {
    errorCategory = 'budget';
    errorCode = 'RATE_LIMIT';
  } else if (lowerMessage.includes('token') && (lowerMessage.includes('limit') || lowerMessage.includes('exceed'))) {
    errorCategory = 'tokens';
    errorCode = 'TOKEN_LIMIT';
  } else if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    errorCategory = 'validation';
    errorCode = 'VALIDATION_ERROR';
  } else if (lowerMessage.includes('security') || lowerMessage.includes('forbidden') || lowerMessage.includes('permission')) {
    errorCategory = 'security';
    errorCode = 'SECURITY_ERROR';
  } else if (lowerMessage.includes('network') || lowerMessage.includes('timeout') || lowerMessage.includes('connect')) {
    errorCategory = 'provider';
    errorCode = 'NETWORK_ERROR';
  }
  
  return {
    status: 'error',
    errorCode,
    errorCategory,
    errorMessage: sanitizeErrorMessage(errorMessage),
  };
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9-]+/g, '***REDACTED***')
    .replace(/pk-[a-zA-Z0-9-]+/g, '***REDACTED***')
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"'\s]+/gi, 'api_key=***REDACTED***')
    .replace(/Bearer\s+[a-zA-Z0-9-]+/g, 'Bearer ***REDACTED***')
    .substring(0, 500);
}

export function buildGenerationMetadata(params: {
  tokenUsage: TokenUsage;
  economic: EconomicContext;
  execution: ExecutionContext;
  safety?: SafetySignals;
  error?: ErrorContext;
}) {
  return {
    llmTokensPrompt: params.tokenUsage.promptTokens,
    llmTokensCompletion: params.tokenUsage.completionTokens,
    llmTokensTotal: params.tokenUsage.totalTokens,
    internalTokensCharged: params.economic.internalTokensCharged,
    estimatedCostUsd: params.economic.estimatedCostUsd,
    tokenRevenueUsd: params.economic.tokenRevenueUsd,
    marginUsd: params.economic.marginUsd,
    provider: params.execution.provider,
    model: params.execution.model,
    temperature: params.execution.temperature,
    creatorTrustScoreSnapshot: params.safety?.creatorTrustScoreSnapshot,
    fraudScoreSnapshot: params.safety?.fraudScoreSnapshot,
    throttled: params.safety?.throttled || false,
    ...(params.error && {
      status: params.error.status,
      errorCode: params.error.errorCode,
      errorCategory: params.error.errorCategory,
      errorMessage: params.error.errorMessage,
    }),
  };
}
