/**
 * Route-level API contract tests for GET /api/scan?mint=<address>
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/providers", () => ({
  fetchDexScreener: vi.fn(),
  fetchRugCheck: vi.fn(),
  fetchJupiter: vi.fn(),
  fetchSolanaRpc: vi.fn(),
}));

vi.mock("@/lib/risk", () => ({
  computeRisk: vi.fn(),
}));

import { computeRisk } from "@/lib/risk";

import {
  fetchDexScreener,
  fetchRugCheck,
  fetchJupiter,
  fetchSolanaRpc,
} from "@/lib/providers";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function makeRequest(params?: string): Request {
  const url = params
    ? `http://localhost/api/scan?${params}`
    : "http://localhost/api/scan";
  return new Request(url);
}

async function parseJson(response: Response) {
  return response.json();
}

/** Default computeRisk return value */
function defaultRisk() {
  return { score: 25, level: "low" as const, factors: [] };
}

/** Set all provider mocks to resolve with minimal valid data */
function setDefaultProviderMocks() {
  vi.mocked(fetchDexScreener).mockResolvedValue({});
  vi.mocked(fetchRugCheck).mockResolvedValue({ warnings: [], dangers: [] });
  vi.mocked(fetchJupiter).mockResolvedValue({});
  vi.mocked(fetchSolanaRpc).mockResolvedValue({});
  vi.mocked(computeRisk).mockReturnValue(defaultRisk());
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/scan", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setDefaultProviderMocks();
  });

  // ─── Parameter Validation ────────────────────────────────────────────────

  describe("parameter validation", () => {
    it("returns MISSING_PARAMETER 400 when mint is absent", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("MISSING_PARAMETER");
      expect(body.error.message).toMatch(/mint/i);
    });

    it("returns MISSING_PARAMETER 400 when mint is empty", async () => {
      const res = await GET(makeRequest("mint="));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("MISSING_PARAMETER");
    });

    it("returns MISSING_PARAMETER 400 when mint is whitespace only", async () => {
      const res = await GET(makeRequest("mint=%20%20"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("MISSING_PARAMETER");
    });

    it("returns INVALID_PARAMETER 400 for invalid mint address", async () => {
      const res = await GET(makeRequest("mint=not-a-valid-address!!!"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/invalid/i);
    });

    it("returns INVALID_PARAMETER 400 for too-short mint", async () => {
      const res = await GET(makeRequest("mint=ABC123"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });
  });

  // ─── Provider Failure Sanitization ───────────────────────────────────────

  describe("provider failure sanitization", () => {
    it("sanitizes provider errors in sources without leaking internals", async () => {
      vi.mocked(fetchDexScreener).mockRejectedValue(
        new Error("HTTP 503 from https://api.dexscreener.com/internal/path"),
      );
      vi.mocked(fetchRugCheck).mockRejectedValue(
        new Error("ECONNREFUSED 127.0.0.1:3000"),
      );
      vi.mocked(fetchJupiter).mockRejectedValue(
        new Error("The operation was aborted"),
      );
      vi.mocked(fetchSolanaRpc).mockRejectedValue(
        new Error("RPC error: Method not found"),
      );

      const res = await GET(makeRequest(`mint=${VALID_MINT}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      expect(body.sources).toHaveLength(4);
      for (const source of body.sources) {
        expect(source.success).toBe(false);
        // Error messages must NOT contain URLs or raw internals
        expect(source.error).not.toMatch(/https?:\/\//);
        expect(source.error).not.toMatch(/127\.0\.0\.1/);
        expect(source.error).not.toMatch(/ECONNREFUSED/);
        expect(typeof source.error).toBe("string");
        expect(source.error.length).toBeGreaterThan(0);
      }
    });

    it("returns partial data when some providers succeed and others fail", async () => {
      vi.mocked(fetchDexScreener).mockResolvedValue({
        priceUsd: 1.5,
        symbol: "USDC",
        name: "USD Coin",
      });
      vi.mocked(fetchRugCheck).mockRejectedValue(new Error("timeout"));
      vi.mocked(fetchJupiter).mockResolvedValue({
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        strict: true,
      });
      vi.mocked(fetchSolanaRpc).mockRejectedValue(
        new Error("Account not found on-chain"),
      );

      const res = await GET(makeRequest(`mint=${VALID_MINT}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      // Successful sources
      const dexSource = body.sources.find((s: { provider: string }) => s.provider === "dexscreener");
      expect(dexSource.success).toBe(true);

      // Failed sources have sanitized errors
      const rugSource = body.sources.find((s: { provider: string }) => s.provider === "rugcheck");
      expect(rugSource.success).toBe(false);
      expect(rugSource.error).toBe("Timed out");

      // Market data from successful provider
      expect(body.market.priceUsd).toBe(1.5);
      expect(body.identity.name).toBe("USD Coin");
    });
  });

  // ─── Success Response Shape ──────────────────────────────────────────────

  describe("success response shape", () => {
    it("returns full TokenReport shape when all providers succeed", async () => {
      vi.mocked(fetchDexScreener).mockResolvedValue({
        priceUsd: 0.99,
        priceNative: 0.007,
        marketCap: 5000000,
        volume24h: 100000,
        liquidity: 2000000,
        pairAddress: "pair123",
        dexId: "raydium",
        name: "USD Coin",
        symbol: "USDC",
        imageUrl: "https://example.com/usdc.png",
      });
      vi.mocked(fetchRugCheck).mockResolvedValue({
        score: 10,
        level: "low",
        topHolderPct: 5.2,
        warnings: ["Minor warning"],
        dangers: [],
      });
      vi.mocked(fetchJupiter).mockResolvedValue({
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        strict: true,
        priceUsd: 1.0,
        imageUrl: "https://jup.example.com/usdc.png",
      });
      vi.mocked(fetchSolanaRpc).mockResolvedValue({
        decimals: 6,
        supply: "1000000000000",
        uiAmount: 1000000,
        mintAuthority: null,
        freezeAuthority: null,
        tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      });

      const res = await GET(makeRequest(`mint=${VALID_MINT}`));
      expect(res.status).toBe(200);
      const body = await parseJson(res);

      // Top-level shape
      expect(body).toHaveProperty("identity");
      expect(body).toHaveProperty("supply");
      expect(body).toHaveProperty("market");
      expect(body).toHaveProperty("trust");
      expect(body).toHaveProperty("risk");
      expect(body).toHaveProperty("sources");
      expect(body).toHaveProperty("fetchedAt");

      // Identity
      expect(body.identity.mint).toBe(VALID_MINT);
      expect(body.identity.name).toBe("USD Coin");
      expect(body.identity.symbol).toBe("USDC");
      expect(body.identity.decimals).toBe(6);
      expect(body.identity.tokenProgram).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

      // Supply
      expect(body.supply.total).toBe("1000000000000");
      expect(body.supply.uiAmount).toBe(1000000);
      expect(body.supply.decimals).toBe(6);

      // Market
      expect(body.market.priceUsd).toBe(0.99);
      expect(body.market.liquidity).toBe(2000000);

      // Trust
      expect(body.trust.jupiterStrict).toBe(true);
      expect(body.trust.rugCheckScore).toBe(10);

      // Risk
      expect(body.risk).toHaveProperty("score");
      expect(body.risk).toHaveProperty("level");
      expect(body.risk).toHaveProperty("factors");

      // Sources
      expect(body.sources).toHaveLength(4);
      expect(body.sources.every((s: { success: boolean }) => s.success)).toBe(true);

      // fetchedAt is ISO string
      expect(body.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ─── Unexpected Errors ───────────────────────────────────────────────────

  describe("unexpected top-level errors", () => {
    it("returns INTERNAL_ERROR 500 for unexpected thrown errors", async () => {
      // Trigger an error after Promise.allSettled by making computeRisk throw
      vi.mocked(computeRisk).mockImplementation(() => {
        throw new Error("unexpected internal failure");
      });

      const res = await GET(makeRequest(`mint=${VALID_MINT}`));
      expect(res.status).toBe(500);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).not.toMatch(/unexpected internal failure/);
    });
  });
});
