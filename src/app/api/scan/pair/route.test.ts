/**
 * Route-level API contract tests for GET /api/scan/pair
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/providers-dlmm", () => ({
  fetchMeteoraDlmmPool: vi.fn(),
  fetchMeteoraDlmmPairByMints: vi.fn(),
  fetchMeteoraDlmmGroupPools: vi.fn(),
}));

vi.mock("@/lib/providers", () => ({
  fetchJupiter: vi.fn(),
  fetchSolanaRpc: vi.fn(),
}));

import {
  fetchMeteoraDlmmPool,
  fetchMeteoraDlmmPairByMints,
  fetchMeteoraDlmmGroupPools,
} from "@/lib/providers-dlmm";

import { fetchJupiter, fetchSolanaRpc } from "@/lib/providers";
import type { DlmmPairInfo } from "@/lib/types";

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

function makePairInfo(overrides: Partial<DlmmPairInfo> = {}): DlmmPairInfo {
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
    vi.mocked(fetchMeteoraDlmmGroupPools).mockResolvedValue([]);
    vi.mocked(fetchSolanaRpc).mockResolvedValue({
      decimals: 6,
      supply: "1000000000000",
      uiAmount: 1000000,
      mintAuthority: null,
      freezeAuthority: null,
      tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    });
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
      vi.mocked(fetchJupiter)
        .mockResolvedValueOnce({ priceUsd: 1.0 })
        .mockResolvedValueOnce({ priceUsd: 200.0 });

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
      vi.mocked(fetchJupiter)
        .mockResolvedValueOnce({ priceUsd: 1.0 })
        .mockResolvedValueOnce({ priceUsd: 200.0 });

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

      // Token prices enriched from Jupiter
      expect(body.pair.tokenX.priceUsd).toBe(1.0);
      expect(body.pair.tokenY.priceUsd).toBe(200.0);

      // Jupiter called for both tokens
      expect(vi.mocked(fetchJupiter)).toHaveBeenCalledWith(VALID_MINT_A);
      expect(vi.mocked(fetchJupiter)).toHaveBeenCalledWith(VALID_MINT_B);

      // Sources: Meteora + Jupiter + Solana RPC
      expect(body.sources).toHaveLength(3);
      const meteora = body.sources.find((s: { provider: string }) => s.provider === "meteora_dlmm");
      const jupiter = body.sources.find((s: { provider: string }) => s.provider === "jupiter");
      const solanaRpc = body.sources.find((s: { provider: string }) => s.provider === "solana_rpc");
      expect(meteora).toBeDefined();
      expect(meteora?.success).toBe(true);
      expect(typeof meteora?.latencyMs).toBe("number");
      expect(jupiter).toBeDefined();
      expect(jupiter?.success).toBe(true);
      expect(solanaRpc).toBeDefined();
      expect(solanaRpc?.success).toBe(true);

      // fetchedAt is ISO string
      expect(body.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("returns PoolReport shape for mintA/mintB query", async () => {
      vi.mocked(fetchMeteoraDlmmPairByMints).mockResolvedValue(makePairInfo());
      vi.mocked(fetchJupiter)
        .mockResolvedValueOnce({ priceUsd: 1.0 })
        .mockResolvedValueOnce({ priceUsd: 200.0 });

      const res = await GET(makeRequest(`mintA=${VALID_MINT_A}&mintB=${VALID_MINT_B}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.kind).toBe("pair");
      expect(body.pair.poolAddress).toBe(VALID_POOL);
      expect(body.sources).toHaveLength(3);
      expect(body.sources.some((s: { provider: string; success: boolean }) => s.provider === "meteora_dlmm" && s.success)).toBe(true);
      expect(body.sources.some((s: { provider: string; success: boolean }) => s.provider === "jupiter" && s.success)).toBe(true);
      expect(body.sources.some((s: { provider: string; success: boolean }) => s.provider === "solana_rpc" && s.success)).toBe(true);
    });

    it("accepts pair= as alias for pool=", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(fetchJupiter)
        .mockResolvedValueOnce({ priceUsd: 1.0 })
        .mockResolvedValueOnce({ priceUsd: 200.0 });

      const res = await GET(makeRequest(`pair=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);
      expect(body.kind).toBe("pair");
      expect(body.pair.poolAddress).toBe(VALID_POOL);
    });

    it("handles Jupiter total failure gracefully", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(fetchJupiter)
        .mockRejectedValueOnce(new Error("HTTP 503"))
        .mockRejectedValueOnce(new Error("HTTP 503"));

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      // Meteora succeeded
      const meteora = body.sources.find((s: { provider: string }) => s.provider === "meteora_dlmm");
      expect(meteora?.success).toBe(true);

      // Jupiter failed
      const jupiter = body.sources.find((s: { provider: string }) => s.provider === "jupiter");
      expect(jupiter).toBeDefined();
      expect(jupiter?.success).toBe(false);
      expect(jupiter?.error).toBeDefined();

      // No new token prices were added
      expect(body.pair.tokenX.priceUsd).toBeUndefined();
      expect(body.pair.tokenY.priceUsd).toBeUndefined();
    });

    it("preserves Meteora prices when Jupiter returns empty objects", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo({
        tokenX: { mint: VALID_MINT_A, name: "USDC", symbol: "USDC", decimals: 6, priceUsd: 0.9 },
        tokenY: { mint: VALID_MINT_B, name: "SOL", symbol: "SOL", decimals: 9, priceUsd: 150 },
      }));
      vi.mocked(fetchJupiter)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      // Existing Meteora prices remain unchanged
      expect(body.pair.tokenX.priceUsd).toBe(0.9);
      expect(body.pair.tokenY.priceUsd).toBe(150);

      // Jupiter source reports failure
      const jupiter = body.sources.find((s: { provider: string }) => s.provider === "jupiter");
      expect(jupiter).toBeDefined();
      expect(jupiter?.success).toBe(false);
    });

    it("handles Jupiter partial data (one price, one empty)", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo({
        tokenX: { mint: VALID_MINT_A, name: "USDC", symbol: "USDC", decimals: 6, priceUsd: 0.9 },
        tokenY: { mint: VALID_MINT_B, name: "SOL", symbol: "SOL", decimals: 9, priceUsd: 150 },
      }));
      vi.mocked(fetchJupiter)
        .mockResolvedValueOnce({ priceUsd: 1.0 })
        .mockResolvedValueOnce({});

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      // Token X updated from Jupiter, token Y preserved from Meteora
      expect(body.pair.tokenX.priceUsd).toBe(1.0);
      expect(body.pair.tokenY.priceUsd).toBe(150);

      // Jupiter source reports success because at least one usable price was returned
      const jupiter = body.sources.find((s: { provider: string }) => s.provider === "jupiter");
      expect(jupiter).toBeDefined();
      expect(jupiter?.success).toBe(true);
    });

    it("includes relatedPools with all group pools including current pool", async () => {
      const ADDR_A = "22222222222222222222222222222222";
      const ADDR_B = "33333333333333333333333333333333";
      const currentPool = makePairInfo({ poolAddress: VALID_POOL });
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(currentPool);
      vi.mocked(fetchMeteoraDlmmGroupPools).mockResolvedValue([
        makePairInfo({ poolAddress: VALID_POOL, binStep: 10, baseFeePct: 0.01 }),
        makePairInfo({ poolAddress: ADDR_A, binStep: 20, baseFeePct: 0.02 }),
        makePairInfo({ poolAddress: ADDR_B, binStep: 50, baseFeePct: 0.05 }),
      ]);
      vi.mocked(fetchJupiter)
        .mockResolvedValueOnce({ priceUsd: 1.0 })
        .mockResolvedValueOnce({ priceUsd: 200.0 });

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.relatedPools).toHaveLength(3);
      expect(
        body.relatedPools.some((p: DlmmPairInfo) => p.poolAddress === VALID_POOL),
      ).toBe(true);
      expect(
        body.relatedPools.some((p: DlmmPairInfo) => p.poolAddress === ADDR_A),
      ).toBe(true);
      expect(
        body.relatedPools.some((p: DlmmPairInfo) => p.poolAddress === ADDR_B),
      ).toBe(true);

      // Group fetch was called with sorted mints
      expect(vi.mocked(fetchMeteoraDlmmGroupPools)).toHaveBeenCalledWith(
        VALID_MINT_A,
        VALID_MINT_B,
      );
    });

    it("returns empty relatedPools when group fetch fails", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(makePairInfo());
      vi.mocked(fetchMeteoraDlmmGroupPools).mockRejectedValue(
        new Error("Group endpoint failed"),
      );
      vi.mocked(fetchJupiter)
        .mockResolvedValueOnce({ priceUsd: 1.0 })
        .mockResolvedValueOnce({ priceUsd: 200.0 });

      const res = await GET(makeRequest(`pool=${VALID_POOL}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.relatedPools).toEqual([]);
      expect(body.pair.poolAddress).toBe(VALID_POOL);
      expect(body.sources).toHaveLength(3);
    });
  });

});
