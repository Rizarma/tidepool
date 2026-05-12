/**
 * In-flight request deduplication.
 *
 * Problem: 1,000 users request /api/scan?mint=USDC at the same time.
 * Without dedup, 1,000 identical API calls go to DexScreener, RugCheck, etc.
 * With dedup, only 1 call goes out, and all 1,000 wait for the same result.
 *
 * The dedup window should be short (a few seconds) — just long enough for
 * concurrent requests to coalesce.
 */

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Execute fn() for the given key, but if another call with the same key is
 * already in flight, return its promise instead of starting a new one.
 *
 * @param key         Deduplication key (should be deterministic for the request)
 * @param fn          The actual fetch/work function
 * @param windowMs    How long to keep the promise in the dedup map after completion
 */
export function dedupFetch<T>(
  key: string,
  fn: () => Promise<T>,
  windowMs = 5000,
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    setTimeout(() => {
      inFlight.delete(key);
    }, windowMs);
  });

  inFlight.set(key, promise);
  return promise;
}

/** Clear all in-flight dedup entries. Primarily useful in tests. */
export function clearDedup(): void {
  inFlight.clear();
}
