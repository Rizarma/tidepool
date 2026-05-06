/**
 * Route-level API contract tests for GET /api/scan/pools?mint=<address>
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/providers-dlmm", () => ({
  fetchMeteoraDlmmPoolsByMint: vi.fn(),
}));

import { fetchMeteoraDlmmPoolsByMint } from "@/lib/providers-dlmm";

const VALID_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const OTHER_MINT = "So11111111111111111111111111111111111111112";

function makeRequest(params?: string): Request {
  const url = params
    ? `http://localhost/api/scan/pools?${params}`
    : "http://localhost/api/scan/pools";
  return new Request(url);
}

async function parseJson(response: Response) {
  return response.json();
}

function makePairInfo(overrides = {}) {
  return {
    poolAddress: "11111111111111111111111111111111",
    name: "USDC-SOL",
    tokenX: { mint: VALID_MINT, name: "USDC", symbol: "USDC", decimals: 6 },
    tokenY: { mint: OTHER_MINT, name: "SOL", symbol: "SOL", decimals: 9 },
    priceTokenYPerTokenX: 0.007,
    inversePrice: 142.85,
    binStep: 10,
    tvlUsd: 500000,
    volume24h: 50000,
    ...overrides,
  };
}

describe("GET /api/scan/pools", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns MISSING_PARAMETER 400 when mint is absent", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error.code).toBe("MISSING_PARAMETER");
  });

  it("returns INVALID_PARAMETER 400 for invalid mint", async () => {
    const res = await GET(makeRequest("mint=not-valid!!!"));
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error.code).toBe("INVALID_PARAMETER");
  });

  it("returns pool_discovery report with primary pool", async () => {
    const pool = makePairInfo();
    vi.mocked(fetchMeteoraDlmmPoolsByMint).mockResolvedValue({
      totalFound: 3,
      pools: [pool, makePairInfo({ poolAddress: "22222222222222222222222222222222", tvlUsd: 200000 })],
    });

    const res = await GET(makeRequest(`mint=${VALID_MINT}`));
    expect(res.status).toBe(200);
    expect(fetchMeteoraDlmmPoolsByMint).toHaveBeenCalledWith(VALID_MINT);

    const body = await parseJson(res);
    expect(body.kind).toBe("pool_discovery");
    expect(body.query).toEqual({ mint: VALID_MINT });
    expect(body.primaryPool.poolAddress).toBe(pool.poolAddress);
    expect(body.totalFound).toBe(3);
    expect(body.totalMatched).toBe(2);
    expect(body.sources[0].success).toBe(true);
  });

  it("returns NO_DATA_FOUND 404 when no exact pools match", async () => {
    vi.mocked(fetchMeteoraDlmmPoolsByMint).mockResolvedValue({ totalFound: 2, pools: [] });

    const res = await GET(makeRequest(`mint=${VALID_MINT}`));
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body.error.code).toBe("NO_DATA_FOUND");
    expect(body.error.message).toBe("No pools found for this mint");
    expect(body.sources[0].success).toBe(true);
  });

  it("sanitizes provider errors in sources", async () => {
    vi.mocked(fetchMeteoraDlmmPoolsByMint).mockRejectedValue(new Error("HTTP 503"));

    const res = await GET(makeRequest(`mint=${VALID_MINT}`));
    expect(res.status).toBe(502);
    const body = await parseJson(res);
    expect(body.error.code).toBe("PROVIDER_UNAVAILABLE");
    expect(body.sources[0].success).toBe(false);
    expect(body.sources[0].error).toBe("Provider unavailable");
  });
});
