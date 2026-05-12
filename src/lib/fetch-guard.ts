/**
 * Combined fetch guard: cache → dedup → rate limit → execute → cache.
 *
 * This is the single chokepoint that prevents:
 *   1. Redundant API calls (cache)
 *   2. Thundering herds (dedup)
 *   3. Rate limit violations (token bucket)
 */

import { cache } from "./cache";
import { dedupFetch } from "./dedup";
import type { TokenBucket } from "./rate-limit";

export interface GuardOptions {
  ttlMs: number;
  dedupWindowMs?: number;
  rateLimiter?: TokenBucket;
}

/**
 * Execute fn() with caching, deduplication, and optional rate limiting.
 *
 * 1. Check cache first. If hit, return immediately.
 * 2. If cache miss, check for in-flight dedup. If found, wait for it.
 * 3. If not in-flight, acquire rate limit token, execute, store in cache.
 */
export async function cacheFirst<T>(
  cacheKey: string,
  fn: () => Promise<T>,
  options: GuardOptions,
): Promise<T> {
  const { ttlMs, dedupWindowMs = 5000, rateLimiter } = options;

  // 1. Check cache
  const cached = await cache.get<T>(cacheKey);
  if (cached !== undefined) return cached;

  // 2. Deduplicate in-flight requests
  return dedupFetch(
    cacheKey,
    async () => {
      // Double-check cache after winning the dedup race
      const cached2 = await cache.get<T>(cacheKey);
      if (cached2 !== undefined) return cached2;

      // 3. Rate limit
      if (rateLimiter) {
        await rateLimiter.acquire();
      }

      // 4. Execute
      const result = await fn();

      // 5. Store in cache
      await cache.set(cacheKey, result, ttlMs);

      return result;
    },
    dedupWindowMs,
  );
}
