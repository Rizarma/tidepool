/**
 * GET /api/scan?mint=<address>
 *
 * Token scanning endpoint – fetches data from multiple providers in parallel,
 * normalizes into a TokenReport, and returns JSON.
 */

import { isValidSolanaMint } from "@/lib/validation";
import {
  fetchDexScreener,
  fetchRugCheck,
  fetchJupiter,
  fetchSolanaRpc,
} from "@/lib/providers";
import { computeRisk } from "@/lib/risk";
import { apiErrorResponse, sanitizeSourceError } from "@/lib/api-errors";
import type {
  TokenReport,
  TokenIdentity,
  TokenSupply,
  TokenMarket,
  TokenTrust,
  SourceStatus,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    return await handleScan(request);
  } catch (err) {
    console.error("Unhandled token scan error", err);
    return apiErrorResponse(
      "INTERNAL_ERROR",
      "Unable to complete scan right now.",
      500,
    );
  }
}

async function handleScan(request: Request): Promise<Response> {
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

  // Fetch all providers in parallel
  const [dexResult, rugResult, jupResult, rpcResult] = await Promise.allSettled([
    timedFetch("dexscreener", () => fetchDexScreener(mint)),
    timedFetch("rugcheck", () => fetchRugCheck(mint)),
    timedFetch("jupiter", () => fetchJupiter(mint)),
    timedFetch("solana_rpc", () => fetchSolanaRpc(mint)),
  ]);

  // Build source statuses
  const sources: SourceStatus[] = [
    buildSourceStatus("dexscreener", dexResult),
    buildSourceStatus("rugcheck", rugResult),
    buildSourceStatus("jupiter", jupResult),
    buildSourceStatus("solana_rpc", rpcResult),
  ];

  // Extract values (undefined if failed)
  const dex = dexResult.status === "fulfilled" ? dexResult.value.data : undefined;
  const rug = rugResult.status === "fulfilled" ? rugResult.value.data : undefined;
  const jup = jupResult.status === "fulfilled" ? jupResult.value.data : undefined;
  const rpc = rpcResult.status === "fulfilled" ? rpcResult.value.data : undefined;

  // ─── Normalize Identity ──────────────────────────────────────────────────
  const identity: TokenIdentity = {
    mint,
    name: jup?.name ?? dex?.name ?? undefined,
    symbol: jup?.symbol ?? dex?.symbol ?? undefined,
    decimals: rpc?.decimals ?? jup?.decimals ?? undefined,
    imageUrl: jup?.imageUrl ?? dex?.imageUrl ?? undefined,
    tokenProgram: rpc?.tokenProgram ?? undefined,
  };

  // ─── Normalize Supply ────────────────────────────────────────────────────
  const supply: TokenSupply = {
    total: rpc?.supply ?? undefined,
    uiAmount: rpc?.uiAmount ?? undefined,
    decimals: rpc?.decimals ?? jup?.decimals ?? undefined,
    mintAuthority: rpc?.mintAuthority ?? undefined,
    freezeAuthority: rpc?.freezeAuthority ?? undefined,
  };

  // ─── Normalize Market ────────────────────────────────────────────────────
  const market: TokenMarket = {
    priceUsd: dex?.priceUsd ?? jup?.priceUsd ?? undefined,
    priceNative: dex?.priceNative ?? undefined,
    marketCap: dex?.marketCap ?? undefined,
    volume24h: dex?.volume24h ?? undefined,
    liquidity: dex?.liquidity ?? undefined,
    pairAddress: dex?.pairAddress ?? undefined,
    dexId: dex?.dexId ?? undefined,
  };

  // ─── Normalize Trust ─────────────────────────────────────────────────────
  const trust: TokenTrust = {
    jupiterStrict: jup?.strict ?? undefined,
    rugCheckScore: rug?.score ?? undefined,
    rugCheckLevel: rug?.level ?? undefined,
    topHolderPct: rug?.topHolderPct ?? undefined,
  };

  // ─── Compute Risk ────────────────────────────────────────────────────────
  const risk = computeRisk({
    supply,
    market,
    trust,
    rugCheckWarnings: rug?.warnings,
    rugCheckDangers: rug?.dangers,
  });

  const report: TokenReport = {
    kind: "token",
    identity,
    supply,
    market,
    trust,
    risk,
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

async function timedFetch<T>(
  _label: string,
  fn: () => Promise<T>,
): Promise<TimedResult<T>> {
  const start = Date.now();
  const data = await fn();
  return { data, latencyMs: Date.now() - start };
}

function buildSourceStatus(
  provider: string,
  result: PromiseSettledResult<TimedResult<unknown>>,
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
