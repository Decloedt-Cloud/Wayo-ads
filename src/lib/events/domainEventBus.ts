import { domainEventRepository } from './domainEventRepository';

export type DomainEventType = 
  | 'WALLET_CREDITED'
  | 'PAYOUT_COMPLETED'
  | 'CREATOR_FLAGGED'
  | 'VELOCITY_SPIKE_DETECTED'
  | 'FRAUD_PATTERN_DETECTED'
  | 'RESERVE_LOCKED'
  | 'RESERVE_RELEASED'
  | 'TRUST_SCORE_DOWNGRADED'
  | 'CREATOR_TIER_CHANGED';

export interface DomainEvent<T = unknown> {
  type: DomainEventType;
  payload: T;
  timestamp: Date;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

export interface EventSubscription {
  unsubscribe(): void;
}

class DomainEventBus {
  private handlers: Map<DomainEventType, Set<EventHandler>> = new Map();

  subscribe<T>(eventType: DomainEventType, handler: EventHandler<T>): EventSubscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    return {
      unsubscribe: () => {
        this.handlers.get(eventType)?.delete(handler as EventHandler);
      },
    };
  }

  async publish<T>(event: DomainEvent<T>, userId?: string): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    domainEventRepository.save(event, userId).catch(console.error);

    await Promise.all(
      Array.from(handlers).map((handler) => handler(event).catch(console.error))
    );
  }

  createEvent<T>(type: DomainEventType, payload: T): DomainEvent<T> {
    return {
      type,
      payload,
      timestamp: new Date(),
    };
  }
}

export const domainEventBus = new DomainEventBus();
