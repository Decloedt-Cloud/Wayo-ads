import { db } from '@/lib/db';
import { computeInputHash } from '@/lib/ai/hashing';
import { getActivePrompt } from './promptRegistryService';
import OpenAI from 'openai';
import type { ITokenService } from '@/server/tokens/ITokenService';
import type { TokenFeature } from '@/server/tokens';
import type { Prisma } from '@prisma/client';

export interface AnalysisContext {
  videoId: string;
  transcript: string;
  metadata: Record<string, unknown>;
  userVariables?: Record<string, string>;
}

export interface AnalysisResultData {
  cached: boolean;
  result: Record<string, unknown>;
  tokenCost: number;
  promptVersion: number;
  model: string;
}

export class AnalysisEngineService {
  private tokenService: ITokenService | null = null;

  setTokenService(service: ITokenService) {
    this.tokenService = service;
  }

  async findCachedResult(
    inputHash: string,
    promptKey: string,
    promptVersion: number
  ) {
    const cached = await db.aiAnalysisResult.findFirst({
      where: {
        inputHash,
        promptKey,
        promptVersion,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return cached;
  }

  async shouldInvalidateCache(
    videoId: string,
    promptKey: string,
    currentPromptVersion: number
  ): Promise<boolean> {
    const existingResults = await db.aiAnalysisResult.findMany({
      where: {
        videoId,
        promptKey,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (existingResults.length === 0) {
      return false;
    }

    const latestResult = existingResults[0];
    return latestResult.promptVersion !== currentPromptVersion;
  }

  async runAnalysis(
    context: AnalysisContext,
    promptKey: string,
    model: string = 'deepseek-chat',
    userId?: string
  ): Promise<AnalysisResultData> {
    const prompt = await getActivePrompt(promptKey);

    const inputHash = computeInputHash({
      transcript: context.transcript,
      metadata: context.metadata,
      systemPrompt: prompt.systemPrompt,
      userPromptTemplate: prompt.userPromptTemplate,
      version: prompt.version,
      model,
    });

    const existingCache = await this.findCachedResult(inputHash, promptKey, prompt.version);

    if (existingCache) {
      return {
        cached: true,
        result: existingCache.outputJson as Record<string, unknown>,
        tokenCost: existingCache.tokenCost,
        promptVersion: existingCache.promptVersion,
        model: existingCache.model,
      };
    }

    const needsInvalidation = await this.shouldInvalidateCache(context.videoId, promptKey, prompt.version);
    if (needsInvalidation) {
      await db.aiAnalysisResult.deleteMany({
        where: {
          videoId: context.videoId,
          promptKey,
        },
      });
    }

    const userPrompt = this.buildUserPrompt(prompt.userPromptTemplate, {
      transcript: context.transcript,
      metadata: context.metadata,
      ...context.userVariables,
    });

    const openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: prompt.temperature,
      max_tokens: prompt.maxTokens,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const tokenCost = completion.usage?.total_tokens || 0;

    let outputJson: Record<string, unknown>;
    try {
      outputJson = JSON.parse(responseText);
    } catch {
      outputJson = { raw: responseText };
    }

    const analysisResult = await db.aiAnalysisResult.create({
      data: {
        videoId: context.videoId,
        promptKey,
        promptVersion: prompt.version,
        model,
        inputHash,
        outputJson: outputJson as Prisma.InputJsonValue,
        tokenCost,
      },
    });

    if (userId && this.tokenService) {
      await this.tokenService.consumeTokens(userId, tokenCost, 'AI_ANALYSIS' as TokenFeature);
    }

    return {
      cached: false,
      result: analysisResult.outputJson as Record<string, unknown>,
      tokenCost: analysisResult.tokenCost,
      promptVersion: analysisResult.promptVersion,
      model: analysisResult.model,
    };
  }

  private buildUserPrompt(
    template: string,
    variables: Record<string, unknown>
  ): string {
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
    return prompt;
  }

  async getAnalysisHistory(
    videoId: string,
    promptKey?: string
  ) {
    const where: { videoId: string; promptKey?: string } = { videoId };
    if (promptKey) {
      where.promptKey = promptKey;
    }

    const results = await db.aiAnalysisResult.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return results;
  }

  async invalidateVideoAnalysis(
    videoId: string,
    promptKey?: string
  ) {
    const where: { videoId: string; promptKey?: string } = { videoId };
    if (promptKey) {
      where.promptKey = promptKey;
    }

    const deleted = await db.aiAnalysisResult.deleteMany({
      where,
    });

    return deleted;
  }
}

export const analysisEngine = new AnalysisEngineService();

export const runAnalysis = analysisEngine.runAnalysis.bind(analysisEngine);
export const getAnalysisHistory = analysisEngine.getAnalysisHistory.bind(analysisEngine);
export const invalidateVideoAnalysis = analysisEngine.invalidateVideoAnalysis.bind(analysisEngine);
