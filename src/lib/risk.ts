/**
 * Risk scoring engine – produces an explainable score from provider data.
 */

import type { RiskFactor, RiskAssessment, TokenSupply, TokenMarket, TokenTrust } from "./types";

interface RiskInput {
  supply: TokenSupply;
  market: TokenMarket;
  trust: TokenTrust;
  rugCheckWarnings?: string[];
  rugCheckDangers?: string[];
}

export function computeRisk(input: RiskInput): RiskAssessment {
  const factors: RiskFactor[] = [];

  // 1. Mint authority still active
  if (input.supply.mintAuthority) {
    factors.push({
      key: "mint_authority_active",
      label: "Mint authority is active",
      weight: 20,
      detail: `Authority: ${input.supply.mintAuthority}`,
    });
  }

  // 2. Freeze authority still active
  if (input.supply.freezeAuthority) {
    factors.push({
      key: "freeze_authority_active",
      label: "Freeze authority is active",
      weight: 15,
      detail: `Authority: ${input.supply.freezeAuthority}`,
    });
  }

  // 3. Low liquidity (< $10k)
  if (input.market.liquidity != null && input.market.liquidity < 10_000) {
    factors.push({
      key: "low_liquidity",
      label: "Low liquidity",
      weight: 25,
      detail: `Liquidity: $${input.market.liquidity.toLocaleString()}`,
    });
  } else if (input.market.liquidity != null && input.market.liquidity < 50_000) {
    factors.push({
      key: "moderate_liquidity",
      label: "Moderate liquidity",
      weight: 10,
      detail: `Liquidity: $${input.market.liquidity.toLocaleString()}`,
    });
  }

  // 4. Holder concentration (top holder > 20%)
  if (input.trust.topHolderPct != null && input.trust.topHolderPct > 20) {
    const w = input.trust.topHolderPct > 50 ? 30 : 15;
    factors.push({
      key: "holder_concentration",
      label: "High holder concentration",
      weight: w,
      detail: `Top holder owns ${input.trust.topHolderPct.toFixed(1)}%`,
    });
  }

  // 5. RugCheck warnings
  if (input.rugCheckWarnings && input.rugCheckWarnings.length > 0) {
    factors.push({
      key: "rugcheck_warnings",
      label: "RugCheck warnings",
      weight: Math.min(input.rugCheckWarnings.length * 5, 15),
      detail: input.rugCheckWarnings.slice(0, 3).join("; "),
    });
  }

  // 6. RugCheck dangers
  if (input.rugCheckDangers && input.rugCheckDangers.length > 0) {
    factors.push({
      key: "rugcheck_dangers",
      label: "RugCheck danger signals",
      weight: Math.min(input.rugCheckDangers.length * 10, 30),
      detail: input.rugCheckDangers.slice(0, 3).join("; "),
    });
  }

  // 7. Not on Jupiter strict list
  if (input.trust.jupiterStrict === false) {
    factors.push({
      key: "not_jupiter_strict",
      label: "Not on Jupiter strict list",
      weight: 10,
    });
  }

  // 8. No market data at all
  if (input.market.priceUsd == null && input.market.liquidity == null) {
    factors.push({
      key: "missing_market",
      label: "No market data available",
      weight: 20,
    });
  }

  // Compute aggregate score (capped at 100)
  const rawScore = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.min(rawScore, 100);

  const level: RiskAssessment["level"] =
    score >= 70 ? "critical" : score >= 45 ? "high" : score >= 20 ? "medium" : "low";

  return { score, level, factors };
}
