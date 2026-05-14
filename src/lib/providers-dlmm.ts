/**
 * Meteora DLMM REST provider – no SDK dependencies.
 * Base URL: https://dlmm.datapi.meteora.ag
 */

import type { DlmmPairInfo, PairToken } from "@/lib/types";
import {
  isObject,
  prop,
  toNumber,
  toString,
  toBool,
  toStringArray,
  fetchJson,
} from "@/lib/provider-parsing";
import { cacheFirst } from "@/lib/fetch-guard";
import { rateLimiters } from "@/lib/rate-limit";

const BASE_URL = "https://dlmm.datapi.meteora.ag";

// ─── Normalization ───────────────────────────────────────────────────────────

export function parsePairToken(raw: unknown, amountField?: number): PairToken {
  if (!isObject(raw)) {
    return { mint: "" };
  }
  const result: PairToken = {
    mint: toString(raw.mint) ?? toString(raw.address) ?? "",
    name: toString(raw.name),
    symbol: toString(raw.symbol),
    decimals: toNumber(raw.decimals),
    // Meteora payloads use `price` as the USD price field; `price_usd` is not present.
    // Keep `price_usd` first so we don't break if Meteora ever adds it.
    priceUsd: toNumber(raw.price_usd) ?? toNumber(raw.price),
    verified: toBool(raw.verified) ?? toBool(raw.is_verified),
    amount: Number.isFinite(amountField) ? amountField : undefined,
    holders: toNumber(raw.holders),
    freezeAuthorityDisabled: toBool(raw.freeze_authority_disabled),
    totalSupply: toNumber(raw.total_supply),
    marketCap: toNumber(raw.market_cap),
  };

  // Fallback: compute market cap from price × total_supply when Meteora returns 0/falsy
  const price = result.priceUsd;
  const supply = result.totalSupply;
  const rawMarketCap = result.marketCap;
  if (!rawMarketCap && price && supply) {
    result.marketCap = price * supply;
    result.marketCapFallback = true;
  }

  return result;
}

export function normalizePair(raw: unknown): DlmmPairInfo {
  if (!isObject(raw)) {
    throw new Error("Invalid pool data: expected an object");
  }

  const poolAddress: string =
    toString(raw.pool_address) ?? toString(raw.address) ?? toString(raw.pair) ?? "";
  if (!poolAddress) {
    throw new Error("Invalid pool data: missing pool address");
  }

  const currentPrice = toNumber(raw.current_price);
  const inversePrice =
    currentPrice && currentPrice > 0 ? 1 / currentPrice : undefined;

  const tokenXAmount = toNumber(raw.token_x_amount);
  const tokenYAmount = toNumber(raw.token_y_amount);

  const tokenXRaw = prop(raw, "token_x") ?? prop(raw, "mint_x_info");
  const tokenYRaw = prop(raw, "token_y") ?? prop(raw, "mint_y_info");

  const tokenX = parsePairToken(tokenXRaw, tokenXAmount);
  const tokenY = parsePairToken(tokenYRaw, tokenYAmount);

  // Fallback: if token objects don't have mint, use top-level mint_x / mint_y
  if (!tokenX.mint) {
    const mintX = toString(raw.mint_x);
    if (mintX) tokenX.mint = mintX;
  }
  if (!tokenY.mint) {
    const mintY = toString(raw.mint_y);
    if (mintY) tokenY.mint = mintY;
  }

  // Token mints are required for a valid pool
  if (!tokenX.mint) {
    throw new Error("Invalid pool data: missing token X mint");
  }
  if (!tokenY.mint) {
    throw new Error("Invalid pool data: missing token Y mint");
  }

  return {
    poolAddress,
    name: toString(raw.name),
    tokenX,
    tokenY,
    priceTokenYPerTokenX:
      currentPrice && !isNaN(currentPrice) ? currentPrice : undefined,
    inversePrice:
      inversePrice && !isNaN(inversePrice) ? inversePrice : undefined,
    binStep:
      toNumber(raw.bin_step) ?? toNumber(prop(raw, "pool_config", "bin_step")),
    baseFeePct:
      toNumber(raw.base_fee_percentage) ??
      toNumber(raw.base_fee_pct) ??
      toNumber(prop(raw, "pool_config", "base_fee_pct")),
    maxFeePct:
      toNumber(raw.max_fee_percentage) ??
      toNumber(raw.max_fee_pct) ??
      toNumber(prop(raw, "pool_config", "max_fee_pct")),
    protocolFeePct:
      toNumber(raw.protocol_fee_percentage) ??
      toNumber(raw.protocol_fee_pct) ??
      toNumber(prop(raw, "pool_config", "protocol_fee_pct")),
    dynamicFeePct:
      toNumber(raw.dynamic_fee_percentage) ?? toNumber(raw.dynamic_fee_pct),
    tvlUsd: toNumber(raw.tvl) ?? toNumber(raw.liquidity),
    volume24h: toNumber(prop(raw, "volume", "24h")) ?? toNumber(raw.trade_volume_24h),
    fees24h: toNumber(prop(raw, "fees", "24h")) ?? toNumber(raw.fee_volume_24h),
    // Build timeframe records from nested volume/fees objects
    volume: (() => {
      const out: Record<string, number> = {};
      const nested = isObject(raw.volume) ? raw.volume : undefined;
      if (nested) {
        for (const key of Object.keys(nested)) {
          const val = toNumber(nested[key]);
          if (val !== undefined) out[key] = val;
        }
      }
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
    fees: (() => {
      const out: Record<string, number> = {};
      const nested = isObject(raw.fees) ? raw.fees : undefined;
      if (nested) {
        for (const key of Object.keys(nested)) {
          const val = toNumber(nested[key]);
          if (val !== undefined) out[key] = val;
        }
      }
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
    apr: toNumber(raw.apr),
    apy: toNumber(raw.apy),
    isBlacklisted: toBool(raw.is_blacklisted),
    tags: toStringArray(raw.tags),
    launchpad: toString(raw.launchpad),
    createdAt:
      toNumber(raw.created_at) ??
      toNumber(raw.createdAt) ??
      toNumber(raw.pool_created_at),
  };
}

// ─── Pool Discovery ─────────────────────────────────────────────────────────

export interface PoolDiscoveryResult {
  totalFound: number;
  pools: DlmmPairInfo[];
}

/**
 * Fetch DLMM pools that contain a given token mint.
 * Queries the Meteora paginated pools endpoint, normalizes results,
 * exact-filters to pools where tokenX or tokenY matches the mint,
 * excludes blacklisted pools, and sorts by TVL desc then volume24h desc.
 */
export async function fetchMeteoraDlmmPoolsByMint(
  mint: string,
): Promise<PoolDiscoveryResult> {
  return cacheFirst(`meteora:pools:${mint}`, async () => {
  const params = new URLSearchParams({
    query: mint,
    page: "1",
    page_size: "20",
    sort_by: "tvl:desc",
    filter_by: "is_blacklisted=false",
  });
  const url = `${BASE_URL}/pools?${params.toString()}`;
  const data = await fetchJson(url);

  // The endpoint returns { data: [...], total: N } or possibly an array
  let rawPools: unknown[];
  let totalFound = 0;

  if (isObject(data) && Array.isArray(prop(data, "data"))) {
    rawPools = prop(data, "data") as unknown[];
    totalFound = toNumber(prop(data, "total")) ?? rawPools.length;
  } else if (Array.isArray(data)) {
    rawPools = data;
    totalFound = rawPools.length;
  } else {
    throw new Error("Invalid response from DLMM pools endpoint: expected array or object with data");
  }

  // Normalize and filter
  const pools: DlmmPairInfo[] = [];

  for (const raw of rawPools) {
    if (!isObject(raw)) continue;

    // Pre-normalization mint check: account for various raw shapes
    const rawMintX =
      toString(prop(raw, "token_x", "mint")) ??
      toString(prop(raw, "token_x", "address")) ??
      toString(prop(raw, "mint_x_info", "mint")) ??
      toString(prop(raw, "mint_x_info", "address")) ??
      toString(raw.mint_x);
    const rawMintY =
      toString(prop(raw, "token_y", "mint")) ??
      toString(prop(raw, "token_y", "address")) ??
      toString(prop(raw, "mint_y_info", "mint")) ??
      toString(prop(raw, "mint_y_info", "address")) ??
      toString(raw.mint_y);

    const matchesRaw = rawMintX === mint || rawMintY === mint;

    // Skip early if raw mints don't match and we can tell
    if (!matchesRaw && rawMintX && rawMintY) continue;

    // Normalize the pair
    let pair: DlmmPairInfo;
    try {
      pair = normalizePair(raw);
    } catch {
      continue;
    }

    // Post-normalization exact match
    if (pair.tokenX.mint !== mint && pair.tokenY.mint !== mint) continue;

    // Exclude blacklisted
    if (pair.isBlacklisted) continue;

    pools.push(pair);
  }

  // Sort by tvlUsd desc, then volume24h desc
  pools.sort((a, b) => {
    const tvlDiff = (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
    if (tvlDiff !== 0) return tvlDiff;
    return (b.volume24h ?? 0) - (a.volume24h ?? 0);
  });

  return { totalFound, pools };
  }, { ttlMs: 30_000, rateLimiter: rateLimiters.meteoraDlmm });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a single DLMM pool by its pool address.
 */
export async function fetchMeteoraDlmmPool(
  poolAddress: string,
): Promise<DlmmPairInfo> {
  return cacheFirst(`meteora:pool:${poolAddress}`, async () => {
  const url = `${BASE_URL}/pools/${poolAddress}`;
  const data = await fetchJson(url);

  if (!isObject(data)) {
    throw new Error("Invalid response from DLMM: expected object");
  }

  // The single-pool endpoint returns a flat object (or possibly wrapped)
  const raw = isObject(prop(data, "pool")) ? prop(data, "pool") : data;
  return normalizePair(raw);
  }, { ttlMs: 15_000, rateLimiter: rateLimiters.meteoraDlmm });
}

/**
 * Fetch recently created DLMM pools for a single orientation (token_x or token_y = SOL).
 */
async function fetchMeteoraNewPoolsOrientation(
  filterBy: string,
  pageSize: number,
  page: number,
): Promise<{ pools: DlmmPairInfo[]; total: number; pages: number }> {
  return cacheFirst(`meteora:new:${filterBy}:${page}:${pageSize}`, async () => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort_by: "pool_created_at:desc",
      filter_by: filterBy,
    });
    const url = `${BASE_URL}/pools?${params.toString()}`;
    const data = await fetchJson(url);

    if (!isObject(data) || !Array.isArray(data.data)) {
      throw new Error("Invalid response from DLMM pools endpoint: expected paginated object");
    }

    const rawPools = data.data as unknown[];
    const total = toNumber(data.total) ?? rawPools.length;
    const pages = toNumber(data.pages) ?? 1;

    const pools: DlmmPairInfo[] = [];
    for (const raw of rawPools) {
      if (!isObject(raw)) continue;
      try {
        const pair = normalizePair(raw);
        pools.push(pair);
      } catch {
        continue;
      }
    }

    return { pools, total, pages };
  }, { ttlMs: 15_000, rateLimiter: rateLimiters.meteoraDlmm });
}

/**
 * Fetch recently created DLMM pools sorted by creation time.
 * Queries both token_x=SOL and token_y=SOL orientations in parallel,
 * then merges and deduplicates results.
 */
export async function fetchMeteoraDlmmNewPools(
  pageSize = 20,
  page = 1,
  filters?: {
    minTvl?: number | null;
    minApr?: number | null;
    maxAgeHours?: number | null;
    freezeOffOnly?: boolean;
  }
): Promise<{ pools: DlmmPairInfo[]; total: number; pages: number }> {
  const baseFilter = "is_blacklisted=false && volume_30m>=1 && tvl>=100";
  const solMint = "So11111111111111111111111111111111111111112";

  // Fetch pages 1..N from both orientations to construct a correct combined page N.
  // A pool on orientation A page 1 may be newer than orientation B page 2,
  // so we must merge all pages up to N before slicing.
  const pageNumbers = Array.from({ length: page }, (_, i) => i + 1);

  const [yResults, xResults] = await Promise.all([
    Promise.all(
      pageNumbers.map((p) =>
        fetchMeteoraNewPoolsOrientation(`${baseFilter} && token_y=${solMint}`, pageSize, p),
      ),
    ),
    Promise.all(
      pageNumbers.map((p) =>
        fetchMeteoraNewPoolsOrientation(`${baseFilter} && token_x=${solMint}`, pageSize, p),
      ),
    ),
  ]);

  // Merge all pages, deduplicate by poolAddress
  const seen = new Map<string, DlmmPairInfo>();
  for (const result of [...yResults.flat(), ...xResults.flat()]) {
    for (const pool of result.pools) {
      if (!seen.has(pool.poolAddress)) {
        seen.set(pool.poolAddress, pool);
      }
    }
  }

  const allPools = Array.from(seen.values()).sort((a, b) => {
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });

  // Apply server-side filters
  let filteredPools = allPools;
  if (filters?.minTvl != null) {
    const minTvl = filters.minTvl;
    filteredPools = filteredPools.filter((p) => (p.tvlUsd ?? 0) >= minTvl);
  }
  if (filters?.minApr != null) {
    const minApr = filters.minApr;
    filteredPools = filteredPools.filter((p) => (p.apr ?? 0) >= minApr);
  }
  if (filters?.maxAgeHours != null) {
    const maxAgeHours = filters.maxAgeHours;
    const now = Math.floor(Date.now() / 1000);
    filteredPools = filteredPools.filter((p) => {
      if (!p.createdAt) return false;
      return (now - p.createdAt) / 3600 <= maxAgeHours;
    });
  }
  if (filters?.freezeOffOnly) {
    filteredPools = filteredPools.filter((p) => {
      const primary = p.tokenX.mint === solMint ? p.tokenY : p.tokenY.mint === solMint ? p.tokenX : p.tokenX;
      return primary.freezeAuthorityDisabled === true;
    });
  }

  const total = filteredPools.length;
  const pages = Math.ceil(total / pageSize);

  const start = (page - 1) * pageSize;
  const pools = filteredPools.slice(start, start + pageSize);

  return { pools, total, pages };
}

/**
 * Fetch all DLMM pools for a given token pair (both mints).
 * Returns normalized, non-blacklisted pools sorted by TVL desc then volume desc.
 */
export async function fetchMeteoraDlmmGroupPools(
  mintA: string,
  mintB: string,
): Promise<DlmmPairInfo[]> {
  const [sortedA, sortedB] = [mintA, mintB].sort();
  return cacheFirst(`meteora:group:${sortedA}:${sortedB}`, async () => {
    const pageSize = 50;
    const maxPages = 5;
    const allResult: DlmmPairInfo[] = [];

    for (let page = 1; page <= maxPages; page++) {
      if (page > 1) {
        await rateLimiters.meteoraDlmm.acquire();
      }

      const url = `${BASE_URL}/pools/groups/${sortedA}-${sortedB}?page=${page}&page_size=${pageSize}&sort_by=tvl:desc&filter_by=is_blacklisted=false`;
      const data = await fetchJson(url);

      // Handle both { data: [...] } and array responses
      let pools: unknown[];
      if (isObject(data) && Array.isArray(prop(data, "data"))) {
        pools = prop(data, "data") as unknown[];
      } else if (Array.isArray(data)) {
        pools = data;
      } else {
        throw new Error(
          "Invalid response from DLMM group endpoint: expected array or object with data",
        );
      }

      // Process this page
      for (const raw of pools) {
        if (!isObject(raw)) continue;
        try {
          const pair = normalizePair(raw);
          if (pair.isBlacklisted) continue;
          allResult.push(pair);
        } catch {
          continue;
        }
      }

      // If we got fewer than pageSize pools, we've reached the end
      if (pools.length < pageSize) break;
    }

    // Sort by TVL desc, then volume24h desc
    allResult.sort((a, b) => {
      const tvlDiff = (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
      if (tvlDiff !== 0) return tvlDiff;
      return (b.volume24h ?? 0) - (a.volume24h ?? 0);
    });

    return allResult;
  }, { ttlMs: 30_000, rateLimiter: rateLimiters.meteoraDlmm });
}

/**
 * Fetch the best DLMM pool for a given mint pair.
 * Mints are sorted lexicographically to form the group key.
 */
export async function fetchMeteoraDlmmPairByMints(
  mintA: string,
  mintB: string,
): Promise<DlmmPairInfo> {
  const [sortedA, sortedB] = [mintA, mintB].sort();
  return cacheFirst(`meteora:pair:${sortedA}:${sortedB}`, async () => {
  const url = `${BASE_URL}/pools/groups/${sortedA}-${sortedB}?page=1&page_size=5&sort_by=tvl:desc&filter_by=is_blacklisted=false`;
  const data = await fetchJson(url);

  // Group endpoint returns { data: [...] } or possibly an array
  let pools: unknown[];
  if (isObject(data) && Array.isArray(prop(data, "data"))) {
    pools = prop(data, "data") as unknown[];
  } else if (Array.isArray(data)) {
    pools = data;
  } else {
    throw new Error("Invalid response from DLMM: expected array or object with data");
  }

  if (pools.length === 0) {
    throw new Error(
      `No DLMM pool found for mints ${sortedA} / ${sortedB}`,
    );
  }

  // Choose first safe pool with current_price > 0.
  // Only treat explicit false or absent (undefined) as safe; any truthy/unknown value is unsafe.
  const isSafePool = (p: unknown): boolean => {
    if (!isObject(p)) return false;
    const price = toNumber(p.current_price);
    const bl = p.is_blacklisted;
    const isSafe = bl === false || bl === undefined;
    return isSafe && price !== undefined && price > 0;
  };

  const chosen = pools.find(isSafePool);

  if (!chosen) {
    throw new Error(
      `No DLMM pool found for mints ${sortedA} / ${sortedB}`,
    );
  }

  return normalizePair(chosen);
  }, { ttlMs: 30_000, rateLimiter: rateLimiters.meteoraDlmm });
}
