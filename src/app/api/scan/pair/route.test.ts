/**
 * Route-level API contract tests for GET /api/scan/pair
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/providers-dlmm", () => ({
  fetchMeteoraDlmmPool: vi.fn(),
  fetchMeteoraDlmmPairByMints: vi.fn(),
}));

vi.mock("@/lib/providers-ohlcv", () => ({
  fetchBirdeyePriceHistory: vi.fn(),
}));

vi.mock("@/lib/indicators", () => ({
  buildPoolIndicators: vi.fn(),
}));

import {
  fetchMeteoraDlmmPool,
  fetchMeteoraDlmmPairByMints,
} from "@/lib/providers-dlmm";

import { fetchBirdeyePriceHistory } from "@/lib/providers-ohlcv";
import { buildPoolIndicators } from "@/lib/indicators";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_MINT_A = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const VALID_MINT_B = "So11111111111111111111111111111111111111112";
const VALID_POOL = "11111111111111111111111111111111";

function makeRequest(params?: string): Request {
  const url = params
    ? `http://localhost/api/scan/pair?${params}`
    : "http://localhost/api/scan/pair";
  return new Request(url);
}

async function parseJson(response: Response) {
  return response.json();
}

function makePairInfo(overrides = {}) {
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
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/scan/pair", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── Parameter Validation ────────────────────────────────────────────────

  describe("parameter validation", () => {
    it("returns MISSING_PARAMETER 400 when no params provided", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("MISSING_PARAMETER");
      expect(body.error.message).toMatch(/missing/i);
    });

    it("returns MISSING_PARAMETER 400 when only mintA provided", async () => {
      const res = await GET(makeRequest(`mintA=${VALID_MINT_A}`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("MISSING_PARAMETER");
    });

    it("returns MISSING_PARAMETER 400 when only mintB provided", async () => {
      const res = await GET(makeRequest(`mintB=${VALID_MINT_B}`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("MISSING_PARAMETER");
    });

    it("returns MISSING_PARAMETER 400 for whitespace-only pool", async () => {
      const res = await GET(makeRequest("pool=%20%20"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      // Whitespace trims to empty, so treated as missing
      expect(body.error.code).toBe("MISSING_PARAMETER");
    });

    it("returns INVALID_PARAMETER 400 for invalid pool address", async () => {
      const res = await GET(makeRequest("pool=not-valid!!!"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/pool/i);
    });

    it("returns INVALID_PARAMETER 400 for invalid mintA", async () => {
      const res = await GET(makeRequest(`mintA=bad&mintB=${VALID_MINT_B}`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/mintA/i);
    });

    it("returns INVALID_PARAMETER 400 for invalid mintB", async () => {
      const res = await GET(makeRequest(`mintA=${VALID_MINT_A}&mintB=bad`));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/mintB/i);
    });

    it("pool param takes precedence over mintA/mintB", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(
        makeRequest(`pool=${VALID_POOL}&mintA=${VALID_MINT_A}&mintB=${VALID_MINT_B}`),
      );
      expect(res.status).toBe(200);
      // Should have called fetchMeteoraDlmmPool (pool mode), not fetchMeteoraDlmmPairByMints
      expect(fetchMeteoraDlmmPool).toHaveBeenCalledWith(VALID_POOL);
      expect(fetchMeteoraDlmmPairByMints).not.toHaveBeenCalled();
    });
  });

  // ─── Provider Error Classification ───────────────────────────────────────

  describe("provider error classification", () => {
    it("maps provider timeout to PROVIDER_TIMEOUT 504", async () => {
      vi.mocked(fetchMeteoraDlmmPairByMints).mockRejectedValue(
        new Error("The operation was aborted"),
      );

      const res = await GET(makeRequest(`mintA=${VALID_MINT_A}&mintB=${VALID_MINT_B}`));
      expect(res.status).toBe(504);
      const body = await parseJson(res);
      expect(body.error.code).toBe("PROVIDER_TIMEOUT");
      expect(body.error.message).toBe("Timed out");
      // Sources included and sanitized
      expect(body.sources).toHaveLength(1);
      expect(body.sources[0].success).toBe(false);
      expect(body.sources[0].error).toBe("Timed out");
    });

    it("maps no data found to NO_DATA_FOUND 404", async () => {
      vi.mocked(fetchMeteoraDlmmPairByMints).mockRejectedValue(
        new Error("No DLMM pool found for mints abc / def"),
      );

      const res = await GET(makeRequest(`mintA=${VALID_MINT_A}&mintB=${VALID_MINT_B}`));
      expect(res.status).toBe(404);
      const body = await parseJson(res);
      expect(body.error.code).toBe("NO_DATA_FOUND");
      expect(body.error.message).toBe("No data found");
      // Source error is also sanitized
      expect(body.sources[0].error).toBe("No data found");
    });

    it("maps invalid response to INVALID_RESPONSE 502", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(
        new Error("Invalid response from DLMM: expected object"),
      );

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(502);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_RESPONSE");
      expect(body.error.message).toBe("Invalid response");
      expect(body.sources[0].error).not.toMatch(/DLMM/);
    });

    it("maps invalid pool data to INVALID_RESPONSE 502", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(
        new Error("Invalid pool data: expected an object"),
      );

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(502);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_RESPONSE");
    });

    it("maps RPC error to PROVIDER_UNAVAILABLE 502", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(
        new Error("RPC error: Method not found"),
      );

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(502);
      const body = await parseJson(res);
      expect(body.error.code).toBe("PROVIDER_UNAVAILABLE");
      expect(body.error.message).toBe("Provider unavailable");
      // Source error is client-safe
      expect(body.sources[0].error).toBe("Provider unavailable");
    });

    it("maps HTTP errors to PROVIDER_UNAVAILABLE 502", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(
        new Error("HTTP 503"),
      );

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(502);
      const body = await parseJson(res);
      expect(body.error.code).toBe("PROVIDER_UNAVAILABLE");
    });

    it("does not leak raw error details in response", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(
        new Error("HTTP 500 from https://dlmm.datapi.meteora.ag/internal/secret"),
      );

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      const body = await parseJson(res);
      const serialized = JSON.stringify(body);
      expect(serialized).not.toMatch(/https?:\/\//);
      expect(serialized).not.toMatch(/secret/);
      expect(serialized).not.toMatch(/datapi/);
      expect(body.error.code).toBe("PROVIDER_UNAVAILABLE");
    });
  });

  // ─── Provider Sync Throw Classification ────────────────────────────────────

  describe("provider sync throw classification", () => {
    it("classifies synchronous provider throws as PROVIDER_UNAVAILABLE 502", async () => {
      // timedFetch catches sync throws and classifies them
      vi.mocked(fetchMeteoraDlmmPool).mockImplementation(() => {
        throw new TypeError("Cannot read properties of undefined");
      });

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(502);
      const body = await parseJson(res);
      expect(body.error.code).toBe("PROVIDER_UNAVAILABLE");
      // Raw TypeError message should not leak
      expect(body.error.message).not.toMatch(/Cannot read/);
    });
  });

  // ─── Success Response Shape ──────────────────────────────────────────────

  describe("success response shape", () => {
    it("returns PoolReport shape for pool query", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      // Top-level shape
      expect(body.kind).toBe("pair");
      expect(body).toHaveProperty("pair");
      expect(body).toHaveProperty("sources");
      expect(body).toHaveProperty("fetchedAt");

      // Pair data
      expect(body.pair.poolAddress).toBe(VALID_POOL);
      expect(body.pair.name).toBe("USDC-SOL");
      expect(body.pair.tokenX.mint).toBe(VALID_MINT_A);
      expect(body.pair.tokenY.mint).toBe(VALID_MINT_B);
      expect(body.pair.priceTokenYPerTokenX).toBe(0.007);
      expect(body.pair.binStep).toBe(10);
      expect(body.pair.tvlUsd).toBe(500000);

      // Sources
      expect(body.sources).toHaveLength(1);
      expect(body.sources[0].provider).toBe("meteora_dlmm");
      expect(body.sources[0].success).toBe(true);
      expect(typeof body.sources[0].latencyMs).toBe("number");

      // fetchedAt is ISO string
      expect(body.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("returns PoolReport shape for mintA/mintB query", async () => {
      vi.mocked(fetchMeteoraDlmmPairByMints).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`mintA=${VALID_MINT_A}&mintB=${VALID_MINT_B}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.kind).toBe("pair");
      expect(body.pair.poolAddress).toBe(VALID_POOL);
      expect(body.sources[0].success).toBe(true);
    });

    it("accepts pair= as alias for pool=", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pair=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);
      expect(body.kind).toBe("pair");
      expect(body.pair.poolAddress).toBe(VALID_POOL);
    });
  });

  // ─── Indicator Integration ───────────────────────────────────────────────

  describe("indicator integration", () => {
    it("includes indicators when Birdeye is configured", async () => {
      vi.stubEnv("BIRDEYE_API_KEY", "test-key");
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      vi.mocked(fetchBirdeyePriceHistory).mockResolvedValue({
        items: Array.from({ length: 25 }, (_, i) => ({
          unixTime: 1000 + i,
          value: 1.0 + i * 0.01,
        })),
      });

      vi.mocked(buildPoolIndicators).mockReturnValue({
        timeframes: [
          { timeframe: "1m", sma20: 0.0045 },
          { timeframe: "5m", sma20: 0.0048 },
          { timeframe: "15m", sma20: 0.0052 },
        ],
      });

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators).toBeDefined();
      expect(body.indicators.timeframes).toHaveLength(3);
      expect(body.indicators.timeframes[0]).toEqual({
        timeframe: "1m",
        sma20: 0.0045,
      });

      // Birdeye added as a source
      expect(body.sources).toHaveLength(2);
      expect(body.sources[1].provider).toBe("birdeye");
      expect(body.sources[1].success).toBe(true);
      expect(typeof body.sources[1].latencyMs).toBe("number");
    }, 15_000);

    it("skips indicators and adds failed source when Birdeye errors", async () => {
      vi.stubEnv("BIRDEYE_API_KEY", "test-key");
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(fetchBirdeyePriceHistory).mockRejectedValue(
        new Error("HTTP 429"),
      );

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      // Pool data still present
      expect(body.kind).toBe("pair");
      expect(body.pair.poolAddress).toBe(VALID_POOL);

      // No indicators
      expect(body.indicators).toBeUndefined();

      // Birdeye source shows failure
      expect(body.sources).toHaveLength(2);
      expect(body.sources[1].provider).toBe("birdeye");
      expect(body.sources[1].success).toBe(false);
      expect(body.sources[1].error).toBe("Provider unavailable");
    });

    it("skips indicators when BIRDEYE_API_KEY is not set", async () => {
      vi.stubEnv("BIRDEYE_API_KEY", "");
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.indicators).toBeUndefined();
      expect(body.sources).toHaveLength(1); // only meteora
    });
  });
});
