# Development Workflow Guidelines

## Overview

Use these guidelines when installing packages, running scripts, or validating changes.

## Package Manager

- Use `pnpm` for all package and script commands.
- Do not use `npm install`, `npm run`, `yarn`, or `bun` in this repository.
- Keep `pnpm-lock.yaml` as the authoritative lockfile.

## Commands

- Start development server: `pnpm dev`
- Create a production build: `pnpm build`
- Start the production server after building: `pnpm start`
- Run linting: `pnpm lint`
- Run tests: `pnpm test`

## Validation

- Run `pnpm lint` after code changes that affect TypeScript, React, API routes, or styles.
- Run `pnpm test` after changes to domain logic, validation, provider normalization, or test files.
- Run `pnpm build` after framework, routing, configuration, or dependency changes.

## Dependencies

- Add runtime libraries under `dependencies` and build/tooling libraries under `devDependencies`.
- Prefer the installed Next.js, React, TypeScript, ESLint, and Tailwind major versions when adding related packages.
