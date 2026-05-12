/**
 * OHLCV / price-history providers for technical indicators.
 *
 * Supports:
 * - Birdeye: token-level USD prices (requires API key)
 * - Meteora DLMM: pool-native OHLCV (no auth required)
 */

import { isObject, prop, toNumber, toString } from "@/lib/provider-parsing";
import { fetchMeteoraDlmmPool } from "@/lib/providers-dlmm";
import { cache } from "@/lib/cache";
import { rateLimiters } from "@/lib/rate-limit";
import type { DlmmPairInfo } from "@/lib/types";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";
const METEORA_BASE_URL = "https://dlmm.datapi.meteora.ag";

// ─── Shared Types ───────────────────────────────────────────────────────────

export interface PricePoint {
  /** Unix timestamp in seconds */
  unixTime: number;
  /** Price value at that timestamp (pool price for Meteora, USD for Birdeye tokens) — typically close */
  value: number;
  /** Optional OHLC data from providers that supply full candles */
  open?: number;
  high?: number;
  low?: number;
}

export interface PriceHistoryResult {
  items: PricePoint[];
}

/** @deprecated Use PriceHistoryResult instead */
export type BirdeyeHistoryResult = PriceHistoryResult;

// ─── Provider Interface ─────────────────────────────────────────────────────

export interface OhlcvProvider {
  /** Fetch price history for a pool. Timeframe is user-facing (e.g. "5m", "1h"). */
  fetchHistory(poolAddress: string, timeframe: string, periods: number): Promise<PriceHistoryResult>;
}

// ─── Birdeye Provider ────────────────────────────────────────────────────────

const BIRDEYE_CACHE_TTL_MS: Record<string, number> = {
  "5m": 120_000,
  "30m": 300_000,
  "1h": 600_000,
  "2h": 900_000,
  "4h": 1_800_000,
  "12h": 3_600_000,
  "24h": 7_200_000,
};

/** Map UI-friendly names to Birdeye API casing. Kept internal to the provider. */
const BIRDEYE_TIMEFRAME_MAP: Record<string, string> = {
  "5m": "5m",
  "30m": "30m",
  "1h": "1H",
  "2h": "2H",
  "4h": "4H",
  "12h": "12H",
  "24h": "24H",
};

function toBirdeyeTimeframe(tf: string): string {
  return BIRDEYE_TIMEFRAME_MAP[tf] ?? tf;
}

function birdeyeCacheKey(mint: string, timeframe: string, periods: number): string {
  return `birdeye:${mint}:${timeframe}:${periods}`;
}

function getBirdeyeApiKey(): string | undefined {
  return process.env.BIRDEYE_API_KEY;
}

function extractBirdeyeError(raw: unknown): string | undefined {
  if (!isObject(raw)) return undefined;
  const msg = toString(prop(raw, "message")) ?? toString(prop(raw, "error")) ?? toString(prop(raw, "msg"));
  if (msg) return msg;
  const data = prop(raw, "data");
  if (isObject(data)) {
    return toString(prop(data, "message")) ?? toString(prop(data, "error")) ?? undefined;
  }
  return undefined;
}

function parseBirdeyeHistory(raw: unknown): PriceHistoryResult {
  if (!isObject(raw)) {
    throw new Error("Invalid Birdeye response: expected object");
  }
  const errorMsg = extractBirdeyeError(raw);
  if (errorMsg) {
    throw new Error(`Birdeye error: ${errorMsg}`);
  }

  let itemsRaw: unknown[] | undefined;
  const data = prop(raw, "data");
  if (isObject(data)) {
    const nestedItems = prop(data, "items");
    if (Array.isArray(nestedItems)) itemsRaw = nestedItems;
  }
  if (!itemsRaw && Array.isArray(data)) {
    itemsRaw = data;
  }
  if (!itemsRaw) {
    const topItems = prop(raw, "items");
    if (Array.isArray(topItems)) itemsRaw = topItems;
  }
  if (!itemsRaw) {
    const history = prop(raw, "history");
    if (Array.isArray(history)) itemsRaw = history;
  }
  if (!itemsRaw) {
    const prices = prop(raw, "prices");
    if (Array.isArray(prices)) itemsRaw = prices;
  }
  if (!itemsRaw) {
    const availableKeys = Object.keys(raw).join(", ");
    throw new Error(
      `Invalid Birdeye response: no items/history/prices array found (keys: ${availableKeys})`,
    );
  }

  const seen = new Map<number, PricePoint>();
  for (const item of itemsRaw) {
    if (!isObject(item)) continue;
    const unixTime =
      toNumber(prop(item, "unixTime")) ??
      toNumber(prop(item, "unix_time")) ??
      toNumber(prop(item, "timestamp")) ??
      toNumber(prop(item, "time")) ??
      toNumber(prop(item, "t")) ??
      toNumber(prop(item, "date"));
    const value =
      toNumber(prop(item, "value")) ??
      toNumber(prop(item, "price")) ??
      toNumber(prop(item, "p")) ??
      toNumber(prop(item, "close")) ??
      toNumber(prop(item, "v"));
    if (unixTime !== undefined && value !== undefined) {
      seen.set(unixTime, { unixTime, value });
    }
  }

  const items = Array.from(seen.values());
  items.sort((a, b) => a.unixTime - b.unixTime);
  return { items };
}

async function fetchBirdeyeTokenHistory(
  mint: string,
  timeframe: string,
  periods: number,
  retries = 3,
): Promise<PriceHistoryResult> {
  const apiKey = getBirdeyeApiKey();
  if (!apiKey) {
    throw new Error("BIRDEYE_API_KEY is not configured");
  }

  const birdeyeTf = toBirdeyeTimeframe(timeframe);
  const now = Math.floor(Date.now() / 1000);
  const from = now - lookbackSeconds(timeframe, periods);

  await rateLimiters.birdeye.acquire();

  const key = birdeyeCacheKey(mint, timeframe, periods);
  const cached = await cache.get<PriceHistoryResult>(key);
  if (cached) return cached;

  const url =
    `${BIRDEYE_BASE_URL}/defi/history_price?` +
    `address=${encodeURIComponent(mint)}` +
    `&type=${encodeURIComponent(birdeyeTf)}` +
    `&time_from=${from}` +
    `&time_to=${now}`;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(url, {
        headers: { "X-API-KEY": apiKey, "x-chain": "solana" },
        signal: controller.signal,
      });

      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        const preview = text.slice(0, 300).replace(/\s+/g, " ");
        throw new Error(`Invalid JSON (status: ${res.status}, preview: ${preview})`);
      }

      if (!res.ok || prop(json, "success") === false) {
        const errMsg = extractBirdeyeError(json) ?? `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      const result = parseBirdeyeHistory(json);
      await cache.set(key, result, BIRDEYE_CACHE_TTL_MS[timeframe] ?? 60_000);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      const isRateLimited =
        msg.includes("429") ||
        msg.toLowerCase().includes("too many requests") ||
        msg.toLowerCase().includes("rate limit");
      if (isRateLimited && attempt < retries) {
        const waitMs = 2000 * Math.pow(2, attempt);
        console.log(
          `[Birdeye] Rate limited on ${timeframe}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`,
        );
        await delay(waitMs);
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Max retries exceeded");
}

// ─── Meteora Provider ───────────────────────────────────────────────────────

const METEORA_CACHE_TTL_MS: Record<string, number> = {
  "5m": 120_000,
  "30m": 300_000,
  "1h": 600_000,
  "2h": 900_000,
  "4h": 1_800_000,
  "12h": 3_600_000,
  "24h": 7_200_000,
};

function meteoraCacheKey(pool: string, timeframe: string, periods: number): string {
  return `meteora:ohlcv:${pool}:${timeframe}:${periods}`;
}

function extractMeteoraError(raw: unknown): string | undefined {
  if (!isObject(raw)) return undefined;
  return toString(prop(raw, "message")) ?? toString(prop(raw, "error")) ?? undefined;
}

function parseMeteoraOhlcv(raw: unknown): PriceHistoryResult {
  if (!isObject(raw)) {
    throw new Error("Invalid Meteora OHLCV response: expected object");
  }
  const data = prop(raw, "data");
  if (!Array.isArray(data)) {
    throw new Error("Invalid Meteora OHLCV response: expected data array");
  }
  const items: PricePoint[] = [];
  for (const item of data) {
    if (!isObject(item)) continue;
    const unixTime = toNumber(prop(item, "timestamp"));
    const value = toNumber(prop(item, "close"));
    if (unixTime !== undefined && value !== undefined) {
      const open = toNumber(prop(item, "open"));
      const high = toNumber(prop(item, "high"));
      const low = toNumber(prop(item, "low"));
      const point: PricePoint = { unixTime, value };
      if (open !== undefined) point.open = open;
      if (high !== undefined) point.high = high;
      if (low !== undefined) point.low = low;
      items.push(point);
    }
  }
  items.sort((a, b) => a.unixTime - b.unixTime);
  return { items };
}

async function fetchMeteoraOhlcv(
  poolAddress: string,
  timeframe: string,
  periods: number,
  retries = 3,
): Promise<PriceHistoryResult> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - lookbackSeconds(timeframe, periods);

  await rateLimiters.meteoraDlmm.acquire();

  const key = meteoraCacheKey(poolAddress, timeframe, periods);
  const cached = await cache.get<PriceHistoryResult>(key);
  if (cached) return cached;

  const url =
    `${METEORA_BASE_URL}/pools/${encodeURIComponent(poolAddress)}/ohlcv?` +
    `timeframe=${encodeURIComponent(timeframe)}` +
    `&start_time=${from}` +
    `&end_time=${now}`;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(url, { signal: controller.signal });

      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        const preview = text.slice(0, 300).replace(/\s+/g, " ");
        throw new Error(`Invalid JSON (status: ${res.status}, preview: ${preview})`);
      }

      if (!res.ok) {
        const errMsg = extractMeteoraError(json) ?? `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      const result = parseMeteoraOhlcv(json);
      await cache.set(key, result, METEORA_CACHE_TTL_MS[timeframe] ?? 60_000);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;
      const isRateLimited =
        msg.includes("429") ||
        msg.toLowerCase().includes("too many requests") ||
        msg.toLowerCase().includes("rate limit");
      if (isRateLimited && attempt < retries) {
        const waitMs = 2000 * Math.pow(2, attempt);
        console.log(
          `[Meteora] Rate limited on ${timeframe}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`,
        );
        await delay(waitMs);
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Max retries exceeded");
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────

function lookbackSeconds(timeframe: string, periods: number): number {
  const minutesPerCandle: Record<string, number> = {
    "5m": 5,
    "30m": 30,
    "1h": 60,
    "2h": 120,
    "4h": 240,
    "12h": 720,
    "24h": 1440,
  };
  const minutes = minutesPerCandle[timeframe] ?? 60;
  const minutesNeeded = minutes * periods * 1.5;
  return Math.max(minutesNeeded * 60, 600);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Provider Implementations ───────────────────────────────────────────────

const birdeyeProvider: OhlcvProvider = {
  async fetchHistory(poolAddress, timeframe, periods) {
    const apiKey = getBirdeyeApiKey();
    if (!apiKey) {
      throw new Error("BIRDEYE_API_KEY is not configured");
    }
    const pair = await fetchMeteoraDlmmPool(poolAddress);
    const [xHistory, yHistory] = await Promise.all([
      fetchBirdeyeTokenHistory(pair.tokenX.mint, timeframe, periods),
      fetchBirdeyeTokenHistory(pair.tokenY.mint, timeframe, periods),
    ]);
    // Compute pool ratios: tokenX_USD / tokenY_USD = tokenY per tokenX
    const yMap = new Map<number, number>();
    for (const p of yHistory.items) {
      yMap.set(p.unixTime, p.value);
    }
    const ratios: PricePoint[] = [];
    for (const x of xHistory.items) {
      const yPrice = yMap.get(x.unixTime);
      if (yPrice && yPrice > 0 && x.value > 0) {
        ratios.push({ unixTime: x.unixTime, value: x.value / yPrice });
      }
    }
    return { items: ratios };
  },
};

const meteoraProvider: OhlcvProvider = {
  async fetchHistory(poolAddress, timeframe, periods) {
    return fetchMeteoraOhlcv(poolAddress, timeframe, periods);
  },
};

export function getProvider(name: "meteora" | "birdeye"): OhlcvProvider {
  switch (name) {
    case "meteora":
      return meteoraProvider;
    case "birdeye":
      return birdeyeProvider;
    default:
      throw new Error(`Unknown OHLCV provider: ${name}`);
  }
}
