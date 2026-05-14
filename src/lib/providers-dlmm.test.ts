/**
 * Focused tests for DLMM provider parsing helpers.
 * Covers parsePairToken price/price_usd behavior discovered via live API research.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parsePairToken, fetchMeteoraDlmmGroupPools } from "@/lib/providers-dlmm";
import { fetchJson } from "@/lib/provider-parsing";

vi.mock("@/lib/provider-parsing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/provider-parsing")>(
    "@/lib/provider-parsing",
  );
  return {
    ...actual,
    fetchJson: vi.fn(),
  };
});

describe("parsePairToken", () => {
  it("uses price_usd when present", () => {
    const result = parsePairToken({
      mint: "abc",
      price_usd: 1.23,
    });
    expect(result.priceUsd).toBe(1.23);
  });

  it("falls back to price when price_usd is absent", () => {
    const result = parsePairToken({
      mint: "abc",
      price: 0.99,
    });
    expect(result.priceUsd).toBe(0.99);
  });

  it("prefers price_usd over price when both are present", () => {
    const result = parsePairToken({
      mint: "abc",
      price_usd: 1.0,
      price: 0.95,
    });
    expect(result.priceUsd).toBe(1.0);
  });

  it("returns undefined priceUsd when neither field is present", () => {
    const result = parsePairToken({
      mint: "abc",
    });
    expect(result.priceUsd).toBeUndefined();
  });

  it("returns undefined priceUsd when both fields are non-numeric", () => {
    const result = parsePairToken({
      mint: "abc",
      price_usd: "nope",
      price: "nope",
    });
    expect(result.priceUsd).toBeUndefined();
  });
});

describe("fetchMeteoraDlmmGroupPools", () => {
  beforeEach(() => {
    vi.mocked(fetchJson).mockReset();
  });

  it("returns normalized pools from { data: [...] } response", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      data: [
        {
          address: "pool1",
          name: "A-B",
          token_x: { mint: "A", symbol: "A" },
          token_y: { mint: "B", symbol: "B" },
          pool_config: { bin_step: 20, base_fee_pct: 0.02 },
          tvl: 1000000,
          volume: { "24h": 50000 },
        },
        {
          address: "pool2",
          name: "A-B",
          token_x: { mint: "A", symbol: "A" },
          token_y: { mint: "B", symbol: "B" },
          pool_config: { bin_step: 50, base_fee_pct: 0.05 },
          tvl: 500000,
          volume: { "24h": 30000 },
        },
      ],
    });

    const result = await fetchMeteoraDlmmGroupPools("A", "B");
    expect(result).toHaveLength(2);
    expect(result[0].poolAddress).toBe("pool1");
    expect(result[0].binStep).toBe(20);
    expect(result[0].baseFeePct).toBe(0.02);
    expect(result[1].poolAddress).toBe("pool2");
    expect(result[1].binStep).toBe(50);
  });

  it("returns normalized pools from array response", async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      {
        address: "pool1",
        name: "A-B",
        token_x: { mint: "A", symbol: "A" },
        token_y: { mint: "B", symbol: "B" },
        pool_config: { bin_step: 20 },
        tvl: 1000000,
      },
    ]);

    const result = await fetchMeteoraDlmmGroupPools("A", "B");
    expect(result).toHaveLength(1);
    expect(result[0].poolAddress).toBe("pool1");
  });

  it("excludes blacklisted pools", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      data: [
        {
          address: "pool1",
          name: "A-B",
          token_x: { mint: "A", symbol: "A" },
          token_y: { mint: "B", symbol: "B" },
          is_blacklisted: false,
          tvl: 1000000,
        },
        {
          address: "pool2",
          name: "A-B",
          token_x: { mint: "A", symbol: "A" },
          token_y: { mint: "B", symbol: "B" },
          is_blacklisted: true,
          tvl: 500000,
        },
      ],
    });

    const result = await fetchMeteoraDlmmGroupPools("A", "B");
    expect(result).toHaveLength(1);
    expect(result[0].poolAddress).toBe("pool1");
    expect(result[0].isBlacklisted).toBe(false);
  });

  it("returns empty array when no pools", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ data: [] });
    const result = await fetchMeteoraDlmmGroupPools("A", "B");
    expect(result).toEqual([]);
  });

  it("throws for malformed response envelope", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ notData: [] });
    await expect(fetchMeteoraDlmmGroupPools("A", "B")).rejects.toThrow(
      "Invalid response",
    );
  });

  it("sorts mints lexicographically in URL", async () => {
    vi.mocked(fetchJson).mockResolvedValue({ data: [] });
    await fetchMeteoraDlmmGroupPools("B", "A");
    expect(vi.mocked(fetchJson)).toHaveBeenCalledWith(
      expect.stringContaining("/pools/groups/A-B?"),
    );
  });

  it("sorts result by TVL desc then volume desc", async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      data: [
        {
          address: "lowTvlHighVol",
          name: "A-B",
          token_x: { mint: "A", symbol: "A" },
          token_y: { mint: "B", symbol: "B" },
          tvl: 500000,
          volume: { "24h": 100000 },
          pool_config: { bin_step: 10 },
        },
        {
          address: "highTvlLowVol",
          name: "A-B",
          token_x: { mint: "A", symbol: "A" },
          token_y: { mint: "B", symbol: "B" },
          tvl: 1000000,
          volume: { "24h": 10000 },
          pool_config: { bin_step: 20 },
        },
      ],
    });

    const result = await fetchMeteoraDlmmGroupPools("A", "B");
    expect(result).toHaveLength(2);
    expect(result[0].poolAddress).toBe("highTvlLowVol");
    expect(result[1].poolAddress).toBe("lowTvlHighVol");
  });
});
