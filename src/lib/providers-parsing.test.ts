/**
 * Phase 5/6A – Focused tests for safer provider parsing.
 * Tests that malformed payloads throw classifiable errors and
 * that valid payloads produce correct shapes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isObject,
  prop,
  toNumber,
  toString,
  toBool,
  toArray,
  toStringArray,
} from "@/lib/provider-parsing";
import { normalizePair, parsePairToken } from "@/lib/providers-dlmm";
import { classifyProviderError } from "@/lib/api-errors";

// ─── Parse Helper Unit Tests ─────────────────────────────────────────────────

describe("providers parse helpers", () => {

  describe("isObject", () => {
    it("returns true for plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
    });
    it("returns false for non-objects", () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject("string")).toBe(false);
      expect(isObject(42)).toBe(false);
    });
  });

  describe("prop", () => {
    it("accesses nested properties", () => {
      expect(prop({ a: { b: { c: 42 } } }, "a", "b", "c")).toBe(42);
    });
    it("returns undefined for missing paths", () => {
      expect(prop({ a: 1 }, "b")).toBeUndefined();
      expect(prop(null, "a")).toBeUndefined();
      expect(prop(undefined, "a")).toBeUndefined();
    });
    it("returns undefined when intermediate is not object", () => {
      expect(prop({ a: "string" }, "a", "b")).toBeUndefined();
    });
  });

  describe("toNumber", () => {
    it("parses finite numbers", () => {
      expect(toNumber(42)).toBe(42);
      expect(toNumber(0)).toBe(0);
      expect(toNumber(-3.14)).toBe(-3.14);
    });
    it("parses strict numeric strings", () => {
      expect(toNumber("3.14")).toBe(3.14);
      expect(toNumber("0")).toBe(0);
      expect(toNumber("-5")).toBe(-5);
      expect(toNumber("1e3")).toBe(1000);
      expect(toNumber("  42  ")).toBe(42); // trimmed
    });
    it("rejects non-finite numbers", () => {
      expect(toNumber(Infinity)).toBeUndefined();
      expect(toNumber(-Infinity)).toBeUndefined();
      expect(toNumber(NaN)).toBeUndefined();
    });
    it("rejects hostile/partial numeric strings", () => {
      expect(toNumber("123abc")).toBeUndefined();
      expect(toNumber("abc123")).toBeUndefined();
      expect(toNumber("1,000")).toBeUndefined();
      expect(toNumber("Infinity")).toBeUndefined();
      expect(toNumber("-Infinity")).toBeUndefined();
      expect(toNumber("NaN")).toBeUndefined();
      expect(toNumber("")).toBeUndefined();
      expect(toNumber("   ")).toBeUndefined();
      expect(toNumber("1.2.3")).toBeUndefined();
      expect(toNumber("0x1F")).toBeUndefined();
    });
    it("returns undefined for non-numeric types", () => {
      expect(toNumber(null)).toBeUndefined();
      expect(toNumber(undefined)).toBeUndefined();
      expect(toNumber({})).toBeUndefined();
      expect(toNumber([])).toBeUndefined();
      expect(toNumber(true)).toBeUndefined();
    });
  });

  describe("toString", () => {
    it("returns strings", () => {
      expect(toString("hello")).toBe("hello");
      expect(toString("")).toBe("");
    });
    it("returns undefined for non-strings", () => {
      expect(toString(42)).toBeUndefined();
      expect(toString(null)).toBeUndefined();
      expect(toString(undefined)).toBeUndefined();
    });
  });

  describe("toBool", () => {
    it("returns booleans", () => {
      expect(toBool(true)).toBe(true);
      expect(toBool(false)).toBe(false);
    });
    it("returns undefined for non-booleans", () => {
      expect(toBool(1)).toBeUndefined();
      expect(toBool("true")).toBeUndefined();
      expect(toBool(null)).toBeUndefined();
    });
  });

  describe("toArray", () => {
    it("returns arrays as-is", () => {
      expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(toArray([])).toEqual([]);
    });
    it("returns empty array for non-arrays", () => {
      expect(toArray(null)).toEqual([]);
      expect(toArray({})).toEqual([]);
      expect(toArray("string")).toEqual([]);
    });
  });
});

// ─── DLMM Parse Tests ────────────────────────────────────────────────────────

describe("DLMM normalizePair", () => {

  it("throws on null input", () => {
    expect(() => normalizePair(null)).toThrow("Invalid pool data: expected an object");
  });

  it("throws on array input", () => {
    expect(() => normalizePair([])).toThrow("Invalid pool data: expected an object");
  });

  it("throws on string input", () => {
    expect(() => normalizePair("not an object")).toThrow("Invalid pool data: expected an object");
  });

  it("throws on object without pool address", () => {
    expect(() => normalizePair({ name: "test" })).toThrow("Invalid pool data: missing pool address");
  });

  it("parses a valid minimal pool", () => {
    const result = normalizePair({
      pool_address: "ABC123",
      current_price: 1.5,
      token_x: { mint: "mintX", name: "TokenX", decimals: 9 },
      token_y: { mint: "mintY", name: "TokenY", decimals: 6 },
    });
    expect(result.poolAddress).toBe("ABC123");
    expect(result.priceTokenYPerTokenX).toBe(1.5);
    expect(result.tokenX.mint).toBe("mintX");
    expect(result.tokenY.mint).toBe("mintY");
  });

  it("handles string current_price", () => {
    const result = normalizePair({
      pool_address: "ABC123",
      current_price: "2.5",
      token_x: { mint: "x" },
      token_y: { mint: "y" },
    });
    expect(result.priceTokenYPerTokenX).toBe(2.5);
  });

  it("falls back to mint_x/mint_y when token objects lack mint", () => {
    const result = normalizePair({
      pool_address: "ABC123",
      mint_x: "fallbackX",
      mint_y: "fallbackY",
      token_x: { name: "X" },
      token_y: { name: "Y" },
    });
    expect(result.tokenX.mint).toBe("fallbackX");
    expect(result.tokenY.mint).toBe("fallbackY");
  });

  it("throws when token X mint is missing after all fallbacks", () => {
    expect(() => normalizePair({
      pool_address: "ABC123",
      token_x: { name: "X" },
      token_y: { mint: "y" },
    })).toThrow("Invalid pool data: missing token X mint");
  });

  it("throws when token Y mint is missing after all fallbacks", () => {
    expect(() => normalizePair({
      pool_address: "ABC123",
      token_x: { mint: "x" },
      token_y: { name: "Y" },
    })).toThrow("Invalid pool data: missing token Y mint");
  });

  it("throws when both token mints are missing", () => {
    expect(() => normalizePair({
      pool_address: "ABC123",
      token_x: { name: "X" },
      token_y: { name: "Y" },
    })).toThrow("Invalid pool data: missing token X mint");
  });

  describe("parsePairToken", () => {
    it("returns empty mint for non-object", () => {
      expect(parsePairToken(null)).toEqual({ mint: "" });
      expect(parsePairToken(undefined)).toEqual({ mint: "" });
      expect(parsePairToken("string")).toEqual({ mint: "" });
    });

    it("parses valid token data", () => {
      const result = parsePairToken({
        mint: "abc",
        name: "Token",
        symbol: "TKN",
        decimals: 9,
        price_usd: 1.23,
        verified: true,
        holders: 100,
        freeze_authority_disabled: true,
        market_cap: 1000000,
      });
      expect(result.mint).toBe("abc");
      expect(result.name).toBe("Token");
      expect(result.symbol).toBe("TKN");
      expect(result.decimals).toBe(9);
      expect(result.priceUsd).toBe(1.23);
      expect(result.verified).toBe(true);
      expect(result.holders).toBe(100);
      expect(result.freezeAuthorityDisabled).toBe(true);
      expect(result.marketCap).toBe(1000000);
    });

    it("uses address field as fallback for mint", () => {
      const result = parsePairToken({ address: "xyz" });
      expect(result.mint).toBe("xyz");
    });
  });

  describe("tags validation", () => {
    it("returns undefined for non-array", () => {
      expect(toStringArray(null)).toBeUndefined();
      expect(toStringArray(undefined)).toBeUndefined();
      expect(toStringArray("string")).toBeUndefined();
      expect(toStringArray(42)).toBeUndefined();
    });

    it("returns undefined for empty array", () => {
      expect(toStringArray([])).toBeUndefined();
    });

    it("filters out non-string elements", () => {
      expect(toStringArray(["valid", 123, null, "also-valid", true, {}])).toEqual(["valid", "also-valid"]);
    });

    it("returns undefined when all elements are non-string", () => {
      expect(toStringArray([123, null, true, {}])).toBeUndefined();
    });

    it("returns valid string array", () => {
      expect(toStringArray(["tag1", "tag2"])).toEqual(["tag1", "tag2"]);
    });

    it("normalizePair filters tags correctly", () => {
      const result = normalizePair({
        pool_address: "ABC123",
        token_x: { mint: "x" },
        token_y: { mint: "y" },
        tags: ["valid", 123, null, "also-valid"],
      });
      expect(result.tags).toEqual(["valid", "also-valid"]);
    });

    it("normalizePair returns undefined tags for all-invalid array", () => {
      const result = normalizePair({
        pool_address: "ABC123",
        token_x: { mint: "x" },
        token_y: { mint: "y" },
        tags: [123, null, true],
      });
      expect(result.tags).toBeUndefined();
    });
  });

  describe("hostile numeric values in pool data", () => {
    it("rejects Infinity in current_price", () => {
      const result = normalizePair({
        pool_address: "ABC123",
        current_price: Infinity,
        token_x: { mint: "x" },
        token_y: { mint: "y" },
      });
      expect(result.priceTokenYPerTokenX).toBeUndefined();
    });

    it("rejects partial numeric string in current_price", () => {
      const result = normalizePair({
        pool_address: "ABC123",
        current_price: "123abc",
        token_x: { mint: "x" },
        token_y: { mint: "y" },
      });
      expect(result.priceTokenYPerTokenX).toBeUndefined();
    });

    it("rejects comma-formatted numbers", () => {
      const result = normalizePair({
        pool_address: "ABC123",
        current_price: "1,000",
        token_x: { mint: "x" },
        token_y: { mint: "y" },
        tvl: "1,000,000",
      });
      expect(result.priceTokenYPerTokenX).toBeUndefined();
      expect(result.tvlUsd).toBeUndefined();
    });

    it("rejects NaN in numeric fields", () => {
      const result = normalizePair({
        pool_address: "ABC123",
        current_price: NaN,
        token_x: { mint: "x", decimals: NaN },
        token_y: { mint: "y" },
        tvl: NaN,
      });
      expect(result.priceTokenYPerTokenX).toBeUndefined();
      expect(result.tvlUsd).toBeUndefined();
      expect(result.tokenX.decimals).toBeUndefined();
    });
  });
});

// ─── DLMM Blacklist Selection Tests ──────────────────────────────────────────

describe("DLMM blacklist selection policy", () => {
  // Helper to build a minimal pool object
  function makePool(addr: string, price: number, blacklisted: unknown) {
    return {
      pool_address: addr,
      current_price: price,
      is_blacklisted: blacklisted,
      token_x: { mint: "x" },
      token_y: { mint: "y" },
    };
  }

  it("normalizePair stores boolean blacklist correctly", () => {
    const result = normalizePair(makePool("p1", 1.0, true));
    expect(result.isBlacklisted).toBe(true);
  });

  it("normalizePair stores undefined for non-boolean blacklist", () => {
    const result = normalizePair(makePool("p1", 1.0, "true"));
    expect(result.isBlacklisted).toBeUndefined();
  });

  it("normalizePair stores undefined for numeric blacklist", () => {
    const result = normalizePair(makePool("p1", 1.0, 1));
    expect(result.isBlacklisted).toBeUndefined();
  });
});

// ─── Provider fetch error classification ─────────────────────────────────────

describe("provider error classification via Phase 4", () => {
  it("classifies invalid JSON errors as INVALID_RESPONSE", () => {
    const err = classifyProviderError("Invalid JSON in response");
    expect(err.code).toBe("INVALID_RESPONSE");
  });

  it("classifies invalid response object errors as INVALID_RESPONSE", () => {
    const err = classifyProviderError("Invalid response from DexScreener: expected object");
    expect(err.code).toBe("INVALID_RESPONSE");
  });

  it("classifies invalid pool data errors as INVALID_RESPONSE", () => {
    const err = classifyProviderError("Invalid pool data: expected an object");
    expect(err.code).toBe("INVALID_RESPONSE");
  });

  it("classifies account not found as NO_DATA_FOUND", () => {
    const err = classifyProviderError("Account not found on-chain");
    expect(err.code).toBe("NO_DATA_FOUND");
  });

  it("classifies no DLMM pool found as NO_DATA_FOUND", () => {
    const err = classifyProviderError("No DLMM pool found for mints abc / def");
    expect(err.code).toBe("NO_DATA_FOUND");
  });

  it("classifies failed to parse as INVALID_RESPONSE", () => {
    const err = classifyProviderError("Failed to parse mint layout");
    expect(err.code).toBe("INVALID_RESPONSE");
  });

  it("classifies RPC error with stable prefix as PROVIDER_UNAVAILABLE", () => {
    // RPC errors have a stable prefix so arbitrary messages like "not found" don't leak
    const err = classifyProviderError("RPC error: Method not found");
    expect(err.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("classifies RPC error unknown as PROVIDER_UNAVAILABLE", () => {
    const err = classifyProviderError("RPC error: unknown");
    expect(err.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("classifies missing token mint errors as INVALID_RESPONSE", () => {
    const err = classifyProviderError("Invalid pool data: missing token X mint");
    expect(err.code).toBe("INVALID_RESPONSE");
  });

  it("classifies invalid DLMM response as INVALID_RESPONSE", () => {
    const err = classifyProviderError("Invalid response from DLMM: expected array or object with data");
    expect(err.code).toBe("INVALID_RESPONSE");
  });

  it("classifies HTTP errors as PROVIDER_UNAVAILABLE", () => {
    const err = classifyProviderError("HTTP 500");
    expect(err.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("classifies RPC HTTP errors as PROVIDER_UNAVAILABLE", () => {
    const err = classifyProviderError("RPC HTTP 503");
    expect(err.code).toBe("PROVIDER_UNAVAILABLE");
  });
});

// ─── Integration: fetchDexScreener with mocked fetch ─────────────────────────

describe("fetchDexScreener parsing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws on non-JSON response", async () => {
    const { fetchDexScreener } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("not json", { status: 200 }),
    );
    await expect(fetchDexScreener("mint123")).rejects.toThrow("Invalid JSON in response");
  });

  it("throws on non-object response", async () => {
    const { fetchDexScreener } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify("just a string"), { status: 200 }),
    );
    await expect(fetchDexScreener("mint123")).rejects.toThrow("Invalid response from DexScreener: expected object");
  });

  it("returns empty result for empty pairs array", async () => {
    const { fetchDexScreener } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ pairs: [] }), { status: 200 }),
    );
    const result = await fetchDexScreener("mint123");
    expect(result).toEqual({});
  });

  it("parses valid DexScreener response", async () => {
    const { fetchDexScreener } = await import("@/lib/providers");
    const payload = {
      pairs: [
        {
          priceUsd: "0.05",
          priceNative: "0.001",
          marketCap: 500000,
          volume: { h24: 10000 },
          liquidity: { usd: 200000 },
          pairAddress: "pair123",
          dexId: "raydium",
          baseToken: { address: "mint123", name: "TestToken", symbol: "TT" },
          quoteToken: { address: "other", name: "SOL", symbol: "SOL" },
          info: { imageUrl: "https://example.com/img.png" },
        },
      ],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    const result = await fetchDexScreener("mint123");
    expect(result.priceUsd).toBe(0.05);
    expect(result.name).toBe("TestToken");
    expect(result.symbol).toBe("TT");
    expect(result.liquidity).toBe(200000);
    expect(result.pairAddress).toBe("pair123");
  });
});

// ─── Integration: fetchRugCheck with mocked fetch ────────────────────────────

describe("fetchRugCheck parsing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws on non-object response", async () => {
    const { fetchRugCheck } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(null), { status: 200 }),
    );
    await expect(fetchRugCheck("mint123")).rejects.toThrow("Invalid response from RugCheck: expected object");
  });

  it("handles response with no risks array gracefully", async () => {
    const { fetchRugCheck } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ score: 75, riskLevel: "high" }), { status: 200 }),
    );
    const result = await fetchRugCheck("mint123");
    expect(result.score).toBe(75);
    expect(result.level).toBe("high");
    expect(result.warnings).toEqual([]);
    expect(result.dangers).toEqual([]);
  });

  it("parses risks into warnings and dangers", async () => {
    const { fetchRugCheck } = await import("@/lib/providers");
    const payload = {
      score: 50,
      riskLevel: "medium",
      risks: [
        { description: "Low liquidity", level: "warning" },
        { description: "Honeypot detected", level: "danger" },
        { name: "Rug pull risk", level: "critical" },
      ],
      topHolders: [{ pct: 45.5 }],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    const result = await fetchRugCheck("mint123");
    expect(result.score).toBe(50);
    expect(result.warnings).toEqual(["Low liquidity"]);
    expect(result.dangers).toEqual(["Honeypot detected", "Rug pull risk"]);
    expect(result.topHolderPct).toBe(45.5);
  });
});

// ─── Integration: RPC parsing with mocked fetch ──────────────────────────────

describe("fetchSolanaRpc parsing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws on non-JSON RPC response", async () => {
    const { fetchSolanaRpc } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("not json at all", { status: 200 }),
    );
    await expect(fetchSolanaRpc("mint123")).rejects.toThrow("Invalid JSON in RPC response");
  });

  it("throws on RPC error field with stable prefix", async () => {
    const { fetchSolanaRpc } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: "Method not found" } }), { status: 200 }),
    );
    await expect(fetchSolanaRpc("mint123")).rejects.toThrow("RPC error: Method not found");
  });

  it("throws when result has no value (account not found)", async () => {
    const { fetchSolanaRpc } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { value: null } }), { status: 200 }),
    );
    await expect(fetchSolanaRpc("mint123")).rejects.toThrow("Account not found on-chain");
  });

  it("throws when data array is missing", async () => {
    const { fetchSolanaRpc } = await import("@/lib/providers");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: { value: { owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", data: null } },
        }),
        { status: 200 },
      ),
    );
    await expect(fetchSolanaRpc("mint123")).rejects.toThrow("No account data");
  });
});

// ─── Integration: DLMM fetch with mocked fetch ──────────────────────────────

describe("fetchMeteoraDlmmPool parsing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws on non-object response", async () => {
    const { fetchMeteoraDlmmPool } = await import("@/lib/providers-dlmm");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(null), { status: 200 }),
    );
    await expect(fetchMeteoraDlmmPool("pool123")).rejects.toThrow("Invalid response from DLMM: expected object");
  });

  it("throws on response missing pool address", async () => {
    const { fetchMeteoraDlmmPool } = await import("@/lib/providers-dlmm");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ name: "test" }), { status: 200 }),
    );
    await expect(fetchMeteoraDlmmPool("pool123")).rejects.toThrow("Invalid pool data: missing pool address");
  });

  it("parses valid pool response", async () => {
    const { fetchMeteoraDlmmPool } = await import("@/lib/providers-dlmm");
    const payload = {
      pool_address: "pool123",
      current_price: 2.0,
      bin_step: 10,
      token_x: { mint: "mintX", name: "X", decimals: 9 },
      token_y: { mint: "mintY", name: "Y", decimals: 6 },
      tvl: 50000,
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    const result = await fetchMeteoraDlmmPool("pool123");
    expect(result.poolAddress).toBe("pool123");
    expect(result.priceTokenYPerTokenX).toBe(2.0);
    expect(result.binStep).toBe(10);
    expect(result.tvlUsd).toBe(50000);
  });
});

describe("fetchMeteoraDlmmPairByMints parsing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws on invalid response shape", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify("string"), { status: 200 }),
    );
    await expect(fetchMeteoraDlmmPairByMints("a", "b")).rejects.toThrow(
      "Invalid response from DLMM: expected array or object with data",
    );
  });

  it("throws when no pools found", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    await expect(fetchMeteoraDlmmPairByMints("mintA", "mintB")).rejects.toThrow(
      /No DLMM pool found/,
    );
  });

  it("selects non-blacklisted pool with positive price", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    const payload = {
      data: [
        { pool_address: "blacklisted", current_price: 1.0, is_blacklisted: true, token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "good", current_price: 2.0, is_blacklisted: false, token_x: { mint: "a" }, token_y: { mint: "b" } },
      ],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    const result = await fetchMeteoraDlmmPairByMints("a", "b");
    expect(result.poolAddress).toBe("good");
  });

  it("treats truthy non-boolean blacklist values as unsafe", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    const payload = {
      data: [
        { pool_address: "stringTrue", current_price: 3.0, is_blacklisted: "true", token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "numericOne", current_price: 2.0, is_blacklisted: 1, token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "safe", current_price: 1.0, is_blacklisted: false, token_x: { mint: "a" }, token_y: { mint: "b" } },
      ],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    const result = await fetchMeteoraDlmmPairByMints("a", "b");
    expect(result.poolAddress).toBe("safe");
  });

  it("treats absent blacklist field as safe", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    const payload = {
      data: [
        { pool_address: "noField", current_price: 5.0, token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "explicit", current_price: 1.0, is_blacklisted: false, token_x: { mint: "a" }, token_y: { mint: "b" } },
      ],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    const result = await fetchMeteoraDlmmPairByMints("a", "b");
    // "noField" has undefined is_blacklisted which is treated as safe, and higher price
    expect(result.poolAddress).toBe("noField");
  });

  it("throws when all pools are blacklisted (boolean true)", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    const payload = {
      data: [
        { pool_address: "bl1", current_price: 5.0, is_blacklisted: true, token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "bl2", current_price: 3.0, is_blacklisted: true, token_x: { mint: "a" }, token_y: { mint: "b" } },
      ],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    await expect(fetchMeteoraDlmmPairByMints("a", "b")).rejects.toThrow(
      /No DLMM pool found/,
    );
  });

  it("throws when all pools have truthy non-boolean blacklist values", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    const payload = {
      data: [
        { pool_address: "strTrue", current_price: 5.0, is_blacklisted: "true", token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "numOne", current_price: 3.0, is_blacklisted: 1, token_x: { mint: "a" }, token_y: { mint: "b" } },
      ],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    await expect(fetchMeteoraDlmmPairByMints("a", "b")).rejects.toThrow(
      /No DLMM pool found/,
    );
  });

  it("throws when all pools are unsafe (mixed blacklist types)", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    const payload = {
      data: [
        { pool_address: "boolTrue", current_price: 10.0, is_blacklisted: true, token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "strTrue", current_price: 5.0, is_blacklisted: "true", token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "numOne", current_price: 3.0, is_blacklisted: 1, token_x: { mint: "a" }, token_y: { mint: "b" } },
      ],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    await expect(fetchMeteoraDlmmPairByMints("a", "b")).rejects.toThrow(
      /No DLMM pool found/,
    );
  });

  it("throws when pools exist but none have positive price", async () => {
    const { fetchMeteoraDlmmPairByMints } = await import("@/lib/providers-dlmm");
    const payload = {
      data: [
        { pool_address: "zero", current_price: 0, is_blacklisted: false, token_x: { mint: "a" }, token_y: { mint: "b" } },
        { pool_address: "noPrice", is_blacklisted: false, token_x: { mint: "a" }, token_y: { mint: "b" } },
      ],
    };
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );
    await expect(fetchMeteoraDlmmPairByMints("a", "b")).rejects.toThrow(
      /No DLMM pool found/,
    );
  });
});

describe("fetchMeteoraDlmmPoolsByMint parsing", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("discovers exact mint matches and sorts by TVL then volume", async () => {
    const { fetchMeteoraDlmmPoolsByMint } = await import("@/lib/providers-dlmm");
    const mint = "mintA";
    const payload = {
      total: 4,
      data: [
        { pool_address: "low", current_price: 1, tvl: 100, trade_volume_24h: 5000, token_x: { mint }, token_y: { mint: "sol" } },
        { pool_address: "wrong", current_price: 1, tvl: 100000, token_x: { mint: "other" }, token_y: { mint: "sol" } },
        { pool_address: "highest", current_price: 1, tvl: 1000, trade_volume_24h: 10, token_x: { mint: "sol" }, token_y: { mint } },
        { pool_address: "tieVolume", current_price: 1, tvl: 1000, trade_volume_24h: 20, token_x: { mint }, token_y: { mint: "usdc" } },
      ],
    };

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const result = await fetchMeteoraDlmmPoolsByMint(mint);

    expect(result.totalFound).toBe(4);
    expect(result.pools.map((pool) => pool.poolAddress)).toEqual([
      "tieVolume",
      "highest",
      "low",
    ]);
  });

  it("supports token address fields and excludes blacklisted pools", async () => {
    const { fetchMeteoraDlmmPoolsByMint } = await import("@/lib/providers-dlmm");
    const mint = "mintA";
    const payload = {
      data: [
        { address: "blacklisted", current_price: 1, tvl: 2000, is_blacklisted: true, token_x: { address: mint }, token_y: { address: "sol" } },
        { address: "safe", current_price: 1, tvl: 1000, is_blacklisted: false, token_x: { address: "sol" }, token_y: { address: mint } },
      ],
    };

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const result = await fetchMeteoraDlmmPoolsByMint(mint);

    expect(result.pools).toHaveLength(1);
    expect(result.pools[0].poolAddress).toBe("safe");
    expect(result.pools[0].tokenY.mint).toBe(mint);
  });

  it("returns no pools when fuzzy results do not exactly match the mint", async () => {
    const { fetchMeteoraDlmmPoolsByMint } = await import("@/lib/providers-dlmm");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({
        total: 1,
        data: [
          { pool_address: "fuzzy", current_price: 1, token_x: { mint: "other" }, token_y: { mint: "sol" } },
        ],
      }), { status: 200 }),
    );

    const result = await fetchMeteoraDlmmPoolsByMint("mintA");

    expect(result.totalFound).toBe(1);
    expect(result.pools).toEqual([]);
  });

  it("throws on invalid discovery response shape", async () => {
    const { fetchMeteoraDlmmPoolsByMint } = await import("@/lib/providers-dlmm");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ pools: [] }), { status: 200 }),
    );

    await expect(fetchMeteoraDlmmPoolsByMint("mintA")).rejects.toThrow(
      "Invalid response from DLMM pools endpoint",
    );
  });
});
