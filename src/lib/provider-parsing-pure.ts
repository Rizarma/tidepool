/**
 * Shared provider parsing helpers — pure functions, safe for browser and server.
 */

// ─── Type Guards ─────────────────────────────────────────────────────────────

/** Type guard: value is a non-null, non-array object */
export function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// ─── Property Access ─────────────────────────────────────────────────────────

/** Safely access a nested property path on unknown data */
export function prop(obj: unknown, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!isObject(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

// ─── Scalar Parsers ──────────────────────────────────────────────────────────

/** Strict regex: optional sign, digits, optional decimal, optional exponent */
const STRICT_NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** Parse a numeric value from unknown – strict and finite only */
export function toNumber(v: unknown): number | undefined {
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
export function toString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Parse a boolean value from unknown */
export function toBool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

// ─── Array Parsers ───────────────────────────────────────────────────────────

/** Assert value is an array, return it or empty array */
export function toArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Filter an unknown value to a string[] or undefined. Only keeps actual strings. */
export function toStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const filtered = v.filter((item): item is string => typeof item === "string");
  return filtered.length > 0 ? filtered : undefined;
}
