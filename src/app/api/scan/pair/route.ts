/**
 * GET /api/scan/pair?pool=<address>
 * GET /api/scan/pair?pair=<address>       (alias for pool)
 * GET /api/scan/pair?mintA=<address>&mintB=<address>
 *
 * DLMM pair scanning endpoint – fetches pool data from Meteora REST API.
 */

import { isValidSolanaMint } from "@/lib/validation";
import {
  fetchMeteoraDlmmPool,
  fetchMeteoraDlmmPairByMints,
} from "@/lib/providers-dlmm";
import type { PoolReport, SourceStatus, DlmmPairInfo } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const pool = searchParams.get("pool")?.trim() || searchParams.get("pair")?.trim();
  const mintA = searchParams.get("mintA")?.trim();
  const mintB = searchParams.get("mintB")?.trim();

  // Determine mode
  if (!pool && (!mintA || !mintB)) {
    return Response.json(
      {
        error:
          "Missing required query parameters: provide ?pool=<address> or ?mintA=<address>&mintB=<address>",
      },
      { status: 400 },
    );
  }

  // Validate addresses
  if (pool) {
    if (!isValidSolanaMint(pool)) {
      return Response.json(
        { error: "Invalid Solana address for pool parameter" },
        { status: 400 },
      );
    }
  } else {
    if (!isValidSolanaMint(mintA!)) {
      return Response.json(
        { error: "Invalid Solana address for mintA parameter" },
        { status: 400 },
      );
    }
    if (!isValidSolanaMint(mintB!)) {
      return Response.json(
        { error: "Invalid Solana address for mintB parameter" },
        { status: 400 },
      );
    }
  }

  // Fetch from Meteora DLMM
  const result = await timedFetch("meteora_dlmm", () =>
    pool
      ? fetchMeteoraDlmmPool(pool)
      : fetchMeteoraDlmmPairByMints(mintA!, mintB!),
  );

  const source = buildSourceStatus("meteora_dlmm", result);
  const sources: SourceStatus[] = [source];

  if (result.status === "rejected") {
    return Response.json(
      {
        error: result.reason?.message ?? String(result.reason),
        sources,
      },
      { status: 502 },
    );
  }

  const pair: DlmmPairInfo = result.value.data;

  const report: PoolReport = {
    kind: "pair",
    pair,
    sources,
    fetchedAt: new Date().toISOString(),
  };

  return Response.json(report);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface TimedResult<T> {
  data: T;
  latencyMs: number;
}

type SettledResult<T> =
  | { status: "fulfilled"; value: TimedResult<T> }
  | { status: "rejected"; reason: { message?: string } | undefined };

async function timedFetch<T>(
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

function buildSourceStatus(
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
  return {
    provider,
    success: false,
    error: result.reason?.message ?? String(result.reason),
  };
}
