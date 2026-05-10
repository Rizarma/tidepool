/**
 * Pure math functions for technical indicators.
 */

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
