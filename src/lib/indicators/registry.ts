/**
 * Indicator registry.
 *
 * Register new indicators here to make them available across the system.
 * Adding an indicator requires a single entry — no other files need changes.
 */

import type { IndicatorType } from "@/lib/types";
import { sma } from "./math";

export interface IndicatorDefinition {
  type: IndicatorType;
  name: string;
  description: string;
  compute: (values: number[], config: { period: number }) => number | null;
  defaultPeriod: number;
  minDataPoints: number;
}

const registry: Record<IndicatorType, IndicatorDefinition> = {
  sma: {
    type: "sma",
    name: "SMA",
    description: "Simple Moving Average",
    compute: (values, config) => sma(values, config.period),
    defaultPeriod: 20,
    minDataPoints: 1,
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
