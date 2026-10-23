# Third-Party Dependencies and Licences

## Scope

This file records every transitive npm dependency of the NOVA monorepo with its version and licence.
Generated from the four `package.json` files:
- `nova/packages/contracts/package.json`
- `nova/services/api-gateway/package.json`
- `nova/apps/web/package.json`
- `nova/services/_template/typescript/package.json`

Only npm packages are present. No Cargo.toml, go.mod, or pyproject.toml runtime dependencies exist.

## Dependency Table

| Package | Version | Licence | Type | Source |
|---------|---------|---------|------|--------|
| @nova/contracts | file:../../packages/contracts | UNLICENSED (internal) | prod | api-gateway |
| @tailwindcss/postcss | 4.3.3 | MIT | dev | web |
| @types/node | 22.19.1 | MIT | dev | contracts, api-gateway, web, template |
| @types/pg | ^8.23.1 | MIT | dev | contracts |
| @types/react | 19.3.0 | MIT | dev | api-gateway, web |
| @types/react-dom | 19.3.0 | MIT | dev | api-gateway, web |
| ajv | ^8.20.0 | MIT | prod | contracts |
| ajv-formats | ^3.0.1 | MIT | prod | contracts |
| axios | 1.20.0 | MIT | dev | api-gateway |
| bullmq | 6.4.0 | MIT | prod | api-gateway |
| class-variance-authority | 0.7.1 | MIT | prod | web |
| clsx | 2.1.1 | MIT | prod | web |
| cn | 0.5.0 | MIT | prod | web |
| next | 16.4.2 | MIT | prod | api-gateway, web |
| next-intl | 4.14.9 | MIT | prod | web |
| pg | 8.16.3 | MIT | dev | contracts |
| radix-ui | 1.8.1 | MIT | prod | web |
| react | 19.3.1 | MIT | prod | api-gateway, web |
| react-dom | 19.3.1 | MIT | prod | api-gateway, web |
| tailwind-merge | 3.7.0 | MIT | prod | web |
| tailwindcss | 4.3.3 | MIT | dev | web |
| typescript | 5.9.3 | Apache-2.0 | dev | contracts, api-gateway, web, template |

## Licence Summary

| Licence | Count | Packages |
|---------|-------|----------|
| MIT | 22 | @tailwindcss/postcss, @types/node, @types/pg, @types/react, @types/react-dom, ajv, ajv-formats, axios, bullmq, class-variance-authority, clsx, cn, next, next-intl, pg, radix-ui, react, react-dom, tailwind-merge, tailwindcss |
| Apache-2.0 | 1 | typescript |
| UNLICENSED (internal) | 1 | @nova/contracts |

## Verification

- All dependencies have an OSI-approved licence (MIT, Apache-2.0) or are internal (UNLICENSED).
- No GPL, AGPL, or other copyleft licences detected.
- No proprietary or unknown licences.

## Generation

Run `npm ls --all --json` in each package directory to regenerate this list.
The `@nova/contracts` internal dependency is resolved via `file:../../packages/contracts`.