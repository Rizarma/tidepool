/**
 * Unified cache interface with in-memory fallback and optional Upstash Redis.
 *
 * Design goals:
 *   1. Works out-of-the-box without any external dependencies.
 *   2. Swaps to Redis automatically when UPSTASH_REDIS_REST_URL + TOKEN are set.
 *   3. Fail-safe: cache errors never break the application.
 */

import { Redis } from "@upstash/redis";

// ─── Interface ─────────────────────────────────────────────────────────────

export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// ─── In-Memory Fallback ──────────────────────────────────────────────────────

interface MemoryEntry {
  value: string;
  expiry: number;
}

class MemoryCache implements Cache {
  private store = new Map<string, MemoryEntry>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    // Periodic purge to prevent unbounded growth in long-lived processes
    if (this.store.size > 0 && this.store.size % 500 === 0) {
      this.purgeExpired();
    }
    this.store.set(key, {
      value: JSON.stringify(value),
      expiry: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [k, entry] of this.store) {
      if (now > entry.expiry) this.store.delete(k);
    }
  }
}

// ─── Upstash Redis ─────────────────────────────────────────────────────────

class UpstashCache implements Cache {
  private redis: Redis | null = null;

  private getRedis(): Redis {
    if (!this.redis) {
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    }
    return this.redis;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.getRedis().get(key);
      if (value === null || value === undefined) return undefined;
      return value as T;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    try {
      await this.getRedis().set(key, value, { px: ttlMs });
    } catch {
      // Cache is best-effort; never crash the app
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.getRedis().del(key);
    } catch {
      // Best-effort
    }
  }

  async clear(): Promise<void> {
    // Intentionally a no-op: flushing Redis in production is dangerous.
    // Tests should run without Redis env vars to use MemoryCache instead.
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

function createCache(): Cache {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashCache();
  }
  return new MemoryCache();
}

/** Global cache instance. Safe to import from any server-side module. */
export const cache = createCache();
