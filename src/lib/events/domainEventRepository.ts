import { db } from '@/lib/db';
import { DomainEvent, DomainEventType } from './domainEventBus';

interface PrismaDomainEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  processed: boolean;
  userId: string | null;
}

export interface IDomainEventRepository {
  save(event: DomainEvent, userId?: string): Promise<PrismaDomainEvent>;
  findById(id: string): Promise<PrismaDomainEvent | null>;
  findByType(type: DomainEventType, limit?: number): Promise<PrismaDomainEvent[]>;
  findByUserId(userId: string, limit?: number): Promise<PrismaDomainEvent[]>;
  findUnprocessed(limit?: number): Promise<PrismaDomainEvent[]>;
  markAsProcessed(id: string): Promise<void>;
  findByDateRange(startDate: Date, endDate: Date, type?: DomainEventType): Promise<PrismaDomainEvent[]>;
}

export class DomainEventRepository implements IDomainEventRepository {
  async save(event: DomainEvent, userId?: string): Promise<PrismaDomainEvent> {
    return (db as any).domainEvent.create({
      data: {
        type: event.type,
        payload: event.payload as unknown as Record<string, unknown>,
        timestamp: event.timestamp,
        userId,
      },
    });
  }

  async findById(id: string): Promise<PrismaDomainEvent | null> {
    return (db as any).domainEvent.findUnique({ where: { id } });
  }

  async findByType(type: DomainEventType, limit: number = 100): Promise<PrismaDomainEvent[]> {
    return (db as any).domainEvent.findMany({
      where: { type },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async findByUserId(userId: string, limit: number = 100): Promise<PrismaDomainEvent[]> {
    return (db as any).domainEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async findUnprocessed(limit: number = 100): Promise<PrismaDomainEvent[]> {
    return (db as any).domainEvent.findMany({
      where: { processed: false },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }

  async markAsProcessed(id: string): Promise<void> {
    await (db as any).domainEvent.update({
      where: { id },
      data: { processed: true },
    });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    type?: DomainEventType
  ): Promise<PrismaDomainEvent[]> {
    return (db as any).domainEvent.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        ...(type && { type }),
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}

export const domainEventRepository = new DomainEventRepository();
