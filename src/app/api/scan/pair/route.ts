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

  const timeframes: Array<"1m" | "5m" | "15m"> = ["1m", "5m", "15m"];
  const tokenX = pair.tokenX;
  const tokenY = pair.tokenY;

  const start = Date.now();
  try {
    // Fetch all histories in parallel: 3 timeframes × 2 tokens = 6 calls
    const [xHistories, yHistories] = await Promise.all([
      Promise.all(
        timeframes.map((tf) => fetchBirdeyePriceHistory(tokenX.mint, tf, 25))
      ),
      Promise.all(
        timeframes.map((tf) => fetchBirdeyePriceHistory(tokenY.mint, tf, 25))
      ),
    ]);

    const indicators = buildPoolIndicators(xHistories, yHistories);
    const latencyMs = Date.now() - start;

    return {
      indicators,
      source: { provider: "birdeye", success: true, latencyMs },
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const rawError = err instanceof Error ? err.message : String(err);
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


