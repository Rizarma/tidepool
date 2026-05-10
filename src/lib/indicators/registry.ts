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
  minDataPoints: number;
  requiresOhlc?: boolean;
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
    minDataPoints: 1,
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
      return { value: result.value, trend: result.trend };
    },
    defaultPeriod: 10,
    defaultMultiplier: 3,
    minDataPoints: 2,
    requiresOhlc: true,
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
