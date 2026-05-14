"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TablePagination } from "./TablePagination";
import {
  SortDir,
  Timeframe,
  ColumnKey,
  ALL_COLUMN_KEYS,
  TIMEFRAMES,
  sortableColumns,
  LS_TIMEFRAME,
  LS_VISIBLE_COLUMNS,
  LS_TABLE_DENSITY,
} from "./new-pairs-config";
import { useNewPairsData } from "./useNewPairsData";
import { useNewPairsSorting } from "./useNewPairsSorting";
import { NewPairRow } from "./NewPairRow";

// ─── SortHeader ────────────────────────────────────────────────────────────
function SortHeader({
  label,
  active,
  dir,
  align,
  onClick,
  padClass = "px-3 py-2",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  align: "left" | "right";
  onClick: () => void;
  padClass?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : undefined
      }
      className={`px-0 py-0 text-[10px] font-semibold uppercase tracking-wider ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${padClass} cursor-pointer select-none transition hover:text-zinc-300 ${active ? "text-zinc-300" : "text-zinc-500"} ${align === "right" ? "w-full justify-end" : "w-full"}`}
      >
        {label}
        {active && (
          <svg
            viewBox="0 0 12 12"
            className="size-3 text-[var(--accent)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {dir === "asc" ? (
              <path d="M3 8.5L6 4.5L9 8.5" />
            ) : (
              <path d="M3 4.5L6 8.5L9 4.5" />
            )}
          </svg>
        )}
      </button>
    </th>
  );
}

// ─── SkeletonRow ───────────────────────────────────────────────────────────
function SkeletonRow({
  visibleColumns,
  density,
}: {
  visibleColumns: Set<ColumnKey>;
  density: "compact" | "comfortable";
}) {
  const pad = density === "compact" ? "px-3 py-2.5" : "px-4 py-3.5";
  return (
    <tr className="border-b border-[var(--panel-border)]">
      {visibleColumns.has("pair") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-28" />
          <div className="h-2 bg-zinc-800 rounded animate-pulse w-20 mt-1.5" />
        </td>
      )}
      {visibleColumns.has("priceTokenYPerTokenX") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("tvlUsd") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("volume24h") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("fees24h") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("apr") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("binStep") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("baseFeePct") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("marketCap") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("holders") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("createdAt") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("freeze") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
      {visibleColumns.has("launchpad") && (
        <td className={pad}>
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      )}
    </tr>
  );
}

// ─── NewPairsTable ─────────────────────────────────────────────────────────
export function NewPairsTable({
  onSelectPool,
}: {
  onSelectPool: (poolAddress: string) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL params
  const page = useMemo(() => {
    const p = parseInt(searchParams.get("page") ?? "1", 10);
    return isNaN(p) || p < 1 ? 1 : p;
  }, [searchParams]);

  const pageSize = useMemo(() => {
    const size = parseInt(searchParams.get("pageSize") ?? "20", 10);
    return [10, 20, 50, 100].includes(size) ? size : 20;
  }, [searchParams]);

  // Data fetching
  const {
    pools,
    loading,
    error,
    totalPages,
    total,
    newPoolIds,
    lastUpdatedText,
    autoRefresh,
    countdown,
    triggerRefresh,
    toggleAutoRefresh,
  } = useNewPairsData({ page, pageSize });

  // Component state
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    if (typeof window === "undefined") return new Set(ALL_COLUMN_KEYS);
    try {
      const saved = localStorage.getItem(LS_VISIBLE_COLUMNS);
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnKey[];
        return new Set(parsed.filter((k) => ALL_COLUMN_KEYS.includes(k)));
      }
    } catch {
      // ignore
    }
    return new Set(ALL_COLUMN_KEYS);
  });
  const [density, setDensity] = useState<"compact" | "comfortable">(() => {
    if (typeof window === "undefined") return "compact";
    try {
      const saved = localStorage.getItem(LS_TABLE_DENSITY);
      if (saved === "comfortable") return "comfortable";
    } catch {
      // ignore
    }
    return "compact";
  });
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Refs
  const columnsDropdownRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLDivElement>(null);

  // Sorting
  const { sortKey, sortDir, sortedPools, handleSort } = useNewPairsSorting({
    pools,
    timeframe,
  });

  // Max TVL for micro-bars
  const maxTvl = useMemo(() => {
    return Math.max(...pools.map((p) => p.tvlUsd ?? 0), 1);
  }, [pools]);

  // ─── Effects ─────────────────────────────────────────────────────────────

  // Hydration-safe timeframe sync
  useEffect(() => {
    Promise.resolve()
      .then(() => {
        try {
          return localStorage.getItem(LS_TIMEFRAME);
        } catch {
          return null;
        }
      })
      .then((val) => {
        if (val && TIMEFRAMES.includes(val as Timeframe))
          setTimeframe(val as Timeframe);
      });
  }, []);

  // Persist component state
  useEffect(() => {
    try {
      localStorage.setItem(LS_TIMEFRAME, timeframe);
    } catch {
      // ignore
    }
  }, [timeframe]);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_VISIBLE_COLUMNS,
        JSON.stringify([...visibleColumns]),
      );
    } catch {
      // ignore
    }
  }, [visibleColumns]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_TABLE_DENSITY, density);
    } catch {
      // ignore
    }
  }, [density]);

  // Page clamp
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(totalPages));
      router.replace(`?${params.toString()}`);
    }
  }, [totalPages, page, searchParams, router]);

  // Scroll to top on page change
  useEffect(() => {
    tableBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // Columns dropdown click-outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        columnsDropdownRef.current &&
        !columnsDropdownRef.current.contains(e.target as Node)
      ) {
        setColumnsOpen(false);
      }
    }
    if (columnsOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [columnsOpen]);

  // Track horizontal scroll for sticky column shadow
  useEffect(() => {
    const el = tableBodyRef.current;
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollLeft > 0);
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleTimeframeChange = (tf: Timeframe) => setTimeframe(tf);

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", String(newPage));
      router.replace(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", "1");
      params.set("pageSize", String(newSize));
      router.replace(`?${params.toString()}`);
    },
    [searchParams, router],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

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

        <div className="flex items-center gap-2">
          {/* Density toggle */}
          <div className="flex items-center rounded overflow-hidden border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setDensity("compact")}
              className={`px-1.5 py-0.5 text-[10px] font-medium transition ${
                density === "compact"
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300"
              }`}
              aria-pressed={density === "compact"}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setDensity("comfortable")}
              className={`px-1.5 py-0.5 text-[10px] font-medium transition ${
                density === "comfortable"
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300"
              }`}
              aria-pressed={density === "comfortable"}
            >
              Comfortable
            </button>
          </div>

          {/* Columns toggle */}
          <div className="relative" ref={columnsDropdownRef}>
            <button
              type="button"
              onClick={() => setColumnsOpen((prev) => !prev)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition border border-white/[0.06] ${
                columnsOpen
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]"
                  : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300"
              }`}
              aria-expanded={columnsOpen}
            >
              Columns
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M5 7.5L10 12.5L15 7.5" />
              </svg>
            </button>
            {columnsOpen && (
              <div className="absolute right-0 mt-1 w-44 rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-xl py-1 z-30 max-h-64 overflow-y-auto">
                {ALL_COLUMN_KEYS.map((key) => {
                  const label =
                    key === "pair"
                      ? "Pair"
                      : key === "freeze"
                        ? "Freeze"
                        : key === "launchpad"
                          ? "LP"
                          : sortableColumns.find((c) => c.key === key)
                              ?.label ?? key;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 cursor-pointer hover:bg-white/[0.04]"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(key)}
                        onChange={() => {
                          const next = new Set(visibleColumns);
                          if (next.has(key)) {
                            if (next.size > 1) next.delete(key);
                          } else {
                            next.add(key);
                          }
                          setVisibleColumns(next);
                        }}
                        className="accent-[var(--accent)]"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeframe toggle */}
          <div className="flex items-center rounded overflow-hidden border border-white/[0.06]">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframeChange(tf)}
                className={`px-1.5 py-0.5 text-[10px] font-medium transition ${
                  timeframe === tf
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300"
                }`}
                aria-pressed={timeframe === tf}
                aria-label={`${tf} timeframe`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Auto toggle */}
          <button
            type="button"
            onClick={toggleAutoRefresh}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition border border-white/[0.06] ${
              autoRefresh
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
            aria-pressed={autoRefresh}
            aria-label={
              autoRefresh ? "Disable auto refresh" : "Enable auto refresh"
            }
          >
            {autoRefresh && (
              <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span>Auto</span>
            {autoRefresh && countdown > 0 && (
              <span className="tabular-nums">{countdown}s</span>
            )}
          </button>

          {/* Last updated (when auto is off) */}
          {!autoRefresh && lastUpdatedText && (
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {lastUpdatedText}
            </span>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={triggerRefresh}
            disabled={loading}
            className={`rounded px-2 py-1 text-[10px] font-medium transition border border-white/[0.06] ${loading ? "bg-white/[0.03] text-zinc-500 opacity-50 cursor-not-allowed" : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-300"}`}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div ref={tableBodyRef} className="flex-1 overflow-auto panel-scroll">
        {error ? (
          <div className="h-full grid place-items-center p-6">
            <div className="text-center max-w-sm">
              <p className="text-xs text-red-300 mb-3">{error}</p>
              <button
                type="button"
                onClick={triggerRefresh}
                className="rounded bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--background)] transition hover:bg-[var(--accent-dim)]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[1400px] text-left">
            <thead className="sticky top-0 bg-[var(--panel-bg)] z-10">
              <tr className="border-b border-[var(--panel-border)]">
                {visibleColumns.has("pair") && (
                  <th
                    scope="col"
                    className={`sticky left-0 z-20 bg-[var(--panel-bg)] ${isScrolled ? "shadow-[4px_0_12px_rgba(0,0,0,0.4)]" : ""} text-[10px] font-semibold uppercase tracking-wider text-zinc-500 ${density === "compact" ? "px-3 py-2" : "px-4 py-3"}`}
                  >
                    Pair
                  </th>
                )}
                {sortableColumns
                  .filter((col) => visibleColumns.has(col.key))
                  .map((col) => {
                    const label =
                      col.key === "volume24h"
                        ? `${timeframe} Vol`
                        : col.key === "fees24h"
                          ? `${timeframe} Fees`
                          : col.label;
                    return (
                      <SortHeader
                        key={col.key}
                        label={label}
                        active={sortKey === col.key}
                        dir={sortDir}
                        align={col.align}
                        onClick={() => handleSort(col.key)}
                        padClass={
                          density === "compact" ? "px-3 py-2" : "px-4 py-3"
                        }
                      />
                    );
                  })}
                {visibleColumns.has("freeze") && (
                  <th
                    scope="col"
                    className={`text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-center ${density === "compact" ? "px-3 py-2" : "px-4 py-3"}`}
                  >
                    Freeze
                  </th>
                )}
                {visibleColumns.has("launchpad") && (
                  <th
                    scope="col"
                    className={`text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-center ${density === "compact" ? "px-3 py-2" : "px-4 py-3"}`}
                  >
                    LP
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow
                    key={i}
                    visibleColumns={visibleColumns}
                    density={density}
                  />
                ))
              ) : sortedPools.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.size}
                    className="px-3 py-8 text-center text-xs text-zinc-500"
                  >
                    No new pools found
                  </td>
                </tr>
              ) : (
                sortedPools.map((pool) => (
                  <NewPairRow
                    key={pool.poolAddress}
                    pool={pool}
                    visibleColumns={visibleColumns}
                    density={density}
                    timeframe={timeframe}
                    newPoolIds={newPoolIds}
                    maxTvl={maxTvl}
                    onSelectPool={onSelectPool}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        loading={loading}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
