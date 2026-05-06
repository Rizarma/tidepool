# Tidepool

Tidepool helps Solana users check a token or Meteora DLMM pool before they trade, hold, or research it. Paste an address, run a scan, and read a plain-language risk report.

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

Paste a Meteora DLMM pool address, or enter both token mint addresses in a pair, to see:

- Pool name and token pair
- Price, TVL, daily volume, fees, APR, and APY when available
- Bin step and fee settings
- Token details for both sides of the pair
- Blacklist status and pool tags
- Which data sources answered the scan

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

- DexScreener for market data
- RugCheck for token risk signals
- Jupiter for token metadata, price, and strict-list status
- Solana RPC for on-chain mint data
- Meteora for DLMM pool data

If a source is slow or unavailable, Tidepool still shows what it can and lists the source status in the report.

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

Tidepool uses public data sources by default. You can set `NEXT_PUBLIC_SOLANA_RPC_URL` or `SOLANA_RPC_URL` if you want to use your own Solana RPC endpoint.

## Project Notes

- Built with Next.js and React
- Uses pnpm for package management
- Runs without a database or user accounts
- Fetches scan data live when you submit an address
- Designed for deployment on Vercel or any host that supports Next.js
