/**
 * Focused tests for DLMM provider parsing helpers.
 * Covers parsePairToken price/price_usd behavior discovered via live API research.
 */

import { describe, it, expect } from "vitest";
import { parsePairToken } from "@/lib/providers-dlmm";

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
