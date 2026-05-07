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

## Detailed Instructions

- [Architecture](docs/agent-instructions/architecture.md)
- [Development Workflow](docs/agent-instructions/development-workflow.md)
- [Code Style](docs/agent-instructions/code-style.md)
