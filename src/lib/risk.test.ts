import { describe, it, expect } from "vitest";
import { computeRisk } from "./risk";
import type { TokenSupply, TokenMarket, TokenTrust } from "./types";

function makeInput(overrides: {
  supply?: Partial<TokenSupply>;
  market?: Partial<TokenMarket>;
  trust?: Partial<TokenTrust>;
  rugCheckWarnings?: string[];
  rugCheckDangers?: string[];
} = {}) {
  return {
    supply: { total: "1000000000", decimals: 9, mintAuthority: null, freezeAuthority: null, ...overrides.supply },
    market: { priceUsd: 0.01, liquidity: 100_000, ...overrides.market },
    trust: { jupiterStrict: true, topHolderPct: 5, ...overrides.trust },
    rugCheckWarnings: overrides.rugCheckWarnings,
    rugCheckDangers: overrides.rugCheckDangers,
  };
}

describe("computeRisk", () => {
  it("returns low risk for a safe token", () => {
    const result = computeRisk(makeInput());
    expect(result.score).toBe(0);
    expect(result.level).toBe("low");
    expect(result.factors).toHaveLength(0);
  });

  it("flags active mint authority (weight 20)", () => {
    const result = computeRisk(makeInput({ supply: { mintAuthority: "SomeAuthority111" } }));
    const factor = result.factors.find((f) => f.key === "mint_authority_active");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(20);
  });

  it("flags active freeze authority (weight 15)", () => {
    const result = computeRisk(makeInput({ supply: { freezeAuthority: "FreezeAuth222" } }));
    const factor = result.factors.find((f) => f.key === "freeze_authority_active");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(15);
  });

  it("flags low liquidity < $10k (weight 25)", () => {
    const result = computeRisk(makeInput({ market: { liquidity: 5000 } }));
    const factor = result.factors.find((f) => f.key === "low_liquidity");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(25);
  });

  it("flags moderate liquidity $10k-$50k (weight 10)", () => {
    const result = computeRisk(makeInput({ market: { liquidity: 30_000 } }));
    const factor = result.factors.find((f) => f.key === "moderate_liquidity");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(10);
  });

  it("does not flag liquidity >= $50k", () => {
    const result = computeRisk(makeInput({ market: { liquidity: 50_000 } }));
    const liquidityFactors = result.factors.filter(
      (f) => f.key === "low_liquidity" || f.key === "moderate_liquidity"
    );
    expect(liquidityFactors).toHaveLength(0);
  });

  it("flags holder concentration > 20% with weight 15", () => {
    const result = computeRisk(makeInput({ trust: { topHolderPct: 35 } }));
    const factor = result.factors.find((f) => f.key === "holder_concentration");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(15);
  });

  it("flags holder concentration > 50% with weight 30", () => {
    const result = computeRisk(makeInput({ trust: { topHolderPct: 60 } }));
    const factor = result.factors.find((f) => f.key === "holder_concentration");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(30);
  });

  it("does not flag holder concentration <= 20%", () => {
    const result = computeRisk(makeInput({ trust: { topHolderPct: 20 } }));
    const factor = result.factors.find((f) => f.key === "holder_concentration");
    expect(factor).toBeUndefined();
  });

  it("flags rugcheck warnings (capped at weight 15)", () => {
    const result = computeRisk(makeInput({ rugCheckWarnings: ["w1", "w2", "w3", "w4"] }));
    const factor = result.factors.find((f) => f.key === "rugcheck_warnings");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(15); // 4*5=20 capped to 15
  });

  it("flags rugcheck dangers (capped at weight 30)", () => {
    const result = computeRisk(makeInput({ rugCheckDangers: ["d1", "d2", "d3", "d4"] }));
    const factor = result.factors.find((f) => f.key === "rugcheck_dangers");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(30); // 4*10=40 capped to 30
  });

  it("flags not on Jupiter strict list (weight 10)", () => {
    const result = computeRisk(makeInput({ trust: { jupiterStrict: false } }));
    const factor = result.factors.find((f) => f.key === "not_jupiter_strict");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(10);
  });

  it("flags missing market data (weight 20)", () => {
    const result = computeRisk(makeInput({ market: { priceUsd: undefined, liquidity: undefined } }));
    const factor = result.factors.find((f) => f.key === "missing_market");
    expect(factor).toBeDefined();
    expect(factor!.weight).toBe(20);
  });

  it("caps total score at 100", () => {
    const result = computeRisk(makeInput({
      supply: { mintAuthority: "A", freezeAuthority: "B" },
      market: { liquidity: 1000 },
      trust: { topHolderPct: 80, jupiterStrict: false },
      rugCheckWarnings: ["w1", "w2", "w3"],
      rugCheckDangers: ["d1", "d2", "d3", "d4"],
    }));
    expect(result.score).toBe(100);
  });

  it("assigns correct risk levels based on score thresholds", () => {
    // score 0 -> low
    expect(computeRisk(makeInput()).level).toBe("low");

    // score 20 -> medium (mint authority = 20)
    expect(computeRisk(makeInput({ supply: { mintAuthority: "X" } })).level).toBe("medium");

    // score 45 -> high (mint 20 + low liquidity 25 = 45)
    expect(computeRisk(makeInput({ supply: { mintAuthority: "X" }, market: { liquidity: 5000 } })).level).toBe("high");

    // score >= 70 -> critical
    expect(computeRisk(makeInput({
      supply: { mintAuthority: "X", freezeAuthority: "Y" },
      market: { liquidity: 5000 },
      trust: { topHolderPct: 60 },
    })).level).toBe("critical");
  });
});
