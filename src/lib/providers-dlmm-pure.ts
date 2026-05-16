/**
 * Pure Meteora DLMM normalization helpers — safe for browser and server.
 */

import type { DlmmPairInfo, PairToken } from "@/lib/types";
import { isObject, prop, toNumber, toString, toBool, toStringArray } from "@/lib/provider-parsing-pure";

export function parsePairToken(raw: unknown, amountField?: number): PairToken {
  if (!isObject(raw)) {
    return { mint: "" };
  }
  const result: PairToken = {
    mint: toString(raw.mint) ?? toString(raw.address) ?? "",
    name: toString(raw.name),
    symbol: toString(raw.symbol),
    decimals: toNumber(raw.decimals),
    priceUsd: toNumber(raw.price_usd) ?? toNumber(raw.price),
    verified: toBool(raw.verified) ?? toBool(raw.is_verified),
    amount: Number.isFinite(amountField) ? amountField : undefined,
    holders: toNumber(raw.holders),
    freezeAuthorityDisabled: toBool(raw.freeze_authority_disabled),
    totalSupply: toNumber(raw.total_supply),
    marketCap: toNumber(raw.market_cap),
  };

  const price = result.priceUsd;
  const supply = result.totalSupply;
  const rawMarketCap = result.marketCap;
  if (!rawMarketCap && price && supply) {
    result.marketCap = price * supply;
    result.marketCapFallback = true;
  }

  return result;
}

export function normalizePair(raw: unknown): DlmmPairInfo {
  if (!isObject(raw)) {
    throw new Error("Invalid pool data: expected an object");
  }

  const poolAddress: string =
    toString(raw.pool_address) ?? toString(raw.address) ?? toString(raw.pair) ?? "";
  if (!poolAddress) {
    throw new Error("Invalid pool data: missing pool address");
  }

  const currentPrice = toNumber(raw.current_price);
  const inversePrice =
    currentPrice && currentPrice > 0 ? 1 / currentPrice : undefined;

  const tokenXAmount = toNumber(raw.token_x_amount);
  const tokenYAmount = toNumber(raw.token_y_amount);

  const tokenXRaw = prop(raw, "token_x") ?? prop(raw, "mint_x_info");
  const tokenYRaw = prop(raw, "token_y") ?? prop(raw, "mint_y_info");

  const tokenX = parsePairToken(tokenXRaw, tokenXAmount);
  const tokenY = parsePairToken(tokenYRaw, tokenYAmount);

  if (!tokenX.mint) {
    const mintX = toString(raw.mint_x);
    if (mintX) tokenX.mint = mintX;
  }
  if (!tokenY.mint) {
    const mintY = toString(raw.mint_y);
    if (mintY) tokenY.mint = mintY;
  }

  if (!tokenX.mint) {
    throw new Error("Invalid pool data: missing token X mint");
  }
  if (!tokenY.mint) {
    throw new Error("Invalid pool data: missing token Y mint");
  }

  return {
    poolAddress,
    name: toString(raw.name),
    tokenX,
    tokenY,
    priceTokenYPerTokenX:
      currentPrice && !isNaN(currentPrice) ? currentPrice : undefined,
    inversePrice:
      inversePrice && !isNaN(inversePrice) ? inversePrice : undefined,
    binStep:
      toNumber(raw.bin_step) ?? toNumber(prop(raw, "pool_config", "bin_step")),
    baseFeePct:
      toNumber(raw.base_fee_percentage) ??
      toNumber(raw.base_fee_pct) ??
      toNumber(prop(raw, "pool_config", "base_fee_pct")),
    maxFeePct:
      toNumber(raw.max_fee_percentage) ??
      toNumber(raw.max_fee_pct) ??
      toNumber(prop(raw, "pool_config", "max_fee_pct")),
    protocolFeePct:
      toNumber(raw.protocol_fee_percentage) ??
      toNumber(raw.protocol_fee_pct) ??
      toNumber(prop(raw, "pool_config", "protocol_fee_pct")),
    dynamicFeePct:
      toNumber(raw.dynamic_fee_percentage) ?? toNumber(raw.dynamic_fee_pct),
    tvlUsd: toNumber(raw.tvl) ?? toNumber(raw.liquidity),
    volume24h: toNumber(prop(raw, "volume", "24h")) ?? toNumber(raw.trade_volume_24h),
    fees24h: toNumber(prop(raw, "fees", "24h")) ?? toNumber(raw.fee_volume_24h),
    volume: (() => {
      const out: Record<string, number> = {};
      const nested = isObject(raw.volume) ? raw.volume : undefined;
      if (nested) {
        for (const key of Object.keys(nested)) {
          const val = toNumber(nested[key]);
          if (val !== undefined) out[key] = val;
        }
      }
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
    fees: (() => {
      const out: Record<string, number> = {};
      const nested = isObject(raw.fees) ? raw.fees : undefined;
      if (nested) {
        for (const key of Object.keys(nested)) {
          const val = toNumber(nested[key]);
          if (val !== undefined) out[key] = val;
        }
      }
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
    apr: toNumber(raw.apr),
    apy: toNumber(raw.apy),
    isBlacklisted: toBool(raw.is_blacklisted),
    tags: toStringArray(raw.tags),
    launchpad: toString(raw.launchpad),
    createdAt:
      toNumber(raw.created_at) ??
      toNumber(raw.createdAt) ??
      toNumber(raw.pool_created_at),
  };
}
