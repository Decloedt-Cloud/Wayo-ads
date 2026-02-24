export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
  'deepseek-coder': { input: 0.00014, output: 0.00028 },
  'gpt-4.1': { input: 0.002, output: 0.008 },
  'gpt-4.1-mini': { input: 0.0003, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'glm-4-flash': { input: 0.0001, output: 0.0001 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
};

export function estimateCost(
  model: string,
  promptTokens: number = 0,
  completionTokens: number = 0
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    console.warn(`Unknown model: ${model}, using default pricing`);
    return (promptTokens * 0.0001 + completionTokens * 0.0002);
  }

  return (
    promptTokens * pricing.input +
    completionTokens * pricing.output
  );
}

export function getModelPricing(model: string): { input: number; output: number } | null {
  return MODEL_PRICING[model] || null;
}

const MODEL_PROVIDER_MAP: Record<string, string> = {
  'deepseek-chat': 'DeepSeek',
  'deepseek-coder': 'DeepSeek',
  'gpt-4.1': 'OpenAI',
  'gpt-4.1-mini': 'OpenAI',
  'gpt-4o': 'OpenAI',
  'gpt-4o-mini': 'OpenAI',
  'glm-4-flash': 'GLM',
  'claude-3-5-sonnet': 'Anthropic',
  'claude-3-haiku': 'Anthropic',
};

export function getProviderFromModel(model: string): string {
  return MODEL_PROVIDER_MAP[model] || 'Unknown';
}
