export interface FetchJsonOptions {
  retries?: number;
  retryDelayMs?: number;
  retryOnStatuses?: number[];
  headers?: Record<string, string>;
}

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(
  url: string,
  {
    retries = 2,
    retryDelayMs = 800,
    retryOnStatuses = [429],
    headers = { Accept: 'application/json' },
  }: FetchJsonOptions = {},
): Promise<T> {
  let attempt = 0;
  let delayMs = retryDelayMs;

  while (true) {
    const response = await fetch(url, { headers });

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
    const error = new Error(`Lichess API failed with status ${status}`) as Error & {
      status: number;
      body: string;
      url: string;
    };
    error.status = status;
    error.body = body;
    error.url = url;
    throw error;
  }
}
