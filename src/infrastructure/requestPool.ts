import { RateLimitQueue, RateLimitQueueOptions } from './rateLimitQueue';

export interface RequestPoolOptions extends RateLimitQueueOptions {
  /** Number of retry attempts for recoverable errors. */
  retries?: number;
  /** Base delay between retries in milliseconds. */
  retryDelayMs?: number;
  /** Status codes that should trigger a retry. */
  retryOnStatuses?: number[];
  /** Optional override to provide a custom fetch implementation (useful in tests). */
  fetchImpl?: typeof fetch;
  /** Maximum number of retry cycles dedicated to 429 responses. */
  max429Retries?: number;
}

export interface RequestOptions extends RequestInit {
  /**
   * Optional hook invoked with the response whenever the request fails with a
   * throttling error. Returning a number will override the computed delay
   * before the next retry.
   */
  onThrottleDelay?: (response: Response) => number | void;
}

export class RequestPool {
  private readonly queue: RateLimitQueue;

  private readonly retries: number;

  private readonly retryDelayMs: number;

  private readonly retryOnStatuses: number[];

  private readonly fetchImpl: typeof fetch;

  private readonly max429Retries: number;

  constructor(options: RequestPoolOptions = {}) {
    const { retries = 2, retryDelayMs = 600, retryOnStatuses = [502, 503, 504], fetchImpl = fetch, max429Retries = 1, ...queueOptions } = options;
    this.queue = new RateLimitQueue(queueOptions as RateLimitQueueOptions);
    this.retries = Math.max(0, retries);
    this.retryDelayMs = Math.max(0, retryDelayMs);
    this.retryOnStatuses = retryOnStatuses;
    this.fetchImpl = fetchImpl;
    this.max429Retries = Math.max(0, max429Retries);
  }

  requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.queue.enqueue(() => this.executeJson<T>(url, options));
  }

  private async executeJson<T>(url: string, options: RequestOptions): Promise<T> {
    const { onThrottleDelay, ...fetchOptions } = options;
    let attempt = 0;
    let delayMs = this.retryDelayMs;
    let throttleAttempts = 0;
    while (true) {
      const response = await this.fetchImpl(url, fetchOptions);
      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 429) {
        if (throttleAttempts >= this.max429Retries) {
          const err = new Error(`Lichess API rate limited (${response.status})`);
          (err as Error & { status?: number; url?: string; body?: string }).status = response.status;
          (err as Error & { status?: number; url?: string; body?: string }).url = url;
          try {
            (err as Error & { body?: string }).body = await response.text();
          } catch {
            // ignore body parsing error
          }
          throw err;
        }

        throttleAttempts += 1;
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;
        const computedDelay = typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) ? Math.max(retryAfterMs, delayMs) : Math.max(60000, delayMs);
        const override = onThrottleDelay?.(response);
        await this.sleep(typeof override === 'number' ? override : computedDelay);
        continue;
      }

      if (this.retryOnStatuses.includes(response.status) && attempt < this.retries) {
        attempt += 1;
        await this.sleep(delayMs);
        delayMs *= 2;
        continue;
      }

      const error = new Error(`HTTP ${response.status} for ${url}`);
      (error as Error & { status?: number; url?: string; body?: string }).status = response.status;
      (error as Error & { status?: number; url?: string; body?: string }).url = url;
      try {
        (error as Error & { body?: string }).body = await response.text();
      } catch {
        // ignore body parsing issues
      }
      throw error;
    }
  }

  private async sleep(duration: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, Math.max(0, duration));
    });
  }
}

export function createRequestPool(options?: RequestPoolOptions): RequestPool {
  return new RequestPool(options);
}
