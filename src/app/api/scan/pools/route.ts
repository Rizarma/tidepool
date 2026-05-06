/**
 * GET /api/scan/pools?mint=<address>
 *
 * Pool discovery endpoint – finds all Meteora DLMM pools containing a given
 * token mint, sorted by TVL and volume.
 */

import { isValidSolanaMint } from "@/lib/validation";
import { fetchMeteoraDlmmPoolsByMint } from "@/lib/providers-dlmm";
import { apiErrorResponse, classifyProviderError, sanitizeSourceError } from "@/lib/api-errors";
import type { PoolDiscoveryReport, SourceStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    return await handlePoolDiscovery(request);
  } catch (err) {
    console.error("Unhandled pool discovery error", err);
    return apiErrorResponse(
      "INTERNAL_ERROR",
      "Unable to complete pool discovery right now.",
      500,
    );
  }
}

async function handlePoolDiscovery(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const mint = searchParams.get("mint")?.trim();

  if (!mint) {
    return apiErrorResponse(
      "MISSING_PARAMETER",
      "Missing required query parameter: mint",
      400,
    );
  }

  if (!isValidSolanaMint(mint)) {
    return apiErrorResponse(
      "INVALID_PARAMETER",
      "Invalid Solana mint address",
      400,
    );
  }

  // Fetch pools from Meteora DLMM
  const result = await timedFetch("meteora_dlmm", () =>
    fetchMeteoraDlmmPoolsByMint(mint),
  );

  const source = buildSourceStatus("meteora_dlmm", result);
  const sources: SourceStatus[] = [source];

  if (result.status === "rejected") {
    // Provider failed entirely – return normalized error with sources
    const rawError = result.reason?.message ?? String(result.reason);
    const sanitized = classifyProviderError(rawError);
    const body = {
      error: { code: sanitized.code, message: sanitized.message },
      sources,
    };
    return Response.json(body, { status: sanitized.status });
  }

  const { totalFound, pools } = result.value.data;

  // No exact matches after filtering
  if (pools.length === 0) {
    const body = {
      error: { code: "NO_DATA_FOUND" as const, message: "No pools found for this mint" },
      sources,
    };
    return Response.json(body, { status: 404 });
  }

  const primaryPool = pools[0];
  const selectionReason =
    pools.length === 1
      ? "single_match"
      : primaryPool.tvlUsd && primaryPool.tvlUsd > 0
      ? "highest_tvl"
      : "highest_volume";

  const report: PoolDiscoveryReport = {
    kind: "pool_discovery",
    query: { mint },
    primaryPool,
    pools,
    totalFound,
    totalMatched: pools.length,
    selectionReason,
    sources,
    fetchedAt: new Date().toISOString(),
  };

  return Response.json(report);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface TimedResult<T> {
  data: T;
  latencyMs: number;
}

type SettledResult<T> =
  | { status: "fulfilled"; value: TimedResult<T> }
  | { status: "rejected"; reason: { message?: string } | undefined };

async function timedFetch<T>(
  _label: string,
  fn: () => Promise<T>,
): Promise<SettledResult<T>> {
  const start = Date.now();
  try {
    const data = await fn();
    return { status: "fulfilled", value: { data, latencyMs: Date.now() - start } };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err : { message: String(err) };
    return { status: "rejected", reason };
  }
}

function buildSourceStatus(
  provider: string,
  result: SettledResult<unknown>,
): SourceStatus {
  if (result.status === "fulfilled") {
    return {
      provider,
      success: true,
      latencyMs: result.value.latencyMs,
    };
  }
  const rawError = result.reason?.message ?? String(result.reason);
  return {
    provider,
    success: false,
    error: sanitizeSourceError(rawError),
  };
}
