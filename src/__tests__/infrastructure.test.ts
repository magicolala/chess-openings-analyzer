import { describe, expect, it } from 'vitest';
import { createRateLimitQueue } from '../infrastructure/rateLimitQueue';
import { createPersistentCache } from '../infrastructure/indexedDbCache';

describe('RateLimitQueue', () => {
  it('enqueues tasks sequentially when concurrency is 1', async () => {
    const queue = createRateLimitQueue({ maxConcurrent: 1 });
    const order: number[] = [];
    const tasks = [1, 2, 3].map((value) =>
      queue.enqueue(async () => {
        order.push(value);
      }),
    );
    await Promise.all(tasks);
    expect(order).toEqual([1, 2, 3]);
  });
});

describe('Persistent cache memory fallback', () => {
  it('stores and retrieves values when IndexedDB is unavailable', async () => {
    const cache = createPersistentCache<string>({ dbName: 'test', storeName: 'memory' });
    expect(await cache.get('foo')).toBeUndefined();
    await cache.set('foo', 'bar');
    expect(await cache.get('foo')).toBe('bar');
    await cache.delete('foo');
    expect(await cache.get('foo')).toBeUndefined();
    await cache.set('baz', 'qux');
    await cache.clear();
    expect(await cache.get('baz')).toBeUndefined();
  });
});
