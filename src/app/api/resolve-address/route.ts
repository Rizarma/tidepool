/**
 * GET /api/resolve-address?address=<address>
 *
 * Address intelligence endpoint – probes whether a Solana address resolves as
 * a Meteora DLMM pool, a token mint with Meteora pools, or neither.
 */

import { apiErrorResponse, classifyProviderError } from "@/lib/api-errors";
import { fetchMeteoraDlmmPool, fetchMeteoraDlmmPoolsByMint } from "@/lib/providers-dlmm";
import { fetchSolanaRpc } from "@/lib/providers";
import { isValidSolanaAddress } from "@/lib/validation";
import type {
  AddressResolution,
  AddressResolutionSuggestion,
  AddressResolutionType,
  DlmmPairInfo,
  SourceStatus,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    return await handleResolveAddress(request);
  } catch (err) {
    console.error("Unhandled address resolution error", err);
    return apiErrorResponse(
      "INTERNAL_ERROR",
      "Unable to resolve address right now.",
      500,
    );
  }
}

async function handleResolveAddress(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();

  if (!address) {
    return apiErrorResponse(
      "MISSING_PARAMETER",
      "Missing required query parameter: address",
      400,
    );
  }

  if (!isValidSolanaAddress(address)) {
    return apiErrorResponse(
      "INVALID_PARAMETER",
      "Invalid Solana address",
      400,
    );
  }

  const [poolResult, tokenResult, poolsResult] = await Promise.all([
    timedFetch("meteora_pool", () => fetchMeteoraDlmmPool(address)),
    timedFetch("solana_rpc", () => fetchSolanaRpc(address)),
    timedFetch("meteora_pool_discovery", () => fetchMeteoraDlmmPoolsByMint(address)),
  ]);

  const sources: SourceStatus[] = [
    buildSourceStatus("meteora_pool", poolResult),
    buildSourceStatus("solana_rpc", tokenResult),
    buildSourceStatus("meteora_pool_discovery", poolsResult),
  ];

  const directPool = poolResult.status === "fulfilled" ? poolResult.value.data : undefined;
  const discoveredPools = poolsResult.status === "fulfilled" ? poolsResult.value.data.pools : [];
  const providerTotalFound = poolsResult.status === "fulfilled" ? poolsResult.value.data.totalFound : undefined;
  const primaryPool = discoveredPools[0] ?? null;
  const isTokenMint = tokenResult.status === "fulfilled" || discoveredPools.length > 0;

  const possibleTypes: AddressResolutionType[] = [];
  if (directPool) possibleTypes.push("meteora_dlmm_pool");
  if (isTokenMint) possibleTypes.push("token_mint");

  const primarySuggestion = getPrimarySuggestion({
    directPool,
    isTokenMint,
    discoveredPools,
  });

  const resolution: AddressResolution = {
    address,
    valid: true,
    status: getResolutionStatus([poolResult, tokenResult, poolsResult], primarySuggestion),
    possibleTypes,
    tokenScanAvailable: tokenResult.status === "fulfilled",
    meteoraPoolAvailable: Boolean(directPool),
    meteoraPoolsAvailable: discoveredPools.length > 0,
    primarySuggestion,
    pool: directPool,
    poolAddress: directPool?.poolAddress,
    matchingPoolCount: discoveredPools.length,
    providerTotalFound,
    primaryPool,
    primaryPoolAddress: primaryPool?.poolAddress,
    sources,
    fetchedAt: new Date().toISOString(),
  };

  return Response.json(resolution);
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
  const sanitized = classifyProviderError(rawError);
  return {
    provider,
    success: false,
    code: sanitized.code,
    error: sanitized.message,
  };
}

function getResolutionStatus(
  results: SettledResult<unknown>[],
  primarySuggestion: AddressResolutionSuggestion,
): AddressResolution["status"] {
  if (primarySuggestion !== "none") return "resolved";

  const hasProviderError = results.some((result) => {
    if (result.status === "fulfilled") return false;
    const rawError = result.reason?.message ?? String(result.reason);
    return classifyProviderError(rawError).code !== "NO_DATA_FOUND";
  });

  return hasProviderError ? "partial" : "unknown";
}

function getPrimarySuggestion({
  directPool,
  isTokenMint,
  discoveredPools,
}: {
  directPool?: DlmmPairInfo;
  isTokenMint: boolean;
  discoveredPools: DlmmPairInfo[];
}): AddressResolutionSuggestion {
  if (directPool) return "direct_pool_scan";
  if (discoveredPools.length > 0) return "pool_discovery";
  if (isTokenMint) return "token_scan";
  return "none";
}
