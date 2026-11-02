# 2026-11-01 module-01-ci-fixes-and-service-builds

## Summary
Effort 3 — CI fixes and service builds (Module 01 / plan 21-mcp-surface): fixed the `mypy` version pin and added CI build/test steps for policy-approval-service and audit-service.

## Changes
- `.github/workflows/ci.yml:30` — Changed `mypy==2.4.0` → `mypy==1.11.0`. mypy 2.4.0 does not exist on PyPI (mypy ships 1.x), so `pip install mypy==2.4.0` would fail and break CI.
- `.github/workflows/ci.yml` — Skipped Python requirements reordering before `mypy nova` (line 41) because `pyproject.toml:13` sets `ignore_missing_imports = true`, making mypy independent of service requirements.
- `.github/workflows/ci.yml:84-89` — Added `policy-approval-service` build/test step AFTER contracts build (ci.yml:78-83): `cd nova/services/policy-approval-service && npm ci && npm test`. `policy-approval-service/package-lock.json` is tracked, so `npm ci` works.
- `.github/workflows/ci.yml:90-96` — Added `audit-service` build/test step after policy-approval-service: `cd nova/services/audit-service && npm install && npm run build && node --test dist/*.test.js`. Uses `npm install` (not `npm ci`) because `audit-service/package-lock.json` is gitignored/not tracked. Uses `dist/*.test.js` (one-level glob) because audit-service's single test file compiles to `dist/audit-repository.test.js` and bash globstar is OFF in CI (`dist/**/*.test.js` = `dist/*/*.test.js` = two levels).
- `repo.md` — Updated CI workflow description to mention policy-approval-service and audit-service builds.

## Tests
- mypy version `1.11.0` exists on PyPI (mypy ships 1.x).
- `policy-approval-service` has tracked `package-lock.json` → `npm ci` works.
- `audit-service` test file `src/audit-repository.test.ts` → `dist/audit-repository.test.js` (one level) → `dist/*.test.js` matches.
- Both services depend on `@nova/contracts` via `file:../../packages/contracts`; contracts `dist/` is built at ci.yml:78-83 before the service steps run.
- Note: audit-service `src/` changes (Effort 2) are uncommitted — CI tests committed ref until user commits (per global invariant).

## Notes
- Pre-existing `migrations/runner.ts` mypy error (TS18047) is unrelated to this change.
- CI checks out committed ref via `actions/checkout`; uncommitted audit-service changes are not tested by CI until committed.
