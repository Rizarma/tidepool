All review fixes are committed. Here's what was fixed:

---

## 🔴 Critical Fixes

### `src/lib/providers-ohlcv.ts`
| Issue | Fix |
|---|---|
| Birdeye returns `{success: false}` with HTTP 200 | `if (!res.ok \|\| prop(json, "success") === false)` |
| Retry throws generic "Max retries exceeded" | Store `lastError` and re-throw the actual error |
| Duplicate timestamps skew SMA | Map deduplication (`seen.set(unixTime, ...)`) — last wins |

### `src/app/api/scan/pair/route.ts`
| Issue | Fix |
|---|---|
| No overall timeout — worst case ~95s hang | `Promise.race` with 30s `setTimeout` |
| Sequential X then Y = ~12s latency | `Promise.all([X, Y])` per timeframe = ~6s |

---

## 🟡 Improvements

### `src/lib/indicators.ts`
- `computePoolRatios` now returns `{ ratios, skipped }` — tracks how many points were dropped
- `buildPoolIndicators` computes `dataQuality`: `"full"` (≥20 points), `"partial"` (some), `"insufficient"` (none)

### `src/lib/types.ts` / `api-types.ts`
- Added `dataQuality?: "full" | "partial" | "insufficient"` to `IndicatorTimeframe`

---

## Test Results

| Metric | Before | After |
|---|---|---|
| Total tests | 204 | **207** |
| Passing | 204 | **207** |
| Suite duration | 6.4s | **3.4s** (47% faster) |

---

The full review document is saved at `review.md` for reference.