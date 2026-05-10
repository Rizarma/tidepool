/**
 * Birdeye OHLCV / price-history provider for Solana.
 *
 * Fetches token price history at 1m/5m/15m timeframes. Used to compute
 * technical indicators (moving averages) on pool scan reports.
 *
 * API: https://public-api.birdeye.so
 * Endpoint: GET /history/price?address={mint}&type={timeframe}&time_from={unix}&time_to={unix}
 */

import { isObject, prop, toNumber } from "@/lib/provider-parsing";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PricePoint {
  /** Unix timestamp in seconds */
  unixTime: number;
  /** Price in USD at that timestamp */
  value: number;
}

export interface BirdeyeHistoryResult {
  items: PricePoint[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getApiKey(): string | undefined {
  return process.env.BIRDEYE_API_KEY;
}

function parseBirdeyeHistory(raw: unknown): BirdeyeHistoryResult {
  if (!isObject(raw)) {
    throw new Error("Invalid Birdeye response: expected object");
  }

  // Birdeye wraps in { success: boolean, data: { items: [...] } }
  const data = prop(raw, "data");
  if (!isObject(data)) {
    throw new Error("Invalid Birdeye response: missing data field");
  }

  const itemsRaw = prop(data, "items");
  if (!Array.isArray(itemsRaw)) {
    throw new Error("Invalid Birdeye response: missing items array");
  }

  const items: PricePoint[] = [];
  for (const item of itemsRaw) {
    if (!isObject(item)) continue;
    const unixTime = toNumber(prop(item, "unixTime"));
    const value = toNumber(prop(item, "value"));
    if (unixTime !== undefined && value !== undefined) {
      items.push({ unixTime, value });
    }
  }

  // Sort by time ascending (oldest first) so SMA math is natural
  items.sort((a, b) => a.unixTime - b.unixTime);

  return { items };
}

/**
 * Compute how many seconds of history we need for a given timeframe + period,
 * with a generous buffer for gaps / sparse trading.
 */
function lookbackSeconds(
  timeframe: "1m" | "5m" | "15m",
  periods: number,
): number {
  const minutesPerCandle = timeframe === "1m" ? 1 : timeframe === "5m" ? 5 : 15;
  // 2× buffer for sparse tokens that may have missing candles
  const minutesNeeded = minutesPerCandle * periods * 2;
  return Math.max(minutesNeeded * 60, 600); // minimum 10 min
}

/**
 * Fetch price history for a single token mint from Birdeye.
 */
export async function fetchBirdeyePriceHistory(
  mint: string,
  timeframe: "1m" | "5m" | "15m",
  periods: number,
): Promise<BirdeyeHistoryResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("BIRDEYE_API_KEY is not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - lookbackSeconds(timeframe, periods);

  const url =
    `${BIRDEYE_BASE_URL}/history/price?` +
    `address=${encodeURIComponent(mint)}` +
    `&type=${encodeURIComponent(timeframe)}` +
    `&time_from=${from}` +
    `&time_to=${now}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      headers: { "x-api-key": apiKey, accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON in response");
    }

    return parseBirdeyeHistory(json);
  } finally {
    clearTimeout(timer);
  }
}
