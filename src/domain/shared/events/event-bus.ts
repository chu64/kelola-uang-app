export interface DomainEvent {
  readonly namaEvent: string;
  readonly occurredAt: Date;
}

type Handler<T extends DomainEvent> = (event: T) => void | Promise<void>;

type Unsubscribe = () => void;

class EventBus {
  private handlers = new Map<string, Set<Handler<DomainEvent>>>();

  subscribe<T extends DomainEvent>(namaEvent: string, handler: Handler<T>): Unsubscribe {
    if (!this.handlers.has(namaEvent)) {
      this.handlers.set(namaEvent, new Set());
    }
    const bucket = this.handlers.get(namaEvent)!;
    bucket.add(handler as Handler<DomainEvent>);
    return () => bucket.delete(handler as Handler<DomainEvent>);
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const bucket = this.handlers.get(event.namaEvent);
    if (!bucket) return;
    for (const handler of bucket) {
      await handler(event);
    }
  }

  reset(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
