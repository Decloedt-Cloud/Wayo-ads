import { db } from '@/lib/db';
import { aiPromptDefinitionRepository } from './repositories';

export interface CreatePromptInput {
  key: string;
  version: number;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  temperature?: number;
  maxTokens?: number;
}

export async function getActivePrompt(key: string) {
  const prompt = await aiPromptDefinitionRepository.findActiveByKey(key);

  if (!prompt) {
    throw new Error(`No active prompt found for key: ${key}`);
  }

  return prompt;
}

export async function getPromptByKeyAndVersion(key: string, version: number) {
  const prompt = await aiPromptDefinitionRepository.findByKeyAndVersion(key, version);
  return prompt;
}

export async function createPromptVersion(input: CreatePromptInput) {
  const existingActive = await aiPromptDefinitionRepository.findActiveByKey(input.key);

  if (existingActive && input.version <= existingActive.version) {
    throw new Error(
      `New version (${input.version}) must be greater than existing active version (${existingActive.version})`
    );
  }

  const newPrompt = await aiPromptDefinitionRepository.create({
    key: input.key,
    version: input.version,
    description: input.description,
    systemPrompt: input.systemPrompt,
    userPromptTemplate: input.userPromptTemplate,
    temperature: input.temperature ?? 0.2,
    maxTokens: input.maxTokens ?? 600,
    active: true,
  });

  return newPrompt;
}

export async function deactivateOldVersions(key: string, keepVersion: number) {
  const prompts = await db.aiPromptDefinition.findMany({
    where: {
      key,
      version: { not: keepVersion },
      active: true,
    },
    select: { id: true },
  });

  for (const prompt of prompts) {
    await aiPromptDefinitionRepository.update(prompt.id, { active: false });
  }

  return { count: prompts.length };
}

export async function setActivePrompt(key: string, version: number) {
  const prompt = await aiPromptDefinitionRepository.findByKeyAndVersion(key, version);

  if (!prompt) {
    throw new Error(`Prompt not found: ${key} v${version}`);
  }

  await db.$transaction([
    db.aiPromptDefinition.updateMany({
      where: {
        key,
        active: true,
      },
      data: {
        active: false,
      },
    }),
    db.aiPromptDefinition.update({
      where: {
        id: prompt.id,
      },
      data: {
        active: true,
      },
    }),
  ]);

  return getActivePrompt(key);
}

export async function listPrompts(key?: string) {
  if (key) {
    const prompts = await db.aiPromptDefinition.findMany({
      where: { key },
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
    });
    return prompts;
  }
  return aiPromptDefinitionRepository.findAll();
}

export async function getAllActivePrompts() {
  const prompts = await db.aiPromptDefinition.findMany({
    where: {
      active: true,
    },
    orderBy: {
      key: 'asc',
    },
  });

  return prompts;
}
