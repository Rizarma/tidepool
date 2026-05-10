/**
 * Indicators panel — fetches from /api/indicators and renders cards.
 *
 * Self-contained: reads config from context, fetches data, handles loading/error states.
 */

"use client";

import { useEffect, useState } from "react";
import { useIndicatorConfig } from "./IndicatorConfigContext";
import { serializeConfig } from "@/lib/indicator-config";
import { formatTokenPrice } from "@/lib/format";
import type { IndicatorValue, PoolIndicators, SourceStatus } from "@/lib/types";

interface IndicatorApiResponse {
  indicators: PoolIndicators;
  sources?: SourceStatus[];
}

function indicatorLabel(indicator: IndicatorValue): string {
  if (indicator.type === "supertrend") {
    return `ST(${indicator.period}${indicator.multiplier ? `,${indicator.multiplier}` : ""})`;
  }
  return `SMA(${indicator.period})`;
}

function IndicatorCard({
  label,
  indicator,
  currentPrice,
  symbolY,
}: {
  label: string;
  indicator: IndicatorValue;
  currentPrice?: number;
  symbolY: string;
}) {
  const { type, value, period, dataQuality, availableDataPoints, trend, isApproximate } = indicator;
  const isAbove = value != null && currentPrice != null && currentPrice > value;
  const isBelow = value != null && currentPrice != null && currentPrice < value;
  const hasValue = value != null && !Number.isNaN(value);

  // Colour logic: SMA uses price-vs-indicator; Supertrend uses its own trend direction.
  const priceColor =
    type === "supertrend"
      ? trend === "up"
        ? "text-emerald-300"
        : trend === "down"
          ? "text-red-300"
          : "text-zinc-100"
      : isAbove
        ? "text-emerald-300"
        : isBelow
          ? "text-red-300"
          : "text-zinc-100";

  return (
    <div className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      {hasValue ? (
        <p className={`mt-0.5 text-sm font-semibold tabular-nums truncate ${priceColor}`}>
          {formatTokenPrice(value)}{" "}
          <span className="text-zinc-500 text-[10px]">{symbolY}</span>
        </p>
      ) : (
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-500">
          —
        </p>
      )}
      {type === "supertrend" && trend && (
        <p
          className={`text-[10px] mt-0.5 ${
            trend === "up" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {trend === "up" ? "▲ Uptrend" : "▼ Downtrend"}
        </p>
      )}
      {type === "sma" && hasValue && (isAbove || isBelow) && (
        <p
          className={`text-[10px] mt-0.5 ${
            isAbove ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isAbove ? "▲ Above current price" : "▼ Below current price"}
        </p>
      )}
      {isApproximate && (
        <p className="text-[10px] mt-0.5 text-amber-400">Approximated (no OHLC)</p>
      )}
      {!hasValue && dataQuality && (
        <p className="text-[10px] mt-0.5 text-zinc-500">
          {dataQuality === "insufficient"
            ? "No data available"
            : `Need ${period} candles, have ${availableDataPoints ?? "?"}`}
        </p>
      )}
    </div>
  );
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

  useEffect(() => {
    if (!poolAddress || !isReady) return;
    if (config.timeframes.length === 0) return;
    if (!hasEnabledIndicators) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = serializeConfig(config);
        const res = await fetch(`/api/indicators?pool=${poolAddress}&${qs}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const body: IndicatorApiResponse = await res.json();
        if (!cancelled) setData(body.indicators);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [poolAddress, config, isReady, hasEnabledIndicators]);

  if (!poolAddress || config.timeframes.length === 0 || !hasEnabledIndicators) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
          Indicators
        </p>
        {loading && (
          <span className="text-[10px] text-zinc-500 animate-pulse">Loading…</span>
        )}
        {error && !loading && (
          <span className="text-[10px] text-red-400">{error}</span>
        )}
      </div>

      {data?.timeframes && data.timeframes.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {data.timeframes.flatMap((tf) =>
            tf.values.map((indicator) => (
              <IndicatorCard
                key={`${tf.timeframe}-${indicator.type}`}
                label={`${tf.timeframe} ${indicatorLabel(indicator)}`}
                indicator={indicator}
                currentPrice={currentPrice}
                symbolY={symbolY}
              />
            )),
          )}
        </div>
      ) : !loading ? (
        <p className="text-[10px] text-zinc-500">No indicator data available.</p>
      ) : null}
    </div>
  );
}
