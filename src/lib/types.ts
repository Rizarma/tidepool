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
  code?: string;
  error?: string;
}

// ─── Indicators ──────────────────────────────────────────────────────────────

export type IndicatorType = "sma" | "supertrend";

export interface IndicatorValue {
  type: IndicatorType;
  value?: number;
  period: number;
  dataQuality: "full" | "partial" | "insufficient";
  /** Number of data points available for this indicator (may be less than period) */
  availableDataPoints?: number;
  /** Supertrend multiplier, if applicable */
  multiplier?: number;
  /** Supertrend trend direction: up or down */
  trend?: "up" | "down";
  /** True if OHLC data was approximated (e.g. Birdeye fallback) */
  isApproximate?: boolean;
  /** If the computed value is valid but not analytically reliable */
  unreliableReason?: string;
}

export interface IndicatorTimeframe {
  timeframe: string;
  values: IndicatorValue[];
}

export interface PoolIndicators {
  timeframes: IndicatorTimeframe[];
}

// ─── Full Report ─────────────────────────────────────────────────────────────

export interface TokenReport {
  kind: "token";
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
  /** Unix timestamp (ms) when the pool was created */
  createdAt?: number;
}

export interface PoolReport {
  kind: "pair";
  pair: DlmmPairInfo;
  indicators?: PoolIndicators;
  sources: SourceStatus[];
  /** ISO timestamp */
  fetchedAt: string;
}

// ─── Pool Discovery ──────────────────────────────────────────────────────────

export interface PoolDiscoveryReport {
  kind: "pool_discovery";
  query: { mint: string };
  primaryPool: DlmmPairInfo | null;
  pools: DlmmPairInfo[];
  totalFound: number;
  totalMatched: number;
  selectionReason: "highest_tvl" | "highest_volume" | "single_match" | null;
  sources: SourceStatus[];
  /** ISO timestamp */
  fetchedAt: string;
}

// ─── Address Resolution ──────────────────────────────────────────────────────

export type AddressResolutionType = "token_mint" | "meteora_dlmm_pool";

export type AddressResolutionSuggestion =
  | "direct_pool_scan"
  | "pool_discovery"
  | "token_scan"
  | "none";

export interface AddressResolution {
  address: string;
  valid: boolean;
  status: "resolved" | "partial" | "unknown";
  possibleTypes: AddressResolutionType[];
  tokenScanAvailable: boolean;
  meteoraPoolAvailable: boolean;
  meteoraPoolsAvailable: boolean;
  primarySuggestion: AddressResolutionSuggestion;
  pool?: DlmmPairInfo;
  poolAddress?: string;
  matchingPoolCount?: number;
  providerTotalFound?: number;
  primaryPool?: DlmmPairInfo | null;
  primaryPoolAddress?: string;
  sources: SourceStatus[];
  /** ISO timestamp */
  fetchedAt: string;
}
