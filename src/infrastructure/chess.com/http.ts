export interface FetchJsonOptions {
  retries?: number;
  retryDelayMs?: number;
  retryOnStatuses?: number[];
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private isProcessing = false;
  private readonly delay: number;

  constructor(delay: number) {
    this.delay = delay;
  }

  add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(() => requestFn().then(resolve).catch(reject));
      if (!this.isProcessing) {
        this.process();
      }
    });
  }

  private async process() {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const requestTask = this.queue.shift();
      if (requestTask) {
        await requestTask();
        await wait(this.delay);
      }
    }
    this.isProcessing = false;
  }
}

const chessComApiQueue = new RequestQueue(1000); // 1-second delay

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const {
    retries = 2,
    retryDelayMs = 800,
    retryOnStatuses = [429],
    headers = { Accept: 'application/json' },
    signal,
  } = options;

  const requestFn = async () => {
    let attempt = 0;
    let delayMs = retryDelayMs;

    while (true) {
      const response = await fetch(url, { headers, signal });

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      const status = response.status;
      if (retryOnStatuses.includes(status) && attempt < retries) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : delayMs;
        await wait(waitMs);
        attempt += 1;
        delayMs *= 2;
        continue;
      }

      const body = await response.text().catch(() => '');
      const error = new Error(
        `Chess.com API failed with status ${status}`,
      ) as Error & {
        status: number;
        body: string;
        url: string;
      };
      error.status = status;
      error.body = body;
      error.url = url;
      throw error;
    }
  };

  return chessComApiQueue.add(requestFn);
}
