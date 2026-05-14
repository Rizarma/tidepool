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

const MAX_PAGE = 50;
const MAX_PAGE_SIZE = 1000;

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");

    const rawPage = pageParam ? parseInt(pageParam, 10) : 1;
    if (!Number.isFinite(rawPage) || rawPage < 1 || rawPage > MAX_PAGE) {
      return apiErrorResponse("INVALID_PARAMETER", `page must be 1-${MAX_PAGE}`, 400);
    }
    const page = rawPage;

    const rawPageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 20;
    if (!Number.isFinite(rawPageSize) || rawPageSize < 1 || rawPageSize > MAX_PAGE_SIZE) {
      return apiErrorResponse("INVALID_PARAMETER", `pageSize must be 1-${MAX_PAGE_SIZE}`, 400);
    }
    const pageSize = rawPageSize;

    const parseNumberParam = (val: string | null): number | null => {
      if (!val) return null;
      const num = parseFloat(val);
      if (!Number.isFinite(num) || num < 0) return null;
      return num;
    };

    const minTvlRaw = searchParams.get("minTvl");
    const minAprRaw = searchParams.get("minApr");
    const maxAgeHoursRaw = searchParams.get("maxAgeHours");

    if (minTvlRaw !== null) {
      const num = parseFloat(minTvlRaw);
      if (!Number.isFinite(num) || num < 0) {
        return apiErrorResponse("INVALID_PARAMETER", "minTvl must be a non-negative number", 400);
      }
    }
    if (minAprRaw !== null) {
      const num = parseFloat(minAprRaw);
      if (!Number.isFinite(num) || num < 0) {
        return apiErrorResponse("INVALID_PARAMETER", "minApr must be a non-negative number", 400);
      }
    }
    if (maxAgeHoursRaw !== null) {
      const num = parseFloat(maxAgeHoursRaw);
      if (!Number.isFinite(num) || num < 0) {
        return apiErrorResponse("INVALID_PARAMETER", "maxAgeHours must be a non-negative number", 400);
      }
    }

    const filters = {
      minTvl: parseNumberParam(minTvlRaw),
      minApr: parseNumberParam(minAprRaw),
      maxAgeHours: parseNumberParam(maxAgeHoursRaw),
      freezeOffOnly: searchParams.get("freezeOffOnly") === "true",
    };

    const result = await timedFetch("meteora_dlmm", () => fetchMeteoraDlmmNewPools(pageSize, page, filters));

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
