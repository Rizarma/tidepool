/**
 * Shared API error types and helpers.
 *
 * Provides stable error codes, client-safe messages, and sanitization
 * to avoid leaking raw provider URLs or internals to the frontend.
 */

// ─── Error Codes ─────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | "MISSING_PARAMETER"
  | "INVALID_PARAMETER"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "NO_DATA_FOUND"
  | "INVALID_RESPONSE"
  | "INTERNAL_ERROR";

// ─── Structured Error Shape ──────────────────────────────────────────────────

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export interface SanitizedApiError {
  code: ApiErrorCode;
  message: string;
  status: number;
}

/**
 * Build a normalized JSON error response.
 */
export function apiErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status });
}

// ─── Source Error Sanitization ───────────────────────────────────────────────

/**
 * Patterns used to classify raw provider errors into client-safe messages.
 */
const TIMEOUT_PATTERNS = [
  /abort/i,
  /timeout/i,
  /timed?\s*out/i,
  /ETIMEDOUT/i,
  /ECONNABORTED/i,
];

const UNAVAILABLE_PATTERNS = [
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /ENETUNREACH/i,
  /503/,
  /502/,
  /429/,
  /rate.?limit/i,
  /service.?unavailable/i,
];

const NOT_FOUND_PATTERNS = [
  /not found/i,
  /404/,
  /no .* found/i,
  /no .*data/i,
  /empty/i,
];

const INVALID_RESPONSE_PATTERNS = [
  /parse/i,
  /invalid.*json/i,
  /unexpected token/i,
  /failed to parse/i,
  /invalid.*data/i,
  /invalid.*response/i,
  /expected.*object/i,
];

/**
 * Sanitize a raw provider error message into a generic, client-safe string.
 * Strips URLs, internal details, and classifies into known categories.
 */
export function classifyProviderError(raw: string | undefined): SanitizedApiError {
  if (!raw) return { code: "PROVIDER_UNAVAILABLE", message: "Provider error", status: 502 };

  // Check patterns in priority order
  for (const pattern of TIMEOUT_PATTERNS) {
    if (pattern.test(raw)) return { code: "PROVIDER_TIMEOUT", message: "Timed out", status: 504 };
  }
  for (const pattern of UNAVAILABLE_PATTERNS) {
    if (pattern.test(raw)) return { code: "PROVIDER_UNAVAILABLE", message: "Provider unavailable", status: 502 };
  }
  for (const pattern of NOT_FOUND_PATTERNS) {
    if (pattern.test(raw)) return { code: "NO_DATA_FOUND", message: "No data found", status: 404 };
  }
  for (const pattern of INVALID_RESPONSE_PATTERNS) {
    if (pattern.test(raw)) return { code: "INVALID_RESPONSE", message: "Invalid response", status: 502 };
  }

  // If it contains a URL or HTTP status pattern, genericize it
  if (/https?:\/\//.test(raw)) return { code: "PROVIDER_UNAVAILABLE", message: "Provider unavailable", status: 502 };
  if (/^HTTP \d{3}/i.test(raw)) return { code: "PROVIDER_UNAVAILABLE", message: "Provider unavailable", status: 502 };
  if (/^RPC HTTP \d{3}/i.test(raw)) return { code: "PROVIDER_UNAVAILABLE", message: "Provider unavailable", status: 502 };

  return { code: "PROVIDER_UNAVAILABLE", message: "Provider error", status: 502 };
}

export function sanitizeSourceError(raw: string | undefined): string {
  return classifyProviderError(raw).message;
}

// ─── Client-side Error Parsing ───────────────────────────────────────────────

/**
 * Parse an error message from an API response body.
 * Supports both the new normalized shape `{ error: { code, message } }`
 * and the legacy shape `{ error: "string" }`.
 */
export function parseApiError(data: unknown, fallback = "Request failed"): string {
  if (!data || typeof data !== "object") return fallback;

  const obj = data as Record<string, unknown>;

  // New normalized shape: { error: { code, message } }
  if (obj.error && typeof obj.error === "object") {
    const errObj = obj.error as Record<string, unknown>;
    if (typeof errObj.message === "string") return errObj.message;
  }

  // Legacy shape: { error: "string" }
  if (typeof obj.error === "string") return obj.error;

  return fallback;
}
