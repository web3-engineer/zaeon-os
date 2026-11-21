const DEFAULT_UA = "ZaeonScholar/1.0 (https://zaeon.os; mailto:research@zaeon.os)";

export interface RetryOpts {
  /** false = 429 volta na hora (a fonte decide: pausa). Cota DIÁRIA estourada não melhora esperando segundos. */
  repetir429?: boolean;
  retries?: number;        // default 3 (so up to 4 attempts)
  baseDelayMs?: number;    // default 600
  timeoutMs?: number;      // default 12000 (per attempt)
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

// Retries on 429 and 5xx, honoring Retry-After when present; exponential backoff with jitter.
// Always sends a default User-Agent unless caller set one. Returns the final Response
// (caller checks res.ok); rethrows the last network error only if every attempt threw.
export async function fetchWithRetry(url: string, init: RequestInit = {}, opts: RetryOpts = {}): Promise<Response> {
  const { retries = 3, baseDelayMs = 600, timeoutMs = 12000 } = opts;
  const doFetch = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const headers = new Headers(init.headers);
  if (!headers.has("User-Agent")) headers.set("User-Agent", DEFAULT_UA);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await doFetch(url, { ...init, headers, signal: AbortSignal.timeout(timeoutMs) });
      if (((res.status === 429 && opts.repetir429 !== false) || res.status >= 500) && attempt < retries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) { await sleep(baseDelayMs * 2 ** attempt); continue; }
      throw lastErr;
    }
  }
  // unreachable, but satisfies the type checker
  throw lastErr ?? new Error("fetchWithRetry: exhausted");
}

// Run async fn over items with a concurrency cap (keeps PDF parsing from overwhelming serverless).
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
