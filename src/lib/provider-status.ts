/**
 * Shared provider-call status helpers.
 *
 * Deduplicates TimedResult/SettledResult/timedFetch/buildSourceStatus patterns
 * used across API route handlers.
 */

import { classifyProviderError, sanitizeSourceError } from "@/lib/api-errors";
import type { SourceStatus } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimedResult<T> {
  data: T;
  latencyMs: number;
}

export type SettledResult<T> =
  | { status: "fulfilled"; value: TimedResult<T> }
  | { status: "rejected"; reason: { message?: string } | undefined };

// ─── timedFetch ──────────────────────────────────────────────────────────────

/**
 * Execute an async provider call, capturing latency and settling into a
 * fulfilled/rejected discriminated union (like Promise.allSettled but for a
 * single call).
 */
export async function timedFetch<T>(
  _label: string,
  fn: () => Promise<T>,
): Promise<SettledResult<T>> {
  const start = Date.now();
  try {
    const data = await fn();
    return { status: "fulfilled", value: { data, latencyMs: Date.now() - start } };
  } catch (err: unknown) {
    const reason = err instanceof Error ? err : { message: String(err) };
    return { status: "rejected", reason };
  }
}

/**
 * Execute an async provider call, capturing latency. Throws on failure.
 * Designed for use with Promise.allSettled (token scan pattern).
 */
export async function timedFetchThrowing<T>(
  _label: string,
  fn: () => Promise<T>,
): Promise<TimedResult<T>> {
  const start = Date.now();
  const data = await fn();
  return { data, latencyMs: Date.now() - start };
}

// ─── buildSourceStatus ───────────────────────────────────────────────────────

/**
 * Build a SourceStatus from a SettledResult.
 * Uses sanitizeSourceError (returns only the message string).
 */
export function buildSourceStatus(
  provider: string,
  result: SettledResult<unknown>,
): SourceStatus {
  if (result.status === "fulfilled") {
    return {
      provider,
      success: true,
      latencyMs: result.value.latencyMs,
    };
  }
  const rawError = result.reason?.message ?? String(result.reason);
  return {
    provider,
    success: false,
    error: sanitizeSourceError(rawError),
  };
}

/**
 * Build a SourceStatus from a SettledResult with full classification
 * (includes error code). Used by resolve-address which exposes the code field.
 */
export function buildSourceStatusClassified(
  provider: string,
  result: SettledResult<unknown>,
): SourceStatus {
  if (result.status === "fulfilled") {
    return {
      provider,
      success: true,
      latencyMs: result.value.latencyMs,
    };
  }
  const rawError = result.reason?.message ?? String(result.reason);
  const sanitized = classifyProviderError(rawError);
  return {
    provider,
    success: false,
    code: sanitized.code,
    error: sanitized.message,
  };
}

/**
 * Build a SourceStatus from a native PromiseSettledResult<TimedResult<T>>.
 * Used by token scan which relies on Promise.allSettled.
 */
export function buildSourceStatusFromSettled(
  provider: string,
  result: PromiseSettledResult<TimedResult<unknown>>,
): SourceStatus {
  if (result.status === "fulfilled") {
    return {
      provider,
      success: true,
      latencyMs: result.value.latencyMs,
    };
  }
  const rawError = result.reason?.message ?? String(result.reason);
  return {
    provider,
    success: false,
    error: sanitizeSourceError(rawError),
  };
}
