/**
 * Frontend-facing API response types.
 *
 * These are intentionally looser (all-optional) versions of the canonical
 * backend types in `./types.ts`, because API responses may arrive with
 * partial data depending on provider availability.
 */

import type {
  DlmmPairInfo,
  PairToken as StrictPairToken,
  RiskAssessment,
  RiskFactor as StrictRiskFactor,
  SourceStatus,
  TokenIdentity,
  TokenMarket,
  TokenSupply,
  TokenTrust,
} from "./types";

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Make all properties (including nested objects) optional. */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

// ─── Re-exports (unchanged shape) ───────────────────────────────────────────

export type { SourceStatus } from "./types";

// ─── Risk ────────────────────────────────────────────────────────────────────

export type RiskLevel = RiskAssessment["level"];

export type RiskFactor = Partial<StrictRiskFactor>;

// ─── Token Report ────────────────────────────────────────────────────────────

export interface TokenReport {
  identity?: DeepPartial<TokenIdentity>;
  supply?: DeepPartial<TokenSupply>;
  market?: DeepPartial<TokenMarket>;
  trust?: DeepPartial<TokenTrust>;
  risk?: {
    score?: number;
    level?: RiskLevel;
    factors?: RiskFactor[];
  };
  sources?: SourceStatus[];
  fetchedAt?: string;
}

// ─── Pair / Pool Report ──────────────────────────────────────────────────────

export type PairToken = Partial<StrictPairToken>;

export interface PoolReport {
  kind: "pair";
  pair?: DeepPartial<DlmmPairInfo> & {
    tokenX?: PairToken;
    tokenY?: PairToken;
    tags?: string[];
  };
  sources?: SourceStatus[];
  fetchedAt?: string;
}

// ─── Union ───────────────────────────────────────────────────────────────────

export type ScanReport = TokenReport | PoolReport;
export type ScanMode = "token" | "pair";
export type PairInputMode = "pool" | "mints";
