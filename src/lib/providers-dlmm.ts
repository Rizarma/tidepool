/**
 * Meteora DLMM REST provider – no SDK dependencies.
 * Base URL: https://dlmm.datapi.meteora.ag
 */

import type { DlmmPairInfo, PairToken } from "@/lib/types";

const BASE_URL = "https://dlmm.datapi.meteora.ag";

// ─── Parse Helpers ───────────────────────────────────────────────────────────

/** Type guard: value is a non-null object */
function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Safely access a nested property path on unknown data */
function prop(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!isObject(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

/** Strict regex: optional sign, digits, optional decimal, optional exponent */
const STRICT_NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** Parse a numeric value from unknown – strict and finite only */
function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed || !STRICT_NUMERIC_RE.test(trimmed)) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Parse a string value from unknown */
function toString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Parse a boolean value from unknown */
function toBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

/** Assert value is an array, return it or empty array */
function toArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Filter an unknown value to a string[] or undefined. Only keeps actual strings. */
function toStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const filtered = v.filter((item): item is string => typeof item === "string");
  return filtered.length > 0 ? filtered : undefined;
}

// ─── Fetch Helpers ───────────────────────────────────────────────────────────

async function fetchJson(url: string, timeoutMs = 10_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON in response");
    }
  } finally {
    clearTimeout(timer);
  }
}

// ─── Normalization ───────────────────────────────────────────────────────────

function parsePairToken(raw: unknown, amountField?: number): PairToken {
  if (!isObject(raw)) {
    return { mint: "" };
  }
  return {
    mint: toString(raw.mint) ?? toString(raw.address) ?? "",
    name: toString(raw.name),
    symbol: toString(raw.symbol),
    decimals: toNumber(raw.decimals),
    priceUsd: toNumber(raw.price_usd) ?? toNumber(raw.price),
    verified: toBool(raw.verified) ?? toBool(raw.is_verified),
    amount: typeof amountField === "number" ? amountField : undefined,
    holders: toNumber(raw.holders),
    freezeAuthorityDisabled: toBool(raw.freeze_authority_disabled),
    marketCap: toNumber(raw.market_cap),
  };
}

function normalizePair(raw: unknown): DlmmPairInfo {
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

  // Fallback: if token objects don't have mint, use top-level mint_x / mint_y
  if (!tokenX.mint) {
    const mintX = toString(raw.mint_x);
    if (mintX) tokenX.mint = mintX;
  }
  if (!tokenY.mint) {
    const mintY = toString(raw.mint_y);
    if (mintY) tokenY.mint = mintY;
  }

  // Token mints are required for a valid pool
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
    apr: toNumber(raw.apr),
    apy: toNumber(raw.apy),
    isBlacklisted: toBool(raw.is_blacklisted),
    tags: toStringArray(raw.tags),
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

  if (!isObject(data)) {
    throw new Error("Invalid response from DLMM: expected object");
  }

  // The single-pool endpoint returns a flat object (or possibly wrapped)
  const raw = isObject(prop(data, "pool")) ? prop(data, "pool") : data;
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
  let pools: unknown[];
  if (isObject(data) && Array.isArray(prop(data, "data"))) {
    pools = prop(data, "data") as unknown[];
  } else if (Array.isArray(data)) {
    pools = data;
  } else {
    throw new Error("Invalid response from DLMM: expected array or object with data");
  }

  if (pools.length === 0) {
    throw new Error(
      `No DLMM pool found for mints ${sortedA} / ${sortedB}`,
    );
  }

  // Choose first non-blacklisted pool with current_price > 0.
  // Only treat explicit false or absent (undefined) as safe; any truthy/unknown value is unsafe.
  const preferred = pools.find((p: unknown) => {
    if (!isObject(p)) return false;
    const price = toNumber(p.current_price);
    const bl = p.is_blacklisted;
    const isSafe = bl === false || bl === undefined;
    return isSafe && price !== undefined && price > 0;
  });

  // Fallback: first pool with a valid price
  const fallback =
    preferred ??
    pools.find((p: unknown) => {
      if (!isObject(p)) return false;
      const price = toNumber(p.current_price);
      return price !== undefined && price > 0;
    });

  const chosen = fallback ?? pools[0];
  return normalizePair(chosen);
}

// ─── Exported parse helpers (for testing) ────────────────────────────────────

export const _dlmmParseHelpers = { isObject, prop, toNumber, toString, toBool, toArray, toStringArray, normalizePair, parsePairToken };
