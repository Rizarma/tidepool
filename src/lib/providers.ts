/**
 * Provider fetch helpers. Each returns a partial result or throws.
 * All are designed to be consumed via Promise.allSettled.
 */

import {
  isObject,
  prop,
  toNumber,
  toString,
  toArray,
  fetchJson,
  rpcCall,
} from "@/lib/provider-parsing";

// ─── DexScreener ─────────────────────────────────────────────────────────────

export interface DexScreenerResult {
  priceUsd?: number;
  priceNative?: number;
  marketCap?: number;
  volume24h?: number;
  liquidity?: number;
  pairAddress?: string;
  dexId?: string;
  name?: string;
  symbol?: string;
  imageUrl?: string;
}

export async function fetchDexScreener(mint: string): Promise<DexScreenerResult> {
  const data = await fetchJson(
    `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
  );

  if (!isObject(data)) {
    throw new Error("Invalid response from DexScreener: expected object");
  }

  // DexScreener returns { pairs: [...] }
  const pairs = toArray(prop(data, "pairs"));
  if (pairs.length === 0) return {};

  // Use the first pair with highest liquidity
  const sorted = [...pairs]
    .filter(isObject)
    .sort((a, b) => {
      const liqA = toNumber(prop(a, "liquidity", "usd")) ?? 0;
      const liqB = toNumber(prop(b, "liquidity", "usd")) ?? 0;
      return liqB - liqA;
    });
  const pair = sorted[0];
  if (!pair) return {};

  // Find the base token matching our mint
  const baseTokenRaw = prop(pair, "baseToken");
  const quoteTokenRaw = prop(pair, "quoteToken");

  let baseToken: unknown;
  if (isObject(baseTokenRaw) && prop(baseTokenRaw, "address") === mint) {
    baseToken = baseTokenRaw;
  } else if (isObject(quoteTokenRaw) && prop(quoteTokenRaw, "address") === mint) {
    baseToken = quoteTokenRaw;
  } else {
    baseToken = baseTokenRaw;
  }

  return {
    priceUsd: toNumber(prop(pair, "priceUsd")) || undefined,
    priceNative: toNumber(prop(pair, "priceNative")) || undefined,
    marketCap: toNumber(prop(pair, "marketCap")) ?? toNumber(prop(pair, "fdv")) ?? undefined,
    volume24h: toNumber(prop(pair, "volume", "h24")) ?? undefined,
    liquidity: toNumber(prop(pair, "liquidity", "usd")) ?? undefined,
    pairAddress: toString(prop(pair, "pairAddress")) ?? undefined,
    dexId: toString(prop(pair, "dexId")) ?? undefined,
    name: toString(prop(baseToken, "name")) ?? undefined,
    symbol: toString(prop(baseToken, "symbol")) ?? undefined,
    imageUrl: toString(prop(pair, "info", "imageUrl")) ?? undefined,
  };
}

// ─── RugCheck ────────────────────────────────────────────────────────────────

export interface RugCheckResult {
  score?: number;
  level?: string;
  topHolderPct?: number;
  warnings: string[];
  dangers: string[];
}

export async function fetchRugCheck(mint: string): Promise<RugCheckResult> {
  const data = await fetchJson(
    `https://api.rugcheck.xyz/v1/tokens/${mint}/report`,
  );

  if (!isObject(data)) {
    throw new Error("Invalid response from RugCheck: expected object");
  }

  const risks: string[] = [];
  const dangers: string[] = [];

  // Defensive: risks may be array of objects with level/description
  const risksArr = toArray(prop(data, "risks"));
  for (const r of risksArr) {
    if (!isObject(r)) continue;
    const desc = toString(prop(r, "description")) ?? toString(prop(r, "name")) ?? String(r);
    const level = toString(prop(r, "level"));
    if (level === "danger" || level === "critical") {
      dangers.push(desc);
    } else {
      risks.push(desc);
    }
  }

  // Top holder concentration
  let topHolderPct: number | undefined;
  const topHolders = toArray(prop(data, "topHolders"));
  if (topHolders.length > 0 && isObject(topHolders[0])) {
    const holder = topHolders[0] as Record<string, unknown>;
    topHolderPct = toNumber(holder.pct) ?? toNumber(holder.percentage);
  }

  return {
    score: toNumber(prop(data, "score")),
    level: toString(prop(data, "riskLevel")),
    topHolderPct,
    warnings: risks,
    dangers,
  };
}

// ─── Jupiter ─────────────────────────────────────────────────────────────────

export interface JupiterResult {
  name?: string;
  symbol?: string;
  decimals?: number;
  strict?: boolean;
  priceUsd?: number;
  imageUrl?: string;
}

export async function fetchJupiter(mint: string): Promise<JupiterResult> {
  // Fetch token info from Jupiter strict list API and price in parallel
  const [tokenInfoRes, priceRes] = await Promise.allSettled([
    fetchJson(`https://tokens.jup.ag/token/${mint}`),
    fetchJson(`https://api.jup.ag/price/v2?ids=${mint}`),
  ]);

  const result: JupiterResult = {};

  if (tokenInfoRes.status === "fulfilled" && isObject(tokenInfoRes.value)) {
    const info = tokenInfoRes.value;
    result.name = toString(prop(info, "name"));
    result.symbol = toString(prop(info, "symbol"));
    result.decimals = toNumber(prop(info, "decimals"));
    // strict list tokens have tags including "strict" or a strict boolean
    const tags = toArray(prop(info, "tags"));
    result.strict = prop(info, "strict") === true || tags.includes("strict");
    result.imageUrl = toString(prop(info, "logoURI"));
  }

  if (priceRes.status === "fulfilled" && isObject(priceRes.value)) {
    const priceData = prop(priceRes.value, "data", mint);
    if (isObject(priceData)) {
      const price = toNumber(prop(priceData, "price"));
      result.priceUsd = price || undefined;
    }
  }

  return result;
}

// ─── Solana RPC ──────────────────────────────────────────────────────────────

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function isTokenProgram(owner: string): boolean {
  return owner === TOKEN_PROGRAM_ID || owner === TOKEN_2022_PROGRAM_ID;
}

export interface SolanaRpcResult {
  decimals?: number;
  supply?: string;
  uiAmount?: number;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  tokenProgram?: string;
}

/**
 * Parse SPL Token Mint layout (82 bytes for standard, or Token-2022 with extensions).
 * Layout (first 82 bytes):
 *   [0..3]   mintAuthorityOption (u32 LE) – 0 = None, 1 = Some
 *   [4..35]  mintAuthority (32 bytes pubkey)
 *   [36..43] supply (u64 LE)
 *   [44]     decimals (u8)
 *   [45]     isInitialized (bool)
 *   [46..49] freezeAuthorityOption (u32 LE)
 *   [50..81] freezeAuthority (32 bytes pubkey)
 */
function parseMintAccount(base64Data: string): Omit<SolanaRpcResult, "tokenProgram"> | null {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length < 82) return null;

    const mintAuthOption = buffer.readUInt32LE(0);
    const mintAuthority = mintAuthOption === 1 ? encodeBase58(buffer.slice(4, 36)) : null;

    const supplyBigInt = buffer.readBigUInt64LE(36);
    const decimals = buffer[44];
    const isInitialized = buffer[45] === 1;
    if (!isInitialized) return null;

    const freezeAuthOption = buffer.readUInt32LE(46);
    const freezeAuthority = freezeAuthOption === 1 ? encodeBase58(buffer.slice(50, 82)) : null;

    const supply = supplyBigInt.toString();
    const uiAmount = Number(supplyBigInt) / Math.pow(10, decimals);

    return { decimals, supply, uiAmount, mintAuthority, freezeAuthority };
  } catch {
    return null;
  }
}

/** Minimal base58 encoder (no dependency) */
function encodeBase58(bytes: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt(0);
  for (const b of bytes) {
    num = num * 256n + BigInt(b);
  }
  let str = "";
  while (num > 0n) {
    const mod = Number(num % 58n);
    str = ALPHABET[mod] + str;
    num = num / 58n;
  }
  // Leading zeros
  for (const b of bytes) {
    if (b === 0) str = "1" + str;
    else break;
  }
  return str || "1";
}

export async function fetchSolanaRpc(mint: string): Promise<SolanaRpcResult> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";

  // getAccountInfo with base64 encoding
  const raw = await rpcCall("getAccountInfo", [mint, { encoding: "base64" }], rpcUrl);

  if (!isObject(raw)) {
    throw new Error("Invalid RPC response: expected object");
  }

  const value = raw.value;
  if (!isObject(value)) {
    throw new Error("Account not found on-chain");
  }

  const owner = toString(value.owner);
  if (!owner) {
    throw new Error("Invalid RPC response: missing owner");
  }

  if (!isTokenProgram(owner)) {
    throw new Error("Account is not an SPL token mint");
  }

  const tokenProgram = owner;

  const dataArr = value.data;
  if (!Array.isArray(dataArr) || typeof dataArr[0] !== "string") {
    throw new Error("No account data");
  }

  const base64Data = dataArr[0];
  const parsed = parseMintAccount(base64Data);
  if (!parsed) throw new Error("Failed to parse mint layout");

  return { ...parsed, tokenProgram };
}
