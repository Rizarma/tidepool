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

## Detailed Instructions

- [Architecture](docs/agent-instructions/architecture.md)
- [Development Workflow](docs/agent-instructions/development-workflow.md)
- [Code Style](docs/agent-instructions/code-style.md)
