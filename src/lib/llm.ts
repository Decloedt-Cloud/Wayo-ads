import OpenAI from 'openai';
import { trackAiUsageAndDeductTokens } from '@/server/ai/tokenEconomics';
import { getProviderFromModel } from '@/server/ai/costCalculator';
import {
  createLangfuseTrace,
  createLangfuseSpan,
  endLangfuseSpan,
  createLangfuseGeneration,
  endLangfuseGeneration,
  flushLangfuse,
  isEnabled,
  AIFeature,
  TokenUsage,
  normalizeError,
} from '@/lib/langfuse-trace';
import type { LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient } from 'langfuse';

export type { AIFeature, TokenUsage };

export interface LLMMetadata {
  campaignId?: string;
  creatorId?: string;
  workspaceId?: string;
  niche?: string;
  [key: string]: unknown;
}

interface AccountingResult {
  tokensCharged: number;
  newBalance: number;
  estimatedCostUsd: number;
  tokenRevenueUsd: number;
  marginUsd: number;
}

export async function callLLM({
  prompt,
  userId,
  systemPrompt,
  model = 'deepseek-chat',
  temperature = 0.2,
  top_p = 0.9,
  max_tokens = 600,
  feature = 'script-generation',
  metadata,
  creatorId,
}: {
  prompt: string;
  userId?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  feature?: AIFeature;
  metadata?: LLMMetadata;
  creatorId?: string;
}) {
  const langfuseEnabled = isEnabled();
  const startTime = Date.now();
  
  let trace: LangfuseTraceClient | null = null;
  let inputSpan: LangfuseSpanClient | null = null;
  let providerSpan: LangfuseSpanClient | null = null;
  let generation: LangfuseGenerationClient | null = null;

  if (langfuseEnabled) {
    trace = createLangfuseTrace({
      feature: feature as AIFeature,
      requestType: 'generation',
      creatorId,
      campaignId: metadata?.campaignId,
      workspaceId: metadata?.workspaceId,
    }) as LangfuseTraceClient | null;

    if (trace) {
      inputSpan = createLangfuseSpan({
        name: 'input_preparation',
        trace,
        input: { promptLength: prompt.length, hasSystemPrompt: !!systemPrompt },
      });
      
      generation = trace.generation({
        name: 'deepseek-call',
        model: model,
        input: prompt,
        modelParameters: {
          temperature,
          top_p,
          max_tokens,
        },
      });
    }
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });

    const messages: { role: 'system' | 'user'; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    if (langfuseEnabled && inputSpan) {
      await endLangfuseSpan(inputSpan, { status: 'success' });
      
      providerSpan = createLangfuseSpan({
        name: 'provider_request',
        trace,
        input: { model, temperature, top_p, max_tokens },
      });
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
    });

    const response = completion.choices[0]?.message?.content || '';
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    const latencyMs = Date.now() - startTime;

    if (langfuseEnabled && providerSpan) {
      await endLangfuseSpan(providerSpan, { status: 'success', output: { responseLength: response.length } });
    }

    let accounting: AccountingResult | null = null;
    let accountingSpan: LangfuseSpanClient | null = null;

    if (creatorId && feature) {
      if (langfuseEnabled && trace) {
        accountingSpan = createLangfuseSpan({
          name: 'accounting_snapshot',
          trace,
        });
      }

      try {
        accounting = await trackAiUsageAndDeductTokens(
          creatorId,
          feature,
          model,
          promptTokens,
          completionTokens,
          trace?.id,
          metadata as Record<string, unknown> | undefined
        );
      } catch (error) {
        console.error('Failed to track AI usage:', error);
      }

      if (langfuseEnabled && accountingSpan) {
        await endLangfuseSpan(accountingSpan, { 
          status: accounting ? 'success' : 'error',
          output: accounting ? { tokensCharged: accounting.tokensCharged, cost: accounting.estimatedCostUsd } : undefined,
        });
      }
    }

    if (langfuseEnabled) {
      const tokenUsage: TokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens,
      };

      if (generation) {
        await endLangfuseGeneration(generation, {
          output: response,
          tokenUsage,
          internalTokensCharged: accounting?.tokensCharged || 0,
          estimatedCostUsd: accounting?.estimatedCostUsd || 0,
          marginUsd: accounting?.marginUsd || 0,
          tokenRevenueUsd: accounting?.tokenRevenueUsd,
          provider: getProviderFromModel(model),
          model,
        });
      }
    }

    await flushLangfuse();

    return response;
  } catch (error) {
    const normalizedError = normalizeError(error);
    
    if (langfuseEnabled) {
      if (inputSpan) {
        await endLangfuseSpan(inputSpan, { status: 'error', output: { error: normalizedError.errorMessage } });
      }
      if (providerSpan) {
        await endLangfuseSpan(providerSpan, { status: 'error', output: { error: normalizedError.errorMessage } });
      }
      if (generation) {
        const tokenUsage: TokenUsage = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        };
        
        await endLangfuseGeneration(generation, {
          output: '',
          tokenUsage,
          internalTokensCharged: 0,
          estimatedCostUsd: 0,
          marginUsd: 0,
          provider: getProviderFromModel(model),
          model,
          error: normalizedError,
        });
      }
    }

    await flushLangfuse();
    throw error;
  }
}
