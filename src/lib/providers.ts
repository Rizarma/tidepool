/**
 * Provider fetch helpers. Each returns a partial result or throws.
 * All are designed to be consumed via Promise.allSettled.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Using `any` intentionally for defensive parsing of external API responses.
// Provider shapes can change without notice; we extract known fields safely.

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

async function rpcCall<T = unknown>(
  method: string,
  params: unknown[],
  rpcUrl: string,
  timeoutMs = 10_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result as T;
  } finally {
    clearTimeout(timer);
  }
}

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

  // DexScreener returns { pairs: [...] }
  const pairs = Array.isArray(data?.pairs) ? data.pairs : [];
  if (pairs.length === 0) return {};

  // Use the first pair with highest liquidity
  const sorted = [...pairs].sort(
    (a: any, b: any) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0),
  );
  const pair = sorted[0];
  if (!pair) return {};

  // Find the base token matching our mint
  const baseToken =
    pair.baseToken?.address === mint
      ? pair.baseToken
      : pair.quoteToken?.address === mint
        ? pair.quoteToken
        : pair.baseToken;

  return {
    priceUsd: parseFloat(pair.priceUsd) || undefined,
    priceNative: parseFloat(pair.priceNative) || undefined,
    marketCap: pair.marketCap ?? pair.fdv ?? undefined,
    volume24h: pair.volume?.h24 ?? undefined,
    liquidity: pair.liquidity?.usd ?? undefined,
    pairAddress: pair.pairAddress ?? undefined,
    dexId: pair.dexId ?? undefined,
    name: baseToken?.name ?? undefined,
    symbol: baseToken?.symbol ?? undefined,
    imageUrl: pair.info?.imageUrl ?? undefined,
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

  const risks: string[] = [];
  const dangers: string[] = [];

  // Defensive: risks may be array of objects with level/description
  if (Array.isArray(data?.risks)) {
    for (const r of data.risks) {
      const desc = r?.description ?? r?.name ?? String(r);
      if (r?.level === "danger" || r?.level === "critical") {
        dangers.push(desc);
      } else {
        risks.push(desc);
      }
    }
  }

  // Top holder concentration
  let topHolderPct: number | undefined;
  if (Array.isArray(data?.topHolders) && data.topHolders.length > 0) {
    topHolderPct = data.topHolders[0]?.pct ?? data.topHolders[0]?.percentage ?? undefined;
    if (topHolderPct != null) topHolderPct = Number(topHolderPct);
  }

  return {
    score: typeof data?.score === "number" ? data.score : undefined,
    level: typeof data?.riskLevel === "string" ? data.riskLevel : undefined,
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

  if (tokenInfoRes.status === "fulfilled" && tokenInfoRes.value) {
    const info = tokenInfoRes.value;
    result.name = info.name ?? undefined;
    result.symbol = info.symbol ?? undefined;
    result.decimals = typeof info.decimals === "number" ? info.decimals : undefined;
    // strict list tokens have tags including "strict" or a strict boolean
    result.strict = info.strict === true || (Array.isArray(info.tags) && info.tags.includes("strict"));
    result.imageUrl = info.logoURI ?? undefined;
  }

  if (priceRes.status === "fulfilled" && priceRes.value) {
    const priceData = priceRes.value?.data?.[mint];
    if (priceData?.price != null) {
      result.priceUsd = Number(priceData.price) || undefined;
    }
  }

  return result;
}

// ─── Solana RPC ──────────────────────────────────────────────────────────────

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

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
  const accountInfo = await rpcCall<{
    value: { data: [string, string]; owner: string } | null;
  }>("getAccountInfo", [mint, { encoding: "base64" }], rpcUrl);

  if (!accountInfo?.value) {
    throw new Error("Account not found on-chain");
  }

  const owner = accountInfo.value.owner;
  const tokenProgram =
    owner === TOKEN_PROGRAM_ID
      ? TOKEN_PROGRAM_ID
      : owner === TOKEN_2022_PROGRAM_ID
        ? TOKEN_2022_PROGRAM_ID
        : owner;

  const base64Data = accountInfo.value.data?.[0];
  if (!base64Data) throw new Error("No account data");

  const parsed = parseMintAccount(base64Data);
  if (!parsed) throw new Error("Failed to parse mint layout");

  return { ...parsed, tokenProgram };
}
