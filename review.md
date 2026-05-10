# Code Review: `feature/indicators` Branch

## Context
Adding Birdeye OHLCV-based SMA-20 indicators (1m/5m/15m) to pool scan reports. Fetches token price histories from Birdeye, computes pool ratios (tokenX USD / tokenY USD), and renders a Moving Averages panel.

---

## Severity Legend
- 🔴 **Critical** — Bugs, security issues, or incorrect behavior
- 🟡 **Warning** — Code smells, maintainability issues, or edge-case problems
- 🟢 **Info** — Suggestions for improvement, not urgent

---

## 1. Backend / API Layer

### `src/lib/providers-ohlcv.ts`

#### 🔴 Critical — Birdeye `success: false` responses are not handled

Birdeye returns HTTP 200 with `{ success: false, message: "..." }` for some error conditions (e.g., invalid token, no data). Current code:

```ts
if (!res.ok) {
  const errMsg = extractBirdeyeError(json) ?? `HTTP ${res.status}`;
  throw new Error(errMsg);
}
return parseBirdeyeHistory(json);
```

If `res.ok === true` but `json.success === false`, the code proceeds to `parseBirdeyeHistory`, which will fail with "no items array found" instead of the actual Birdeye error message.

**Fix:**
```ts
if (!res.ok || prop(json, "success") === false) {
  const errMsg = extractBirdeyeError(json) ?? `HTTP ${res.status}`;
  throw new Error(errMsg);
}
```

#### 🟡 Warning — Retry loop loses the actual error on final failure

If all 3 retries fail with rate limit, the thrown error is `"Max retries exceeded"` instead of the actual HTTP 429 message. This makes debugging harder.

**Fix:** Store the last error and re-throw it:
```ts
let lastError: Error | undefined;
for (let attempt = 0; attempt <= retries; attempt++) {
  try {
    // ... fetch logic
    return result;
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    if (isRateLimited && attempt < retries) { await delay(...); continue; }
    throw lastError;
  }
}
throw lastError ?? new Error("Max retries exceeded");
```

#### 🟡 Warning — No deduplication of duplicate timestamps

If Birdeye returns duplicate `unixTime` values in the same response, `parseBirdeyeHistory` includes them all, which could skew SMA calculations.

**Fix:** Use a Map in `parseBirdeyeHistory` to keep only the last value per timestamp:
```ts
const seen = new Map<number, PricePoint>();
for (const item of itemsRaw) {
  // ... parse unixTime and value
  if (unixTime !== undefined && value !== undefined) {
    seen.set(unixTime, { unixTime, value }); // last wins
  }
}
const items = Array.from(seen.values()).sort((a, b) => a.unixTime - b.unixTime);
```

#### 🟢 Info — `extractBirdeyeError` could also check `json.success === false`

Some Birdeye errors come as `{ success: false, message: "No data found" }`. The current `extractBirdeyeError` looks for `message` at the top level, which should catch this. However, it might be worth explicitly checking `success` to distinguish API errors from parsing errors.

---

### `src/lib/indicators.ts`

#### 🟡 Warning — `computePoolRatios` silently drops data

When Y price is 0, negative, or missing, the ratio is silently skipped with no indication. For tokens with sparse or bad data, this could result in fewer ratios than expected without the caller knowing why.

**Fix:** Consider adding a `skipped` count to help callers understand data quality:
```ts
export interface PoolRatiosResult {
  ratios: number[];
  skipped: number; // how many points were dropped
}
```

Or at minimum, log a warning in debug mode.

#### 🟡 Warning — `computePoolRatios` Map behavior for duplicate timestamps

The function builds `yMap` from Y history. If Y has duplicate `unixTime` values, the Map keeps only the last one. This is probably the desired behavior (last value wins), but it should be documented in the JSDoc.

#### 🟢 Info — `sma` could be optimized for very large arrays

Current: `slice(-period).reduce(...)` — O(period) per call. For 20 periods on 25 elements, this is negligible. For larger arrays, a sliding window would be O(1) per new value. **Not urgent** for current use case.

---

### `src/app/api/scan/pair/route.ts`

#### 🟡 Warning — No overall timeout on `fetchPoolIndicators`

Individual requests have 15s timeout, but with 6 sequential requests + 5 delays = ~95s worst case. If Birdeye is very slow or retrying, the API route could hang for a long time.

**Fix:** Add an overall timeout:
```ts
async function fetchPoolIndicators(pair: DlmmPairInfo, timeoutMs = 30_000) {
  return Promise.race([
    fetchPoolIndicatorsInternal(pair),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Birdeye indicator fetch timeout")), timeoutMs)
    ),
  ]);
}
```

#### 🟡 Warning — X and Y histories for the same timeframe could be parallelized

Currently:
```ts
for (const tf of timeframes) {
  xHistories.push(await fetchBirdeyePriceHistory(tokenX.mint, tf, 25));
  await delay(1000);
}
for (const tf of timeframes) {
  yHistories.push(await fetchBirdeyePriceHistory(tokenY.mint, tf, 25));
  await delay(1000);
}
```

X and Y for the same timeframe are independent — they could be fetched in parallel:
```ts
for (const tf of timeframes) {
  const [x, y] = await Promise.all([
    fetchBirdeyePriceHistory(tokenX.mint, tf, 25),
    fetchBirdeyePriceHistory(tokenY.mint, tf, 25),
  ]);
  xHistories.push(x);
  yHistories.push(y);
  await delay(1000);
}
```

This cuts latency from ~12s to ~6s (3 timeframes × ~2s each with parallel fetching).

> ⚠️ **Caveat:** Parallel fetching might trigger rate limits more aggressively. Test with your Birdeye tier before enabling.

#### 🟢 Info — `console.error` is fine for POC but should use structured logging in production

Current: `console.error("[Birdeye] Indicator fetch failed:", rawError)`

For production, consider a proper logger with levels and correlation IDs.

---

## 2. Frontend / UI Layer

### `src/components/report/PairReportLayout.tsx`

#### 🟢 Info — `IndicatorCard` is a clean local component

Props are well-typed, rendering is straightforward, and the conditional trend messaging is clear. Consider extracting to a separate file if it will be reused elsewhere (e.g., in a token scan report).

#### 🟢 Info — Missing SMA shows `"—"` which is good

`formatTokenPrice(undefined)` returns `"—"`, so the card gracefully handles missing data. Consider adding a tooltip or small note explaining *why* SMA is unavailable (e.g., "Not enough price history").

#### 🟢 Info — Color coding is intuitive but could use a legend

Green = above SMA (bullish), Red = below SMA (bearish). Some users might not immediately understand this. A small inline legend or hover tooltip would help.

---

### `src/components/pairs/NewPairsTable.tsx`

#### ✅ Good — Hydration fix is correct

Moving `localStorage` reads from `useState` initializers to a `useEffect` properly resolves the SSR/client mismatch. The server and client now render identical HTML on first paint.

---

## 3. Tests

### `src/lib/indicators.test.ts` — 14 tests

#### 🟡 Warning — Missing test for duplicate timestamps

`computePoolRatios` with duplicate `unixTime` in Y history keeps only the last value. This behavior should be tested explicitly.

```ts
it("handles duplicate timestamps by keeping last value", () => {
  const xHistory = { items: [{ unixTime: 1000, value: 1.0 }] };
  const yHistory = { items: [
    { unixTime: 1000, value: 2.0 },
    { unixTime: 1000, value: 4.0 }, // duplicate
  ]};
  const ratios = computePoolRatios(xHistory, yHistory);
  expect(ratios).toEqual([0.25]); // 1.0 / 4.0, not 1.0 / 2.0
});
```

#### 🟡 Warning — Missing test for mixed success in `buildPoolIndicators`

Some timeframes have enough data, others don't. Current tests only cover "all succeed" or "all fail".

#### 🟢 Info — Could add test for `sma` with `period = 1`

Edge case: `sma([5], 1)` should return `5`.

---

### `src/app/api/scan/pair/route.test.ts` — 3 indicator tests

#### 🟡 Warning — Integration tests mock too much

Both `fetchBirdeyePriceHistory` and `buildPoolIndicators` are mocked. The test verifies the wiring but not the actual data flow. Consider one test that mocks only the global `fetch` and lets the real `buildPoolIndicators` compute the result.

#### 🟡 Warning — No test for timeout behavior

The 15s Birdeye timeout and the overall indicator fetch are not tested.

#### 🟡 Warning — No test for retry logic

The exponential backoff retry is not tested. A mock that fails 2 times then succeeds would verify this.

#### 🟢 Info — 15s test timeout is generous

With 6 × 1000ms delays, the test needs ~6s. The 15s timeout is safe. Consider using `vi.useFakeTimers()` to speed this up if test suite growth becomes a concern.

---

## 4. Types & Architecture

### `src/lib/types.ts` / `src/lib/api-types.ts`

#### 🟢 Info — `PoolIndicators` could include data quality metadata

Currently, missing SMAs show as `undefined` with no explanation. Consider:

```ts
export interface IndicatorTimeframe {
  timeframe: "1m" | "5m" | "15m";
  sma20?: number;
  dataQuality?: "full" | "partial" | "insufficient";
}
```

This would let the UI show "Insufficient data" instead of just `"—"`.

#### ✅ Good — Backward compatibility is maintained

`indicators?: PoolIndicators` is optional on `PoolReport`, so existing consumers are not broken.

---

### `.env.example`

#### ✅ Good — Clear documentation

- `BIRDEYE_API_KEY` is documented as server-side only
- `SOLANA_RPC_URL` is also documented

---

## Summary

| Area | Rating | Top Issue |
|---|---|---|
| Backend / API | **B+** | Missing `success: false` handling; no overall timeout |
| Frontend / UI | **A** | Clean, well-structured, good conditional rendering |
| Tests | **B+** | Good coverage, missing timeout / retry / duplicate tests |
| Architecture | **A** | Backward-compatible, properly layered |

---

## Recommended Priority Fixes

| Priority | File | Issue | Effort |
|---|---|---|---|
| P1 | `providers-ohlcv.ts` | Handle Birdeye `success: false` responses | Small |
| P1 | `providers-ohlcv.ts` | Preserve actual error in retry final failure | Small |
| P2 | `route.ts` | Add 30s overall timeout to `fetchPoolIndicators` | Small |
| P2 | `route.ts` | Consider parallelizing X+Y fetches per timeframe | Small |
| P2 | `indicators.test.ts` | Add duplicate timestamp test | Small |
| P2 | `route.test.ts` | Add timeout + retry tests | Medium |
| P3 | `types.ts` | Add data quality metadata to indicators | Small |
| P3 | `PairReportLayout.tsx` | Add tooltip for missing SMA | Small |
