/**
 * Meteora DLMM REST provider – no SDK dependencies.
 * Base URL: https://dlmm.datapi.meteora.ag
 */

import type { DlmmPairInfo } from "@/lib/types";
import { fetchJson } from "@/lib/provider-parsing";
import { normalizePair } from "./providers-dlmm-pure";
import {
  isObject,
  prop,
  toNumber,
  toString,
  toBool,
  toStringArray,
} from "./provider-parsing-pure";
import { cacheFirst } from "@/lib/fetch-guard";
import { rateLimiters } from "@/lib/rate-limit";

export { normalizePair, parsePairToken } from "./providers-dlmm-pure";

const BASE_URL = "https://dlmm.datapi.meteora.ag";

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
  signal?: AbortSignal,
): Promise<DlmmPairInfo> {
  return cacheFirst(`meteora:pool:${poolAddress}`, async () => {
    if (signal?.aborted) throw new Error("Request aborted");
    const url = `${BASE_URL}/pools/${poolAddress}`;
    const data = await fetchJson(url, 10_000, signal);

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
): Promise<{ pools: DlmmPairInfo[]; total: number; pages: number; _debug: unknown }> {
  return cacheFirst(`meteora:new:${filterBy}:${page}:${pageSize}`, async () => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort_by: "pool_created_at:desc",
      filter_by: filterBy,
    });
    const url = `${BASE_URL}/pools?${params.toString()}`;
    const resMeta: { status?: number; headers?: Record<string, string> } = {};
    const data = await fetchJson(url, 10_000, undefined, (res) => {
      resMeta.status = res.status;
      const h: Record<string, string> = {};
      res.headers.forEach((value: string, name: string) => { h[name] = value; });
      resMeta.headers = h;
    });

    let _hasDataArray = false;
    let _dataLength: number | string = "n/a";
    if (isObject(data)) {
      _hasDataArray = Array.isArray(data.data);
      if (_hasDataArray) {
        _dataLength = (data.data as unknown[]).length;
      }
    }

    if (!isObject(data) || !Array.isArray(data.data)) {
      return {
        pools: [],
        total: 0,
        pages: 0,
        _debug: {
          url,
          status: resMeta.status,
          headers: resMeta.headers,
          responseType: typeof data,
          hasDataArray: _hasDataArray,
          dataLength: _dataLength,
          error: "Invalid response shape",
        },
      };
    }

    const rawPools = data.data as unknown[];
    const total = toNumber(data.total) ?? rawPools.length;
    const pages = toNumber(data.pages) ?? 1;

    const pools: DlmmPairInfo[] = [];
    let skipped = 0;
    let normalizationErrors: string[] = [];
    for (const raw of rawPools) {
      if (!isObject(raw)) { skipped++; continue; }
      try {
        const pair = normalizePair(raw);
        pools.push(pair);
      } catch (err) {
        skipped++;
        if (normalizationErrors.length < 5) {
          normalizationErrors.push((err as Error).message);
        }
        continue;
      }
    }

    return {
      pools,
      total,
      pages,
      _debug: {
        url,
        status: resMeta.status,
        headers: resMeta.headers,
        responseType: typeof data,
        hasDataArray: true,
        dataLength: rawPools.length,
        rawTotal: toNumber((data as Record<string, unknown>).total),
        rawPages: toNumber((data as Record<string, unknown>).pages),
        normalized: pools.length,
        skipped,
        normalizationErrors: normalizationErrors.length > 0 ? normalizationErrors : undefined,
      },
    };
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
): Promise<{ pools: DlmmPairInfo[]; total: number; pages: number; _debug: unknown }> {
  const baseFilter = "is_blacklisted=false && volume_30m>=1 && tvl>=100";
  const solMint = "So11111111111111111111111111111111111111112";

  // Cap at 10 pages max to prevent request amplification attacks.
  const fetchPages = Math.min(page, 10);

  // Fetch pages 1..N from both orientations to construct a correct combined page N.
  const pageNumbers = Array.from({ length: fetchPages }, (_, i) => i + 1);

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

  return {
    pools,
    total,
    pages,
    _debug: {
      pageSize,
      page,
      fetchPages,
      yOrientations: yResults.map((r) => r._debug),
      xOrientations: xResults.map((r) => r._debug),
      allPoolsCount: allPools.length,
      filteredPoolsCount: filteredPools.length,
      filters,
    },
  };
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
