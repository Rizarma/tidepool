/**
 * Technical indicator calculations.
 *
 * Pure functions that operate on arrays of numbers (pool-ratio closes).
 */

import type { BirdeyeHistoryResult } from "@/lib/providers-ohlcv";
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
  xHistory: BirdeyeHistoryResult,
  yHistory: BirdeyeHistoryResult,
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
 * Build PoolIndicators from paired Birdeye histories for tokenX and tokenY.
 *
 * `xHistories` and `yHistories` must be in the same order as `config.timeframes`.
 * For each timeframe, computes pool ratios and evaluates every indicator in config
 * using the registry.
 */
export function buildPoolIndicators(
  xHistories: BirdeyeHistoryResult[],
  yHistories: BirdeyeHistoryResult[],
  config: BuildConfig,
): PoolIndicators {
  const timeframes: IndicatorTimeframe[] = [];

  for (let i = 0; i < config.timeframes.length; i++) {
    const result = computePoolRatios(xHistories[i], yHistories[i]);
    const values: IndicatorValue[] = [];

    for (const indConfig of config.indicators) {
      const definition = getIndicator(indConfig.type);
      const value =
        result.ratios.length >= definition.minDataPoints
          ? definition.compute(result.ratios, { period: indConfig.period })
          : null;

      values.push({
        type: indConfig.type,
        value: value ?? undefined,
        period: indConfig.period,
        dataQuality:
          result.ratios.length >= indConfig.period
            ? "full"
            : result.ratios.length > 0
              ? "partial"
              : "insufficient",
      });
    }

    timeframes.push({
      timeframe: config.timeframes[i],
      values,
    });
  }

  return { timeframes };
}
