# Code Style Guidelines

## Overview

Use these guidelines when editing TypeScript, React components, styles, or shared utilities.

## TypeScript

- Keep shared data shapes in `src/lib/types.ts` or colocated with the narrow feature they serve.
- Prefer explicit return shapes for exported functions and API responses when they are consumed across files.
- Preserve strict TypeScript compatibility; do not bypass type errors with broad `any` types unless the boundary is genuinely untyped.

## React and Styling

- Use function components for React UI.
- Use Tailwind CSS v4 conventions already configured by the project.
- Keep page-level layout in `src/app/page.tsx` or route files, and extract reusable UI only when it reduces duplication or clarifies intent.

## Maintainability

- Keep provider integration isolated from risk scoring and validation logic.
- Prefer descriptive domain names for liquidity, pair, risk, and validation concepts.
- Remove dead code rather than preserving unused branches for hypothetical future behavior.
