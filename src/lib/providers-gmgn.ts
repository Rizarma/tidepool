/**
 * GMGN Agent API provider — token security data.
 * Docs: https://docs.gmgn.ai/index/gmgn-agent-api
 */

import { cacheFirst } from "@/lib/fetch-guard";
import { rateLimiters } from "@/lib/rate-limit";
import { isObject, prop, toNumber, toString, toBool } from "@/lib/provider-parsing";

const BASE_URL = "https://api.gmgn.ai";

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
  /** Buy tax percentage string */
  buyTax?: string;
  /** Sell tax percentage string */
  sellTax?: string;
  /** Top 10 holder concentration 0-1 */
  top10HolderRate?: number;
  /** Number of sniper wallets */
  sniperCount?: number;
  /** Contract ownership renounced (EVM-style) */
  ownerRenounced?: string;
  /** Creator token status, e.g. "creator_close" */
  creatorTokenStatus?: string;
}

export async function fetchGmgnTokenSecurity(
  mint: string,
): Promise<GmgnSecurityResult> {
  return cacheFirst(
    `gmgn:security:${mint}`,
    async () => {
      await rateLimiters.gmgn.acquire();

      const apiKey = process.env.GMGN_API_KEY;
      if (!apiKey) {
        throw new Error("GMGN_API_KEY not configured");
      }

      const url = `${BASE_URL}/v1/token/security?chain=sol&address=${encodeURIComponent(mint)}`;
      const res = await fetch(url, {
        headers: {
          "X-API-KEY": apiKey,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`GMGN security API ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (!isObject(data)) {
        throw new Error("Invalid GMGN response: expected object");
      }

      // GMGN returns nested under `data` sometimes, or flat
      const payload = isObject(prop(data, "data")) ? prop(data, "data") : data;

      return parseGmgnSecurity(payload);
    },
    { ttlMs: 60_000 },
  );
}

function parseGmgnSecurity(raw: unknown): GmgnSecurityResult {
  if (!isObject(raw)) return {};

  const result: GmgnSecurityResult = {};

  // Boolean fields
  result.renouncedMint = toBool(prop(raw, "renounced_mint")) ?? undefined;
  result.renouncedFreeze = toBool(prop(raw, "renounced_freeze_account")) ?? undefined;

  // CTO flag: 1 = true, 0 = false
  const ctoRaw = prop(raw, "cto_flag") ?? prop(raw, "dev", "cto_flag");
  if (ctoRaw === 1 || ctoRaw === "1" || ctoRaw === true) {
    result.ctoFlag = true;
  } else if (ctoRaw === 0 || ctoRaw === "0" || ctoRaw === false) {
    result.ctoFlag = false;
  }

  // Honeypot
  result.isHoneypot = toString(prop(raw, "is_honeypot")) ?? undefined;

  // Numeric fields
  result.rugRatio = toNumber(prop(raw, "rug_ratio")) ?? undefined;
  result.top10HolderRate = toNumber(prop(raw, "top_10_holder_rate")) ?? undefined;
  result.sniperCount = toNumber(prop(raw, "sniper_count")) ?? undefined;

  // Tax fields
  result.buyTax = toString(prop(raw, "buy_tax")) ?? undefined;
  result.sellTax = toString(prop(raw, "sell_tax")) ?? undefined;

  // EVM-style ownership
  result.ownerRenounced = toString(prop(raw, "owner_renounced")) ?? undefined;

  // Creator status
  result.creatorTokenStatus =
    toString(prop(raw, "creator_token_status")) ?? undefined;

  return result;
}
