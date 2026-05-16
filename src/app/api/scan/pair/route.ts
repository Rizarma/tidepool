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
  fetchMeteoraDlmmGroupPools,
} from "@/lib/providers-dlmm";
import { fetchDexScreener, fetchJupiter, fetchSolanaRpc } from "@/lib/providers";
import { fetchGmgnTokenSecurity } from "@/lib/providers-gmgn";
import { apiErrorResponse, classifyProviderError } from "@/lib/api-errors";
import { timedFetch, buildSourceStatus } from "@/lib/provider-status";
import { cacheableJson } from "@/lib/api-cache";
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

async function enrichPairWithJupiterPrices(
  pair: DlmmPairInfo,
  sources: SourceStatus[],
): Promise<void> {
  const mintX = pair.tokenX.mint;
  const mintY = pair.tokenY.mint;

  if (!mintX || !mintY) return;

  const jupiterResult = await timedFetch("jupiter", async () => {
    const [xRes, yRes] = await Promise.allSettled([
      fetchJupiter(mintX),
      fetchJupiter(mintY),
    ]);

    const x = xRes.status === "fulfilled" ? xRes.value : undefined;
    const y = yRes.status === "fulfilled" ? yRes.value : undefined;

    const hasXPrice = x?.priceUsd != null;
    const hasYPrice = y?.priceUsd != null;

    if (!hasXPrice && !hasYPrice) {
      throw new Error("No Jupiter price data");
    }

    return { x, y };
  });

  sources.push(buildSourceStatus("jupiter", jupiterResult));

  if (jupiterResult.status === "fulfilled") {
    const { x, y } = jupiterResult.value.data;
    if (x?.priceUsd != null) pair.tokenX.priceUsd = x.priceUsd;
    if (y?.priceUsd != null) pair.tokenY.priceUsd = y.priceUsd;
    if (x?.imageUrl) pair.tokenX.imageUrl = x.imageUrl;
    if (y?.imageUrl) pair.tokenY.imageUrl = y.imageUrl;
  }
}

async function enrichPairWithDexScreenerImages(
  pair: DlmmPairInfo,
  sources: SourceStatus[],
): Promise<void> {
  const mintX = pair.tokenX.mint;
  const mintY = pair.tokenY.mint;

  if (!mintX || !mintY) return;

  const dexResult = await timedFetch("dexscreener", async () => {
    const [xRes, yRes] = await Promise.allSettled([
      fetchDexScreener(mintX),
      fetchDexScreener(mintY),
    ]);

    const x = xRes.status === "fulfilled" ? xRes.value : undefined;
    const y = yRes.status === "fulfilled" ? yRes.value : undefined;

    if (!x && !y) {
      throw new Error("No DexScreener data");
    }

    return { x, y };
  });

  sources.push(buildSourceStatus("dexscreener", dexResult));

  if (dexResult.status === "fulfilled") {
    const { x, y } = dexResult.value.data;
    // Only fill imageUrl if Jupiter didn't already provide one
    if (x?.imageUrl && !pair.tokenX.imageUrl) pair.tokenX.imageUrl = x.imageUrl;
    if (y?.imageUrl && !pair.tokenY.imageUrl) pair.tokenY.imageUrl = y.imageUrl;
  }
}

async function enrichPairWithSolanaAuthorities(
  pair: DlmmPairInfo,
  sources: SourceStatus[],
): Promise<void> {
  const mintX = pair.tokenX.mint;
  const mintY = pair.tokenY.mint;

  if (!mintX || !mintY) return;

  const result = await timedFetch("solana_rpc", async () => {
    const [xRes, yRes] = await Promise.allSettled([
      fetchSolanaRpc(mintX),
      fetchSolanaRpc(mintY),
    ]);

    const x = xRes.status === "fulfilled" ? xRes.value : undefined;
    const y = yRes.status === "fulfilled" ? yRes.value : undefined;

    if (!x && !y) {
      throw new Error("No Solana RPC data");
    }

    return { x, y };
  });

  sources.push(buildSourceStatus("solana_rpc", result));

  if (result.status === "fulfilled") {
    const { x, y } = result.value.data;
    if (x) {
      pair.tokenX.mintAuthority = x.mintAuthority;
      pair.tokenX.freezeAuthority = x.freezeAuthority;
    }
    if (y) {
      pair.tokenY.mintAuthority = y.mintAuthority;
      pair.tokenY.freezeAuthority = y.freezeAuthority;
    }
  }
}

async function enrichPairWithGmgnSecurity(
  pair: DlmmPairInfo,
  sources: SourceStatus[],
): Promise<void> {
  const mintX = pair.tokenX.mint;
  const mintY = pair.tokenY.mint;

  if (!mintX || !mintY) return;

  // Skip if no API key is configured — gracefully degrade
  if (!process.env.GMGN_API_KEY) return;

  const result = await timedFetch("gmgn", async () => {
    const [xRes, yRes] = await Promise.allSettled([
      fetchGmgnTokenSecurity(mintX),
      fetchGmgnTokenSecurity(mintY),
    ]);

    const x = xRes.status === "fulfilled" ? xRes.value : undefined;
    const y = yRes.status === "fulfilled" ? yRes.value : undefined;

    if (!x && !y) {
      throw new Error("No GMGN security data");
    }

    return { x, y };
  });

  sources.push(buildSourceStatus("gmgn", result));

  if (result.status === "fulfilled") {
    const { x, y } = result.value.data;
    if (x) {
      pair.tokenX.renouncedMint = x.renouncedMint;
      pair.tokenX.renouncedFreeze = x.renouncedFreeze;
      pair.tokenX.ctoFlag = x.ctoFlag;
      pair.tokenX.isHoneypot = x.isHoneypot;
      pair.tokenX.rugRatio = x.rugRatio;
      pair.tokenX.top10HolderRate = x.top10HolderRate;
      pair.tokenX.sniperCount = x.sniperCount;
    }
    if (y) {
      pair.tokenY.renouncedMint = y.renouncedMint;
      pair.tokenY.renouncedFreeze = y.renouncedFreeze;
      pair.tokenY.ctoFlag = y.ctoFlag;
      pair.tokenY.isHoneypot = y.isHoneypot;
      pair.tokenY.rugRatio = y.rugRatio;
      pair.tokenY.top10HolderRate = y.top10HolderRate;
      pair.tokenY.sniperCount = y.sniperCount;
    }
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

  // Parallel fetch: related pools + Jupiter prices
  let relatedPools: DlmmPairInfo[] = [];

  if (pair.tokenX.mint && pair.tokenY.mint) {
    const [groupResult] = await Promise.all([
      timedFetch("meteora_dlmm", () =>
        fetchMeteoraDlmmGroupPools(pair.tokenX.mint, pair.tokenY.mint),
      ),
      enrichPairWithJupiterPrices(pair, sources),
      enrichPairWithSolanaAuthorities(pair, sources),
      enrichPairWithGmgnSecurity(pair, sources),
      enrichPairWithDexScreenerImages(pair, sources),
    ]);

    if (groupResult.status === "fulfilled") {
      relatedPools = groupResult.value.data;
    }
    // On rejection: silently degrade to []
  } else {
    await Promise.all([
      enrichPairWithJupiterPrices(pair, sources),
      enrichPairWithSolanaAuthorities(pair, sources),
      enrichPairWithGmgnSecurity(pair, sources),
      enrichPairWithDexScreenerImages(pair, sources),
    ]);
  }

  const report: PoolReport = {
    kind: "pair",
    pair,
    relatedPools,
    sources,
    fetchedAt: new Date().toISOString(),
  };

  return cacheableJson(report, 10, 30);
}


