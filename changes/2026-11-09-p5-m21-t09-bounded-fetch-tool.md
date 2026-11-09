# Change — 2026-11-09-p5-m21-t09-bounded-fetch-tool

## Problem

Task 21.9 (module 21, P5): add the bounded fetch tool with a domain allow-list. Artifact: `packages/contracts/mcp/`. Acceptance test: "A URL outside the allow-list is refused." Spec:149 (no arbitrary URLs), spec:503 (no generic-browser tool).

## Changes (test-first)

- Wrote `nova/packages/contracts/mcp/fetch.test.ts` first — tests `validateFetchURL` refuses URLs outside the allow-list, allows URLs in the allow-list, allows subdomains of allow-listed domains, refuses non-allow-listed parent domains, rejects malformed URLs. Test-first confirmed: `tsc` failed with module-not-found for `./fetch-validate.js` before implementation existed.
- Wrote `nova/packages/contracts/mcp/fetch-validate.ts` — `validateFetchURL(url, providerAllowlist)` parses the URL, checks the hostname against the allow-list (exact match + subdomain match via `endsWith("." + domain)`), returns `{ ok: true }` or `{ ok: false, reason }`. No arbitrary URL access permitted.
- Created `nova/packages/contracts/mcp/catalogue/fetch.json` — `integrations.fetch` tool definition with `provider_allowlist: ["example.com", "api.local"]`, `classification: "read"`, `risk_tier: "tier2"`, `verifier: "verify_fetch_url"`. Passes `validate_tool_definition` (all required fields present, `provider_allowlist` is a known field).
- Added `mcp/fetch-validate.ts` and `mcp/fetch.test.ts` to `tsconfig.json` `include` array (tsconfig uses explicit file list, not glob).
- Added `dist/mcp/fetch.test.js` to `package.json` test script.

## Verification

- `npm test` in `nova/packages/contracts` → 193 tests pass, 0 fail (4 suites).
- `node --test dist/mcp/fetch.test.js` → 5 tests pass (fetch URL allow-list validation).
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree: 185 directories, 115 leaf directories, 43 placeholders (unchanged — new files under existing `mcp/` directory).
- `python3 nova/tests/layout/test_layout_checks.py` → every mutation rejected by its check.

## Notes

Task 21.9 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 21 now 10 done / 1 partial / 4 open; totals 228 done / 18 partial / 157 open (56%).

Robots.txt checking and rate limiting are documented concerns for the fetch tool but are not part of this task's acceptance test (they belong to the fetch service/worker implementation in a later task). The URL allow-list validation is the contract-level enforcement for "no arbitrary URL" (spec:503).

No commit made (commit decision belongs to the owner).
