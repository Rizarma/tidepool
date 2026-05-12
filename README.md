# Tidepool

Tidepool helps Solana users check a token or Meteora DLMM pool before they trade, hold, or research it. Paste a token mint, a Meteora DLMM pool address, or a token address copied from GMGN, run a scan, and read a plain-language risk report. The homepage also shows a live table of recently created Meteora DLMM pools that you can browse and click to scan.

It is a screening tool, not financial advice. A low score does not make a token safe, and a high score does not prove fraud. Use the report as one input in your own research.

## What You Can Scan

### Solana tokens

Paste a Solana token mint address to see:

- A risk score from 0 to 100
- A risk level: low, medium, high, or critical
- Token name, symbol, image, and mint address
- Price, liquidity, daily volume, and market cap when available
- Mint authority and freeze authority status
- Holder concentration and RugCheck signals
- Whether Jupiter lists the token on its strict list
- Which data sources answered the scan

Tidepool includes example scans for USDC, JUP, and BONK.

### Meteora DLMM pools

Paste a Meteora DLMM pool address, paste a token mint from GMGN, or enter both token mint addresses in a pair. Tidepool can discover Meteora DLMM pools that contain a token mint and selects the highest-TVL match by default.

The homepage also shows a live table of recently created Meteora DLMM pools with sortable columns for price, TVL, volume, fees, APR, bin step, base fee, market cap, holders, and age. Click any pool to run a full scan.

Pool scans show:

- Pool name and token pair
- Price, TVL, daily volume, fees, APR, and APY when available
- Bin step and fee settings
- Token details for both sides of the pair
- Blacklist status and pool tags
- A pool chooser when more than one matching pool exists
- Which data sources answered the scan
- SMA (Simple Moving Average) indicators at configurable timeframes (1m, 5m, 15m, 1h, 4h, 1d), with a settings panel to toggle timeframes and adjust the SMA period

If no Meteora DLMM pool matches a token mint, try Token mode for a broader token risk scan. The token may trade on another DEX.

## How to Read the Risk Score

Tidepool scores visible risk signals from live data. Higher scores mean more warning signs.

| Score | Level | Meaning |
| --- | --- | --- |
| 0-19 | Low | Few warning signs found |
| 20-44 | Medium | Some warning signs found |
| 45-69 | High | Several warning signs found |
| 70-100 | Critical | Strong warning signs found |

The score can rise when a token has active mint or freeze authority, low liquidity, concentrated holders, RugCheck warnings, missing market data, or no Jupiter strict-list match.

## Data Sources

Tidepool collects live data from public services:

- DexScreener
- RugCheck
- Jupiter
- Solana RPC
- Meteora DLMM
- Birdeye (price history for SMA indicators)

If a source is slow or unavailable, Tidepool still shows what it can and lists the source status in the report.

## Scaling & Rate Limiting

Tidepool implements a 4-layer defense to protect against API rate limits when scaling to many concurrent users:

1. **Provider-level caching** — Every 3rd-party API response is cached with a TTL tuned to the data type (token prices 15s, pool data 15s, risk scores 60s). This means 1,000 users scanning the same token share one set of API calls rather than firing 4,000 requests.
2. **Request deduplication** — Identical concurrent requests within a 5-second window share one underlying promise. This prevents "thundering herd" problems.
3. **Token bucket rate limiting** — Each provider has a dedicated rate limiter that smooths outgoing request bursts proactively, preventing 429 errors before they happen.
4. **CDN edge caching** — Success responses carry `Cache-Control` headers. Vercel's Edge Network serves cached responses directly for 10–20 seconds, absorbing repeated views and refreshes without hitting your server.

By default, caching uses an in-memory Map (per-instance). For multi-instance deployments, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to share cache globally across all serverless functions.

## Running Tidepool Locally

This section is for people who want to run the app on their own computer.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the app:

   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Run checks before shipping changes:

   ```bash
   pnpm lint
   pnpm test
   pnpm build
   ```

Tidepool uses public data sources by default. You can set `NEXT_PUBLIC_SOLANA_RPC_URL` or `SOLANA_RPC_URL` if you want to use your own Solana RPC endpoint. You can also set `BIRDEYE_API_KEY` if you want SMA indicators on pool scans. Without it, pool scans still work but indicators are omitted.

For production deployments expecting significant traffic, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to enable shared caching across all serverless instances. You can also set `SOLANA_RPC_URLS` (comma-separated) to rotate across multiple RPC endpoints for resilience.

## Project Notes

- Built with Next.js and React
- Uses pnpm for package management
- Uses Vitest for unit tests
- Runs without a database or user accounts
- Fetches scan data live when you submit an address
- Resolves pasted addresses as token mints, Meteora DLMM pools, or pool-discovery candidates
- Keeps scanner state/fetch orchestration in `src/components/scan/useScanController.ts`, report views in `src/components/report/`, and the homepage New Pairs table in `src/components/pairs/NewPairsTable.tsx`
- Designed for deployment on Vercel or any host that supports Next.js
