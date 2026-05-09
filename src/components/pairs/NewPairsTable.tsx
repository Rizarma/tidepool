"use client";

import { useEffect, useMemo, useState } from "react";
import type { DlmmPairInfo } from "@/lib/types";
import {
  formatCompactUsd,
  formatTokenPrice,
  formatAge,
  pctValue,
} from "@/lib/format";

interface NewPairsResponse {
  pools: DlmmPairInfo[];
  total: number;
  pages: number;
  source?: unknown;
  fetchedAt?: string;
}

type SortKey =
  | "createdAt"
  | "priceTokenYPerTokenX"
  | "tvlUsd"
  | "volume24h"
  | "fees24h"
  | "apr";
type SortDir = "asc" | "desc";

function VerificationDot() {
  return (
    <span
      className="inline-block size-1.5 rounded-full bg-emerald-400 shrink-0"
      title="Verified"
    />
  );
}

function NewBadge() {
  return (
    <span className="inline-flex items-center rounded bg-[var(--accent)]/15 px-1 py-0 text-[9px] font-bold uppercase tracking-wider text-[var(--accent)]">
      New
    </span>
  );
}

function SortHeader({
  label,
  active,
  dir,
  align,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  align: "left" | "right";
  onClick: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none transition hover:text-zinc-300 ${active ? "text-zinc-300" : "text-zinc-500"} ${align === "right" ? "text-right" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <span className="text-[8px] text-[var(--accent)]">
            {dir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </span>
    </th>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--panel-border)]">
      <td className="px-3 py-2.5">
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-28" />
        <div className="h-2 bg-zinc-800 rounded animate-pulse w-20 mt-1.5" />
      </td>
      <td className="px-3 py-2.5">
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-16 ml-auto" />
      </td>
      <td className="px-3 py-2.5">
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-14 ml-auto" />
      </td>
      <td className="px-3 py-2.5">
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-14 ml-auto" />
      </td>
      <td className="px-3 py-2.5">
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
      </td>
      <td className="px-3 py-2.5">
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-10 ml-auto" />
      </td>
      <td className="px-3 py-2.5">
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-8 ml-auto" />
      </td>
    </tr>
  );
}

export function NewPairsTable({
  onSelectPool,
}: {
  onSelectPool: (poolAddress: string) => void;
}) {
  const [pools, setPools] = useState<DlmmPairInfo[]>([]);
  const [newPoolIds, setNewPoolIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pools/new")
      .then(async (res) => {
        if (!cancelled) {
          setLoading(true);
          setError(null);
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error?.message || `Failed to load pools (${res.status})`,
          );
        }
        return res.json() as Promise<NewPairsResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          const now = Date.now();
          const oneHour = 3600000;
          const ids = new Set(
            data.pools
              .filter((p) => p.createdAt && now - p.createdAt < oneHour)
              .map((p) => p.poolAddress),
          );
          setPools(data.pools);
          setNewPoolIds(ids);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load new pools",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "desc");
    }
  }

  const sortedPools = useMemo(() => {
    if (sortKey === "createdAt") {
      return [...pools].sort((a, b) => {
        const aVal = a.createdAt ?? 0;
        const bVal = b.createdAt ?? 0;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    return [...pools].sort((a, b) => {
      const aVal = (a[sortKey] as number | undefined) ?? 0;
      const bVal = (b[sortKey] as number | undefined) ?? 0;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [pools, sortKey, sortDir]);

  const sortableColumns: {
    key: SortKey;
    label: string;
    align: "left" | "right";
  }[] = [
    { key: "priceTokenYPerTokenX", label: "Price", align: "right" },
    { key: "tvlUsd", label: "TVL", align: "right" },
    { key: "volume24h", label: "24h Vol", align: "right" },
    { key: "fees24h", label: "24h Fees", align: "right" },
    { key: "apr", label: "APR", align: "right" },
    { key: "createdAt", label: "Age", align: "right" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[var(--panel-border)]">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            New Pools
          </h2>
          {!loading && pools.length > 0 && (
            <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-500">
              {pools.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="rounded px-2 py-1 text-[10px] font-medium text-zinc-500 transition hover:text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto panel-scroll">
        {error ? (
          <div className="h-full grid place-items-center p-6">
            <div className="text-center max-w-sm">
              <p className="text-xs text-red-300 mb-3">{error}</p>
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="rounded bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--background)] transition hover:bg-[var(--accent-dim)]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[var(--panel-bg)] z-10">
              <tr className="border-b border-[var(--panel-border)]">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Pair
                </th>
                {sortableColumns.map((col) => (
                  <SortHeader
                    key={col.key}
                    label={col.label}
                    active={sortKey === col.key}
                    dir={sortDir}
                    align={col.align}
                    onClick={() => handleSort(col.key)}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))
              ) : sortedPools.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-xs text-zinc-500"
                  >
                    No new pools found
                  </td>
                </tr>
              ) : (
                sortedPools.map((pool) => (
                  <tr
                    key={pool.poolAddress}
                    onClick={() => onSelectPool(pool.poolAddress)}
                    className="border-b border-[var(--panel-border)] cursor-pointer transition hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-zinc-200">
                          {pool.tokenX.symbol ?? "?"}
                        </span>
                        {pool.tokenX.verified && <VerificationDot />}
                        <span className="text-zinc-500 text-xs">/</span>
                        <span className="text-xs font-medium text-zinc-200">
                          {pool.tokenY.symbol ?? "?"}
                        </span>
                        {pool.tokenY.verified && <VerificationDot />}
                        {newPoolIds.has(pool.poolAddress) && <NewBadge />}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[200px]">
                        {pool.name ??
                          `${pool.tokenX.symbol ?? "?"}/${pool.tokenY.symbol ?? "?"}`}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {formatTokenPrice(pool.priceTokenYPerTokenX)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {formatCompactUsd(pool.tvlUsd)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {formatCompactUsd(pool.volume24h)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {formatCompactUsd(pool.fees24h)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {pctValue(pool.apr)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-400">
                      {formatAge(pool.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
