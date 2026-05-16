# Tidepool

Next.js 16 application for tidepool scanning and risk analysis.

## Quick Reference

- **Package Manager:** pnpm only; do not use npm, yarn, or bun commands.
- **Dev:** `pnpm dev`
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Test:** `pnpm test`

## Critical Rules

- This is Next.js 16.2.4 with React 19.2.4. APIs, conventions, and file structure may differ from older Next.js versions.
- Before changing Next.js behavior, verify the local installed version and prefer local package docs/types over memory. The historical `node_modules/next/dist/docs/` path may not exist in this install.

## Domain Notes

- Pool mode accepts either a Meteora DLMM pool address or a token mint copied from GMGN.
- Direct pool scans use `GET /api/scan/pair?pool=<address>` and Meteora `GET /pools/{address}`.
- Token-mint pool discovery uses `GET /api/scan/pools?mint=<mint>` and Meteora `GET /pools?query=<mint>`, then exact-filters token X/Y mint matches and sorts pools by TVL, then 24h volume.
- Address intelligence lives at `GET /api/resolve-address?address=<address>` and can report `direct_pool_scan`, `pool_discovery`, `token_scan`, or `none`.
- Keep token scans and pool scans conceptually separate: Token mode checks token risk; Pool mode checks Meteora DLMM pool data.
- The homepage shows a live **New Pairs table** of recently created Meteora DLMM pools via `GET /api/pools/new`. Columns include price, TVL, volume, fees, APR, bin step, base fee, market cap, holders, age, freeze authority status, and launchpad. Each row includes quick links to Meteora, GMGN, DexTools, DexScreener, Jupiter, and LPAgent. Clicking a pool row navigates to `/pool/<address>` via `router.push()`.
- `GET /api/pools/new` proxies Meteora's new-pools endpoint and returns `{ pools: DlmmPairInfo[], total, pages }` with `createdAt` populated from `pool.created_at`.
- The New Pairs table supports periodic auto-refresh (60s interval, 15s cooldown). Toggle state and countdown are persisted in `localStorage` with keys `tidepool_auto_refresh` and `tidepool_last_fetched_at`.
- The Tidepool logo button navigates to `/` via `router.push('/')`, returning to the New Pairs table. Command bar inputs are persisted in `localStorage` via lazy `useState` initializers in `RouteScanForm.tsx`.
- Pool reports include configurable technical indicators (SMA) fetched from a separate endpoint `GET /api/indicators?pool=<address>&timeframes=1m,5m,15m&indicators=sma:20`. This is separate from the pool scan so indicator latency does not block pool data.
- The indicators subsystem lives in `src/components/indicators/` (UI: `IndicatorsPanel`, `IndicatorBottomBar`, `IndicatorSettings`, `IndicatorConfigContext`), `src/lib/indicators/` (math + registry), `src/lib/providers-ohlcv.ts` (Birdeye fetcher), and `src/lib/indicator-config.ts` (config types + localStorage helpers).
- Adding a new indicator type requires a single entry in `src/lib/indicators/registry.ts` — no other files need changes.
- Pool price ratios for indicators are computed as `tokenX_USD / tokenY_USD` at matching timestamps from Birdeye price histories.
- Indicator config is persisted in `localStorage` under key `tidepool_indicator_config`.
- `IndicatorSettings.tsx` uses local draft state — changes only apply on the "Apply" button click. Do not change this to immediate apply.

### Pool Report UI (Trading Terminal)

The pool detail page (`/pool/[address]`) uses a terminal-style layout rendered by `PairReportLayout.tsx`. Sections render in this order:

1. `PoolHeader` — Pool identity (name, address, launchpad), status badge (Active/Blacklisted), metrics grid (TVL, 24h Vol, 24h Fees, Bin Step), and fee row (APR, Base Fee, Dynamic Fee). Includes a discovery slot for the pool chooser when multiple pools exist.
2. `PoolPriceBlock` (sticky) — Token price display: "1 X = price Y" and inverse. Stays visible while scrolling.
3. `ExternalLinks` (sticky) — Links to Meteora, DexTools, DexScreener, GMGN, Jupiter, LPAgent. Uses hardcoded referral codes `GMGN_REFERRAL = "yr2NU5dr"` and `LPAGENT_REFERRAL = "URq8gm4"`.
4. `TokenAnalysisMatrix` — On-Chain Analysis panel comparing Token X and Token Y across five security criteria: mint authority status, freeze authority status, CTO flag, honeypot check, and top-10 holder concentration. Data sourced from GMGN API (preferred) with Solana RPC fallback for raw authority addresses.
5. `IndicatorsPanel` — SMA technical indicators at configurable timeframes.
6. `RankedPoolsTable` — Sortable table of all related pools. Columns: Pool, TVL Share (micro-bar), TVL, 24h Vol, APR, Bin Step, Base Fee, 24h Fees, Age. The Dynamic Fee column was removed. Current pool is highlighted with an amber "You are here" badge.
7. `TokenCard` × 2 — Token X and Token Y detail cards showing price, market cap, reserve, holders, and mint address.
8. `ComparisonZone` — Bar chart comparison of TVL, 24h Volume, and APR across related pools. Collapsible when more than 6 pools. Uses `pctCompact` for APR labels. Pool labels use Meteora-style format: "Bin Step {n} · Fee {x}%".
9. `CompactFooter` — Pool tags, collapsible sources list, and data timestamp.

`DiscoveryPanel` supports a `variant="compact"` prop used when embedded inside `PoolHeader`.

### Related Pools

Pool reports include `report.relatedPools` — other DLMM pools for the same token pair. Fetched via Meteora `GET /pools/groups/<mintA>-<mintB>` with pagination (page size 200) to retrieve all pools. The current pool is included in the normalized list if not already present. Related pools are shown in both the `ComparisonZone` (bar charts) and `RankedPoolsTable` (sortable table).

### App Router Routes

The app uses Next.js 16 App Router with segmented routes. The root `layout.tsx` renders `AppShell` (a `"use client"` component) which wraps every page with the persistent command bar, indicator provider, and bottom bar.

**Route structure:**
- `/` — Homepage: `page.tsx` (Server Component) renders `HomePageView` (Client Component, wrapped in `<Suspense>`). `/?mode=token` shows token `EmptyState`.
- `/pool/[address]` — Pool scan: `page.tsx` exports metadata, renders `PoolRouteView` (Client Component with `key={address}` for remounts). Fetches `/api/scan/pair?pool=<address>`. On `ApiFetchError.code === "NO_DATA_FOUND"` (status 404), falls back to `fetchPoolDiscovery(address)` and `router.replace('/discover/...')`.
- `/token/[mint]` — Token scan: `page.tsx` exports metadata, renders `TokenRouteView`. Fetches `/api/scan?mint=<mint>`.
- `/discover/[mint]?pool=` — Pool discovery: `page.tsx` exports metadata, renders `DiscoveryRouteView`. Fetches `/api/scan/pools?mint=<mint>`. Pool selection persists via `?pool=` query param and is validated with `useMemo`.

**Server/Client split pattern:**
- `page.tsx` files are Server Components. They await `params: Promise<{...}>` (Next.js 16 style), build safe metadata, and render the Client view. **No `"use client"` in `page.tsx`.**
- `*RouteView.tsx` files are Client Components (`"use client"`). They manage fetch state (`loading`, `error`, `report`) in `useEffect` with only async `setState` inside Promise callbacks (no synchronous `setState` in effect bodies, per the `react-hooks/set-state-in-effect` lint rule). They render their own `LoadingState` and error UIs. Route-level `loading.tsx`/`error.tsx` are shell/module fallbacks only.

**Key files:**
- `src/app/AppShell.tsx` — Persistent shell with `IndicatorConfigProvider`, `RouteScanForm`, `IndicatorBottomBar`
- `src/components/scan/RouteScanForm.tsx` — Route-aware command bar. Derives mode from `pathname`/`searchParams`. Uses lazy `useState` initializers for `localStorage` restore (no sync `setState` in effects). On `/`, mode toggle updates URL (`/?mode=token` or `/`). On report routes, mode toggle only affects local state via `setMode()`.
- `src/lib/report-fetchers.ts` — `ApiFetchError` extends Error with `{ code?: ApiErrorCode; status: number; body?: unknown }`. Typed helpers: `fetchPoolReport`, `fetchTokenReport`, `fetchPoolDiscovery`, `fetchPoolByMints`.
- `src/lib/format.ts` — Shared formatting helpers (currency, percentages, addresses, ages). See Shared Formatting Helpers section below.
- `src/components/report/PairReportLayout.tsx` — Terminal-style pool report layout composing all pool report sections
- `src/components/report/PoolHeader.tsx` — Pool identity, metrics grid, status badge, fee row
- `src/components/report/PoolPriceBlock.tsx` — Sticky token price display
- `src/components/report/ExternalLinks.tsx` — External platform links with referral codes
- `src/components/report/ComparisonZone.tsx` — Collapsible bar chart comparison of related pools
- `src/components/report/RelatedPoolsPanel.tsx` — Sortable related pools table (`RankedPoolsTable`) and compatibility wrapper (`RelatedPoolsPanel`)
- `src/components/report/TokenCard.tsx` — Token detail card for Token X / Token Y
- `src/components/report/CompactFooter.tsx` — Tags, sources, data age footer
- `src/components/report/TokenAnalysisMatrix.tsx` — On-Chain Analysis comparison matrix for Token X / Token Y
- `src/components/report/report-atoms.tsx` — Reusable UI atoms: `TerminalSection`, `TerminalDataRow`, `TerminalMetric`, `DataRow`, `RiskBadge`, `MetricCell`, `PanelSection`, `TokenSummaryCompact`
- `src/lib/providers-gmgn.ts` — GMGN token security provider. Unified `fetchGmgnTokenSecurity(mint)` calls both `/v1/token/security` and `/v1/token/info`, merges results, caches for 5 minutes.

**Deleted SPA files (do not reference or re-create):**
- `src/components/scan/ScanClient.tsx`
- `src/components/scan/useScanController.ts`
- `src/components/scan/ScanForm.tsx`

## External Services and APIs

- **Meteora DLMM REST API** (`https://dlmm.datapi.meteora.ag`): Used in `src/lib/providers-dlmm.ts` for DLMM pool discovery and pool details.
  - `GET /pools?query=<mint>` discovers pools that may contain a token mint.
  - `GET /pools/<address>` fetches one pool by DLMM pool address.
  - `GET /pools/groups/<mintA>-<mintB>` fetches pool groups for a token pair.
- `GET /pools?sort_by=pool_created_at:desc&filter_by=is_blacklisted=false` fetches recently created pools for the homepage New Pairs table. Response is paginated: `{ total, pages, current_page, page_size, data: [...] }`.
- **DexScreener API** (`https://api.dexscreener.com/latest/dex/tokens/<mint>`): Used in `src/lib/providers.ts` for token market data such as price, liquidity, volume, and market cap.
- **RugCheck API** (`https://api.rugcheck.xyz/v1/tokens/<mint>/report`): Used in `src/lib/providers.ts` for token risk signals, holder concentration, and authority warnings.
- **Jupiter APIs**: Used in `src/lib/providers.ts` for token metadata, price, and strict-list checks.
  - Token metadata: `https://tokens.jup.ag/token/<mint>`
  - Price: `https://api.jup.ag/price/v2?ids=<mint>`
- **Solana RPC**: Used in `src/lib/providers.ts` for on-chain mint account data.
  - RPC rotation: `getNextRpcUrl()` round-robins across `SOLANA_RPC_URL` → `NEXT_PUBLIC_SOLANA_RPC_URL` → `SOLANA_RPC_URLS` (comma-separated list) → public fallback.
  - Default fallback: `https://api.mainnet-beta.solana.com`
- **Solana program IDs**: Defined in `src/lib/solana-programs.ts` for SPL Token and Token-2022 account checks.
  - SPL Token: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
  - Token-2022: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- **Birdeye API** (`https://public-api.birdeye.so`): Used in `src/lib/providers-ohlcv.ts` for token price history (OHLCV) at 1m/5m/15m/1h/4h/1d timeframes. Endpoint: `GET /defi/history_price?address=<mint>&type=<timeframe>&time_from=<unix>&time_to=<unix>`. Requires `BIRDEYE_API_KEY` header and `x-chain: solana`. Implements retry with exponential backoff on 429 rate limits. Uses the shared cache (`src/lib/cache.ts`) instead of local Maps. Gracefully degrades (omits indicators) when the key is missing.
- **GMGN API** (`https://openapi.gmgn.ai`): Used in `src/lib/providers-gmgn.ts` for enriched token security data. Calls two endpoints per token:
  - `GET /v1/token/security?chain=sol&address=<mint>` — returns `renounced_mint`, `renounced_freeze_account`, `is_honeypot`, `honeypot` (numeric fallback for Solana), `top_10_holder_rate`, `rug_ratio`, `sniper_count`
  - `GET /v1/token/info?chain=sol&address=<mint>` — returns `dev.cto_flag`, `stat.top_10_holder_rate`
  Both endpoints require `X-APIKEY` header, plus `timestamp` (Unix seconds) and `client_id` (UUID) query params for anti-replay. Responses are wrapped in `{"code":0,"data":{...}}` — `gmgnFetch` validates `code === 0` before returning to prevent cache poisoning on error responses. Requires `GMGN_API_KEY` env var; gracefully skipped when absent. Cloudflare may block datacenter/IPv6 IPs — local dev works, production serverless may need client-side proxying.

The app does not use Solana or Meteora SDK packages. It calls these services with native `fetch` and a small JSON-RPC helper.

## Provider Infrastructure & Caching

All 3rd-party fetches now pass through a shared caching, deduplication, and rate-limiting layer. When working on provider code, route code, or tests, keep these patterns in mind.

### Infrastructure Files

| File | Purpose |
|------|---------|
| `src/lib/cache.ts` | Unified cache interface. `cache.get<T>(key)` / `cache.set(key, value, ttlMs)`. Auto-detects Upstash Redis when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set; otherwise falls back to `MemoryCache` (in-memory Map with TTL). Cache errors are silently swallowed — the app never crashes if Redis is unavailable. |
| `src/lib/dedup.ts` | In-flight request deduplication. `dedup(key, factory, ttlMs)` ensures identical concurrent requests share one promise. Default window is 5s. `clearDedup()` is exported for test use. |
| `src/lib/rate-limit.ts` | Token bucket rate limiters per provider. `rateLimiters.dexscreener`, `.rugcheck`, `.jupiter`, `.solanaRpc`, `.meteoraDlmm`, `.birdeye`, `.gmgn`. Call `await rateLimiter.acquire()` before the fetch. |
| `src/lib/fetch-guard.ts` | `cacheFirst(key, factory, options)` — the standard pattern for wrapping a provider fetch. It does: cache hit → dedup → rate limit → execute → cache set. Use this for all new provider fetchers. |
| `src/lib/api-cache.ts` | HTTP `Cache-Control` helpers. `cacheableJson(data, maxAge, staleWhileRevalidate)` returns a `Response` with `public, s-maxage=N, stale-while-revalidate=M`. All API route success responses should use this instead of `Response.json()`. |

### Wrapping a New Provider Fetch

The standard pattern is:

```typescript
import { cacheFirst } from "@/lib/fetch-guard";
import { rateLimiters } from "@/lib/rate-limit";

export async function fetchMyProvider(mint: string): Promise<MyData> {
  return cacheFirst(
    `myprovider:${mint}`,
    async () => {
      await rateLimiters.myprovider.acquire();
      const res = await fetch(...);
      return parseResult(res);
    },
    { ttlMs: 30_000 }
  );
}
```

### Cache Key Naming Convention

Use provider-prefixed keys to avoid collisions:

- DexScreener: `dexscreener:${mint}`
- RugCheck: `rugcheck:${mint}`
- Jupiter: `jupiter:${mint}`
- Solana RPC: `solana:rpc:${mint}`
- Meteora pool: `meteora:pool:${address}`
- Meteora pools by mint: `meteora:pools:${mint}`
- Meteora new pools: `meteora:new:${page}:${pageSize}`
- Meteora pair by mints: `meteora:pair:${sortedA}:${sortedB}`
- Birdeye OHLCV: `birdeye:${mint}:${timeframe}:${periods}`
- Meteora OHLCV: `meteora:ohlcv:${pool}:${timeframe}:${periods}`
- GMGN security: `gmgn:security:${mint}`

### API Route Cache Headers

All success responses in API routes use `cacheableJson` from `@/lib/api-cache` with these TTLs:

- `/api/scan`: 15s max-age, 60s stale-while-revalidate
- `/api/scan/pair`: 10s max-age, 30s stale-while-revalidate
- `/api/scan/pools`: 15s max-age, 60s stale-while-revalidate
- `/api/pools/new`: 10s max-age, 30s stale-while-revalidate
- `/api/resolve-address`: 15s max-age, 60s stale-while-revalidate
- `/api/indicators`: 20s max-age, 60s stale-while-revalidate

Error responses continue to use `Response.json()` or `apiErrorResponse()` without cache headers.

### Testing

`vitest.setup.ts` clears both `cache` and `dedup` before each test. When adding new tests that exercise cached providers, you do not need to manually clear cache state — the setup file handles it.

If a test file previously called `clearIndicatorResponseCache()`, that function is now a no-op (the local response cache was removed in favor of provider-level caching). The test setup file ensures a clean state for all tests.

## Shared Formatting Helpers

`src/lib/format.ts` exports shared formatting utilities used across the UI:

| Function | Purpose |
|----------|---------|
| `formatUsd(value)` | Currency formatter with adaptive precision |
| `formatCompactUsd(value)` | Compact USD — `$1.2K`, `$3.4M` |
| `formatCompactNumber(value)` | Compact number — `1.2K`, `3.4M`, `1.23B` |
| `formatTokenPrice(value)` | Token price with exponential fallback for extreme values |
| `pctValue(value)` | Percentage with 2 decimals — `12.34%` |
| `pctCompact(value)` | Compact percentage for large values — `2.76k%`, `1.50M%` |
| `feePct(value)` | Fee percentage with adaptive precision — `0.0025%` or `0.25%` |
| `shortenAddress(addr, start?, end?)` | Shorten base58 — `7x8K…3aB9` |
| `short(value)` | Shorten any string > 12 chars |
| `formatAge(timestamp)` | Relative age — `2m`, `1h`, `3d` |
| `numberOrDash(value)` | Number or `—` |
| `programLabel(program)` | SPL Token / Token-2022 / shortened address |
| `isBadRugLevel(level)` | True for danger/critical/high/risky |
| `yesNo(value)` | Yes / No / Unknown |

All formatters return `"—"` for `null`/`undefined`/`NaN` unless otherwise noted.

## Detailed Instructions

- [Architecture](docs/agent-instructions/architecture.md)
- [Development Workflow](docs/agent-instructions/development-workflow.md)
- [Code Style](docs/agent-instructions/code-style.md)
