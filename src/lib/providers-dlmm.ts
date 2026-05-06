/**
 * Meteora DLMM REST provider – no SDK dependencies.
 * Base URL: https://dlmm.datapi.meteora.ag
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DlmmPairInfo, PairToken } from "@/lib/types";

const BASE_URL = "https://dlmm.datapi.meteora.ag";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJson(url: string, timeoutMs = 10_000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Normalization ───────────────────────────────────────────────────────────

function parsePairToken(raw: any, amountField?: number): PairToken {
  if (!raw || typeof raw !== "object") {
    return { mint: "" };
  }
  return {
    mint: raw.mint ?? raw.address ?? "",
    name: raw.name ?? undefined,
    symbol: raw.symbol ?? undefined,
    decimals: typeof raw.decimals === "number" ? raw.decimals : undefined,
    priceUsd:
      typeof raw.price_usd === "number"
        ? raw.price_usd
        : typeof raw.price === "number"
          ? raw.price
          : undefined,
    verified:
      typeof raw.verified === "boolean"
        ? raw.verified
        : typeof raw.is_verified === "boolean"
          ? raw.is_verified
          : undefined,
    amount: typeof amountField === "number" ? amountField : undefined,
    holders: typeof raw.holders === "number" ? raw.holders : undefined,
    freezeAuthorityDisabled:
      typeof raw.freeze_authority_disabled === "boolean"
        ? raw.freeze_authority_disabled
        : undefined,
    marketCap: typeof raw.market_cap === "number" ? raw.market_cap : undefined,
  };
}

function normalizePair(raw: any): DlmmPairInfo {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid pool data: expected an object");
  }

  const poolAddress: string = raw.pool_address ?? raw.address ?? raw.pair ?? "";
  if (!poolAddress) {
    throw new Error("Invalid pool data: missing pool address");
  }

  const currentPrice =
    typeof raw.current_price === "number"
      ? raw.current_price
      : typeof raw.current_price === "string"
        ? parseFloat(raw.current_price)
        : undefined;

  const inversePrice =
    currentPrice && currentPrice > 0 ? 1 / currentPrice : undefined;

  const tokenXAmount =
    typeof raw.token_x_amount === "number"
      ? raw.token_x_amount
      : typeof raw.token_x_amount === "string"
        ? parseFloat(raw.token_x_amount)
        : undefined;

  const tokenYAmount =
    typeof raw.token_y_amount === "number"
      ? raw.token_y_amount
      : typeof raw.token_y_amount === "string"
        ? parseFloat(raw.token_y_amount)
        : undefined;

  const tokenX = parsePairToken(raw.token_x ?? raw.mint_x_info, tokenXAmount);
  const tokenY = parsePairToken(raw.token_y ?? raw.mint_y_info, tokenYAmount);

  // Fallback: if token objects don't have mint, use top-level mint_x / mint_y
  if (!tokenX.mint && raw.mint_x) tokenX.mint = raw.mint_x;
  if (!tokenY.mint && raw.mint_y) tokenY.mint = raw.mint_y;

  return {
    poolAddress,
    name: raw.name ?? undefined,
    tokenX,
    tokenY,
    priceTokenYPerTokenX:
      currentPrice && !isNaN(currentPrice) ? currentPrice : undefined,
    inversePrice:
      inversePrice && !isNaN(inversePrice) ? inversePrice : undefined,
    binStep:
      typeof raw.bin_step === "number"
        ? raw.bin_step
        : typeof raw.pool_config?.bin_step === "number"
          ? raw.pool_config.bin_step
          : undefined,
    baseFeePct:
      typeof raw.base_fee_percentage === "number"
        ? raw.base_fee_percentage
        : typeof raw.base_fee_pct === "number"
          ? raw.base_fee_pct
          : typeof raw.pool_config?.base_fee_pct === "number"
            ? raw.pool_config.base_fee_pct
            : undefined,
    maxFeePct:
      typeof raw.max_fee_percentage === "number"
        ? raw.max_fee_percentage
        : typeof raw.max_fee_pct === "number"
          ? raw.max_fee_pct
          : typeof raw.pool_config?.max_fee_pct === "number"
            ? raw.pool_config.max_fee_pct
            : undefined,
    protocolFeePct:
      typeof raw.protocol_fee_percentage === "number"
        ? raw.protocol_fee_percentage
        : typeof raw.protocol_fee_pct === "number"
          ? raw.protocol_fee_pct
          : typeof raw.pool_config?.protocol_fee_pct === "number"
            ? raw.pool_config.protocol_fee_pct
            : undefined,
    dynamicFeePct:
      typeof raw.dynamic_fee_percentage === "number"
        ? raw.dynamic_fee_percentage
        : typeof raw.dynamic_fee_pct === "number"
          ? raw.dynamic_fee_pct
          : undefined,
    tvlUsd:
      typeof raw.tvl === "number"
        ? raw.tvl
        : typeof raw.liquidity === "number"
          ? raw.liquidity
          : undefined,
    volume24h: raw.volume?.["24h"] ?? raw.trade_volume_24h ?? undefined,
    fees24h: raw.fees?.["24h"] ?? raw.fee_volume_24h ?? undefined,
    apr: typeof raw.apr === "number" ? raw.apr : undefined,
    apy: typeof raw.apy === "number" ? raw.apy : undefined,
    isBlacklisted:
      typeof raw.is_blacklisted === "boolean" ? raw.is_blacklisted : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags : undefined,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a single DLMM pool by its pool address.
 */
export async function fetchMeteoraDlmmPool(
  poolAddress: string,
): Promise<DlmmPairInfo> {
  const url = `${BASE_URL}/pools/${poolAddress}`;
  const data = await fetchJson(url);

  // The single-pool endpoint returns a flat object (or possibly wrapped)
  const raw = data?.pool ?? data;
  return normalizePair(raw);
}

/**
 * Fetch the best DLMM pool for a given mint pair.
 * Mints are sorted lexicographically to form the group key.
 */
export async function fetchMeteoraDlmmPairByMints(
  mintA: string,
  mintB: string,
): Promise<DlmmPairInfo> {
  const [sortedA, sortedB] = [mintA, mintB].sort();
  const url = `${BASE_URL}/pools/groups/${sortedA}-${sortedB}?page=1&page_size=5&sort_by=tvl:desc&filter_by=is_blacklisted=false`;
  const data = await fetchJson(url);

  // Group endpoint returns { data: [...] } or possibly an array
  const pools: any[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];

  if (pools.length === 0) {
    throw new Error(
      `No DLMM pool found for mints ${sortedA} / ${sortedB}`,
    );
  }

  // Choose first non-blacklisted pool with current_price > 0
  const preferred = pools.find((p: any) => {
    const price =
      typeof p.current_price === "number"
        ? p.current_price
        : parseFloat(p.current_price);
    return !p.is_blacklisted && price > 0;
  });

  // Fallback: first pool with a valid price
  const fallback =
    preferred ??
    pools.find((p: any) => {
      const price =
        typeof p.current_price === "number"
          ? p.current_price
          : parseFloat(p.current_price);
      return price > 0;
    });

  const chosen = fallback ?? pools[0];
  return normalizePair(chosen);
}
