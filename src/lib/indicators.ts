/**
 * Technical indicator calculations.
 *
 * Pure functions that operate on arrays of numbers (pool-price closes).
 */

import type { PriceHistoryResult } from "@/lib/providers-ohlcv";
import type { IndicatorType, IndicatorValue, IndicatorTimeframe, PoolIndicators } from "@/lib/types";
import { getIndicator } from "@/lib/indicators/registry";

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { sma } from "@/lib/indicators/math";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PoolRatiosResult {
  ratios: number[];
  skipped: number;
}

// ─── Pool Ratio ──────────────────────────────────────────────────────────────

/**
 * Compute the pool price (tokenY per tokenX) from two USD price histories.
 *
 * For each timestamp that exists in both histories, ratio = tokenX_USD / tokenY_USD.
 *
 * Example:
 *   tokenX = $0.50 USD, tokenY (SOL) = $150 USD
 *   pool price (Y per X) = 0.50 / 150 = 0.00333 SOL per tokenX
 */
export function computePoolRatios(
  xHistory: PriceHistoryResult,
  yHistory: PriceHistoryResult,
): PoolRatiosResult {
  const yMap = new Map<number, number>();
  for (const point of yHistory.items) {
    yMap.set(point.unixTime, point.value);
  }

  const ratios: number[] = [];
  let skipped = 0;
  for (const xPoint of xHistory.items) {
    const yPrice = yMap.get(xPoint.unixTime);
    if (yPrice && yPrice > 0 && xPoint.value > 0) {
      ratios.push(xPoint.value / yPrice);
    } else {
      skipped++;
    }
  }

  return { ratios, skipped };
}

// ─── Orchestration ───────────────────────────────────────────────────────────

export interface BuildConfig {
  timeframes: string[];
  indicators: Array<{ type: IndicatorType; period: number }>;
}

/**
 * Build PoolIndicators from pre-computed pool price histories.
 *
 * Each history item's `value` is already the pool price (tokenY per tokenX),
 * so no ratio computation is needed. Used by Meteora OHLCV and by the
 * legacy Birdeye path after ratios are computed.
 */
export function buildPoolIndicatorsDirect(
  histories: PriceHistoryResult[],
  config: BuildConfig,
): PoolIndicators {
  const timeframes: IndicatorTimeframe[] = [];

  for (let i = 0; i < config.timeframes.length; i++) {
    const history = histories[i];
    if (!history || !Array.isArray(history.items)) {
      timeframes.push({
        timeframe: config.timeframes[i],
        values: config.indicators.map((indConfig) => ({
          type: indConfig.type,
          period: indConfig.period,
          dataQuality: "insufficient" as const,
        })),
      });
      continue;
    }
    const values: number[] = history.items.map((p) => p.value);
    const indicatorValues: IndicatorValue[] = [];

    for (const indConfig of config.indicators) {
      const definition = getIndicator(indConfig.type);
      const value =
        values.length >= definition.minDataPoints
          ? definition.compute(values, { period: indConfig.period })
          : null;

      indicatorValues.push({
        type: indConfig.type,
        value: value ?? undefined,
        period: indConfig.period,
        dataQuality:
          values.length >= indConfig.period
            ? "full"
            : values.length > 0
              ? "partial"
              : "insufficient",
      });
    }

    timeframes.push({
      timeframe: config.timeframes[i],
      values: indicatorValues,
    });
  }

  return { timeframes };
}

/**
 * Build PoolIndicators from paired token histories (legacy Birdeye path).
 *
 * `xHistories` and `yHistories` must be in the same order as `config.timeframes`.
 * For each timeframe, computes pool ratios and evaluates every indicator in config
 * using the registry. Delegates to `buildPoolIndicatorsDirect` after ratio computation.
 */
export function buildPoolIndicators(
  xHistories: PriceHistoryResult[],
  yHistories: PriceHistoryResult[],
  config: BuildConfig,
): PoolIndicators {
  const histories: PriceHistoryResult[] = [];

  for (let i = 0; i < config.timeframes.length; i++) {
    const yMap = new Map<number, number>();
    for (const p of yHistories[i].items) {
      yMap.set(p.unixTime, p.value);
    }
    const items: { unixTime: number; value: number }[] = [];
    for (const x of xHistories[i].items) {
      const yPrice = yMap.get(x.unixTime);
      if (yPrice && yPrice > 0 && x.value > 0) {
        items.push({ unixTime: x.unixTime, value: x.value / yPrice });
      }
    }
    histories.push({ items });
  }

  return buildPoolIndicatorsDirect(histories, config);
}
