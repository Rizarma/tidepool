/**
 * Indicator registry.
 *
 * Register new indicators here to make them available across the system.
 * Most simple indicators still require only a single entry.
 * OHLC-based indicators (e.g. supertrend) need the data model to carry
 * high/low — handled transparently by buildPoolIndicatorsDirect.
 */

import type { IndicatorType } from "@/lib/types";
import { sma, supertrend } from "./math";

export interface IndicatorInput {
  closes: number[];
  highs?: number[];
  lows?: number[];
}

export interface IndicatorResult {
  value: number | null;
  trend?: "up" | "down";
  /** If the computed value is mathematically valid but not analytically reliable. */
  unreliableReason?: string;
}

export interface IndicatorDefinition {
  type: IndicatorType;
  name: string;
  description: string;
  compute: (
    input: IndicatorInput,
    config: { period: number; multiplier?: number },
  ) => IndicatorResult;
  defaultPeriod: number;
  defaultMultiplier?: number;
  /** Minimum candles required before compute() is even attempted. */
  minDataPoints: number | ((config: { period: number }) => number);
  requiresOhlc?: boolean;
  /** Minimum candles for a reliable result (used for data quality assessment). */
  fullQualityDataPoints?: (config: { period: number }) => number;
  /** Minimum allowed period in UI/API validation. */
  minPeriod?: number;
}

const registry: Record<IndicatorType, IndicatorDefinition> = {
  sma: {
    type: "sma",
    name: "SMA",
    description: "Simple Moving Average",
    compute: ({ closes }, config) => ({
      value: sma(closes, config.period),
    }),
    defaultPeriod: 20,
    minDataPoints: ({ period }) => period,
  },
  supertrend: {
    type: "supertrend",
    name: "Supertrend",
    description: "ATR-based trend-following trailing stop",
    compute: ({ closes, highs, lows }, config) => {
      if (!highs || !lows) return { value: null };
      const result = supertrend(
        closes,
        highs,
        lows,
        config.period,
        config.multiplier ?? 3,
      );
      if (!result) return { value: null };
      return {
        value: result.value,
        trend: result.trend,
        unreliableReason: result.unreliableReason,
      };
    },
    defaultPeriod: 10,
    defaultMultiplier: 3,
    minDataPoints: ({ period }) => period + 1,
    requiresOhlc: true,
    fullQualityDataPoints: ({ period }) => period * 2 + 1,
    minPeriod: 5,
  },
};

export function getIndicator(type: string): IndicatorDefinition {
  const def = registry[type as IndicatorType];
  if (!def) {
    throw new Error(`Unknown indicator type: ${type}`);
  }
  return def;
}

export function getAvailableIndicators(): IndicatorType[] {
  return Object.keys(registry) as IndicatorType[];
}

export function isValidIndicatorType(type: string): type is IndicatorType {
  return type in registry;
}
