"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import type { PoolReport } from "@/lib/api-types";
import {
  shortenAddress,
  numberOrDash,
  feePct,
  formatCompactUsd,
  pctCompact,
  formatAge,
} from "@/lib/format";

type PoolItem = NonNullable<PoolReport["relatedPools"]>[number];

interface RankedPoolsTableProps {
  pools: NonNullable<PoolReport["relatedPools"]>;
  currentPoolAddress?: string;
  currentPair?: PoolReport["pair"];
  pairName?: string;
}

type SortKey = "tvl" | "volume" | "apr";
type SortDir = "asc" | "desc";

const SORT_FIELDS: Record<SortKey, keyof PoolItem> = {
  tvl: "tvlUsd",
  volume: "volume24h",
  apr: "apr",
};

function getSortValue(pool: PoolItem, key: SortKey): number {
  const field = SORT_FIELDS[key];
  const val = (pool as Record<string, unknown>)[field as string];
  return typeof val === "number" && !Number.isNaN(val) ? val : 0;
}

function SortHeader({
  label,
  field,
  activeField,
  activeDir,
  onSort,
}: {
  label: string;
  field: SortKey;
  activeField: SortKey;
  activeDir: SortDir;
  onSort: (field: SortKey) => void;
}) {
  const isActive = activeField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`w-full text-right font-medium transition hover:text-zinc-300 flex items-center justify-end gap-1 ${
        isActive ? "text-zinc-200" : "text-zinc-500"
      }`}
      aria-label={`Sort by ${label}`}
      aria-pressed={isActive}
    >
      {label}
      {isActive && (
        <span aria-hidden="true">
          {activeDir === "asc" ? "▲" : "▼"}
        </span>
      )}
    </button>
  );
}

export function RankedPoolsTable({
  pools,
  currentPoolAddress,
  currentPair,
  pairName,
}: RankedPoolsTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Normalize pool list to include current pair if not present
  const normalizedPools = useMemo(() => {
    if (!currentPair?.poolAddress) return pools;
    const exists = pools.some(
      (p) => p.poolAddress === currentPair.poolAddress,
    );
    if (exists) return pools;
    return [currentPair, ...pools];
  }, [pools, currentPair]);

  // Read sort from URL
  const rawSort = searchParams.get("sort");
  const rawDir = searchParams.get("dir");
  const sortKey: SortKey =
    rawSort === "tvl" || rawSort === "volume" || rawSort === "apr"
      ? rawSort
      : "tvl";
  const sortDir: SortDir = rawDir === "asc" ? "asc" : "desc";

  // Sorted pools
  const sortedPools = useMemo(() => {
    const sorted = [...normalizedPools].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [normalizedPools, sortKey, sortDir]);

  // Max TVL for micro-bar
  const maxTvl = useMemo(() => {
    return Math.max(
      ...normalizedPools.map((p) => p.tvlUsd ?? 0),
      0.0001,
    );
  }, [normalizedPools]);

  const title = pairName ? `${pairName} Pools` : "Related Pools";

  function handleSort(key: SortKey) {
    const nextDir: SortDir =
      sortKey === key && sortDir === "desc" ? "asc" : "desc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("dir", nextDir);
    router.replace(pathname + "?" + params.toString());
  }

  return (
    <div className="mt-3">
      <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-2">
        {title}
      </h3>
      <div className="relative overflow-x-auto after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-[var(--background)] after:to-transparent after:pointer-events-none after:content-['']">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="sticky top-0 bg-[var(--background)] z-10">
            <tr className="border-b border-[var(--panel-border)] text-zinc-500">
              <th className="px-3 py-2 text-left font-medium">Pool</th>
              <th className="px-3 py-2 text-left font-medium">TVL Share</th>
              <th
                className="px-3 py-2"
                aria-sort={
                  sortKey === "tvl"
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <SortHeader
                  label="TVL"
                  field="tvl"
                  activeField={sortKey}
                  activeDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th
                className="px-3 py-2"
                aria-sort={
                  sortKey === "volume"
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <SortHeader
                  label="24h Vol"
                  field="volume"
                  activeField={sortKey}
                  activeDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th
                className="px-3 py-2"
                aria-sort={
                  sortKey === "apr"
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <SortHeader
                  label="APR"
                  field="apr"
                  activeField={sortKey}
                  activeDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-2 text-right font-medium">Bin Step</th>
              <th className="px-3 py-2 text-right font-medium">
                Base Fee
              </th>
              <th className="px-3 py-2 text-right font-medium">24h Fees</th>
              <th className="px-3 py-2 text-right font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {sortedPools.map((pool) => {
              const isCurrent = pool.poolAddress === currentPoolAddress;
              const tvlShare = (pool.tvlUsd ?? 0) / maxTvl;
              return (
                <tr
                  key={pool.poolAddress ?? "unknown"}
                  className={`border-b border-[var(--panel-border)] last:border-0 transition font-mono ${
                    isCurrent
                      ? "bg-amber-500/5 border-l-2 border-l-amber-500"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {pool.poolAddress ? (
                        <Link
                          href={`/pool/${pool.poolAddress}`}
                          className="text-zinc-400 hover:text-[var(--accent)] transition"
                        >
                          {shortenAddress(pool.poolAddress)}
                        </Link>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                      {isCurrent && (
                        <span className="inline-flex items-center rounded bg-amber-500/15 px-1 py-0 text-[10px] font-bold uppercase text-amber-300">
                          You are here
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="w-full min-w-[80px]">
                      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isCurrent ? "bg-[var(--accent)]" : "bg-zinc-700"}`}
                          style={{
                            width: `${Math.max(tvlShare * 100, 1)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {formatCompactUsd(pool.tvlUsd)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {formatCompactUsd(pool.volume24h)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {pctCompact(pool.apr)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {numberOrDash(pool.binStep)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {feePct(pool.baseFeePct)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300">
                    {formatCompactUsd(pool.fees24h)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-400">
                    {formatAge(pool.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        {sortedPools.length} pool{sortedPools.length > 1 ? "s" : ""} for this
        pair
      </p>
    </div>
  );
}

// Compatibility wrapper — preserves old RelatedPoolsPanel props
export function RelatedPoolsPanel({
  pools,
  currentPoolAddress,
  pairName,
}: {
  pools: NonNullable<PoolReport["relatedPools"]>;
  currentPoolAddress?: string;
  pairName?: string;
}) {
  return (
    <RankedPoolsTable
      pools={pools}
      currentPoolAddress={currentPoolAddress}
      pairName={pairName}
    />
  );
}
