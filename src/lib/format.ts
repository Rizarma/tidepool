/**
 * Shared formatting helpers for scan reports.
 */

import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@/lib/solana-programs";

export function formatUsd(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value < 0.01) return `$${value.toExponential(2)}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value > 1 ? 2 : 6 }).format(value);
}

export function formatNumber(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function formatTokenPrice(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "0";
  if (Math.abs(value) < 0.000001 || Math.abs(value) >= 1_000_000) return value.toExponential(4);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value > 1 ? 6 : 10 }).format(value);
}

export function feePct(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(value < 0.01 ? 4 : 2)}%`;
}

export function pctValue(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export function short(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.length > 12 ? `${value.slice(0, 5)}…${value.slice(-5)}` : value;
}

export function yesNo(value?: boolean): string {
  if (value == null) return "Unknown";
  return value ? "Yes" : "No";
}

export function numberOrDash(value?: number): string {
  return value == null ? "—" : String(value);
}

export function pct(value?: number): string {
  return value == null ? "Unavailable" : `${value.toFixed(1)}%`;
}

export function programLabel(program?: string): string {
  if (!program) return "Unknown";
  if (program === TOKEN_PROGRAM_ID) return "SPL Token";
  if (program === TOKEN_2022_PROGRAM_ID) return "Token-2022";
  return short(program) ?? program;
}

export function isBadRugLevel(level?: string): boolean {
  if (!level) return false;
  return /danger|critical|high|risky/i.test(level);
}

/** Compact number formatter — 1.2K, 3.4M, 1.23B */
export function formatCompactNumber(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs < 0.01) return value.toExponential(2);
  if (abs < 1) return value.toFixed(2);
  if (abs < 1000) return String(Math.round(value));
  if (abs < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)}K`;
  if (abs < 1_000_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs < 1_000_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  return `${(value / 1_000_000_000_000).toFixed(2)}T`;
}

/** Compact USD — $1.2K, $3.4M */
export function formatCompactUsd(value?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value === 0) return "$0";
  return `$${formatCompactNumber(value)}`;
}

/** Relative age from Unix timestamp — "2m", "1h", "3d" */
export function formatAge(timestamp?: number): string {
  if (timestamp == null || Number.isNaN(timestamp)) return "—";
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 0) return "now";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return `${weeks}w`;
}
