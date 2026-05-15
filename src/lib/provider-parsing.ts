/**
 * Shared provider parsing helpers.
 *
 * Pure parsing utilities are re-exported from provider-parsing-pure.
 * Server-side fetch/rpc helpers live here.
 */

export {
  isObject,
  prop,
  toNumber,
  toString,
  toBool,
  toArray,
  toStringArray,
} from "./provider-parsing-pure";

import {
  isObject,
  toString,
} from "./provider-parsing-pure";

// ─── Fetch Helpers ───────────────────────────────────────────────────────────

/** Fetch a URL and parse JSON, returning unknown. Throws classifiable errors. */
export async function fetchJson(url: string, timeoutMs = 10_000, signal?: AbortSignal, onResponse?: (res: Response) => void): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const abortHandler = () => controller.abort();
  signal?.addEventListener('abort', abortHandler);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (onResponse) onResponse(res);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON in response");
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortHandler);
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
