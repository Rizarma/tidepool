/**
 * GET /api/pools/new
 *
 * Returns recently created Meteora DLMM pools sorted by creation time.
 */

import { fetchMeteoraDlmmNewPools } from "@/lib/providers-dlmm";
import { apiErrorResponse, classifyProviderError } from "@/lib/api-errors";
import { timedFetch, buildSourceStatus } from "@/lib/provider-status";
import { cacheableJson } from "@/lib/api-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const result = await timedFetch("meteora_dlmm", () => fetchMeteoraDlmmNewPools(20));

    const source = buildSourceStatus("meteora_dlmm", result);

    if (result.status === "rejected") {
      const rawError = result.reason?.message ?? String(result.reason);
      const sanitized = classifyProviderError(rawError);
      return Response.json(
        { error: { code: sanitized.code, message: sanitized.message }, source },
        { status: sanitized.status },
      );
    }

    const { pools, total, pages } = result.value.data;

    return cacheableJson({
      pools,
      total,
      pages,
      source,
      fetchedAt: new Date().toISOString(),
    }, 10, 30);
  } catch (err) {
    console.error("Unhandled new pools error", err);
    return apiErrorResponse(
      "INTERNAL_ERROR",
      "Unable to load new pools right now.",
      500,
    );
  }
}
