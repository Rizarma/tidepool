# Architecture Guidelines

## Overview

Use these guidelines when changing routing, API endpoints, shared library code, or framework configuration.

## Project Structure

- Application routes live under `src/app/` and use the Next.js App Router.
- API route handlers live under `src/app/api/**/route.ts`.
- Shared domain logic lives under `src/lib/`; keep reusable validation, provider, risk, and type logic out of route handlers when practical.
- Global styles live in `src/app/globals.css`; static assets live in `public/`.

## Next.js 16

- Treat Next.js behavior as version-specific. Check installed package types or local package files before using APIs that changed across Next.js versions.
- Keep route handlers aligned with App Router conventions for the installed Next.js version.
- Do not assume older Pages Router patterns apply unless the project adds that structure explicitly.

## API Routes

- Keep request parsing, validation, and response shaping explicit in `route.ts` files.
- Prefer small route handlers that delegate domain calculations or provider integration to `src/lib/`.
- Return stable JSON shapes from API routes so client code can depend on consistent fields.
