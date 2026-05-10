/**
 * Birdeye OHLCV / price-history provider for Solana.
 *
 * Fetches token price history at 1m/5m/15m timeframes. Used to compute
 * technical indicators (moving averages) on pool scan reports.
 *
 * API: https://public-api.birdeye.so
 * Endpoint: GET /history/price?address={mint}&type={timeframe}&time_from={unix}&time_to={unix}
 */

import { isObject, prop, toNumber, toString } from "@/lib/provider-parsing";

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

/**
 * Extract a Birdeye error message from the response if present.
 */
function extractBirdeyeError(raw: unknown): string | undefined {
  if (!isObject(raw)) return undefined;
  const msg = toString(prop(raw, "message")) ?? toString(prop(raw, "error")) ?? toString(prop(raw, "msg"));
  if (msg) return msg;

  // Some error shapes: { data: { message: "..." } }
  const data = prop(raw, "data");
  if (isObject(data)) {
    return toString(prop(data, "message")) ?? toString(prop(data, "error")) ?? undefined;
  }
  return undefined;
}

/**
 * Parse Birdeye price history response.
 *
 * Tries multiple response shapes because Birdeye's format varies by endpoint
 * version, auth tier, and token availability.
 */
function parseBirdeyeHistory(raw: unknown): BirdeyeHistoryResult {
  if (!isObject(raw)) {
    throw new Error("Invalid Birdeye response: expected object");
  }

  // Check for explicit error first
  const errorMsg = extractBirdeyeError(raw);
  if (errorMsg) {
    throw new Error(`Birdeye error: ${errorMsg}`);
  }

  // Try multiple response shapes to find the items array
  let itemsRaw: unknown[] | undefined;

  // Shape 1: { data: { items: [...] } }
  const data = prop(raw, "data");
  if (isObject(data)) {
    const nestedItems = prop(data, "items");
    if (Array.isArray(nestedItems)) itemsRaw = nestedItems;
  }

  // Shape 2: { data: [...] } (array directly in data)
  if (!itemsRaw && Array.isArray(data)) {
    itemsRaw = data;
  }

  // Shape 3: { items: [...] } (top-level items)
  if (!itemsRaw) {
    const topItems = prop(raw, "items");
    if (Array.isArray(topItems)) itemsRaw = topItems;
  }

  // Shape 4: { history: [...] }
  if (!itemsRaw) {
    const history = prop(raw, "history");
    if (Array.isArray(history)) itemsRaw = history;
  }

  // Shape 5: { prices: [...] }
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

  const items: PricePoint[] = [];
  for (const item of itemsRaw) {
    if (!isObject(item)) continue;

    // Try multiple timestamp field names
    const unixTime =
      toNumber(prop(item, "unixTime")) ??
      toNumber(prop(item, "unix_time")) ??
      toNumber(prop(item, "timestamp")) ??
      toNumber(prop(item, "time")) ??
      toNumber(prop(item, "t")) ??
      toNumber(prop(item, "date"));

    // Try multiple price field names
    const value =
      toNumber(prop(item, "value")) ??
      toNumber(prop(item, "price")) ??
      toNumber(prop(item, "p")) ??
      toNumber(prop(item, "close")) ??
      toNumber(prop(item, "v"));

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
    `${BIRDEYE_BASE_URL}/defi/history_price?` +
    `address=${encodeURIComponent(mint)}` +
    `&type=${encodeURIComponent(timeframe)}` +
    `&time_from=${from}` +
    `&time_to=${now}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      headers: {
        "X-API-KEY": apiKey,
        "x-chain": "solana",
      },
      signal: controller.signal,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      // Show a preview of what Birdeye actually returned for debugging
      const preview = text.slice(0, 300).replace(/\s+/g, " ");
      throw new Error(`Invalid JSON in response (status: ${res.status}, url: ${url}, preview: ${preview})`);
    }

    // Log non-OK responses with the body for debugging
    if (!res.ok) {
      const errMsg = extractBirdeyeError(json) ?? `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    return parseBirdeyeHistory(json);
  } finally {
    clearTimeout(timer);
  }
}
