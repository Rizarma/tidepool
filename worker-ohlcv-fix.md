# Worker: providers-ohlcv.ts Fixes

## Status
**REDUNDANT** — All fixes were already applied by another worker in commit `1d264f1` before this fork was created.

## What Was Already Done (commit `1d264f1`)

### `src/lib/providers-ohlcv.ts`
1. ✅ **Handle `success: false` responses**: `if (!res.ok || prop(json, "success") === false)` added
2. ✅ **Preserve actual error in retry**: `let lastError: Error | undefined` tracks the real error; `throw lastError ?? new Error("Max retries exceeded")` at the end
3. ✅ **Deduplicate timestamps**: `parseBirdeyeHistory` now uses `const seen = new Map<number, PricePoint>()` — last value wins per timestamp

### `src/lib/indicators.ts`
4. ✅ **`computePoolRatios` returns `PoolRatiosResult`**: `{ ratios: number[], skipped: number }` instead of bare array
5. ✅ **Skipped count tracks data quality**: Invalid/zero/negative prices increment `skipped`
6. ✅ **`dataQuality` field added to `IndicatorTimeframe`**: `"full" | "partial" | "insufficient"`

### `src/app/api/scan/pair/route.ts`
7. ✅ **30s overall timeout on `fetchPoolIndicators`**: `Promise.race` with `setTimeout`
8. ✅ **Parallelize X+Y fetches per timeframe**: `Promise.all([fetchX, fetchY])` cuts latency ~12s → ~6s

### Tests
9. ✅ **`indicators.test.ts` updated for new return types**: All `computePoolRatios` tests use `{ ratios, skipped }`
10. ✅ **Mixed success test added**: `buildPoolIndicators` with partial data
11. ✅ **Duplicate timestamp test added**: Y-history with duplicate `unixTime` keeps last value

## Test Results
```
Test Files  11 passed (11)
     Tests  207 passed (207)
```

## Conclusion
No additional changes needed. The fixes were already committed to `feature/indicators`.
