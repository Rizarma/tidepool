/**
 * Core types for the token-scanning backend.
 */

// ─── Risk ────────────────────────────────────────────────────────────────────

export interface RiskFactor {
  /** Short machine-readable key */
  key: string;
  /** Human-readable label */
  label: string;
  /** Severity weight 0-100 */
  weight: number;
  /** Optional detail string */
  detail?: string;
}

export interface RiskAssessment {
  /** Aggregate score 0-100 (higher = riskier) */
  score: number;
  /** Qualitative level */
  level: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
}

// ─── Token Identity ──────────────────────────────────────────────────────────

export interface TokenIdentity {
  mint: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  imageUrl?: string;
  /** Owner program: TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID */
  tokenProgram?: string;
}

// ─── Supply ──────────────────────────────────────────────────────────────────

export interface TokenSupply {
  total?: string;
  /** UI amount (total / 10^decimals) */
  uiAmount?: number;
  decimals?: number;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
}

// ─── Market ──────────────────────────────────────────────────────────────────

export interface TokenMarket {
  priceUsd?: number;
  priceNative?: number;
  marketCap?: number;
  volume24h?: number;
  liquidity?: number;
  pairAddress?: string;
  dexId?: string;
}

// ─── Trust ───────────────────────────────────────────────────────────────────

export interface TokenTrust {
  /** Whether token is on Jupiter strict list */
  jupiterStrict?: boolean;
  /** RugCheck risk score (their own) */
  rugCheckScore?: number;
  /** RugCheck risk level string */
  rugCheckLevel?: string;
  /** Top holder concentration percentage */
  topHolderPct?: number;
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export interface SourceStatus {
  provider: string;
  success: boolean;
  latencyMs?: number;
  error?: string;
}

// ─── Full Report ─────────────────────────────────────────────────────────────

export interface TokenReport {
  identity: TokenIdentity;
  supply: TokenSupply;
  market: TokenMarket;
  trust: TokenTrust;
  risk: RiskAssessment;
  sources: SourceStatus[];
  /** ISO timestamp */
  fetchedAt: string;
}

// ─── DLMM Pair Types ─────────────────────────────────────────────────────────

export interface PairToken {
  mint: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  priceUsd?: number;
  verified?: boolean;
  amount?: number;
  holders?: number;
  freezeAuthorityDisabled?: boolean;
  marketCap?: number;
}

export interface DlmmPairInfo {
  poolAddress: string;
  name?: string;
  tokenX: PairToken;
  tokenY: PairToken;
  priceTokenYPerTokenX?: number;
  inversePrice?: number;
  binStep?: number;
  baseFeePct?: number;
  maxFeePct?: number;
  protocolFeePct?: number;
  dynamicFeePct?: number;
  tvlUsd?: number;
  volume24h?: number;
  fees24h?: number;
  apr?: number;
  apy?: number;
  isBlacklisted?: boolean;
  tags?: string[];
}

export interface PoolReport {
  kind: "pair";
  pair: DlmmPairInfo;
  sources: SourceStatus[];
  /** ISO timestamp */
  fetchedAt: string;
}
