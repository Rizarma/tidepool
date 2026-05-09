"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const AUTO_REFRESH_INTERVAL = 60; // seconds
const MIN_COOLDOWN_MS = 15000; // minimum ms between requests

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
  const [tick, setTick] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  const lastFetchTimeRef = useRef<number>(0);
  const cancelledRef = useRef(false);
  const countdownRef = useRef(0);

  // ─── Fetch effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Cooldown guard: skip if too soon (except initial mount tick === 0)
    if (Date.now() - lastFetchTimeRef.current < MIN_COOLDOWN_MS && tick > 0) {
      return;
    }

    cancelledRef.current = false;
    lastFetchTimeRef.current = Date.now();

    // Defer loading state to microtask to satisfy linter while keeping UX
    Promise.resolve().then(() => {
      if (!cancelledRef.current) {
        setLoading(true);
        setError(null);
      }
    });

    fetch("/api/pools/new")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error?.message || `Failed to load pools (${res.status})`,
          );
        }
        return res.json() as Promise<NewPairsResponse>;
      })
      .then((data) => {
        if (cancelledRef.current) return;
        const now = Date.now();
        const oneHour = 3600000;
        const ids = new Set(
          data.pools
            .filter((p) => p.createdAt && now - p.createdAt < oneHour)
            .map((p) => p.poolAddress),
        );
        setPools(data.pools);
        setNewPoolIds(ids);
        setLastFetchedAt(now);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelledRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load new pools",
        );
        setLoading(false);
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [tick]);

  // ─── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      countdownRef.current--;
      if (countdownRef.current <= 0) {
        if (Date.now() - lastFetchTimeRef.current >= MIN_COOLDOWN_MS) {
          setTick((t) => t + 1);
        }
        countdownRef.current = AUTO_REFRESH_INTERVAL;
      }
      setCountdown(countdownRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // ─── Page Visibility API ───────────────────────────────────────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== "visible" || !lastFetchedAt) return;
      const staleMs = 60000;
      if (Date.now() - lastFetchedAt <= staleMs) return;
      if (Date.now() - lastFetchTimeRef.current < MIN_COOLDOWN_MS) return;
      setTick((t) => t + 1);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [lastFetchedAt]);

  // ─── Last updated text (computed in effect, not render) ───────────────────
  useEffect(() => {
    const ts = lastFetchedAt;
    if (!ts) {
      const id = setTimeout(() => setLastUpdatedText(null), 0);
      return () => clearTimeout(id);
    }

    function update() {
      const diff = Date.now() - ts!;
      const text = diff < 60000 ? "Just now" : `${formatAge(ts!)} ago`;
      setLastUpdatedText(text);
    }

    const immediate = setTimeout(update, 0);
    const id = setInterval(update, 5000);
    return () => {
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, [lastFetchedAt]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );

  function triggerRefresh() {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_COOLDOWN_MS) return;
    setTick((t) => t + 1);
  }

  function toggleAutoRefresh() {
    setAutoRefresh((prev) => {
      const next = !prev;
      if (next) {
        countdownRef.current = AUTO_REFRESH_INTERVAL;
        setCountdown(AUTO_REFRESH_INTERVAL);
      } else {
        countdownRef.current = 0;
        setCountdown(0);
      }
      return next;
    });
  }

  // ─── Derived data ─────────────────────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────────────────────

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
          {/* Auto toggle */}
          <button
            type="button"
            onClick={toggleAutoRefresh}
            className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-300"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
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
            className="rounded px-2 py-1 text-[10px] font-medium text-zinc-500 transition hover:text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto panel-scroll">
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
