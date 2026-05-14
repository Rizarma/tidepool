import type { DlmmPairInfo } from "@/lib/types";

export interface NewPairsResponse {
  pools: DlmmPairInfo[];
  total: number;
  pages: number;
  source?: unknown;
  fetchedAt?: string;
}

export type SortKey =
  | "createdAt"
  | "priceTokenYPerTokenX"
  | "tvlUsd"
  | "volume24h"
  | "fees24h"
  | "apr"
  | "binStep"
  | "baseFeePct"
  | "marketCap"
  | "holders";

export type SortDir = "asc" | "desc";

export type Timeframe = "30m" | "1h" | "4h" | "6h" | "12h" | "24h";

export type ColumnKey = SortKey | "pair" | "freeze" | "launchpad";

export const ALL_COLUMN_KEYS: ColumnKey[] = [
  "pair",
  "priceTokenYPerTokenX",
  "tvlUsd",
  "volume24h",
  "fees24h",
  "apr",
  "binStep",
  "baseFeePct",
  "marketCap",
  "holders",
  "createdAt",
  "freeze",
  "launchpad",
];

export const TIMEFRAMES: Timeframe[] = ["30m", "1h", "4h", "6h", "12h", "24h"];
export const AUTO_REFRESH_INTERVAL = 60; // seconds
export const MIN_COOLDOWN_MS = 15000; // minimum ms between requests

export const LS_AUTO_REFRESH = "tidepool_auto_refresh";
export const LS_LAST_FETCHED_AT = "tidepool_last_fetched_at";
export const LS_TIMEFRAME = "tidepool_timeframe";
export const LS_VISIBLE_COLUMNS = "tidepool_visible_columns";
export const LS_TABLE_DENSITY = "tidepool_table_density";
export const LS_FILTERS = "tidepool_filters";

export interface FilterState {
  minTvl: number | null;
  minApr: number | null;
  maxAgeHours: number | null;
  freezeOffOnly: boolean;
}

export const sortableColumns: {
  key: SortKey;
  label: string;
  align: "left" | "right";
}[] = [
  { key: "priceTokenYPerTokenX", label: "Price", align: "right" },
  { key: "tvlUsd", label: "TVL", align: "right" },
  { key: "volume24h", label: "24h Vol", align: "right" },
  { key: "fees24h", label: "24h Fees", align: "right" },
  { key: "apr", label: "APR", align: "right" },
  { key: "binStep", label: "Bin Step", align: "right" },
  { key: "baseFeePct", label: "Base Fee", align: "right" },
  { key: "marketCap", label: "MCap", align: "right" },
  { key: "holders", label: "Holders", align: "right" },
  { key: "createdAt", label: "Age", align: "right" },
];

export const DEFAULT_FILTERS: FilterState = {
  minTvl: null,
  minApr: null,
  maxAgeHours: null,
  freezeOffOnly: false,
};
