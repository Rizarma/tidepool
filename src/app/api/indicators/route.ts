/**
 * GET /api/indicators?pool=<address>&timeframes=1m,5m,15m&indicators=sma:20
 *
 * Fetches configurable technical indicators for a pool.
 * Separate from pool scan so indicator latency doesn't block pool data.
 */

import { isValidSolanaAddress } from "@/lib/validation";
import { fetchMeteoraDlmmPool } from "@/lib/providers-dlmm";
import { fetchBirdeyePriceHistory } from "@/lib/providers-ohlcv";
import { buildPoolIndicators } from "@/lib/indicators";
import { isValidIndicatorType } from "@/lib/indicators/registry";
import { apiErrorResponse, classifyProviderError, sanitizeSourceError } from "@/lib/api-errors";
import { timedFetch, buildSourceStatus } from "@/lib/provider-status";
import type { IndicatorType, PoolIndicators, SourceStatus, DlmmPairInfo } from "@/lib/types";

const VALID_TIMEFRAMES = ["1m", "5m", "15m"] as const;

type Timeframe = (typeof VALID_TIMEFRAMES)[number];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const timeframesParam = searchParams.get("timeframes")?.trim() ?? "1m,5m,15m";
  const indicatorsParam = searchParams.get("indicators")?.trim() ?? "sma:20";

  // Validate pool
  if (!pool || !isValidSolanaAddress(pool)) {
    return apiErrorResponse(
      "INVALID_PARAMETER",
      "Invalid or missing pool address",
      400,
    );
  }

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

  if (indicators.length === 0) {
    return apiErrorResponse(
      "INVALID_PARAMETER",
      "No valid indicators specified",
      400,
    );
  }

  // Fetch pool data to get token mints
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

  // Fetch indicators from Birdeye
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    return Response.json({
      indicators: { timeframes: [] } satisfies PoolIndicators,
      sources,
    });
  }

  const start = Date.now();
  try {
    const indicatorData = await Promise.race([
      fetchBirdeyeIndicators(pair, timeframes as Timeframe[], indicators),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Indicator fetch timeout")),
          30_000,
        ),
      ),
    ]);
    const latencyMs = Date.now() - start;
    sources.push({ provider: "birdeye", success: true, latencyMs });

    return Response.json({ indicators: indicatorData, sources });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const rawError = err instanceof Error ? err.message : String(err);
    console.error("[Birdeye] Indicator fetch failed:", rawError);
    sources.push({
      provider: "birdeye",
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

async function fetchBirdeyeIndicators(
  pair: DlmmPairInfo,
  timeframes: Timeframe[],
  indicators: Array<{ type: IndicatorType; period: number }>,
): Promise<PoolIndicators> {
  const tokenX = pair.tokenX;
  const tokenY = pair.tokenY;

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

  return buildPoolIndicators(xHistories, yHistories, {
    timeframes,
    indicators,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
