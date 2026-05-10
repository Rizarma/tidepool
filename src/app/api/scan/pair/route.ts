/**
 * GET /api/scan/pair?pool=<address>
 * GET /api/scan/pair?pair=<address>       (alias for pool)
 * GET /api/scan/pair?mintA=<address>&mintB=<address>
 *
 * DLMM pair scanning endpoint – fetches pool data from Meteora REST API.
 */

import { isValidSolanaAddress } from "@/lib/validation";
import {
  fetchMeteoraDlmmPool,
  fetchMeteoraDlmmPairByMints,
} from "@/lib/providers-dlmm";
import { fetchBirdeyePriceHistory } from "@/lib/providers-ohlcv";
import { buildPoolIndicators } from "@/lib/indicators";
import { apiErrorResponse, classifyProviderError, sanitizeSourceError } from "@/lib/api-errors";
import { timedFetch, buildSourceStatus } from "@/lib/provider-status";
import type { PoolReport, SourceStatus, DlmmPairInfo, PoolIndicators } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    return await handlePairScan(request);
  } catch (err) {
    console.error("Unhandled pair scan error", err);
    return apiErrorResponse(
      "INTERNAL_ERROR",
      "Unable to complete pair scan right now.",
      500,
    );
  }
}

async function handlePairScan(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const pool = searchParams.get("pool")?.trim() || searchParams.get("pair")?.trim();
  const mintA = searchParams.get("mintA")?.trim();
  const mintB = searchParams.get("mintB")?.trim();

  // Determine mode
  if (!pool && (!mintA || !mintB)) {
    return apiErrorResponse(
      "MISSING_PARAMETER",
      "Missing required query parameters: provide ?pool=<address> or ?mintA=<address>&mintB=<address>",
      400,
    );
  }

  // Validate addresses
  if (pool) {
    if (!isValidSolanaAddress(pool)) {
      return apiErrorResponse(
        "INVALID_PARAMETER",
        "Invalid Solana address for pool parameter",
        400,
      );
    }
  } else {
    if (!isValidSolanaAddress(mintA!)) {
      return apiErrorResponse(
        "INVALID_PARAMETER",
        "Invalid Solana address for mintA parameter",
        400,
      );
    }
    if (!isValidSolanaAddress(mintB!)) {
      return apiErrorResponse(
        "INVALID_PARAMETER",
        "Invalid Solana address for mintB parameter",
        400,
      );
    }
  }

  // Fetch from Meteora DLMM
  const result = await timedFetch("meteora_dlmm", () =>
    pool
      ? fetchMeteoraDlmmPool(pool)
      : fetchMeteoraDlmmPairByMints(mintA!, mintB!),
  );

  const source = buildSourceStatus("meteora_dlmm", result);
  const sources: SourceStatus[] = [source];

  if (result.status === "rejected") {
    const rawError = result.reason?.message ?? String(result.reason);
    const sanitized = classifyProviderError(rawError);
    const body = {
      error: { code: sanitized.code, message: sanitized.message },
      sources,
    };
    return Response.json(body, { status: sanitized.status });
  }

  const pair: DlmmPairInfo = result.value.data;

  // ─── Fetch indicators from Birdeye (non-blocking, best-effort) ───
  const indicatorData = await fetchPoolIndicators(pair);
  if (indicatorData.source) {
    sources.push(indicatorData.source);
  }

  const report: PoolReport = {
    kind: "pair",
    pair,
    indicators: indicatorData.indicators,
    sources,
    fetchedAt: new Date().toISOString(),
  };

  return Response.json(report);
}

/**
 * Fetch 1m/5m/15m price histories from Birdeye for both pool tokens,
 * compute pool-ratio moving averages, and return as indicators.
 *
 * If Birdeye is not configured or any fetch fails, returns gracefully
 * with only a source-status entry so the main pool scan still succeeds.
 */
async function fetchPoolIndicators(
  pair: DlmmPairInfo,
): Promise<{ indicators?: PoolIndicators; source?: SourceStatus }> {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    return {};
  }

  const start = Date.now();
  try {
    const { indicators } = await Promise.race([
      fetchPoolIndicatorsInternal(pair),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Indicator fetch timeout")), 30_000)
      ),
    ]);
    const latencyMs = Date.now() - start;
    return {
      indicators,
      source: { provider: "birdeye", success: true, latencyMs },
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const rawError = err instanceof Error ? err.message : String(err);
    console.error("[Birdeye] Indicator fetch failed:", rawError);
    return {
      source: {
        provider: "birdeye",
        success: false,
        latencyMs,
        error: sanitizeSourceError(rawError),
      },
    };
  }
}

async function fetchPoolIndicatorsInternal(
  pair: DlmmPairInfo,
): Promise<{ indicators: PoolIndicators }> {
  const timeframes: Array<"1m" | "5m" | "15m"> = ["1m", "5m", "15m"];
  const tokenX = pair.tokenX;
  const tokenY = pair.tokenY;

  // Fetch X and Y for each timeframe in parallel, with 1000ms delay between timeframes
  const xHistories = [];
  const yHistories = [];
  for (const tf of timeframes) {
    const [x, y] = await Promise.all([
      fetchBirdeyePriceHistory(tokenX.mint, tf, 25),
      fetchBirdeyePriceHistory(tokenY.mint, tf, 25),
    ]);
    xHistories.push(x);
    yHistories.push(y);
    await delay(1000);
  }

  const indicators = buildPoolIndicators(xHistories, yHistories);
  return { indicators };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


