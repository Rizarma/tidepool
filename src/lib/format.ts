/**
 * Shared formatting helpers for scan reports.
 */

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
  if (program === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") return "SPL Token";
  if (program === "TokenzQdBNbLqP5VEhdkAS6EPF5N5cwHho6pdjzZqK") return "Token-2022";
  return short(program) ?? program;
}

export function isBadRugLevel(level?: string): boolean {
  if (!level) return false;
  return /danger|critical|high|risky/i.test(level);
}
