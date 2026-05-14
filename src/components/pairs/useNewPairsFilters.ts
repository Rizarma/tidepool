"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import type { DlmmPairInfo } from "@/lib/types";
import { FilterState, DEFAULT_FILTERS, LS_FILTERS } from "./new-pairs-config";
import { getPrimaryToken } from "./pair-utils";

export function useNewPairsFilters(pools: DlmmPairInfo[]) {
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window === "undefined") return DEFAULT_FILTERS;
    try {
      const saved = localStorage.getItem(LS_FILTERS);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FilterState>;
        return {
          ...DEFAULT_FILTERS,
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_FILTERS;
  });

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(LS_FILTERS, JSON.stringify(filters));
    } catch {
      // ignore
    }
  }, [filters]);

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const filteredPools = useMemo(() => {
    return pools.filter((pool) => {
      if (filters.minTvl != null && (pool.tvlUsd ?? 0) < filters.minTvl)
        return false;
      if (filters.minApr != null && (pool.apr ?? 0) < filters.minApr)
        return false;
      if (filters.maxAgeHours != null && pool.createdAt) {
        const ageHours = (now - pool.createdAt) / 3600;
        if (ageHours > filters.maxAgeHours) return false;
      }
      if (filters.freezeOffOnly) {
        const primaryToken = getPrimaryToken(pool);
        if (primaryToken.freezeAuthorityDisabled !== true) return false;
      }
      return true;
    });
  }, [pools, filters, now]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minTvl != null) count++;
    if (filters.minApr != null) count++;
    if (filters.maxAgeHours != null) count++;
    if (filters.freezeOffOnly) count++;
    return count;
  }, [filters]);

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return {
    filters,
    setFilters,
    filteredPools,
    activeFilterCount,
    clearFilters,
  };
}
