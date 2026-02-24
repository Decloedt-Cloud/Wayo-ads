import { Prisma, AiAnalysisResult, AiVideo, AiPromptDefinition } from '@prisma/client';
import { db } from '@/lib/db';

export interface IAiAnalysisResultRepository {
  findById(id: string): Promise<AiAnalysisResult | null>;
  findByInputHash(inputHash: string, promptKey: string, promptVersion: number): Promise<AiAnalysisResult | null>;
  findByVideoId(videoId: string, promptKey?: string): Promise<AiAnalysisResult[]>;
  create(data: Prisma.AiAnalysisResultUncheckedCreateInput): Promise<AiAnalysisResult>;
}

export class AiAnalysisResultRepository implements IAiAnalysisResultRepository {
  async findById(id: string): Promise<AiAnalysisResult | null> {
    return db.aiAnalysisResult.findUnique({ where: { id } });
  }

  async findByInputHash(inputHash: string, promptKey: string, promptVersion: number): Promise<AiAnalysisResult | null> {
    return db.aiAnalysisResult.findFirst({
      where: { inputHash, promptKey, promptVersion },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByVideoId(videoId: string, promptKey?: string): Promise<AiAnalysisResult[]> {
    return db.aiAnalysisResult.findMany({
      where: { videoId, ...(promptKey ? { promptKey } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.AiAnalysisResultUncheckedCreateInput): Promise<AiAnalysisResult> {
    return db.aiAnalysisResult.create({ data });
  }
}

export interface IAiVideoRepository {
  findById(id: string): Promise<AiVideo | null>;
  findByPlatformVideoId(platform: string, youtubeVideoId: string): Promise<AiVideo | null>;
  findRecent(limit?: number): Promise<AiVideo[]>;
  create(data: Prisma.AiVideoUncheckedCreateInput): Promise<AiVideo>;
  update(id: string, data: Prisma.AiVideoUncheckedUpdateInput): Promise<AiVideo>;
}

export class AiVideoRepository implements IAiVideoRepository {
  async findById(id: string): Promise<AiVideo | null> {
    return db.aiVideo.findUnique({ where: { id } });
  }

  async findByPlatformVideoId(platform: string, youtubeVideoId: string): Promise<AiVideo | null> {
    return db.aiVideo.findFirst({
      where: { platform: platform as any, youtubeVideoId },
    });
  }

  async findRecent(limit: number = 10): Promise<AiVideo[]> {
    return db.aiVideo.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(data: Prisma.AiVideoUncheckedCreateInput): Promise<AiVideo> {
    return db.aiVideo.create({ data });
  }

  async update(id: string, data: Prisma.AiVideoUncheckedUpdateInput): Promise<AiVideo> {
    return db.aiVideo.update({ where: { id }, data });
  }
}

export interface IAiPromptDefinitionRepository {
  findById(id: string): Promise<AiPromptDefinition | null>;
  findByKeyAndVersion(key: string, version: number): Promise<AiPromptDefinition | null>;
  findActiveByKey(key: string): Promise<AiPromptDefinition | null>;
  findAll(): Promise<AiPromptDefinition[]>;
  create(data: Prisma.AiPromptDefinitionUncheckedCreateInput): Promise<AiPromptDefinition>;
  update(id: string, data: Prisma.AiPromptDefinitionUncheckedUpdateInput): Promise<AiPromptDefinition>;
}

export class AiPromptDefinitionRepository implements IAiPromptDefinitionRepository {
  async findById(id: string): Promise<AiPromptDefinition | null> {
    return db.aiPromptDefinition.findUnique({ where: { id } });
  }

  async findByKeyAndVersion(key: string, version: number): Promise<AiPromptDefinition | null> {
    return db.aiPromptDefinition.findUnique({
      where: { key_version: { key, version } },
    });
  }

  async findActiveByKey(key: string): Promise<AiPromptDefinition | null> {
    return db.aiPromptDefinition.findFirst({
      where: { key, active: true },
      orderBy: { version: 'desc' },
    });
  }

  async findAll(): Promise<AiPromptDefinition[]> {
    return db.aiPromptDefinition.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findMany(where?: any, orderBy?: any): Promise<AiPromptDefinition[]> {
    return db.aiPromptDefinition.findMany({ where, orderBy });
  }

  async create(data: Prisma.AiPromptDefinitionUncheckedCreateInput): Promise<AiPromptDefinition> {
    return db.aiPromptDefinition.create({ data });
  }

  async update(id: string, data: Prisma.AiPromptDefinitionUncheckedUpdateInput): Promise<AiPromptDefinition> {
    return db.aiPromptDefinition.update({ where: { id }, data });
  }
}

export const aiAnalysisResultRepository = new AiAnalysisResultRepository();
export const aiVideoRepository = new AiVideoRepository();
export const aiPromptDefinitionRepository = new AiPromptDefinitionRepository();
