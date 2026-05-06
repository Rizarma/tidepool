import { describe, it, expect } from "vitest";
import { classifyProviderError, sanitizeSourceError, parseApiError } from "./api-errors";

describe("sanitizeSourceError", () => {
  it("returns 'Timed out' for abort errors", () => {
    expect(sanitizeSourceError("The operation was aborted")).toBe("Timed out");
    expect(sanitizeSourceError("AbortError: signal timed out")).toBe("Timed out");
    expect(sanitizeSourceError("Request timeout after 10000ms")).toBe("Timed out");
    expect(sanitizeSourceError("ETIMEDOUT")).toBe("Timed out");
  });

  it("returns 'Provider unavailable' for connection errors", () => {
    expect(sanitizeSourceError("ECONNREFUSED")).toBe("Provider unavailable");
    expect(sanitizeSourceError("ENOTFOUND")).toBe("Provider unavailable");
    expect(sanitizeSourceError("HTTP 503 from https://api.example.com/foo")).toBe("Provider unavailable");
    expect(sanitizeSourceError("HTTP 502 from https://api.example.com/foo")).toBe("Provider unavailable");
    expect(sanitizeSourceError("rate limit exceeded")).toBe("Provider unavailable");
  });

  it("returns 'Provider unavailable' for messages containing URLs", () => {
    expect(sanitizeSourceError("HTTP 500 from https://api.dexscreener.com/latest/dex/tokens/abc")).toBe("Provider unavailable");
    expect(sanitizeSourceError("Failed to fetch https://tokens.jup.ag/token/xyz")).toBe("Provider unavailable");
  });

  it("returns 'Provider unavailable' for HTTP status patterns", () => {
    expect(sanitizeSourceError("HTTP 500")).toBe("Provider unavailable");
    expect(sanitizeSourceError("RPC HTTP 503")).toBe("Provider unavailable");
  });

  it("returns 'No data found' for not-found errors", () => {
    expect(sanitizeSourceError("Account not found on-chain")).toBe("No data found");
    expect(sanitizeSourceError("No DLMM pool found for mints ABC / DEF")).toBe("No data found");
    expect(sanitizeSourceError("404")).toBe("No data found");
  });

  it("returns 'Invalid response' for parse errors", () => {
    expect(sanitizeSourceError("Failed to parse mint layout")).toBe("Invalid response");
    expect(sanitizeSourceError("Invalid JSON in response")).toBe("Invalid response");
    expect(sanitizeSourceError("Unexpected token < in JSON")).toBe("Invalid response");
    expect(sanitizeSourceError("Invalid pool data: expected an object")).toBe("Invalid response");
  });

  it("returns 'Provider error' for undefined/empty input", () => {
    expect(sanitizeSourceError(undefined)).toBe("Provider error");
    expect(sanitizeSourceError("")).toBe("Provider error");
  });

  it("does not pass through arbitrary raw provider messages", () => {
    expect(sanitizeSourceError("No account data")).toBe("No data found");
    expect(sanitizeSourceError("Something went wrong")).toBe("Provider error");
    expect(sanitizeSourceError("Invalid API key")).toBe("Provider error");
  });

  it("returns 'Provider error' for long messages with path-like content", () => {
    expect(
      sanitizeSourceError("Some very long error message that contains /internal/path and is over sixty characters in total length here"),
    ).toBe("Provider error");
  });
});

describe("classifyProviderError", () => {
  it("returns provider timeout code and status for timeout errors", () => {
    expect(classifyProviderError("AbortError")).toEqual({ code: "PROVIDER_TIMEOUT", message: "Timed out", status: 504 });
  });

  it("returns no-data code and status for not-found errors", () => {
    expect(classifyProviderError("No DLMM pool found for mints ABC / DEF")).toEqual({ code: "NO_DATA_FOUND", message: "No data found", status: 404 });
  });

  it("returns invalid-response code and status for parse errors", () => {
    expect(classifyProviderError("Failed to parse mint layout")).toEqual({ code: "INVALID_RESPONSE", message: "Invalid response", status: 502 });
  });
});

describe("parseApiError", () => {
  it("parses normalized error shape { error: { code, message } }", () => {
    const data = { error: { code: "INVALID_PARAMETER", message: "Invalid Solana mint address" } };
    expect(parseApiError(data)).toBe("Invalid Solana mint address");
  });

  it("parses legacy error shape { error: 'string' }", () => {
    const data = { error: "Something went wrong" };
    expect(parseApiError(data)).toBe("Something went wrong");
  });

  it("returns fallback for null/undefined", () => {
    expect(parseApiError(null, "Fallback")).toBe("Fallback");
    expect(parseApiError(undefined, "Fallback")).toBe("Fallback");
  });

  it("returns fallback for non-object", () => {
    expect(parseApiError("string", "Fallback")).toBe("Fallback");
    expect(parseApiError(42, "Fallback")).toBe("Fallback");
  });

  it("returns fallback for empty object", () => {
    expect(parseApiError({}, "Fallback")).toBe("Fallback");
  });

  it("returns default fallback when none specified", () => {
    expect(parseApiError(null)).toBe("Request failed");
  });

  it("prefers normalized shape over legacy when both could match", () => {
    const data = { error: { code: "PROVIDER_TIMEOUT", message: "Timed out" } };
    expect(parseApiError(data)).toBe("Timed out");
  });
});
