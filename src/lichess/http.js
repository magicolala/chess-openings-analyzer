import { DEFAULT_FETCH_HEADERS, DEFAULT_RETRYABLE_STATUSES } from "./constants.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Process requests sequentially to avoid hitting rate limits.
let requestQueue = Promise.resolve();

function enqueueRequest(task) {
  const run = requestQueue.then(task, task);
  requestQueue = run.catch(() => {});
  return run;
}

export async function fetchJson(
  url,
  {
    retries = 2,
    retryDelayMs = 800,
    retryOnStatuses = DEFAULT_RETRYABLE_STATUSES,
    headers = DEFAULT_FETCH_HEADERS,
    maxThrottleRetries = 1,
  } = {}
) {
  const execute = async () => {
    let attempt = 0;
    let delayMs = retryDelayMs;
    let throttleAttempts = 0;
    while (true) {
      const response = await fetch(url, { headers });
      if (response.ok) {
        return response.json();
      }

      const status = response.status;
      if (status === 429) {
        const retryAfterHeader = Number(response.headers.get("Retry-After"));
        const retryAfterMs = Number.isFinite(retryAfterHeader)
          ? Math.max(retryAfterHeader * 1000, 60000)
          : Math.max(retryDelayMs, 60000);

        if (throttleAttempts >= maxThrottleRetries) {
          const body = await response.text().catch(() => "");
          const rateErr = new Error("Lichess API rate limit (status 429)");
          rateErr.status = 429;
          rateErr.body = body;
          rateErr.url = url;
          rateErr.retryAfterMs = retryAfterMs;
          rateErr.headers = response.headers;
          throw rateErr;
        }

        throttleAttempts += 1;
        await wait(retryAfterMs);
        continue;
      }
      if (retryOnStatuses.includes(status) && attempt < retries) {
        await wait(delayMs);
        attempt += 1;
        delayMs *= 2;
        continue;
      }

      const body = await response.text().catch(() => "");
      const error = new Error(`Lichess API failed with status ${status}`);
      error.status = status;
      error.body = body;
      error.url = url;
      throw error;
    }
  };

  return enqueueRequest(execute);
}
