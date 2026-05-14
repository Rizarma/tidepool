"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { FilterState, DEFAULT_FILTERS, LS_FILTERS } from "./new-pairs-config";

export function useNewPairsFilters() {
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
    activeFilterCount,
    clearFilters,
  };
}
