/**
 * Token bucket rate limiter for outgoing API calls.
 *
 * Prevents burst requests that trigger 3rd-party rate limits.
 * Each provider gets its own bucket with conservative defaults.
 */

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRatePerSecond: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire the requested number of tokens, waiting if necessary.
   */
  async acquire(count = 1): Promise<void> {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsedSeconds * this.refillRatePerSecond,
    );
    this.lastRefill = now;

    if (this.tokens >= count) {
      this.tokens -= count;
      return;
    }

    const deficit = count - this.tokens;
    const waitMs = (deficit / this.refillRatePerSecond) * 1000;
    this.tokens = 0;

    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
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
