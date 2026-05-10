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
- The homepage shows a live **New Pairs table** of recently created Meteora DLMM pools via `GET /api/pools/new`. Clicking a pool row triggers `scanPool(address)` and renders the pool report.
- `GET /api/pools/new` proxies Meteora's new-pools endpoint and returns `{ pools: DlmmPairInfo[], total, pages }` with `createdAt` populated from `pool.created_at`.
- The New Pairs table supports periodic auto-refresh (60s interval, 15s cooldown). Toggle state and countdown are persisted in `localStorage` with keys `tidepool_auto_refresh` and `tidepool_last_fetched_at`.
- The Tidepool logo button calls `clearScan()` which returns to the New Pairs table while preserving the search bar inputs.
- Pool reports include configurable technical indicators (SMA) fetched from a separate endpoint `GET /api/indicators?pool=<address>&timeframes=1m,5m,15m&indicators=sma:20`. This is separate from the pool scan so indicator latency does not block pool data.
- The indicators subsystem lives in `src/components/indicators/` (UI: `IndicatorsPanel`, `IndicatorBottomBar`, `IndicatorSettings`, `IndicatorConfigContext`), `src/lib/indicators/` (math + registry), `src/lib/providers-ohlcv.ts` (Birdeye fetcher), and `src/lib/indicator-config.ts` (config types + localStorage helpers).
- Adding a new indicator type requires a single entry in `src/lib/indicators/registry.ts` — no other files need changes.
- Pool price ratios for indicators are computed as `tokenX_USD / tokenY_USD` at matching timestamps from Birdeye price histories.
- Indicator config is persisted in `localStorage` under key `tidepool_indicator_config`.
- `IndicatorSettings.tsx` uses local draft state — changes only apply on the "Apply" button click. Do not change this to immediate apply.

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
  - Env override: `SOLANA_RPC_URL` or `NEXT_PUBLIC_SOLANA_RPC_URL`
  - Default fallback: `https://api.mainnet-beta.solana.com`
- **Solana program IDs**: Defined in `src/lib/solana-programs.ts` for SPL Token and Token-2022 account checks.
  - SPL Token: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
  - Token-2022: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- **Birdeye API** (`https://public-api.birdeye.so`): Used in `src/lib/providers-ohlcv.ts` for token price history (OHLCV) at 1m/5m/15m/1h/4h/1d timeframes. Endpoint: `GET /defi/history_price?address=<mint>&type=<timeframe>&time_from=<unix>&time_to=<unix>`. Requires `BIRDEYE_API_KEY` header and `x-chain: solana`. Implements retry with exponential backoff on 429 rate limits. Gracefully degrades (omits indicators) when the key is missing.

The app does not use Solana or Meteora SDK packages. It calls these services with native `fetch` and a small JSON-RPC helper.

## Detailed Instructions

- [Architecture](docs/agent-instructions/architecture.md)
- [Development Workflow](docs/agent-instructions/development-workflow.md)
- [Code Style](docs/agent-instructions/code-style.md)
