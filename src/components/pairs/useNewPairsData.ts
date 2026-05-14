"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DlmmPairInfo } from "@/lib/types";
import { formatAge } from "@/lib/format";
import {
  NewPairsResponse,
  AUTO_REFRESH_INTERVAL,
  MIN_COOLDOWN_MS,
  LS_AUTO_REFRESH,
  LS_LAST_FETCHED_AT,
  FilterState,
} from "./new-pairs-config";

export function useNewPairsData({
  page,
  pageSize,
  filters,
}: {
  page: number;
  pageSize: number;
  filters?: FilterState;
}) {
  const [pools, setPools] = useState<DlmmPairInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [newPoolIds, setNewPoolIds] = useState<Set<string>>(new Set());
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);
  const [liveAge, setLiveAge] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [tick, setTick] = useState(0);

  const lastFetchTimeRef = useRef<number>(0);
  const lastPageRef = useRef(1);

  // ─── Hydration-safe localStorage sync ───────────────────────────────────
  useEffect(() => {
    Promise.resolve()
      .then(() => {
        try {
          return localStorage.getItem(LS_AUTO_REFRESH) === "true";
        } catch {
          return false;
        }
      })
      .then((val) => {
        if (val) setAutoRefresh(true);
      });

    Promise.resolve()
      .then(() => {
        try {
          const savedAt = localStorage.getItem(LS_LAST_FETCHED_AT);
          if (!savedAt) return null;
          const lastFetch = parseInt(savedAt, 10);
          return isNaN(lastFetch) ? null : lastFetch;
        } catch {
          return null;
        }
      })
      .then((val) => {
        if (val !== null) setLastFetchedAt(val);
      });
  }, []);

  // ─── Persist autoRefresh ─────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(LS_AUTO_REFRESH, String(autoRefresh));
    } catch {
      // ignore
    }
  }, [autoRefresh]);

  // ─── Persist lastFetchedAt ────────────────────────────────────────────────
  useEffect(() => {
    if (lastFetchedAt) {
      try {
        localStorage.setItem(LS_LAST_FETCHED_AT, String(lastFetchedAt));
      } catch {
        // ignore
      }
    }
  }, [lastFetchedAt]);

  // ─── Fetch effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const pageChanged = page !== lastPageRef.current;
    lastPageRef.current = page;

    // Cooldown guard: skip if too soon (except initial mount or page change)
    if (
      !pageChanged &&
      Date.now() - lastFetchTimeRef.current < MIN_COOLDOWN_MS &&
      tick > 0
    ) {
      return;
    }

    const controller = new AbortController();
    lastFetchTimeRef.current = Date.now();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (filters?.minTvl != null) params.set("minTvl", String(filters.minTvl));
        if (filters?.minApr != null) params.set("minApr", String(filters.minApr));
        if (filters?.maxAgeHours != null) params.set("maxAgeHours", String(filters.maxAgeHours));
        if (filters?.freezeOffOnly) params.set("freezeOffOnly", "true");

        const res = await fetch(
          `/api/pools/new?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error?.message || `Failed to load pools (${res.status})`
          );
        }
        const data = (await res.json()) as NewPairsResponse;
        const now = Date.now();
        const oneHour = 3600000;
        const ids = new Set(
          data.pools
            .filter((p) => p.createdAt && now - p.createdAt < oneHour)
            .map((p) => p.poolAddress)
        );
        setPools(data.pools);
        setTotalPages(data.pages);
        setTotal(data.total);
        setNewPoolIds(ids);
        setLastFetchedAt(now);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Failed to load new pools"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [tick, page, pageSize, filters?.minTvl, filters?.minApr, filters?.maxAgeHours, filters?.freezeOffOnly]);

  // ─── Countdown timer ─────────────────────────────────────────────────────
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

  // ─── Page Visibility API ────────────────────────────────────────────────
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

  // ─── Last updated text ───────────────────────────────────────────────────
  useEffect(() => {
    const compute = () => {
      if (!lastFetchedAt) {
        setLastUpdatedText(null);
        return;
      }
      const diff = Date.now() - lastFetchedAt;
      setLastUpdatedText(
        diff < 60000 ? "Just now" : `${formatAge(lastFetchedAt)} ago`
      );
    };

    const initId = setTimeout(compute, 0);
    const intervalId = setInterval(compute, 5000);
    return () => {
      clearTimeout(initId);
      clearInterval(intervalId);
    };
  }, [lastFetchedAt]);

  // ─── Live age ────────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      if (!lastFetchedAt) {
        setLiveAge("");
        return;
      }
      const seconds = Math.floor((Date.now() - lastFetchedAt) / 1000);
      if (seconds < 60) {
        setLiveAge(`${seconds}s ago`);
      } else if (seconds < 3600) {
        setLiveAge(`${Math.floor(seconds / 60)}m ago`);
      } else {
        setLiveAge(`${Math.floor(seconds / 3600)}h ago`);
      }
    };

    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [lastFetchedAt]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const triggerRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_COOLDOWN_MS) return;
    setTick((t) => t + 1);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  return {
    pools,
    loading,
    error,
    totalPages,
    total,
    newPoolIds,
    lastFetchedAt,
    lastUpdatedText,
    liveAge,
    autoRefresh,
    countdown,
    triggerRefresh,
    toggleAutoRefresh,
  };
}
