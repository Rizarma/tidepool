"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DlmmPairInfo } from "@/lib/types";
import type { SortKey, SortDir, Timeframe } from "./new-pairs-config";
import { LS_SORT_KEY, LS_SORT_DIR } from "./new-pairs-config";
import { getPrimaryToken } from "./pair-utils";

const VALID_SORT_KEYS: SortKey[] = [
  "createdAt",
  "priceTokenYPerTokenX",
  "tvlUsd",
  "volume24h",
  "fees24h",
  "apr",
  "binStep",
  "baseFeePct",
  "marketCap",
  "holders",
];

export function useNewPairsSorting({
  pools,
  timeframe,
}: {
  pools: DlmmPairInfo[];
  timeframe: Timeframe;
}) {
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "createdAt";
    try {
      const saved = localStorage.getItem(LS_SORT_KEY);
      if (saved && VALID_SORT_KEYS.includes(saved as SortKey)) return saved as SortKey;
    } catch {
      // ignore
    }
    return "createdAt";
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    if (typeof window === "undefined") return "desc";
    try {
      const saved = localStorage.getItem(LS_SORT_DIR);
      if (saved === "asc" || saved === "desc") return saved;
    } catch {
      // ignore
    }
    return "desc";
  });

  // Persist sort state
  useEffect(() => {
    try {
      localStorage.setItem(LS_SORT_KEY, sortKey);
    } catch {
      // ignore
    }
  }, [sortKey]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SORT_DIR, sortDir);
    } catch {
      // ignore
    }
  }, [sortDir]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

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
    if (sortKey === "priceTokenYPerTokenX") {
      return [...pools].sort((a, b) => {
        const aVal = getPrimaryToken(a).priceUsd ?? 0;
        const bVal = getPrimaryToken(b).priceUsd ?? 0;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    return [...pools].sort((a, b) => {
      let aVal: number;
      let bVal: number;
      if (sortKey === "volume24h") {
        aVal = a.volume?.[timeframe] ?? 0;
        bVal = b.volume?.[timeframe] ?? 0;
      } else if (sortKey === "fees24h") {
        aVal = a.fees?.[timeframe] ?? 0;
        bVal = b.fees?.[timeframe] ?? 0;
      } else {
        aVal = (a[sortKey] as number | undefined) ?? 0;
        bVal = (b[sortKey] as number | undefined) ?? 0;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [pools, sortKey, sortDir, timeframe]);

  return {
    sortKey,
    sortDir,
    sortedPools,
    handleSort,
  };
}
