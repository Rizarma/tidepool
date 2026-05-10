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

// ─── True Range ────────────────────────────────────────────────────────────

/**
 * Compute True Range for each candle.
 *
 * TR[0] = high[0] - low[0]
 * TR[i] = max(high[i] - low[i], |high[i] - close[i-1]|, |low[i] - close[i-1]|)
 */
export function trueRange(
  highs: number[],
  lows: number[],
  closes: number[],
): number[] {
  const tr: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      tr.push(highs[i] - lows[i]);
    } else {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(tr1, tr2, tr3));
    }
  }
  return tr;
}

// ─── ATR ─────────────────────────────────────────────────────────────────────

/**
 * Average True Range.
 * Returns an array where ATR[i] is the SMA of TR over `period` ending at i.
 * Indices < period-1 are filled with null.
 */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
): (number | null)[] {
  if (period <= 0) return highs.map(() => null);
  const tr = trueRange(highs, lows, closes);
  const result: (number | null)[] = new Array(tr.length).fill(null);
  for (let i = period - 1; i < tr.length; i++) {
    result[i] = sma(tr.slice(0, i + 1), period);
  }
  return result;
}

// ─── Supertrend ──────────────────────────────────────────────────────────────

export interface SupertrendResult {
  value: number;
  trend: "up" | "down";
}

/**
 * Supertrend indicator.
 *
 * Uses ATR-based bands to produce a dynamic trailing stop.
 * Returns the latest supertrend value and its trend direction.
 *
 * Parameters:
 *   period     — ATR lookback (default 10)
 *   multiplier — band width multiplier (default 3)
 *
 * Returns null if insufficient data (need at least period + 1 candles).
 */
export function supertrend(
  closes: number[],
  highs: number[],
  lows: number[],
  period: number,
  multiplier: number,
): SupertrendResult | null {
  if (
    period <= 0 ||
    multiplier <= 0 ||
    highs.length !== lows.length ||
    highs.length !== closes.length ||
    highs.length < period + 1
  ) {
    return null;
  }

  // Compute ATR series
  const atrValues = atr(highs, lows, closes, period);

  // Basic bands: mid ± multiplier * ATR
  const upperBasic: (number | null)[] = [];
  const lowerBasic: (number | null)[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (atrValues[i] === null) {
      upperBasic.push(null);
      lowerBasic.push(null);
    } else {
      const mid = (highs[i] + lows[i]) / 2;
      upperBasic.push(mid + multiplier * atrValues[i]);
      lowerBasic.push(mid - multiplier * atrValues[i]);
    }
  }

  // First valid index: after ATR warmup (period) + one more for first ST calc
  const startIdx = period;
  if (startIdx >= highs.length) return null;

  // Final bands and supertrend
  const finalUpper: (number | null)[] = new Array(highs.length).fill(null);
  const finalLower: (number | null)[] = new Array(highs.length).fill(null);
  const st: (number | null)[] = new Array(highs.length).fill(null);
  const trend: number[] = new Array(highs.length).fill(0); // 1 = up, -1 = down

  // Initialize first valid candle
  finalUpper[startIdx] = upperBasic[startIdx];
  finalLower[startIdx] = lowerBasic[startIdx];
  if (closes[startIdx] > upperBasic[startIdx]) {
    st[startIdx] = lowerBasic[startIdx];
    trend[startIdx] = 1;
  } else {
    st[startIdx] = upperBasic[startIdx];
    trend[startIdx] = -1;
  }

  for (let i = startIdx + 1; i < highs.length; i++) {
    const ub = upperBasic[i]!;
    const lb = lowerBasic[i]!;

    // Final Upper Band
    if (trend[i - 1] === -1) {
      // Downtrend: upper band can only fall or stay flat
      finalUpper[i] = Math.min(ub, finalUpper[i - 1]!);
    } else {
      // Uptrend: reset to basic
      finalUpper[i] = ub;
    }

    // Final Lower Band
    if (trend[i - 1] === 1) {
      // Uptrend: lower band can only rise or stay flat
      finalLower[i] = Math.max(lb, finalLower[i - 1]!);
    } else {
      // Downtrend: reset to basic
      finalLower[i] = lb;
    }

    // Determine trend and supertrend value
    if (closes[i] > st[i - 1]!) {
      trend[i] = 1; // up
      st[i] = finalLower[i];
    } else {
      trend[i] = -1; // down
      st[i] = finalUpper[i];
    }
  }

  const lastIdx = st.length - 1;
  if (st[lastIdx] === null) return null;

  return {
    value: st[lastIdx],
    trend: trend[lastIdx] === 1 ? "up" : "down",
  };
}
