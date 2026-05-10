/**
 * Unit tests for technical indicator calculations.
 */

import { describe, it, expect } from "vitest";
import {
  sma,
  computePoolRatios,
  buildPoolIndicators,
  buildPoolIndicatorsDirect,
} from "./indicators";
import { trueRange, atr, supertrend } from "./indicators/math";
import type { PriceHistoryResult } from "./providers-ohlcv";

describe("sma", () => {
  it("returns null for empty array", () => {
    expect(sma([], 5)).toBeNull();
  });

  it("returns null when array has fewer elements than period", () => {
    expect(sma([1, 2, 3], 5)).toBeNull();
  });

  it("returns null for period <= 0", () => {
    expect(sma([1, 2, 3], 0)).toBeNull();
    expect(sma([1, 2, 3], -1)).toBeNull();
  });

  it("calculates SMA for exact period match", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
  });

  it("uses the last N values when array is longer than period", () => {
    expect(sma([10, 20, 1, 2, 3, 4, 5], 5)).toBe(3);
  });

  it("handles decimal values", () => {
    expect(sma([1.5, 2.5, 3.5], 3)).toBeCloseTo(2.5, 5);
  });

  it("handles large arrays efficiently", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(sma(values, 20)).toBe(90.5); // average of 81..100
  });

  it("handles period = 1 edge case", () => {
    expect(sma([5], 1)).toBe(5);
    expect(sma([3, 7, 9], 1)).toBe(9); // last value only
  });
});

describe("computePoolRatios", () => {
  it("computes ratios from matching timestamps", () => {
    const xHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 0.5 },  // tokenX = $0.50
        { unixTime: 1001, value: 0.6 },  // tokenX = $0.60
      ],
    };
    const yHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 150 },   // tokenY (SOL) = $150
        { unixTime: 1001, value: 160 },   // tokenY (SOL) = $160
      ],
    };

    const { ratios, skipped } = computePoolRatios(xHistory, yHistory);
    // 0.50 / 150 = 0.003333...
    // 0.60 / 160 = 0.00375
    expect(ratios).toHaveLength(2);
    expect(ratios[0]).toBeCloseTo(0.5 / 150, 6);
    expect(ratios[1]).toBeCloseTo(0.6 / 160, 6);
    expect(skipped).toBe(0);
  });

  it("ignores timestamps that only exist in one history", () => {
    const xHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 1.0 },
        { unixTime: 1001, value: 1.0 },
        { unixTime: 1002, value: 1.0 },
      ],
    };
    const yHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 2.0 },
        { unixTime: 1002, value: 2.0 },
      ],
    };

    const { ratios, skipped } = computePoolRatios(xHistory, yHistory);
    expect(ratios).toHaveLength(2); // only 1000 and 1002 match
    expect(ratios[0]).toBe(0.5);
    expect(ratios[1]).toBe(0.5);
    expect(skipped).toBe(1); // 1001 missing in Y
  });

  it("skips points where Y price is zero or negative", () => {
    const xHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 1.0 },
        { unixTime: 1001, value: 1.0 },
      ],
    };
    const yHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 0 },     // invalid
        { unixTime: 1001, value: -1 },    // invalid
      ],
    };

    const { ratios, skipped } = computePoolRatios(xHistory, yHistory);
    expect(ratios).toHaveLength(0);
    expect(skipped).toBe(2);
  });

  it("skips points where X price is zero or negative", () => {
    const xHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 0 },
        { unixTime: 1001, value: 1.0 },
      ],
    };
    const yHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 2.0 },
        { unixTime: 1001, value: 2.0 },
      ],
    };

    const { ratios, skipped } = computePoolRatios(xHistory, yHistory);
    expect(ratios).toHaveLength(1);
    expect(ratios[0]).toBe(0.5);
    expect(skipped).toBe(1);
  });

  it("returns empty array when both histories are empty", () => {
    const { ratios, skipped } = computePoolRatios({ items: [] }, { items: [] });
    expect(ratios).toEqual([]);
    expect(skipped).toBe(0);
  });

  it("handles duplicate timestamps by keeping last value", () => {
    const xHistory: PriceHistoryResult = {
      items: [{ unixTime: 1000, value: 1.0 }],
    };
    const yHistory: PriceHistoryResult = {
      items: [
        { unixTime: 1000, value: 2.0 },
        { unixTime: 1000, value: 4.0 }, // duplicate — last wins
      ],
    };

    const { ratios, skipped } = computePoolRatios(xHistory, yHistory);
    expect(ratios).toHaveLength(1);
    expect(ratios[0]).toBe(0.25); // 1.0 / 4.0
    expect(skipped).toBe(0);
  });
});

describe("buildPoolIndicatorsDirect", () => {
  const defaultConfig = {
    timeframes: ["5m", "1h", "4h"],
    indicators: [{ type: "sma" as const, period: 20 }],
  };

  it("builds indicators for all timeframes from direct price histories", () => {
    const makeHistory = (basePrice: number): PriceHistoryResult => ({
      items: Array.from({ length: 25 }, (_, i) => ({
        unixTime: 1000 + i,
        value: basePrice + i * 0.01,
      })),
    });

    const histories = [makeHistory(0.007), makeHistory(0.007), makeHistory(0.007)];

    const indicators = buildPoolIndicatorsDirect(histories, defaultConfig);

    expect(indicators.timeframes).toHaveLength(3);
    expect(indicators.timeframes[0].timeframe).toBe("5m");
    expect(indicators.timeframes[1].timeframe).toBe("1h");
    expect(indicators.timeframes[2].timeframe).toBe("4h");

    // Each timeframe should have one value (SMA)
    expect(indicators.timeframes[0].values).toHaveLength(1);
    expect(indicators.timeframes[0].values[0].type).toBe("sma");
    expect(indicators.timeframes[0].values[0].period).toBe(20);
    expect(indicators.timeframes[0].values[0].value).toBeDefined();
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("full");
  });

  it("returns no value when not enough data points", () => {
    const histories: PriceHistoryResult[] = [
      { items: [{ unixTime: 1000, value: 0.007 }] },
      { items: [{ unixTime: 1000, value: 0.007 }] },
      { items: [{ unixTime: 1000, value: 0.007 }] },
    ];

    const indicators = buildPoolIndicatorsDirect(histories, defaultConfig);

    expect(indicators.timeframes[0].values[0].value).toBeUndefined();
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("partial");
    expect(indicators.timeframes[1].values[0].dataQuality).toBe("partial");
    expect(indicators.timeframes[2].values[0].dataQuality).toBe("partial");
  });

  it("handles mixed success across timeframes", () => {
    const h1: PriceHistoryResult = {
      items: Array.from({ length: 25 }, (_, i) => ({ unixTime: 1000 + i, value: 0.007 })),
    };
    const h2: PriceHistoryResult = {
      items: Array.from({ length: 10 }, (_, i) => ({ unixTime: 1000 + i, value: 0.007 })),
    };
    const h3: PriceHistoryResult = {
      items: [],
    };

    const indicators = buildPoolIndicatorsDirect([h1, h2, h3], defaultConfig);

    expect(indicators.timeframes[0].timeframe).toBe("5m");
    expect(indicators.timeframes[0].values[0].value).toBeDefined();
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("full");

    expect(indicators.timeframes[1].timeframe).toBe("1h");
    expect(indicators.timeframes[1].values[0].value).toBeUndefined();
    expect(indicators.timeframes[1].values[0].dataQuality).toBe("partial");

    expect(indicators.timeframes[2].timeframe).toBe("4h");
    expect(indicators.timeframes[2].values[0].value).toBeUndefined();
    expect(indicators.timeframes[2].values[0].dataQuality).toBe("insufficient");
  });
});

describe("buildPoolIndicators (legacy Birdeye path)", () => {
  const defaultConfig = {
    timeframes: ["5m", "1h", "4h"],
    indicators: [{ type: "sma" as const, period: 20 }],
  };

  it("builds indicators from paired x/y histories", () => {
    const makeHistory = (basePrice: number): PriceHistoryResult => ({
      items: Array.from({ length: 25 }, (_, i) => ({
        unixTime: 1000 + i,
        value: basePrice + i * 0.01,
      })),
    });

    const xHistories = [makeHistory(0.5), makeHistory(0.5), makeHistory(0.5)];
    const yHistories = [makeHistory(150), makeHistory(150), makeHistory(150)];

    const indicators = buildPoolIndicators(xHistories, yHistories, defaultConfig);

    expect(indicators.timeframes).toHaveLength(3);
    expect(indicators.timeframes[0].timeframe).toBe("5m");
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("full");
  });
});

// ─── Supertrend Math ─────────────────────────────────────────────────────────

describe("trueRange", () => {
  it("first candle TR = high - low", () => {
    const tr = trueRange([10], [5], [7]);
    expect(tr).toEqual([5]);
  });

  it("subsequent candles include previous close", () => {
    const highs = [10, 12];
    const lows = [5, 8];
    const closes = [7, 10];
    const tr = trueRange(highs, lows, closes);
    // TR[0] = 10 - 5 = 5
    // TR[1] = max(12-8=4, |12-7|=5, |8-7|=1) = 5
    expect(tr[0]).toBe(5);
    expect(tr[1]).toBe(5);
  });
});

describe("atr", () => {
  it("returns nulls until period is reached", () => {
    const highs = [10, 12, 11];
    const lows = [5, 8, 7];
    const closes = [7, 10, 9];
    const values = atr(highs, lows, closes, 3);
    expect(values[0]).toBeNull();
    expect(values[1]).toBeNull();
    // TR = [5, 5, 4]; ATR[2] = (5+5+4)/3 = 4.666...
    expect(values[2]).toBeCloseTo(14 / 3, 5);
  });
});

describe("supertrend", () => {
  it("returns null for insufficient data", () => {
    const highs = [10, 12];
    const lows = [5, 8];
    const closes = [7, 10];
    expect(supertrend(highs, lows, closes, 10, 3)).toBeNull();
  });

  it("returns null for invalid period", () => {
    const highs = Array.from({ length: 15 }, () => 10);
    const lows = Array.from({ length: 15 }, () => 9);
    const closes = Array.from({ length: 15 }, () => 9.5);
    expect(supertrend(highs, lows, closes, 0, 3)).toBeNull();
    expect(supertrend(highs, lows, closes, -1, 3)).toBeNull();
  });

  it("returns null for invalid multiplier", () => {
    const highs = Array.from({ length: 15 }, () => 10);
    const lows = Array.from({ length: 15 }, () => 9);
    const closes = Array.from({ length: 15 }, () => 9.5);
    expect(supertrend(highs, lows, closes, 10, 0)).toBeNull();
  });

  it("detects uptrend in rising market", () => {
    const highs = Array.from({ length: 20 }, (_, i) => 10 + i * 0.5);
    const lows = Array.from({ length: 20 }, (_, i) => 9 + i * 0.5);
    const closes = Array.from({ length: 20 }, (_, i) => 9.8 + i * 0.5);
    const result = supertrend(highs, lows, closes, 10, 3);
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("up");
    expect(result!.value).toBeGreaterThan(0);
  });

  it("detects downtrend in falling market", () => {
    const highs = Array.from({ length: 20 }, (_, i) => 20 - i * 0.5);
    const lows = Array.from({ length: 20 }, (_, i) => 19 - i * 0.5);
    const closes = Array.from({ length: 20 }, (_, i) => 19.5 - i * 0.5);
    const result = supertrend(highs, lows, closes, 10, 3);
    expect(result).not.toBeNull();
    expect(result!.trend).toBe("down");
    expect(result!.value).toBeGreaterThan(0);
  });

  it("handles a market with direction change", () => {
    // Falling for 15 candles, then rising for 15 — verifies algorithm
    // does not crash and produces a valid value across a transition.
    const highs = Array.from({ length: 30 }, (_, i) =>
      i < 15 ? 20 - i * 0.5 : 12.5 + (i - 14) * 1.2,
    );
    const lows = Array.from({ length: 30 }, (_, i) =>
      i < 15 ? 19 - i * 0.5 : 11.5 + (i - 14) * 1.2,
    );
    const closes = Array.from({ length: 30 }, (_, i) =>
      i < 15 ? 19.5 - i * 0.5 : 12 + (i - 14) * 1.2,
    );
    const result = supertrend(highs, lows, closes, 10, 3);
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(0);
  });
});

// ─── Supertrend Integration ──────────────────────────────────────────────────

describe("buildPoolIndicatorsDirect with supertrend", () => {
  it("builds supertrend with real OHLC data (full quality)", () => {
    const history: PriceHistoryResult = {
      items: Array.from({ length: 25 }, (_, i) => ({
        unixTime: 1000 + i,
        value: 0.007 + i * 0.0001,
        high: 0.0075 + i * 0.0001,
        low: 0.0065 + i * 0.0001,
      })),
    };

    const config = {
      timeframes: ["5m"],
      indicators: [{ type: "supertrend" as const, period: 10, multiplier: 3 }],
    };

    const indicators = buildPoolIndicatorsDirect([history], config);
    expect(indicators.timeframes[0].values).toHaveLength(1);
    expect(indicators.timeframes[0].values[0].type).toBe("supertrend");
    expect(indicators.timeframes[0].values[0].trend).toBeDefined();
    expect(indicators.timeframes[0].values[0].multiplier).toBe(3);
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("full");
    expect(indicators.timeframes[0].values[0].isApproximate).toBeUndefined();
  });

  it("marks supertrend as approximate when OHLC is missing", () => {
    const history: PriceHistoryResult = {
      items: Array.from({ length: 25 }, (_, i) => ({
        unixTime: 1000 + i,
        value: 0.007 + i * 0.0001,
      })),
    };

    const config = {
      timeframes: ["5m"],
      indicators: [{ type: "supertrend" as const, period: 10, multiplier: 3 }],
    };

    const indicators = buildPoolIndicatorsDirect([history], config);
    expect(indicators.timeframes[0].values[0].type).toBe("supertrend");
    expect(indicators.timeframes[0].values[0].isApproximate).toBe(true);
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("partial");
  });

  it("renders both sma and supertrend in the same timeframe", () => {
    const history: PriceHistoryResult = {
      items: Array.from({ length: 25 }, (_, i) => ({
        unixTime: 1000 + i,
        value: 0.007 + i * 0.0001,
        high: 0.0075 + i * 0.0001,
        low: 0.0065 + i * 0.0001,
      })),
    };

    const config = {
      timeframes: ["5m"],
      indicators: [
        { type: "sma" as const, period: 20 },
        { type: "supertrend" as const, period: 10, multiplier: 3 },
      ],
    };

    const indicators = buildPoolIndicatorsDirect([history], config);
    expect(indicators.timeframes[0].values).toHaveLength(2);
    expect(indicators.timeframes[0].values[0].type).toBe("sma");
    expect(indicators.timeframes[0].values[1].type).toBe("supertrend");
  });
});
