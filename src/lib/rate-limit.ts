/**
 * Token bucket rate limiter for outgoing API calls.
 *
 * Prevents burst requests that trigger 3rd-party rate limits.
 * Each provider gets its own bucket with conservative defaults.
 *
 * Acquisitions are serialized through a private queue so that concurrent
 * requests cannot all calculate the same wait time and proceed together.
 * Each waiter computes its delay based on the state left by the previous
 * waiter, ensuring requests are spaced by 1000/refillRate ms regardless of
 * concurrency.
 */

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private queue: Array<{ count: number; resolve: () => void }> = [];
  private processing = false;

  constructor(
    private capacity: number,
    private refillRatePerSecond: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire the requested number of tokens, waiting if necessary.
   *
   * Requests are queued and processed one at a time to prevent the
   * thundering-herd race condition where multiple waiters all wake up
   * together and consume tokens in a burst.
   */
  async acquire(count = 1): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ count, resolve });
      if (!this.processing) {
        this.processing = true;
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const { count, resolve } = this.queue.shift()!;

      // Refill tokens based on actual elapsed time since last check
      const now = Date.now();
      const elapsedSeconds = Math.max(0, (now - this.lastRefill) / 1000);
      this.tokens = Math.min(
        this.capacity,
        this.tokens + elapsedSeconds * this.refillRatePerSecond,
      );
      this.lastRefill = now;

      // Fast path: enough tokens are available right now
      if (this.tokens >= count) {
        this.tokens -= count;
        resolve();
        continue;
      }

      // Slow path: we need to wait for tokens to refill.
      // Calculate the exact wait time, round up to ensure we never
      // proceed before the bucket has actually refilled enough.
      const deficit = count - this.tokens;
      const waitMs = Math.ceil((deficit / this.refillRatePerSecond) * 1000);

      await new Promise((r) => setTimeout(r, waitMs));

      // After waiting, recalculate tokens based on the actual elapsed
      // time (setTimeout may fire a few ms early or late).
      const afterWait = Date.now();
      const actualElapsed = Math.max(0, (afterWait - this.lastRefill) / 1000);
      this.tokens = Math.min(
        this.capacity,
        this.tokens + actualElapsed * this.refillRatePerSecond,
      );
      this.lastRefill = afterWait;

      // Consume the tokens we waited for. Clamp to 0 in the extremely
      // rare case setTimeout fired so early we fell slightly short.
      this.tokens = Math.max(0, this.tokens - count);
      resolve();
    }
    this.processing = false;
  }
}

// ─── Provider-Specific Buckets ───────────────────────────────────────────────

/** Conservative defaults. Tune based on actual provider limits and your plan tier. */
export const rateLimiters = {
  /** DexScreener is fairly generous but not unlimited. */
  dexscreener: new TokenBucket(20, 20),

  /** RugCheck is relatively strict. */
  rugcheck: new TokenBucket(5, 5),

  /** Jupiter is very generous; this is a safe lower bound. */
  jupiter: new TokenBucket(50, 50),

  /** Solana public RPC is ~40 req/s; distribute across multiple endpoints if needed. */
  solanaRpc: new TokenBucket(40, 40),

  /** Meteora DLMM – conservative starting point. */
  meteoraDlmm: new TokenBucket(30, 30),

  /** Birdeye depends on your plan; 10 req/s is a safe default. */
  birdeye: new TokenBucket(10, 10),
};
