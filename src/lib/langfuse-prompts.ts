import { langfuse, isLangfuseEnabled } from './langfuse';

export interface PromptConfig {
  name: string;
  version?: number;
  label?: string;
}

export interface LangfusePrompt {
  name: string;
  version: number;
  type: 'chat' | 'text';
  prompt: string | Array<{ role: string; content: string }>;
  config: Record<string, unknown>;
  labels: string[];
  tags: string[];
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens: number;
  promptName: string;
  promptVersion: number;
  promptLabel?: string;
  source: 'langfuse' | 'database' | 'fallback';
}

interface CacheEntry {
  prompt: CompiledPrompt;
  expiresAt: number;
}

const promptCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function getCacheKey(name: string, label?: string, version?: number): string {
  return `${name}:${label || 'default'}:${version || 'latest'}`;
}

function isCacheValid(entry: CacheEntry | undefined): boolean {
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
}

function setCache(key: string, prompt: CompiledPrompt, ttlMs: number = DEFAULT_TTL_MS) {
  promptCache.set(key, {
    prompt,
    expiresAt: Date.now() + ttlMs,
  });
}

function getCache(key: string): CompiledPrompt | null {
  const entry = promptCache.get(key);
  if (isCacheValid(entry)) {
    return entry!.prompt;
  }
  if (entry) {
    promptCache.delete(key);
  }
  return null;
}

export function clearPromptCache(name?: string) {
  if (name) {
    for (const key of promptCache.keys()) {
      if (key.startsWith(name + ':')) {
        promptCache.delete(key);
      }
    }
  } else {
    promptCache.clear();
  }
}

async function fetchFromLangfuse(name: string, label?: string, version?: number): Promise<CompiledPrompt | null> {
  if (!isLangfuseEnabled() || !langfuse) {
    return null;
  }

  try {
    const langfuseWithApi = langfuse as any;
    if (!langfuseWithApi.api || !langfuseWithApi.api.promptsGet) {
      console.warn('[LangfusePrompts] promptsGet not available on this Langfuse SDK version');
      return null;
    }

    const prompt = await langfuseWithApi.api.promptsGet({
      promptName: name,
      label: label || null,
      version: version ?? null,
    });

    if (!prompt) {
      return null;
    }

    let systemPrompt = '';
    let userPromptTemplate = '';

    if (prompt.type === 'text') {
      systemPrompt = prompt.prompt as string;
      userPromptTemplate = '';
    } else if (prompt.type === 'chat') {
      const messages = prompt.prompt as Array<{ role: string; content: string }>;
      const systemMsg = messages.find(m => m.role === 'system');
      const userMsgs = messages.filter(m => m.role !== 'system');
      systemPrompt = systemMsg?.content || '';
      userPromptTemplate = userMsgs.map(m => m.content).join('\n\n');
    }

    const config = prompt.config || {};
    const temperature = typeof config.temperature === 'number' ? config.temperature : 0.7;
    const maxTokens = typeof config.maxTokens === 'number' ? config.maxTokens : 2000;

    return {
      systemPrompt,
      userPromptTemplate,
      temperature,
      maxTokens,
      promptName: prompt.name,
      promptVersion: prompt.version,
      promptLabel: label,
      source: 'langfuse',
    };
  } catch (error) {
    console.error(`[LangfusePrompts] Error fetching prompt ${name}:`, error);
    return null;
  }
}

const FALLBACK_PROMPTS: Record<string, CompiledPrompt> = {
  'title-thumbnail.main': {
    systemPrompt: `You are a YouTube click psychology and viral packaging expert.

You specialize in:
- Reverse-engineering viral YouTube videos
- Title curiosity mechanics
- Thumbnail attention triggers
- CTR optimization psychology
- Pattern recognition & replication logic
- Viewer click decision behavior

You do NOT behave like a marketer or SEO writer.

You think like a viral strategist analyzing why videos get clicked.`,
    userPromptTemplate: '',
    temperature: 0.7,
    maxTokens: 2000,
    promptName: 'title-thumbnail.main',
    promptVersion: 1,
    source: 'fallback',
  },
  'ctr-prediction.main': {
    systemPrompt: `You are a CTR prediction expert for YouTube content.

You analyze video metadata, thumbnails, titles, and audience signals to predict click-through rates.`,
    userPromptTemplate: '',
    temperature: 0.3,
    maxTokens: 500,
    promptName: 'ctr-prediction.main',
    promptVersion: 1,
    source: 'fallback',
  },
  'retention-prediction.main': {
    systemPrompt: `You are a retention prediction expert for YouTube content.

You analyze video content, hooks, pacing, and engagement signals to predict viewer retention rates.`,
    userPromptTemplate: '',
    temperature: 0.3,
    maxTokens: 500,
    promptName: 'retention-prediction.main',
    promptVersion: 1,
    source: 'fallback',
  },
  'expected-value.main': {
    systemPrompt: `You are an expected value calculation expert for YouTube content.

You analyze CTR, retention, views, and monetization signals to calculate expected revenue.`,
    userPromptTemplate: '',
    temperature: 0.3,
    maxTokens: 500,
    promptName: 'expected-value.main',
    promptVersion: 1,
    source: 'fallback',
  },
  'pattern-blending.main': {
    systemPrompt: `You are a pattern blending expert for YouTube content.

You analyze multiple viral videos and blend their successful elements into new content strategies.`,
    userPromptTemplate: '',
    temperature: 0.7,
    maxTokens: 1500,
    promptName: 'pattern-blending.main',
    promptVersion: 1,
    source: 'fallback',
  },
  'viral-patterns.main': {
    systemPrompt: `You are a viral pattern detection expert for YouTube content.

You analyze video elements to identify viral patterns and replication strategies.`,
    userPromptTemplate: '',
    temperature: 0.7,
    maxTokens: 1500,
    promptName: 'viral-patterns.main',
    promptVersion: 1,
    source: 'fallback',
  },
  'creator-intelligence.main': {
    systemPrompt: `You are a creator intelligence expert for YouTube.

You analyze creator channels to extract insights about content strategy and audience.`,
    userPromptTemplate: '',
    temperature: 0.5,
    maxTokens: 1000,
    promptName: 'creator-intelligence.main',
    promptVersion: 1,
    source: 'fallback',
  },
};

async function fetchFromDatabase(name: string): Promise<CompiledPrompt | null> {
  try {
    const { getActivePrompt } = await import('@/server/ai/promptRegistryService');
    const dbPrompt = await getActivePrompt(name);
    
    return {
      systemPrompt: dbPrompt.systemPrompt,
      userPromptTemplate: dbPrompt.userPromptTemplate,
      temperature: dbPrompt.temperature,
      maxTokens: dbPrompt.maxTokens,
      promptName: dbPrompt.key,
      promptVersion: dbPrompt.version,
      source: 'database',
    };
  } catch (error) {
    return null;
  }
}

function getFallbackPrompt(name: string): CompiledPrompt | null {
  const fallback = FALLBACK_PROMPTS[name];
  if (fallback) {
    return { ...fallback };
  }
  return null;
}

export async function getPrompt(config: PromptConfig): Promise<CompiledPrompt> {
  const { name, label, version } = config;
  const cacheKey = getCacheKey(name, label, version);

  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

  let prompt = await fetchFromLangfuse(name, label, version);
  
  if (!prompt) {
    prompt = await fetchFromDatabase(name);
  }

  if (!prompt) {
    prompt = getFallbackPrompt(name);
  }

  if (!prompt) {
    throw new Error(`PROMPT_NOT_FOUND: No prompt found for ${name} (Langfuse unreachable, DB empty, no fallback)`);
  }

  setCache(cacheKey, prompt);
  
  return prompt;
}

export async function getPromptSafe(config: PromptConfig): Promise<CompiledPrompt> {
  try {
    return await getPrompt(config);
  } catch (error) {
    console.error(`[PromptRegistry] Failed to get prompt ${config.name}:`, error);
    const fallback = getFallbackPrompt(config.name);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

export function compileTemplate(template: string, variables: Record<string, string>): string {
  let compiled = template;
  for (const [key, value] of Object.entries(variables)) {
    compiled = compiled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    compiled = compiled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value);
  }
  return compiled;
}

export async function getPromptWithVariables(
  config: PromptConfig,
  variables: Record<string, string>
): Promise<{ systemPrompt: string; userPrompt: string; metadata: CompiledPrompt }> {
  const prompt = await getPromptSafe(config);
  
  const systemPrompt = compileTemplate(prompt.systemPrompt, variables);
  const userPrompt = compileTemplate(prompt.userPromptTemplate, variables);
  
  return {
    systemPrompt,
    userPrompt,
    metadata: prompt,
  };
}

export function isLangfusePromptAvailable(): boolean {
  return isLangfuseEnabled();
}

export function getCacheStats() {
  const now = Date.now();
  let valid = 0;
  let expired = 0;
  
  for (const entry of promptCache.values()) {
    if (now < entry.expiresAt) {
      valid++;
    } else {
      expired++;
    }
  }
  
  return {
    total: promptCache.size,
    valid,
    expired,
  };
}
