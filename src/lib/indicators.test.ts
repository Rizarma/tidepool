/**
 * Unit tests for technical indicator calculations.
 */

import { describe, it, expect } from "vitest";
import { sma, computePoolRatios, buildPoolIndicators } from "./indicators";
import type { BirdeyeHistoryResult } from "./providers-ohlcv";

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
    const xHistory: BirdeyeHistoryResult = {
      items: [
        { unixTime: 1000, value: 0.5 },  // tokenX = $0.50
        { unixTime: 1001, value: 0.6 },  // tokenX = $0.60
      ],
    };
    const yHistory: BirdeyeHistoryResult = {
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
    const xHistory: BirdeyeHistoryResult = {
      items: [
        { unixTime: 1000, value: 1.0 },
        { unixTime: 1001, value: 1.0 },
        { unixTime: 1002, value: 1.0 },
      ],
    };
    const yHistory: BirdeyeHistoryResult = {
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
    const xHistory: BirdeyeHistoryResult = {
      items: [
        { unixTime: 1000, value: 1.0 },
        { unixTime: 1001, value: 1.0 },
      ],
    };
    const yHistory: BirdeyeHistoryResult = {
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
    const xHistory: BirdeyeHistoryResult = {
      items: [
        { unixTime: 1000, value: 0 },
        { unixTime: 1001, value: 1.0 },
      ],
    };
    const yHistory: BirdeyeHistoryResult = {
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
    const xHistory: BirdeyeHistoryResult = {
      items: [{ unixTime: 1000, value: 1.0 }],
    };
    const yHistory: BirdeyeHistoryResult = {
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

describe("buildPoolIndicators", () => {
  const defaultConfig = {
    timeframes: ["1m", "5m", "15m"],
    indicators: [{ type: "sma" as const, period: 20 }],
  };

  it("builds indicators for all three timeframes", () => {
    const makeHistory = (basePrice: number): BirdeyeHistoryResult => ({
      items: Array.from({ length: 25 }, (_, i) => ({
        unixTime: 1000 + i,
        value: basePrice + i * 0.01,
      })),
    });

    const xHistories = [makeHistory(0.5), makeHistory(0.5), makeHistory(0.5)];
    const yHistories = [makeHistory(150), makeHistory(150), makeHistory(150)];

    const indicators = buildPoolIndicators(xHistories, yHistories, defaultConfig);

    expect(indicators.timeframes).toHaveLength(3);
    expect(indicators.timeframes[0].timeframe).toBe("1m");
    expect(indicators.timeframes[1].timeframe).toBe("5m");
    expect(indicators.timeframes[2].timeframe).toBe("15m");

    // Each timeframe should have one value (SMA)
    expect(indicators.timeframes[0].values).toHaveLength(1);
    expect(indicators.timeframes[0].values[0].type).toBe("sma");
    expect(indicators.timeframes[0].values[0].period).toBe(20);
    expect(indicators.timeframes[0].values[0].value).toBeDefined();
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("full");
  });

  it("returns no value when not enough aligned data", () => {
    const xHistories: BirdeyeHistoryResult[] = [
      { items: [{ unixTime: 1000, value: 1.0 }] },
      { items: [{ unixTime: 1000, value: 1.0 }] },
      { items: [{ unixTime: 1000, value: 1.0 }] },
    ];
    const yHistories: BirdeyeHistoryResult[] = [
      { items: [{ unixTime: 1000, value: 2.0 }] },
      { items: [{ unixTime: 1000, value: 2.0 }] },
      { items: [{ unixTime: 1000, value: 2.0 }] },
    ];

    const indicators = buildPoolIndicators(xHistories, yHistories, defaultConfig);

    expect(indicators.timeframes[0].values[0].value).toBeUndefined();
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("partial");
    expect(indicators.timeframes[1].values[0].dataQuality).toBe("partial");
    expect(indicators.timeframes[2].values[0].dataQuality).toBe("partial");
  });

  it("handles mixed success across timeframes", () => {
    const x1m: BirdeyeHistoryResult = {
      items: Array.from({ length: 25 }, (_, i) => ({ unixTime: 1000 + i, value: 1.0 })),
    };
    const y1m: BirdeyeHistoryResult = {
      items: Array.from({ length: 25 }, (_, i) => ({ unixTime: 1000 + i, value: 2.0 })),
    };

    const x5m: BirdeyeHistoryResult = {
      items: Array.from({ length: 10 }, (_, i) => ({ unixTime: 1000 + i, value: 1.0 })),
    };
    const y5m: BirdeyeHistoryResult = {
      items: Array.from({ length: 10 }, (_, i) => ({ unixTime: 1000 + i, value: 2.0 })),
    };

    const x15m: BirdeyeHistoryResult = {
      items: [{ unixTime: 1000, value: 1.0 }],
    };
    const y15m: BirdeyeHistoryResult = {
      items: [{ unixTime: 2000, value: 2.0 }],
    };

    const indicators = buildPoolIndicators([x1m, x5m, x15m], [y1m, y5m, y15m], defaultConfig);

    expect(indicators.timeframes[0].timeframe).toBe("1m");
    expect(indicators.timeframes[0].values[0].value).toBeDefined();
    expect(indicators.timeframes[0].values[0].dataQuality).toBe("full");

    expect(indicators.timeframes[1].timeframe).toBe("5m");
    expect(indicators.timeframes[1].values[0].value).toBeUndefined();
    expect(indicators.timeframes[1].values[0].dataQuality).toBe("partial");

    expect(indicators.timeframes[2].timeframe).toBe("15m");
    expect(indicators.timeframes[2].values[0].value).toBeUndefined();
    expect(indicators.timeframes[2].values[0].dataQuality).toBe("insufficient");
  });
});
