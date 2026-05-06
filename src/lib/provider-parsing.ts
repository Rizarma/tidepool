/**
 * Shared provider parsing helpers.
 *
 * These utilities safely parse unknown external JSON (from provider APIs and
 * Solana RPC) into typed values. They are intentionally strict:
 * - Numbers must be finite; strings must be fully numeric after trimming.
 * - Objects are validated with a type guard before property access.
 * - No heavy dependencies.
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

// ─── Fetch Helpers ───────────────────────────────────────────────────────────

/** Fetch a URL and parse JSON, returning unknown. Throws classifiable errors. */
export async function fetchJson(url: string, timeoutMs = 10_000): Promise<unknown> {
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

/** Make a JSON-RPC 2.0 call, returning the result field as unknown. */
export async function rpcCall(
  method: string,
  params: unknown[],
  rpcUrl: string,
  timeoutMs = 10_000,
): Promise<unknown> {
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
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON in RPC response");
    }
    if (!isObject(json)) {
      throw new Error("Invalid RPC response: expected object");
    }
    if (isObject(json.error)) {
      const msg = toString((json.error as Record<string, unknown>).message);
      throw new Error(`RPC error: ${msg ?? "unknown"}`);
    }
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}
