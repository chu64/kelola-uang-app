import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventBus, type DomainEvent } from './event-bus';

interface TestEvent extends DomainEvent {
  namaEvent: 'TestEvent';
  payload: string;
}

function buatTestEvent(payload: string): TestEvent {
  return { namaEvent: 'TestEvent', occurredAt: new Date(), payload };
}

afterEach(() => {
  eventBus.reset();
});

describe('EventBus', () => {
  it('handler dipanggil saat event dipublikasi', async () => {
    const handler = vi.fn();
    eventBus.subscribe<TestEvent>('TestEvent', handler);
    await eventBus.publish(buatTestEvent('halo'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('handler terima data event yang benar', async () => {
    const handler = vi.fn();
    eventBus.subscribe<TestEvent>('TestEvent', handler);
    const event = buatTestEvent('data-test');
    await eventBus.publish(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('banyak handler dipanggil semua', async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    eventBus.subscribe<TestEvent>('TestEvent', h1);
    eventBus.subscribe<TestEvent>('TestEvent', h2);
    await eventBus.publish(buatTestEvent('multi'));
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('unsubscribe hentikan handler', async () => {
    const handler = vi.fn();
    const unsub = eventBus.subscribe<TestEvent>('TestEvent', handler);
    unsub();
    await eventBus.publish(buatTestEvent('setelah-unsub'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('event berbeda tidak memicu handler', async () => {
    const handler = vi.fn();
    eventBus.subscribe<TestEvent>('TestEvent', handler);
    await eventBus.publish({ namaEvent: 'EventLain', occurredAt: new Date() });
    expect(handler).not.toHaveBeenCalled();
  });

  it('tidak error jika tidak ada handler', async () => {
    await expect(eventBus.publish(buatTestEvent('tanpa-handler'))).resolves.toBeUndefined();
  });
});
