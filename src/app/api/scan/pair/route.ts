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
import { fetchJupiter } from "@/lib/providers";
import { apiErrorResponse, classifyProviderError } from "@/lib/api-errors";
import { timedFetch, buildSourceStatus } from "@/lib/provider-status";
import type { PoolReport, SourceStatus, DlmmPairInfo } from "@/lib/types";

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

  // ─── Enrich token prices with Jupiter ────────────────────────────────────
  const mintX = pair.tokenX.mint;
  const mintY = pair.tokenY.mint;

  if (mintX && mintY) {
    const jupiterResult = await timedFetch("jupiter", async () => {
      const [x, y] = await Promise.all([
        fetchJupiter(mintX),
        fetchJupiter(mintY),
      ]);
      return { x, y };
    });

    sources.push(buildSourceStatus("jupiter", jupiterResult));

    if (jupiterResult.status === "fulfilled") {
      const { x, y } = jupiterResult.value.data;
      if (x?.priceUsd != null) pair.tokenX.priceUsd = x.priceUsd;
      if (y?.priceUsd != null) pair.tokenY.priceUsd = y.priceUsd;
    }
  }

  const report: PoolReport = {
    kind: "pair",
    pair,
    sources,
    fetchedAt: new Date().toISOString(),
  };

  return Response.json(report);
}


