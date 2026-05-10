# Backend Implementation Progress

## Completed

### New Files
- `src/lib/indicators/math.ts` — Pure SMA math function (extracted to avoid circular deps)
- `src/lib/indicators/registry.ts` — Indicator registry with SMA registered, ready for EMA/RSI/MACD
- `src/app/api/indicators/route.ts` — New `GET /api/indicators` endpoint with configurable timeframes + indicators
- `src/app/api/indicators/route.test.ts` — 10 tests for the new endpoint

### Modified Files
- `src/lib/types.ts` — Generic indicator types (`IndicatorType`, `IndicatorValue`, `IndicatorTimeframe`)
- `src/lib/api-types.ts` — Mirrored generic types for frontend
- `src/lib/indicators.ts` — Refactored `buildPoolIndicators` to accept config + use registry
- `src/app/api/scan/pair/route.ts` — Removed inline indicator fetching
- `src/app/api/scan/pair/route.test.ts` — Removed indicator integration tests (moved to new endpoint)
- `src/lib/indicators.test.ts` — Updated for new `buildPoolIndicators` signature
- `src/components/report/PairReportLayout.tsx` — Band-aid fix to use new `values` array shape

### Test Results
- 213 tests passing (up from 207)
- Build compiles cleanly

## API Contract

### Request
```
GET /api/indicators?pool=<address>&timeframes=1m,5m,15m&indicators=sma:20
```

### Response
```json
{
  "indicators": {
    "timeframes": [
      {
        "timeframe": "1m",
        "values": [
          { "type": "sma", "value": 0.0045, "period": 20, "dataQuality": "full" }
        ]
      }
    ]
  },
  "sources": [
    { "provider": "meteora_dlmm", "success": true, "latencyMs": 123 },
    { "provider": "birdeye", "success": true, "latencyMs": 456 }
  ]
}
```

## Registry Pattern

Adding a new indicator requires only one entry in `src/lib/indicators/registry.ts`:

```ts
ema: {
  type: "ema",
  name: "EMA",
  description: "Exponential Moving Average",
  compute: (values, config) => ema(values, config.period),
  defaultPeriod: 20,
  minDataPoints: 2,
},
```

No other files need changes.
