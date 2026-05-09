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

## External Services and APIs

- **Meteora DLMM REST API** (`https://dlmm.datapi.meteora.ag`): Used in `src/lib/providers-dlmm.ts` for DLMM pool discovery and pool details.
  - `GET /pools?query=<mint>` discovers pools that may contain a token mint.
  - `GET /pools/<address>` fetches one pool by DLMM pool address.
  - `GET /pools/groups/<mintA>-<mintB>` fetches pool groups for a token pair.
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

The app does not use Solana or Meteora SDK packages. It calls these services with native `fetch` and a small JSON-RPC helper.

## Detailed Instructions

- [Architecture](docs/agent-instructions/architecture.md)
- [Development Workflow](docs/agent-instructions/development-workflow.md)
- [Code Style](docs/agent-instructions/code-style.md)
