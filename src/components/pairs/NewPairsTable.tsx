"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DlmmPairInfo, PairToken } from "@/lib/types";
import {
  formatCompactUsd,
  formatCompactNumber,
  formatTokenPrice,
  formatAge,
  pctValue,
  shortenAddress,
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
  | "apr"
  | "binStep"
  | "baseFeePct"
  | "marketCap"
  | "holders";
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
  { key: "binStep", label: "Bin Step", align: "right" },
  { key: "baseFeePct", label: "Base Fee", align: "right" },
  { key: "marketCap", label: "MCap", align: "right" },
  { key: "holders", label: "Holders", align: "right" },
  { key: "createdAt", label: "Age", align: "right" },
];

const TOTAL_COLUMNS = 1 + sortableColumns.length + 2; // Pair + sortable + Freeze + Verif.

const SOL_MINT = "So11111111111111111111111111111111111111112";

function getPrimaryToken(pair: DlmmPairInfo): PairToken {
  if (pair.tokenX.mint === SOL_MINT) return pair.tokenY;
  if (pair.tokenY.mint === SOL_MINT) return pair.tokenX;
  return pair.tokenX;
}

function FreezeStatus({ token }: { token: PairToken }) {
  if (token.freezeAuthorityDisabled === true) {
    return <span className="text-emerald-400" aria-label="Freeze authority disabled">Off</span>;
  }
  if (token.freezeAuthorityDisabled === false) {
    return <span className="text-red-400" aria-label="Freeze authority enabled">On</span>;
  }
  return <span className="text-zinc-500" aria-label="Freeze authority unknown">–</span>;
}

function VerifiedStatus({ token }: { token: PairToken }) {
  return token.verified ? (
    <span className="inline-flex items-center justify-center size-4 rounded bg-emerald-500/10 text-emerald-400 text-[9px]" aria-label="Verified">✓</span>
  ) : (
    <span className="text-zinc-600" aria-label="Not verified">–</span>
  );
}

function CopyButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(address)
        .then(() => setCopied(true))
        .catch(() => {});
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    },
    [address],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded p-0.5 text-zinc-600 hover:text-zinc-300 transition"
      title={copied ? "Copied!" : "Copy address"}
    >
      {copied ? (
        <svg
          className="size-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          className="size-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function VerificationDot() {
  return (
    <span
      className="inline-block size-1.5 rounded-full bg-[var(--accent)] shrink-0"
      title="Verified"
      aria-label="Verified"
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
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
      className={`px-0 py-0 text-[10px] font-semibold uppercase tracking-wider ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 px-3 py-2 cursor-pointer select-none transition hover:text-zinc-300 ${active ? "text-zinc-300" : "text-zinc-500"} ${align === "right" ? "w-full justify-end" : "w-full"}`}
      >
        {label}
        {active && (
          <span className="text-[8px] text-[var(--accent)]">
            {dir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>
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
      {Array.from({ length: TOTAL_COLUMNS - 1 }).map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-12 ml-auto" />
        </td>
      ))}
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
  const [autoRefresh, setAutoRefresh] = useState(() => {
    try { return localStorage.getItem("tidepool_auto_refresh") === "true"; }
    catch { return false; }
  });
  const [countdown, setCountdown] = useState(() => {
    try {
      const savedAt = localStorage.getItem("tidepool_last_fetched_at");
      if (!savedAt) return 0;
      const lastFetch = parseInt(savedAt, 10);
      if (isNaN(lastFetch)) return 0;
      const elapsed = Date.now() - lastFetch;
      const intervalMs = AUTO_REFRESH_INTERVAL * 1000;
      if (elapsed >= 0 && elapsed < intervalMs) {
        return Math.max(1, Math.ceil((intervalMs - elapsed) / 1000));
      }
    } catch { /* ignore */ }
    return 0;
  });
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  const lastFetchTimeRef = useRef<number>(0);

  // ─── Persist auto-refresh preference ──────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem("tidepool_auto_refresh", String(autoRefresh));
    } catch {
      // ignore
    }
  }, [autoRefresh]);

  // ─── Persist last fetch timestamp ─────────────────────────────────────────
  useEffect(() => {
    if (lastFetchedAt) {
      try {
        localStorage.setItem("tidepool_last_fetched_at", String(lastFetchedAt));
      } catch {
        // ignore
      }
    }
  }, [lastFetchedAt]);

  // ─── Fetch effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Cooldown guard: skip if too soon (except initial mount tick === 0)
    if (Date.now() - lastFetchTimeRef.current < MIN_COOLDOWN_MS && tick > 0) {
      return;
    }

    const controller = new AbortController();
    lastFetchTimeRef.current = Date.now();
    setLoading(true);
    setError(null);

    fetch("/api/pools/new", { signal: controller.signal })
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
        if (err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Failed to load new pools",
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [tick]);

  // ─── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoRefresh) {
      const id = setTimeout(() => setCountdown(0), 0);
      return () => clearTimeout(id);
    }

    const initId = setTimeout(() => {
      setCountdown((prev) => (prev > 0 ? prev : AUTO_REFRESH_INTERVAL));
    }, 0);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (Date.now() - lastFetchTimeRef.current >= MIN_COOLDOWN_MS) {
            setTick((t) => t + 1);
          }
          return AUTO_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(initId);
      clearInterval(interval);
    };
  }, [autoRefresh]);

  // ─── Page Visibility API ───────────────────────────────────────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (!autoRefresh) return;
      if (document.visibilityState !== "visible" || !lastFetchedAt) return;
      const staleMs = 60000;
      if (Date.now() - lastFetchedAt <= staleMs) return;
      if (Date.now() - lastFetchTimeRef.current < MIN_COOLDOWN_MS) return;
      setTick((t) => t + 1);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [lastFetchedAt, autoRefresh]);

  // ─── Last updated text (computed in effect, not render) ───────────────────
  useEffect(() => {
    const ts = lastFetchedAt;
    if (!ts) {
      return;
    }

    function update() {
      const diff = Date.now() - ts!;
      const text = diff < 60000 ? "Just now" : `${formatAge(ts!)} ago`;
      setLastUpdatedText(text);
    }

    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
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

  const triggerRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_COOLDOWN_MS) return;
    setTick((t) => t + 1);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const sortedPools = useMemo(() => {
    if (sortKey === "createdAt") {
      return [...pools].sort((a, b) => {
        const aVal = a.createdAt ?? 0;
        const bVal = b.createdAt ?? 0;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    if (sortKey === "marketCap") {
      return [...pools].sort((a, b) => {
        const aVal = getPrimaryToken(a).marketCap ?? 0;
        const bVal = getPrimaryToken(b).marketCap ?? 0;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    if (sortKey === "holders") {
      return [...pools].sort((a, b) => {
        const aVal = getPrimaryToken(a).holders ?? 0;
        const bVal = getPrimaryToken(b).holders ?? 0;
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
          <table className="w-full min-w-[1400px] text-left">
            <thead className="sticky top-0 bg-[var(--panel-bg)] z-10">
              <tr className="border-b border-[var(--panel-border)]">
                <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
                <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-center">
                  Freeze
                </th>
                <th scope="col" className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-center">
                  Verif.
                </th>
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
                    colSpan={TOTAL_COLUMNS}
                    className="px-3 py-8 text-center text-xs text-zinc-500"
                  >
                    No new pools found
                  </td>
                </tr>
              ) : (
                sortedPools.map((pool) => (
                  <tr
                    key={pool.poolAddress}
                    tabIndex={0}
                    role="button"
                    onClick={() => onSelectPool(pool.poolAddress)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectPool(pool.poolAddress);
                      }
                    }}
                    className="border-b border-[var(--panel-border)] cursor-pointer transition hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
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
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                          {pool.name ||
                            `${pool.tokenX.symbol ?? "?"}/${pool.tokenY.symbol ?? "?"}`}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
                          {shortenAddress(pool.poolAddress)}
                        </span>
                        <CopyButton address={pool.poolAddress} />
                        <span className="mx-1 text-zinc-700">|</span>
                        <a
                          href={`https://gmgn.ai/sol/token/${getPrimaryToken(pool).mint}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] text-zinc-600 hover:text-[var(--accent)] transition"
                          title="View on GMGN"
                          aria-label="View on GMGN"
                        >
                          GMGN
                        </a>
                        <a
                          href={`https://www.dextools.io/app/en/solana/pair-explorer/${pool.poolAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] text-zinc-600 hover:text-[var(--accent)] transition"
                          title="View on DexTools"
                          aria-label="View on DexTools"
                        >
                          Dex
                        </a>
                        <a
                          href={`https://app.meteora.ag/dlmm/${pool.poolAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[9px] text-zinc-600 hover:text-[var(--accent)] transition"
                          title="View on Meteora"
                          aria-label="View on Meteora"
                        >
                          Met
                        </a>
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
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {pool.binStep ?? "–"}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {pctValue(pool.baseFeePct)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {formatCompactUsd(getPrimaryToken(pool).marketCap)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-300">
                      {formatCompactNumber(getPrimaryToken(pool).holders)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium tabular-nums text-zinc-400">
                      {formatAge(pool.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <FreezeStatus token={getPrimaryToken(pool)} />
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <VerifiedStatus token={getPrimaryToken(pool)} />
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
