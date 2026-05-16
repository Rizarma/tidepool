/**
 * GMGN Agent API provider — token security + info data.
 * Base URL: https://openapi.gmgn.ai
 * Auth: X-APIKEY header + timestamp + client_id query params (anti-replay)
 * Normal auth (no signing) for read-only endpoints.
 */

import { cacheFirst } from "@/lib/fetch-guard";
import { rateLimiters } from "@/lib/rate-limit";
import { isObject, prop, toNumber, toString, toBool } from "@/lib/provider-parsing";
import * as crypto from "crypto";

const BASE_URL = "https://openapi.gmgn.ai";

export interface GmgnSecurityResult {
  /** Mint authority renounced (true = safe) */
  renouncedMint?: boolean;
  /** Freeze authority renounced (true = safe) */
  renouncedFreeze?: boolean;
  /** Community Takeover flag (1 = yes, 0 = no) */
  ctoFlag?: boolean;
  /** Honeypot check: "yes" | "no" | "unknown" */
  isHoneypot?: string;
  /** Rug probability ratio 0-1 */
  rugRatio?: number;
  /** Top 10 holder concentration 0-1 */
  top10HolderRate?: number;
  /** Number of sniper wallets */
  sniperCount?: number;
  /** Contract ownership renounced (EVM-style) */
  ownerRenounced?: string;
  /** Creator token status, e.g. "creator_close" */
  creatorTokenStatus?: string;
}

function randomUUID(): string {
  return crypto.randomUUID();
}

async function gmgnFetch(path: string, mint: string): Promise<unknown> {
  const apiKey = process.env.GMGN_API_KEY;
  if (!apiKey) {
    throw new Error("GMGN_API_KEY not configured");
  }

  // GMGN requires timestamp + client_id as anti-replay query params
  const timestamp = Math.floor(Date.now() / 1000);
  const clientId = randomUUID();

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("chain", "sol");
  url.searchParams.set("address", mint);
  url.searchParams.set("timestamp", String(timestamp));
  url.searchParams.set("client_id", clientId);

  const res = await fetch(url.toString(), {
    headers: {
      "X-APIKEY": apiKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`GMGN ${path} ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data;
}

function extractPayload(data: unknown): unknown {
  if (!isObject(data)) return data;
  // GMGN sometimes wraps under `data` key
  const nested = prop(data, "data");
  return isObject(nested) ? nested : data;
}

/** Fetch token/security endpoint */
async function fetchGmgnSecurityRaw(mint: string): Promise<Partial<GmgnSecurityResult>> {
  const data = await gmgnFetch("/v1/token/security", mint);
  const raw = extractPayload(data);
  if (!isObject(raw)) return {};

  // For SOL, is_honeypot is null — fall back to numeric honeypot field (0 = safe/not-applicable)
  let isHoneypot = toString(prop(raw, "is_honeypot"));
  if (isHoneypot == null) {
    const honeypotNum = toNumber(prop(raw, "honeypot"));
    if (honeypotNum === 0) isHoneypot = "no";
    else if (honeypotNum === 1) isHoneypot = "yes";
  }

  return {
    renouncedMint: toBool(prop(raw, "renounced_mint")) ?? undefined,
    renouncedFreeze: toBool(prop(raw, "renounced_freeze_account")) ?? undefined,
    isHoneypot,
    rugRatio: toNumber(prop(raw, "rug_ratio")) ?? undefined,
    top10HolderRate: toNumber(prop(raw, "top_10_holder_rate")) ?? undefined,
    sniperCount: toNumber(prop(raw, "sniper_count")) ?? undefined,
    ownerRenounced: toString(prop(raw, "owner_renounced")) ?? undefined,
    creatorTokenStatus: toString(prop(raw, "creator_token_status")) ?? undefined,
  };
}

/** Fetch token/info endpoint (for CTO flag) */
async function fetchGmgnInfoRaw(mint: string): Promise<Partial<GmgnSecurityResult>> {
  const data = await gmgnFetch("/v1/token/info", mint);
  const raw = extractPayload(data);
  if (!isObject(raw)) return {};

  // CTO flag is under dev.cto_flag
  const devObj = prop(raw, "dev");
  let ctoFlag: boolean | undefined;
  if (isObject(devObj)) {
    const ctoRaw = prop(devObj, "cto_flag");
    if (ctoRaw === 1 || ctoRaw === "1" || ctoRaw === true) ctoFlag = true;
    else if (ctoRaw === 0 || ctoRaw === "0" || ctoRaw === false) ctoFlag = false;
  }

  // Some fields may also appear in info endpoint
  return {
    ctoFlag,
    top10HolderRate: toNumber(prop(raw, "stat", "top_10_holder_rate")) ?? toNumber(prop(raw, "top_10_holder_rate")) ?? undefined,
  };
}

/** Unified fetch: calls both security + info and merges */
export async function fetchGmgnTokenSecurity(mint: string): Promise<GmgnSecurityResult> {
  return cacheFirst(
    `gmgn:combined:${mint}`,
    async () => {
      await rateLimiters.gmgn.acquire();

      const [securityRes, infoRes] = await Promise.allSettled([
        fetchGmgnSecurityRaw(mint),
        fetchGmgnInfoRaw(mint),
      ]);

      const security = securityRes.status === "fulfilled" ? securityRes.value : {};
      const info = infoRes.status === "fulfilled" ? infoRes.value : {};

      // Merge: security fields take precedence for overlapping keys
      return {
        ...info,
        ...security,
      };
    },
    { ttlMs: 60_000 },
  );
}
