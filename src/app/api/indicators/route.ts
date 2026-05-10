/**
 * GET /api/indicators?pool=<address>&timeframes=5m,1h,4h&indicators=sma:20&provider=meteora
 *
 * Fetches configurable technical indicators for a pool.
 * Separate from pool scan so indicator latency doesn't block pool data.
 * Supports Meteora DLMM OHLCV (default) and Birdeye token-price history.
 */

import { isValidSolanaAddress } from "@/lib/validation";
import { fetchMeteoraDlmmPool } from "@/lib/providers-dlmm";
import { getProvider, type OhlcvProvider } from "@/lib/providers-ohlcv";
import { buildPoolIndicatorsDirect } from "@/lib/indicators";
import { isValidIndicatorType } from "@/lib/indicators/registry";
import { apiErrorResponse, classifyProviderError, sanitizeSourceError } from "@/lib/api-errors";
import { timedFetch, buildSourceStatus } from "@/lib/provider-status";
import type { IndicatorType, PoolIndicators, SourceStatus, DlmmPairInfo } from "@/lib/types";
import type { OhlcvProviderName } from "@/lib/indicator-config";

const VALID_TIMEFRAMES = ["5m", "30m", "1h", "2h", "4h", "12h", "24h"] as const;
const VALID_PROVIDERS: OhlcvProviderName[] = ["meteora", "birdeye"];

type Timeframe = (typeof VALID_TIMEFRAMES)[number];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── API-level response cache ───────────────────────────────────────────────

interface ResponseCacheEntry {
  body: string;
  expiry: number;
}

const responseCache = new Map<string, ResponseCacheEntry>();

function responseCacheKey(
  pool: string,
  provider: string,
  timeframes: string[],
  indicators: Array<{ type: string; period: number }>,
): string {
  const ind = indicators.map((i) => `${i.type}:${i.period}`).join(",");
  return `${pool}:${provider}:${timeframes.join(",")}:${ind}`;
}

function getCachedResponse(key: string): string | undefined {
  // Purge stale entries occasionally to prevent unbounded growth
  if (responseCache.size > 200) {
    const now = Date.now();
    for (const [k, entry] of responseCache) {
      if (now > entry.expiry) responseCache.delete(k);
    }
  }

  const entry = responseCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    responseCache.delete(key);
    return undefined;
  }
  return entry.body;
}

function setCachedResponse(key: string, body: string, ttlMs: number): void {
  responseCache.set(key, { body, expiry: Date.now() + ttlMs });
}

/** Clear the API response cache. Primarily useful in tests. */
export function clearIndicatorResponseCache(): void {
  responseCache.clear();
}

export async function GET(request: Request): Promise<Response> {
  try {
    return await handleIndicators(request);
  } catch (err) {
    console.error("Unhandled indicators error", err);
    return apiErrorResponse(
      "INTERNAL_ERROR",
      "Unable to fetch indicators right now.",
      500,
    );
  }
}

async function handleIndicators(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const pool = searchParams.get("pool")?.trim();
  const timeframesParam = searchParams.get("timeframes")?.trim() ?? "5m,1h,4h";
  const rawIndicators = searchParams.get("indicators");
  const indicatorsParam = rawIndicators === null ? "sma:20" : rawIndicators.trim();
  const providerParam = searchParams.get("provider")?.trim() ?? "meteora";

  // Validate pool
  if (!pool || !isValidSolanaAddress(pool)) {
    return apiErrorResponse(
      "INVALID_PARAMETER",
      "Invalid or missing pool address",
      400,
    );
  }

  // Validate provider
  if (!VALID_PROVIDERS.includes(providerParam as OhlcvProviderName)) {
    return apiErrorResponse(
      "INVALID_PARAMETER",
      `Invalid provider: ${providerParam} (expected: ${VALID_PROVIDERS.join(", ")})`,
      400,
    );
  }
  const providerName = providerParam as OhlcvProviderName;

  // Parse timeframes
  const timeframes = timeframesParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const invalidTimeframes = timeframes.filter(
    (tf): tf is string => !VALID_TIMEFRAMES.includes(tf as Timeframe),
  );
  if (invalidTimeframes.length > 0) {
    return apiErrorResponse(
      "INVALID_PARAMETER",
      `Invalid timeframes: ${invalidTimeframes.join(", ")}`,
      400,
    );
  }

  // Parse indicators
  const indicators: Array<{ type: IndicatorType; period: number }> = [];
  for (const part of indicatorsParam.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [type, periodStr] = trimmed.split(":");
    if (!type || !periodStr) {
      return apiErrorResponse(
        "INVALID_PARAMETER",
        `Invalid indicator format: ${trimmed} (expected type:period)`,
        400,
      );
    }
    if (!isValidIndicatorType(type)) {
      return apiErrorResponse(
        "INVALID_PARAMETER",
        `Unknown indicator type: ${type}`,
        400,
      );
    }
    const period = parseInt(periodStr, 10);
    if (isNaN(period) || period <= 0) {
      return apiErrorResponse(
        "INVALID_PARAMETER",
        `Invalid indicator period: ${periodStr}`,
        400,
      );
    }
    indicators.push({ type, period });
  }

  // Check API-level cache before doing any work
  const cacheKey = responseCacheKey(pool, providerName, timeframes, indicators);
  const cachedBody = getCachedResponse(cacheKey);
  if (cachedBody) {
    return new Response(cachedBody, {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch pool data to get token mints (needed for all paths)
  const poolResult = await timedFetch("meteora_dlmm", () =>
    fetchMeteoraDlmmPool(pool),
  );

  const sources: SourceStatus[] = [buildSourceStatus("meteora_dlmm", poolResult)];

  if (poolResult.status === "rejected") {
    const rawError = poolResult.reason?.message ?? String(poolResult.reason);
    const sanitized = classifyProviderError(rawError);
    return Response.json(
      {
        error: { code: sanitized.code, message: sanitized.message },
        sources,
      },
      { status: sanitized.status },
    );
  }

  const pair: DlmmPairInfo = poolResult.value.data;

  // If no indicators are enabled, return empty response immediately
  if (indicators.length === 0) {
    const body = JSON.stringify({
      indicators: { timeframes: [] } satisfies PoolIndicators,
      sources,
    });
    setCachedResponse(cacheKey, body, 20_000);
    return new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
  }

  const provider = getProvider(providerName);

  // If Birdeye is selected, check API key
  if (providerName === "birdeye" && !process.env.BIRDEYE_API_KEY) {
    sources.push({
      provider: "birdeye",
      success: false,
      latencyMs: 0,
      error: sanitizeSourceError("BIRDEYE_API_KEY is not configured"),
    });
    const body = JSON.stringify({
      indicators: { timeframes: [] } satisfies PoolIndicators,
      sources,
    });
    setCachedResponse(cacheKey, body, 20_000);
    return new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
  }

  const start = Date.now();
  try {
    const indicatorData = await Promise.race([
      fetchIndicators(provider, providerName, pool, pair, timeframes as Timeframe[], indicators),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Indicator fetch timeout")),
          30_000,
        ),
      ),
    ]);
    const latencyMs = Date.now() - start;
    sources.push({
      provider: providerName === "meteora" ? "meteora_dlmm" : "birdeye",
      success: true,
      latencyMs,
    });

    const body = JSON.stringify({ indicators: indicatorData, sources });
    // Cache for 20s — short enough to stay fresh, long enough to absorb
    // repeat views, refreshes, and rapid navigation.
    setCachedResponse(cacheKey, body, 20_000);

    return new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const rawError = err instanceof Error ? err.message : String(err);
    console.error(`[${providerName}] Indicator fetch failed:`, rawError);
    sources.push({
      provider: providerName === "meteora" ? "meteora_dlmm" : "birdeye",
      success: false,
      latencyMs,
      error: sanitizeSourceError(rawError),
    });
    return Response.json({
      indicators: { timeframes: [] } satisfies PoolIndicators,
      sources,
    });
  }
}

async function fetchIndicators(
  provider: OhlcvProvider,
  providerName: OhlcvProviderName,
  poolAddress: string,
  pair: DlmmPairInfo,
  timeframes: Timeframe[],
  indicators: Array<{ type: IndicatorType; period: number }>,
): Promise<PoolIndicators> {
  // Fetch only enough history for the longest indicator period + alignment buffer.
  // The lower-level cache key includes periods, so this stays correct.
  const maxPeriod = Math.max(...indicators.map((ind) => ind.period));
  const periodsNeeded = maxPeriod + 5;

  const histories = [];
  for (let i = 0; i < timeframes.length; i++) {
    const tf = timeframes[i];
    // For Birdeye, the provider needs the pair info to get token mints.
    // For Meteora, the pair info is unused.
    const history = await provider.fetchHistory(poolAddress, tf, periodsNeeded);
    histories.push(history);
    // Short delay between timeframes to stay polite, but only when there
    // are more to fetch. The low-level cache already absorbs most calls.
    if (i < timeframes.length - 1) {
      await delay(300);
    }
  }

  return buildPoolIndicatorsDirect(histories, {
    timeframes,
    indicators,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
