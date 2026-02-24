import { createHash } from 'crypto';

export interface HashInput {
  transcript: string;
  metadata: Record<string, unknown>;
  systemPrompt: string;
  userPromptTemplate: string;
  version: number;
  model: string;
}

export function computeInputHash(input: HashInput): string {
  const normalizedTranscript = input.transcript.trim();
  const normalizedMetadata = JSON.stringify(input.metadata, Object.keys(input.metadata).sort());
  const normalizedSystemPrompt = input.systemPrompt.trim();
  const normalizedUserPrompt = input.userPromptTemplate.trim();

  const combinedString = [
    normalizedTranscript,
    normalizedMetadata,
    normalizedSystemPrompt,
    normalizedUserPrompt,
    input.version.toString(),
    input.model,
  ].join('|');

  return createHash('sha256').update(combinedString).digest('hex');
}

export function computeDeterministicHash(...inputs: string[]): string {
  const combined = inputs.join('|');
  return createHash('sha256').update(combined).digest('hex');
}
