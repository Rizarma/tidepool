/**
 * Route-level API contract tests for GET /api/pools/new
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/providers-dlmm", () => ({
  fetchMeteoraDlmmNewPools: vi.fn(),
}));

import { fetchMeteoraDlmmNewPools } from "@/lib/providers-dlmm";
import { cache } from "@/lib/cache";
import { clearDedup } from "@/lib/dedup";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(params?: string): Request {
  const url = params
    ? `http://localhost/api/pools/new?${params}`
    : "http://localhost/api/pools/new";
  return new Request(url);
}

async function parseJson(response: Response) {
  return response.json();
}

function makePool(overrides = {}) {
  return {
    poolAddress: "11111111111111111111111111111111",
    name: "TEST-SOL",
    tokenX: {
      mint: "So11111111111111111111111111111111111111112",
      name: "SOL",
      symbol: "SOL",
      decimals: 9,
    },
    tokenY: {
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
    },
    tvlUsd: 500000,
    volume24h: 50000,
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    ...overrides,
  };
}

function setDefaultMock() {
  vi.mocked(fetchMeteoraDlmmNewPools).mockResolvedValue({
    pools: [makePool()],
    total: 1,
    pages: 1,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/pools/new", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    setDefaultMock();
    await cache.clear();
    clearDedup();
  });

  describe("default params", () => {
    it("returns pools with default page and pageSize", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await parseJson(res);
      expect(body.pools).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.pages).toBe(1);
      expect(body.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("valid params with filters", () => {
    it("accepts filters and returns filtered pools", async () => {
      const res = await GET(
        makeRequest("page=2&pageSize=50&minTvl=1000&minApr=5&maxAgeHours=24&freezeOffOnly=true"),
      );
      expect(res.status).toBe(200);
      const body = await parseJson(res);
      expect(body.pools).toBeDefined();

      expect(fetchMeteoraDlmmNewPools).toHaveBeenCalledWith(
        50,
        2,
        expect.objectContaining({
          minTvl: 1000,
          minApr: 5,
          maxAgeHours: 24,
          freezeOffOnly: true,
        }),
      );
    });
  });

  describe("invalid page", () => {
    it("returns 400 for negative page", async () => {
      const res = await GET(makeRequest("page=-1"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/page must be 1-50/);
    });

    it("returns 400 for zero page", async () => {
      const res = await GET(makeRequest("page=0"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns 400 for page > 50", async () => {
      const res = await GET(makeRequest("page=51"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
      expect(body.error.message).toMatch(/page must be 1-50/);
    });

    it("returns 400 for NaN page", async () => {
      const res = await GET(makeRequest("page=NaN"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns 400 for non-numeric page", async () => {
      const res = await GET(makeRequest("page=abc"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });
  });

  describe("invalid pageSize", () => {
    it("returns 400 for negative pageSize", async () => {
      const res = await GET(makeRequest("pageSize=-1"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns 400 for pageSize > 1000", async () => {
      const res = await GET(makeRequest("pageSize=1001"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });
  });

  describe("invalid filter params", () => {
    it("returns 400 for negative minTvl", async () => {
      const res = await GET(makeRequest("minTvl=-1"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns 400 for NaN minTvl", async () => {
      const res = await GET(makeRequest("minTvl=NaN"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns 400 for negative minApr", async () => {
      const res = await GET(makeRequest("minApr=-5"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });

    it("returns 400 for negative maxAgeHours", async () => {
      const res = await GET(makeRequest("maxAgeHours=-1"));
      expect(res.status).toBe(400);
      const body = await parseJson(res);
      expect(body.error.code).toBe("INVALID_PARAMETER");
    });
  });

  describe("provider error handling", () => {
    it("returns sanitized error when provider fails", async () => {
      vi.mocked(fetchMeteoraDlmmNewPools).mockRejectedValue(
        new Error("HTTP 503"),
      );
      const res = await GET(makeRequest());
      expect(res.status).toBe(502);
      const body = await parseJson(res);
      expect(body.error.code).toBe("PROVIDER_UNAVAILABLE");
      expect(body.source.success).toBe(false);
    });
  });

  describe("response cache headers", () => {
    it("includes cache headers on success", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const cacheControl = res.headers.get("Cache-Control");
      expect(cacheControl).toBeTruthy();
      expect(cacheControl).toMatch(/public/);
      expect(cacheControl).toMatch(/s-maxage/);
    });
  });
});
