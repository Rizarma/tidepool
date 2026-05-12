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

## Deployment

Tidepool is designed for a **hybrid Vercel + Cloudflare** architecture. Vercel hosts the Next.js application as the origin; Cloudflare sits in front as the global CDN, DDoS protector, and edge cache.

### Why This Architecture

| Layer | What It Does |
|-------|-------------|
| **Cloudflare DNS + SSL** | DNS resolution, SSL termination, HTTP/3 |
| **Cloudflare DDoS + WAF** | Absorbs attacks, blocks malicious bots, IP-based rate limiting |
| **Cloudflare Edge Cache** | Caches API responses at 300+ global POPs |
| **Vercel Origin** | Runs Next.js app, serverless functions, provider fetches |
| **Upstash Redis** | Shared cache across all Vercel instances |

A cached API request never reaches Vercel — it serves directly from the Cloudflare edge location closest to the user.

### Prerequisites

- A domain added to Cloudflare (e.g. `rizarma.com`)
- A Vercel account and project
- Upstash Redis database (free tier works)

### Step 1: Add the Subdomain in Cloudflare DNS

In the Cloudflare Dashboard → `rizarma.com` → DNS → Records:

```
Type    Name        Target                      Proxy Status
CNAME   tidepool    cname.vercel-dns.com.       Proxied  ← orange cloud
```

**Important:** The orange cloud (Proxied) must be enabled. This is what activates Cloudflare's edge caching, DDoS protection, and SSL.

### Step 2: Add the Custom Domain in Vercel

In the Vercel Dashboard → Your Project → Settings → Domains:

1. Add `tidepool.rizarma.com`
2. Vercel will detect the CNAME and verify ownership automatically
3. Wait for the "Valid Configuration" checkmark

### Step 3: Configure Cloudflare SSL

Cloudflare Dashboard → SSL/TLS → Overview:

- **Encryption mode:** Full (strict)
- **Always Use HTTPS:** On
- **Automatic HTTPS Rewrites:** On

This encrypts traffic between users → Cloudflare → Vercel end-to-end.

### Step 4: Configure Cloudflare Caching

Cloudflare Dashboard → Caching → Configuration:

- **Caching Level:** Standard
- **Browser Cache TTL:** Respect Existing Headers
- **Edge Cache TTL:** Respect Origin
- **Query String Sort:** On (ensures `?mint=A&b=1` and `?b=1&mint=A` share a cache key)

Cloudflare Dashboard → Rules → Page Rules (free tier: 3 rules):

```
URL: *tidepool.rizarma.com/api/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 15 seconds  ← matches your s-maxage headers
```

Without this rule, Cloudflare does not cache API responses by default.

### Step 5: Enable Rate Limiting (Recommended)

Cloudflare Dashboard → Security → Rate Limiting Rules:

```
Rule name: API Rate Limit
URL: *tidepool.rizarma.com/api/*
Threshold: 30 requests per minute per IP
Action: Challenge (CAPTCHA)
Duration: 1 minute
```

This protects your origin from a single IP hammering your API. Free tier: 10,000 rate-limited requests/month.

### Step 6: Set Environment Variables in Vercel

Vercel Dashboard → Your Project → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://tidepool.rizarma.com` | Production |
| `BIRDEYE_API_KEY` | Your Birdeye key | Production |
| `SOLANA_RPC_URL` | Your primary RPC | Production |
| `SOLANA_RPC_URLS` | `https://rpc.helius.xyz/...` | Production |
| `UPSTASH_REDIS_REST_URL` | `https://...upstash.io` | Production |
| `UPSTASH_REDIS_REST_TOKEN` | Your token | Production |

**Do not set `UPSTASH_REDIS_REST_URL` in preview/development** unless you want those environments sharing production cache.

### Step 7: Deploy

```bash
# Push your branch to GitHub (or connect your repo to Vercel)
git push origin feat/rate-limit-protection

# Then merge to main when ready
```

Vercel auto-deploys on every push to the connected branch.

### Step 8: Verify

Run these checks after deployment:

```bash
# 1. DNS resolves correctly
dig tidepool.rizarma.com
# Expected: CNAME pointing to cname.vercel-dns.com, proxied by Cloudflare

# 2. SSL is valid
curl -I https://tidepool.rizarma.com
# Expected: HTTP/2, certificate valid, cloudflare headers present

# 3. API caching works
curl -I "https://tidepool.rizarma.com/api/scan?mint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
# Expected: cache-control: public, s-maxage=15, stale-while-revalidate=60
# Expected: cf-cache-status: HIT or DYNAMIC (first request is MISS)

# 4. Rate limiting is active
for i in {1..35}; do curl -s -o /dev/null -w "%{http_code}\n" "https://tidepool.rizarma.com/api/scan?mint=USDC"; done
# Expected: first 30 return 200, then 403 or challenge page
```

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `DNS_PROBE_FINISHED_NXDOMAIN` | DNS not propagated | Wait 5-15 minutes; verify CNAME in Cloudflare |
| `525 SSL Handshake Failed` | SSL mode mismatch | Set Cloudflare SSL to "Full (strict)" |
| `Cache-Control` headers missing | Route returns error | Check Vercel function logs |
| `cf-cache-status: BYPASS` | Page Rule not matching | Verify Page Rule URL pattern `*tidepool.rizarma.com/api/*` |
| Redis cache not working | Wrong env vars | Verify `UPSTASH_REDIS_REST_URL` and `_TOKEN` in Vercel dashboard |
| Indicators timeout | Birdeye key missing | Add `BIRDEYE_API_KEY` to env vars |
