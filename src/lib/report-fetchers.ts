import type { ApiErrorCode } from "@/lib/api-errors";
import type { PoolReport, TokenReport, PoolDiscoveryReport } from "@/lib/api-types";

export class ApiFetchError extends Error {
  code?: ApiErrorCode;
  status: number;
  body?: unknown;

  constructor(message: string, code?: ApiErrorCode, status: number = 500, body?: unknown) {
    super(message);
    this.name = "ApiFetchError";
    this.code = code;
    this.status = status;
    this.body = body;
  }
}

function getApiErrorCode(data: unknown): ApiErrorCode | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  if (obj.error && typeof obj.error === "object") {
    const errObj = obj.error as Record<string, unknown>;
    if (typeof errObj.code === "string") return errObj.code as ApiErrorCode;
  }
  return undefined;
}

function parseApiErrorMessage(data: unknown, fallback = "Request failed"): string {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  if (obj.error && typeof obj.error === "object") {
    const errObj = obj.error as Record<string, unknown>;
    if (typeof errObj.message === "string") return errObj.message;
  }
  if (typeof obj.error === "string") return obj.error;
  return fallback;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    const code = getApiErrorCode(data);
    const message = parseApiErrorMessage(data, `HTTP ${res.status}`);
    throw new ApiFetchError(message, code, res.status, data);
  }

  return data as T;
}

export function fetchPoolReport(address: string): Promise<PoolReport> {
  return apiFetch<PoolReport>(`/api/scan/pair?pool=${encodeURIComponent(address)}`);
}

export function fetchTokenReport(mint: string): Promise<TokenReport> {
  return apiFetch<TokenReport>(`/api/scan?mint=${encodeURIComponent(mint)}`);
}

export function fetchPoolDiscovery(mint: string): Promise<PoolDiscoveryReport> {
  return apiFetch<PoolDiscoveryReport>(`/api/scan/pools?mint=${encodeURIComponent(mint)}`);
}

export function fetchPoolByMints(mintA: string, mintB: string): Promise<PoolReport> {
  return apiFetch<PoolReport>(
    `/api/scan/pair?mintA=${encodeURIComponent(mintA)}&mintB=${encodeURIComponent(mintB)}`,
  );
}
