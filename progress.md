# Progress

## Status
In Progress — Code review fixes applied

## Tasks
- [x] Birdeye `success: false` handling (critical)
- [x] Retry error preservation (critical)
- [x] Timestamp deduplication in parser
- [x] Overall 30s timeout on `fetchPoolIndicators`
- [x] Parallel X+Y fetching per timeframe (cuts ~12s → ~6s)
- [x] `skipped` count in `computePoolRatios`
- [x] `dataQuality` field on `IndicatorTimeframe` (full/partial/insufficient)
- [x] Test fixes for new return types
- [x] All 207 tests passing

## Files Changed
- `src/lib/providers-ohlcv.ts` — Birdeye fixes + deduplication
- `src/lib/indicators.ts` — `PoolRatiosResult` + `dataQuality`
- `src/lib/types.ts` — `dataQuality` field
- `src/lib/api-types.ts` — `dataQuality` field
- `src/app/api/scan/pair/route.ts` — timeout + parallel fetching
- `src/lib/indicators.test.ts` — test fixes + new tests

## Notes
- Route.ts now uses Promise.race with 30s timeout
- X+Y fetched in parallel per timeframe, 1s delay between timeframes
- Tests run 47% faster (3.4s vs 6.4s)
