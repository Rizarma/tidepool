/**
 * Browser-compatible Meteora DLMM fetcher.
 *
 * Uses native fetch (browser) instead of node-fetch, bypassing
 * Cloudflare bot management IP blocking that affects Vercel serverless.
 */

import type { DlmmPairInfo } from "@/lib/types";
import { normalizePair } from "./providers-dlmm-pure";

const BASE_URL = "https://dlmm.datapi.meteora.ag";

export interface FilterState {
  minTvl: number | null;
  minApr: number | null;
  maxAgeHours: number | null;
  freezeOffOnly: boolean;
}

async function fetchOrientation(
  filterBy: string,
  pageSize: number,
  page: number,
  signal?: AbortSignal,
): Promise<{ pools: DlmmPairInfo[]; total: number; pages: number }> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: "pool_created_at:desc",
    filter_by: filterBy,
  });
  const url = `${BASE_URL}/pools?${params.toString()}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Meteora HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    data?: unknown[];
    total?: number;
    pages?: number;
  };

  const rawPools = Array.isArray(data.data) ? data.data : [];
  const pools: DlmmPairInfo[] = [];
  for (const raw of rawPools) {
    if (typeof raw !== "object" || raw === null) continue;
    try {
      pools.push(normalizePair(raw));
    } catch {
      // skip invalid pools
    }
  }

  const total = typeof data.total === "number" ? data.total : pools.length;
  const pages = typeof data.pages === "number" ? data.pages : 1;

  return { pools, total, pages };
}

export async function fetchMeteoraDlmmNewPoolsBrowser(
  pageSize = 20,
  page = 1,
  filters?: FilterState,
  signal?: AbortSignal,
): Promise<{ pools: DlmmPairInfo[]; total: number; pages: number }> {
  const baseFilter = "is_blacklisted=false && volume_30m>=1 && tvl>=100";
  const solMint = "So11111111111111111111111111111111111111112";
  const fetchPages = Math.min(page, 10);

  const yPromises = Array.from({ length: fetchPages }, (_, i) =>
    fetchOrientation(`${baseFilter} && token_y=${solMint}`, pageSize, i + 1, signal),
  );
  const xPromises = Array.from({ length: fetchPages }, (_, i) =>
    fetchOrientation(`${baseFilter} && token_x=${solMint}`, pageSize, i + 1, signal),
  );

  const [yResults, xResults] = await Promise.all([
    Promise.all(yPromises),
    Promise.all(xPromises),
  ]);

  // Merge and deduplicate
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

  // Apply filters
  let filtered = allPools;
  if (filters?.minTvl != null) {
    filtered = filtered.filter((p) => (p.tvlUsd ?? 0) >= filters.minTvl!);
  }
  if (filters?.minApr != null) {
    filtered = filtered.filter((p) => (p.apr ?? 0) >= filters.minApr!);
  }
  if (filters?.maxAgeHours != null) {
    const now = Math.floor(Date.now() / 1000);
    const maxHours = filters.maxAgeHours;
    filtered = filtered.filter((p) => {
      if (!p.createdAt) return false;
      return (now - p.createdAt) / 3600 <= maxHours;
    });
  }
  if (filters?.freezeOffOnly) {
    filtered = filtered.filter((p) => {
      const primary =
        p.tokenX.mint === solMint
          ? p.tokenY
          : p.tokenY.mint === solMint
            ? p.tokenX
            : p.tokenX;
      return primary.freezeAuthorityDisabled === true;
    });
  }

  const total = filtered.length;
  const pages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;

  return { pools: filtered.slice(start, start + pageSize), total, pages };
}
