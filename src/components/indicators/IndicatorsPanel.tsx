/**
 * Indicators panel — fetches from /api/indicators and renders a matrix table.
 *
 * Self-contained: reads config from context, fetches data, handles loading/error states.
 * Uses a dense matrix layout (rows = indicators, columns = timeframes) for
 * terminal-style scannability.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useIndicatorConfig } from "./IndicatorConfigContext";
import { serializeConfig } from "@/lib/indicator-config";
import { buildIndicatorMatrixView } from "./indicator-view-model";
import { IndicatorMatrix } from "./IndicatorMatrix";
import type { PoolIndicators, SourceStatus } from "@/lib/types";

interface IndicatorApiResponse {
  indicators: PoolIndicators;
  sources?: SourceStatus[];
}

export function IndicatorsPanel({
  poolAddress,
  currentPrice,
  symbolY,
}: {
  poolAddress?: string;
  currentPrice?: number;
  symbolY: string;
}) {
  const { config, isReady } = useIndicatorConfig();
  const [data, setData] = useState<PoolIndicators | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEnabledIndicators = config.indicators.some(
    (i) => i.enabled !== false,
  );

  // Compute matrix view model on the client — stable identity keys,
  // deviation percentages, signal/tone/quality classification.
  const matrixView = useMemo(() => {
    if (!data) return null;
    return buildIndicatorMatrixView(data, currentPrice);
  }, [data, currentPrice]);

  useEffect(() => {
    if (!poolAddress || !isReady) return;
    if (config.timeframes.length === 0) return;
    if (!hasEnabledIndicators) return;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = serializeConfig(config);
        const res = await fetch(
          `/api/indicators?pool=${poolAddress}&${qs}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const body: IndicatorApiResponse = await res.json();
        if (!cancelled) setData(body.indicators);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [poolAddress, config, isReady, hasEnabledIndicators]);

  if (!poolAddress || config.timeframes.length === 0 || !hasEnabledIndicators) {
    return null;
  }

  return (
    <div>
      {(loading || error) && (
        <div className="flex justify-end mb-2">
          {loading && (
            <span className="text-xs text-zinc-400 animate-pulse">
              Loading…
            </span>
          )}
          {error && !loading && (
            <span className="text-xs text-red-400">{error}</span>
          )}
        </div>
      )}

      {matrixView && matrixView.rows.length > 0 ? (
        <IndicatorMatrix view={matrixView} symbolY={symbolY} />
      ) : !loading ? (
        <p className="text-xs text-zinc-400">No indicator data available.</p>
      ) : null}
    </div>
  );
}
