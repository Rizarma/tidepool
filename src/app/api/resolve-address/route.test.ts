/**
 * Route-level API contract tests for GET /api/resolve-address?address=<address>
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/providers-dlmm", () => ({
  fetchMeteoraDlmmPool: vi.fn(),
  fetchMeteoraDlmmPoolsByMint: vi.fn(),
}));

vi.mock("@/lib/providers", () => ({
  fetchSolanaRpc: vi.fn(),
}));

import { fetchMeteoraDlmmPool, fetchMeteoraDlmmPoolsByMint } from "@/lib/providers-dlmm";
import { fetchSolanaRpc } from "@/lib/providers";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const OTHER_MINT = "So11111111111111111111111111111111111111112";
const VALID_POOL_ADDRESS = "11111111111111111111111111111111";

function makeRequest(params?: string): Request {
  const url = params
    ? `http://localhost/api/resolve-address?${params}`
    : "http://localhost/api/resolve-address";
  return new Request(url);
}

async function parseJson(response: Response) {
  return response.json();
}

function makePairInfo(overrides = {}) {
  return {
    poolAddress: VALID_POOL_ADDRESS,
    name: "USDC-SOL",
    tokenX: { mint: VALID_ADDRESS, name: "USDC", symbol: "USDC", decimals: 6 },
    tokenY: { mint: OTHER_MINT, name: "SOL", symbol: "SOL", decimals: 9 },
    priceTokenYPerTokenX: 0.007,
    inversePrice: 142.85,
    binStep: 10,
    tvlUsd: 500000,
    volume24h: 50000,
    ...overrides,
  };
}

function makeSolanaRpcResult(overrides = {}) {
  return {
    decimals: 6,
    supply: "1000000000000",
    uiAmount: 1000000,
    mintAuthority: null,
    freezeAuthority: null,
    tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/resolve-address", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ─── Parameter Validation ────────────────────────────────────────────────

  describe("parameter validation", () => {
    it("returns MISSING_PARAMETER 400 when address is absent", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("MISSING_PARAMETER");
      expect(body.error.message).toMatch(/address/i);
    });

    it("returns INVALID_PARAMETER 400 for invalid address", async () => {
      const res = await GET(makeRequest("address=not-valid!!!"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/invalid/i);
    });
  });

  // ─── Direct Meteora Pool Success ─────────────────────────────────────────

  describe("direct Meteora pool resolution", () => {
    it("returns direct_pool_scan when address resolves as a Meteora DLMM pool", async () => {
      const pool = makePairInfo();
      vi.mocked(fetchMeteoraDlmmPool).mockResolvedValue(pool);
      vi.mocked(fetchSolanaRpc).mockRejectedValue(new Error("Account not found on-chain"));
      vi.mocked(fetchMeteoraDlmmPoolsByMint).mockResolvedValue({ totalFound: 0, pools: [] });

      const res = await GET(makeRequest(`address=${VALID_ADDRESS}`));
      expect(res.status).toBe(200);

      const body = await parseJson(res);
      expect(body.primarySuggestion).toBe("direct_pool_scan");
      expect(body.possibleTypes).toContain("meteora_dlmm_pool");
      expect(body.meteoraPoolAvailable).toBe(true);
      expect(body.poolAddress).toBe(VALID_POOL_ADDRESS);
      expect(body.address).toBe(VALID_ADDRESS);
      expect(body.valid).toBe(true);
      expect(body.status).toBe("resolved");
      expect(body.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ─── Token Mint with Discovered Pools ────────────────────────────────────

  describe("token mint with discovered pools", () => {
    it("returns pool_discovery when address is a token mint with matching pools", async () => {
      const discoveredPool = makePairInfo({ poolAddress: "22222222222222222222222222222222" });
      const secondPool = makePairInfo({ poolAddress: "33333333333333333333333333333333", tvlUsd: 200000 });

      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(new Error("Pool not found"));
      vi.mocked(fetchSolanaRpc).mockResolvedValue(makeSolanaRpcResult());
      vi.mocked(fetchMeteoraDlmmPoolsByMint).mockResolvedValue({
        totalFound: 2,
        pools: [discoveredPool, secondPool],
      });

      const res = await GET(makeRequest(`address=${VALID_ADDRESS}`));
      expect(res.status).toBe(200);

      const body = await parseJson(res);
      expect(body.primarySuggestion).toBe("pool_discovery");
      expect(body.possibleTypes).toContain("token_mint");
      expect(body.tokenScanAvailable).toBe(true);
      expect(body.meteoraPoolsAvailable).toBe(true);
      expect(body.matchingPoolCount).toBe(2);
      expect(body.providerTotalFound).toBe(2);
      expect(body.primaryPoolAddress).toBe("22222222222222222222222222222222");
    });

    it("treats discovered pools as token mint evidence when RPC fails", async () => {
      const discoveredPool = makePairInfo({ poolAddress: "22222222222222222222222222222222" });

      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(new Error("Pool not found"));
      vi.mocked(fetchSolanaRpc).mockRejectedValue(new Error("HTTP 503"));
      vi.mocked(fetchMeteoraDlmmPoolsByMint).mockResolvedValue({
        totalFound: 1,
        pools: [discoveredPool],
      });

      const res = await GET(makeRequest(`address=${VALID_ADDRESS}`));
      expect(res.status).toBe(200);

      const body = await parseJson(res);
      expect(body.primarySuggestion).toBe("pool_discovery");
      expect(body.possibleTypes).toContain("token_mint");
      expect(body.tokenScanAvailable).toBe(false);
      expect(body.meteoraPoolsAvailable).toBe(true);
    });
  });

  // ─── Token Mint Only (No Pools) ──────────────────────────────────────────

  describe("token mint only, no pools", () => {
    it("returns token_scan when address is a token mint but no pools discovered", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(new Error("Pool not found"));
      vi.mocked(fetchSolanaRpc).mockResolvedValue(makeSolanaRpcResult());
      vi.mocked(fetchMeteoraDlmmPoolsByMint).mockResolvedValue({ totalFound: 0, pools: [] });

      const res = await GET(makeRequest(`address=${VALID_ADDRESS}`));
      expect(res.status).toBe(200);

      const body = await parseJson(res);
      expect(body.primarySuggestion).toBe("token_scan");
      expect(body.possibleTypes).toContain("token_mint");
      expect(body.tokenScanAvailable).toBe(true);
      expect(body.meteoraPoolsAvailable).toBe(false);
      expect(body.status).toBe("resolved");
    });
  });

  // ─── Unknown Address ─────────────────────────────────────────────────────

  describe("unknown address", () => {
    it("returns none when all probes reject", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(new Error("Pool not found"));
      vi.mocked(fetchSolanaRpc).mockRejectedValue(new Error("Account not found on-chain"));
      vi.mocked(fetchMeteoraDlmmPoolsByMint).mockResolvedValue({ totalFound: 0, pools: [] });

      const res = await GET(makeRequest(`address=${VALID_ADDRESS}`));
      expect(res.status).toBe(200);

      const body = await parseJson(res);
      expect(body.primarySuggestion).toBe("none");
      expect(body.possibleTypes).toEqual([]);
      expect(body.tokenScanAvailable).toBe(false);
      expect(body.meteoraPoolAvailable).toBe(false);
      expect(body.meteoraPoolsAvailable).toBe(false);
      expect(body.status).toBe("unknown");

      // Sources should be sanitized (no raw error messages leaked)
      for (const source of body.sources) {
        if (!source.success) {
          expect(source.error).toBeDefined();
          // Sanitized errors should not contain raw stack traces or HTTP codes
          expect(source.error).not.toMatch(/^Error:/);
        }
      }
    });

    it("returns partial status when provider failures prevent full resolution", async () => {
      vi.mocked(fetchMeteoraDlmmPool).mockRejectedValue(new Error("Pool not found"));
      vi.mocked(fetchSolanaRpc).mockRejectedValue(new Error("Account not found on-chain"));
      vi.mocked(fetchMeteoraDlmmPoolsByMint).mockRejectedValue(new Error("HTTP 503"));

      const res = await GET(makeRequest(`address=${VALID_ADDRESS}`));
      expect(res.status).toBe(200);

      const body = await parseJson(res);
      expect(body.primarySuggestion).toBe("none");
      expect(body.status).toBe("partial");
      expect(body.sources).toContainEqual(
        expect.objectContaining({
          provider: "meteora_pool_discovery",
          success: false,
          code: "PROVIDER_UNAVAILABLE",
          error: "Provider unavailable",
        }),
      );
    });
  });
});
