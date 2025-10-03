export type Task<T> = () => Promise<T> | T;

export interface RateLimitQueueOptions {
  /** Minimum delay between task starts in milliseconds. */
  intervalMs?: number;
  /** Maximum number of tasks running in parallel. */
  maxConcurrent?: number;
  /** Optional name used for debugging/logging. */
  name?: string;
}

interface QueueItem<T> {
  task: Task<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

/**
 * Small utility ensuring async jobs respect a concurrency + rate limit policy.
 *
 * The implementation keeps a FIFO queue of tasks and schedules their execution
 * according to the provided options. A task returning a rejected promise will
 * propagate the error to the caller without stopping the queue.
 */
export class RateLimitQueue {
  private readonly intervalMs: number;

  private readonly maxConcurrent: number;

  private readonly name: string;

  private readonly queue: QueueItem<any>[] = [];

  private running = 0;

  private lastStart = 0;

  constructor(options: RateLimitQueueOptions = {}) {
    this.intervalMs = Math.max(0, options.intervalMs ?? 0);
    this.maxConcurrent = Math.max(1, options.maxConcurrent ?? 1);
    this.name = options.name ?? 'queue';
  }

  enqueue<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.drain();
    });
  }

  private drain(): void {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const waitTime = this.computeWait();
      if (waitTime > 0) {
        // Schedule drain later respecting the rate limit.
        setTimeout(() => this.drain(), waitTime);
        return;
      }

      const item = this.queue.shift();
      if (!item) {
        return;
      }

      this.execute(item);
    }
  }

  private computeWait(): number {
    if (this.intervalMs === 0) {
      return 0;
    }
    const elapsed = Date.now() - this.lastStart;
    if (elapsed >= this.intervalMs) {
      return 0;
    }
    return this.intervalMs - elapsed;
  }

  private execute<T>({ task, resolve, reject }: QueueItem<T>): void {
    this.running += 1;
    this.lastStart = Date.now();
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        this.running -= 1;
        this.drain();
      });
  }

  /**
   * Flush the queue, typically used in tests.
   */
  async settle(): Promise<void> {
    if (this.queue.length === 0 && this.running === 0) {
      return;
    }
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.queue.length === 0 && this.running === 0) {
          resolve();
        } else {
          setTimeout(check, this.intervalMs || 10);
        }
      };
      check();
    });
  }
}

export function createRateLimitQueue(options?: RateLimitQueueOptions): RateLimitQueue {
  return new RateLimitQueue(options);
}
