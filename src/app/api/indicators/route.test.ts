/**
 * Route-level API contract tests for GET /api/indicators
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, clearIndicatorResponseCache } from "./route";

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("@/lib/providers-dlmm", () => ({
  fetchMeteoraDlmmPool: vi.fn(),
}));

vi.mock("@/lib/providers-ohlcv", () => ({
  getProvider: vi.fn(),
}));

vi.mock("@/lib/indicators", () => ({
  buildPoolIndicatorsDirect: vi.fn(),
}));

import { fetchMeteoraDlmmPool } from "@/lib/providers-dlmm";
import { getProvider } from "@/lib/providers-ohlcv";
import { buildPoolIndicatorsDirect } from "@/lib/indicators";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_POOL = "11111111111111111111111111111111";
const VALID_MINT_A = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const VALID_MINT_B = "So11111111111111111111111111111111111111112";

function makeRequest(params?: string): Request {
  const url = params
    ? `http://localhost/api/indicators?${params}`
    : "http://localhost/api/indicators";
  return new Request(url);
}

async function parseJson(response: Response) {
  return response.json();
}

function makePairInfo() {
  return {
    poolAddress: VALID_POOL,
    name: "USDC-SOL",
    tokenX: { mint: VALID_MINT_A, name: "USDC", symbol: "USDC", decimals: 6 },
    tokenY: { mint: VALID_MINT_B, name: "SOL", symbol: "SOL", decimals: 9 },
    priceTokenYPerTokenX: 0.007,
    inversePrice: 142.85,
    binStep: 10,
    baseFeePct: 0.01,
    tvlUsd: 500000,
    volume24h: 50000,
  };
}

function mockProvider() {
  return {
    fetchHistory: vi.fn().mockResolvedValue({
      items: Array.from({ length: 25 }, (_, i) => ({
        unixTime: 1000 + i,
        value: 0.007 + i * 0.0001,
      })),
    }),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("GET /api/indicators", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearIndicatorResponseCache();
  });

  describe("parameter validation", () => {
    it("returns INVALID_PARAMETER 400 when no pool provided", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/pool/i);
    });

    it("returns INVALID_PARAMETER 400 for invalid pool address", async () => {
      const res = await GET(makeRequest("pool=not-valid!!!"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns INVALID_PARAMETER 400 for invalid timeframe", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&timeframes=99x`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/timeframes/i);
    });

    it("returns INVALID_PARAMETER 400 for unknown indicator type", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&indicators=unknown:20`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/indicator/i);
    });

    it("returns INVALID_PARAMETER 400 for invalid indicator period", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&indicators=sma:0`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns INVALID_PARAMETER 400 for invalid indicator multiplier", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&indicators=supertrend:10:0`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/multiplier/i);
    });

    it("returns INVALID_PARAMETER 400 for too many indicator segments", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&indicators=supertrend:10:3:extra`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns INVALID_PARAMETER 400 for supertrend period below minimum", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&indicators=supertrend:4:3`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/period must be at least 5/i);
    });

    it("returns INVALID_PARAMETER 400 for invalid provider", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&provider=unknown`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/provider/i);
    });
  });

  describe("success response", () => {
    it("returns indicators with default config (Meteora)", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(getProvider).mockReturnValue(mockProvider());
      vi.mocked(buildPoolIndicatorsDirect).mockReturnValue({
        timeframes: [
          {
            timeframe: "5m",
            values: [{ type: "sma", value: 0.0045, period: 20, dataQuality: "full" }],
          },
          {
            timeframe: "1h",
            values: [{ type: "sma", value: 0.0048, period: 20, dataQuality: "full" }],
          },
          {
            timeframe: "4h",
            values: [{ type: "sma", value: 0.0052, period: 20, dataQuality: "full" }],
          },
        ],
      });

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators.timeframes).toHaveLength(3);
      expect(body.indicators.timeframes[0].timeframe).toBe("5m");
      expect(body.indicators.timeframes[0].values[0]).toEqual({
        type: "sma",
        value: 0.0045,
        period: 20,
        dataQuality: "full",
      });

      // Sources
      expect(body.sources).toHaveLength(2);
      expect(body.sources[0].provider).toBe("meteora_dlmm");
      expect(body.sources[0].success).toBe(true);
      expect(body.sources[1].provider).toBe("meteora_dlmm");
      expect(body.sources[1].success).toBe(true);
    }, 15_000);

    it("returns indicators with custom config", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(getProvider).mockReturnValue(mockProvider());
      vi.mocked(buildPoolIndicatorsDirect).mockReturnValue({
        timeframes: [
          {
            timeframe: "5m",
            values: [{ type: "sma", value: 0.0045, period: 10, dataQuality: "full" }],
          },
        ],
      });

      const res = await GET(makeRequest(`pool=${VALID_POOL}&timeframes=5m&indicators=sma:10`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators.timeframes).toHaveLength(1);
      expect(body.indicators.timeframes[0].timeframe).toBe("5m");
      expect(body.indicators.timeframes[0].values[0].period).toBe(10);
    }, 15_000);

    it("returns indicators with Birdeye provider", async () => {
      vi.stubEnv("BIRDEYE_API_KEY", "test-key");
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(getProvider).mockReturnValue(mockProvider());
      vi.mocked(buildPoolIndicatorsDirect).mockReturnValue({
        timeframes: [
          {
            timeframe: "5m",
            values: [{ type: "sma", value: 0.0045, period: 20, dataQuality: "full" }],
          },
        ],
      });

      const res = await GET(makeRequest(`pool=${VALID_POOL}&provider=birdeye&timeframes=5m`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators.timeframes).toHaveLength(1);
      expect(body.sources).toHaveLength(2);
      expect(body.sources[1].provider).toBe("birdeye");
      expect(body.sources[1].success).toBe(true);
    }, 15_000);

    it("returns indicators with supertrend and multiplier", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(getProvider).mockReturnValue(mockProvider());
      vi.mocked(buildPoolIndicatorsDirect).mockReturnValue({
        timeframes: [
          {
            timeframe: "5m",
            values: [{ type: "supertrend", value: 0.007, period: 10, multiplier: 3, trend: "up", dataQuality: "full" }],
          },
        ],
      });

      const res = await GET(makeRequest(`pool=${VALID_POOL}&timeframes=5m&indicators=supertrend:10:3`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators.timeframes).toHaveLength(1);
      expect(body.indicators.timeframes[0].values[0].type).toBe("supertrend");
      expect(body.indicators.timeframes[0].values[0].period).toBe(10);
      expect(body.indicators.timeframes[0].values[0].trend).toBe("up");
    }, 15_000);
  });

  describe("error handling", () => {
    it("returns empty indicators when no indicators are requested", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&indicators=`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators.timeframes).toEqual([]);
      expect(body.sources).toHaveLength(1);
      expect(body.sources[0].provider).toBe("meteora_dlmm");
    });

    it("returns empty indicators when Birdeye is selected but API key is missing", async () => {
      vi.stubEnv("BIRDEYE_API_KEY", "");
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(getProvider).mockReturnValue(mockProvider());

      const res = await GET(makeRequest(`pool=${VALID_POOL}&provider=birdeye`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators.timeframes).toEqual([]);
      expect(body.sources).toHaveLength(2);
      expect(body.sources[1].provider).toBe("birdeye");
      expect(body.sources[1].success).toBe(false);
      expect(body.sources[1].error).toMatch(/Provider error|BIRDEYE_API_KEY/i);
    });

    it("returns failed source when provider errors", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      const mockFetchHistory = vi.fn().mockRejectedValue(new Error("HTTP 429"));
      vi.mocked(getProvider).mockReturnValue({ fetchHistory: mockFetchHistory });

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators.timeframes).toEqual([]);
      expect(body.sources).toHaveLength(2);
      expect(body.sources[1].provider).toBe("meteora_dlmm");
      expect(body.sources[1].success).toBe(false);
      expect(body.sources[1].error).toMatch(/429|Provider unavailable/);
    }, 15_000);
  });
});
