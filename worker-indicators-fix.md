# Worker Report: Indicator Layer Fixes

## Changes Made

### `src/lib/indicators.ts`
- **Removed duplicate type definitions** — `IndicatorTimeframe` and `PoolIndicators` now imported from canonical `types.ts`
- **Added `PoolRatiosResult` interface** — `{ ratios: number[]; skipped: number }`
- **Updated `computePoolRatios`** — Returns `PoolRatiosResult` with `skipped` count incremented when points are dropped (Y price ≤ 0, X price ≤ 0, or missing timestamp)
- **Updated `buildPoolIndicators`** — Computes `dataQuality` per timeframe:
  - `"full"` — ≥ 20 aligned ratios
  - `"partial"` — > 0 but < 20 ratios
  - `"insufficient"` — 0 ratios

### `src/lib/types.ts`
- Added `dataQuality?: "full" | "partial" | "insufficient"` to `IndicatorTimeframe`

### `src/lib/api-types.ts`
- Added `dataQuality?: "full" | "partial" | "insufficient"` to `IndicatorTimeframe` (frontend-facing looser type)

### `src/lib/indicators.test.ts`
- Updated all `computePoolRatios` tests to destructure `{ ratios, skipped }`
- Added `skipped` assertions to existing tests
- **New test**: `"handles duplicate timestamps by keeping last value"`
- **New test**: `"handles mixed success across timeframes"` (full/partial/insufficient)
- **New test**: `"handles period = 1 edge case"` for `sma`

## Validation
- 207 tests passing (11 test files)
- `pnpm build` compiles cleanly
- No TypeScript errors

## Notes
- The route.ts fixes (timeout, parallel fetching, Birdeye success:false handling) were committed by the parallel route worker in commit `1d264f1`
- All code review findings are now addressed
