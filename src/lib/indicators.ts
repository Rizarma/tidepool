/**
 * Technical indicator calculations.
 *
 * Pure functions that operate on arrays of numbers (pool-ratio closes).
 */

import type { BirdeyeHistoryResult } from "@/lib/providers-ohlcv";
import type { IndicatorTimeframe, PoolIndicators } from "@/lib/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PoolRatiosResult {
  ratios: number[];
  skipped: number;
}

// ─── Core Math ───────────────────────────────────────────────────────────────

/**
 * Simple Moving Average.
 * Returns null if the array has fewer than `period` elements.
 */
export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
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

const TIMEFRAMES: Array<"1m" | "5m" | "15m"> = ["1m", "5m", "15m"];
const SMA_PERIOD = 20;

/**
 * Build PoolIndicators from paired Birdeye histories for tokenX and tokenY.
 *
 * `xHistories` and `yHistories` must each contain exactly 3 results in the
 * same order as TIMEFRAMES (1m, 5m, 15m).
 */
export function buildPoolIndicators(
  xHistories: BirdeyeHistoryResult[],
  yHistories: BirdeyeHistoryResult[],
): PoolIndicators {
  const timeframes: IndicatorTimeframe[] = [];

  for (let i = 0; i < TIMEFRAMES.length; i++) {
    const result = computePoolRatios(xHistories[i], yHistories[i]);
    const sma20 = sma(result.ratios, SMA_PERIOD);
    const dataQuality: IndicatorTimeframe["dataQuality"] =
      result.ratios.length >= SMA_PERIOD
        ? "full"
        : result.ratios.length > 0
          ? "partial"
          : "insufficient";
    timeframes.push({
      timeframe: TIMEFRAMES[i],
      sma20: sma20 ?? undefined,
      dataQuality,
    });
  }

  return { timeframes };
}
