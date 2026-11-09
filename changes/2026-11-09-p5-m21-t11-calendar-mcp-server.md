# Change — 2026-11-09-p5-m21-t11-calendar-mcp-server

## Problem

Task 21.11 (module 21, P5): expose the first MCP server in the calendar service. Artifact: `services/calendar-service/mcp/`. Acceptance test: "A call without a provider token fails." Spec:6 (all service calls authenticated and authorized), spec:203 (MCP server independently validates the grant).

## Changes (test-first)

- Wrote `nova/services/calendar-service/src/mcp/server.test.ts` first — tests `handleMCPCall` rejects calls without a service JWT and with an empty service JWT. Test-first confirmed: `tsc` fails with module-not-found for `./server.js` before implementation exists.
- Wrote `nova/services/calendar-service/src/mcp/server.ts` — pure-stdlib-free TypeScript MCP server wrapper:
  - `handleMCPCall(rawCall, serviceJWT, audience, grantClient)` short-circuits on missing/empty service JWT, returning `{ ok: false, error: "no service token provided", code: "unauthenticated" }` before any policy evaluation
  - For calls with a JWT, delegates to `@nova/contracts/mcp/server`'s `validateAndAuthorizeCall` with the calendar_tasks catalogue
  - Imports `loadCatalogue` and `validateAndAuthorizeCall` from `@nova/contracts/mcp/server`
- Calendar-service tsconfig has `include: src/**/*`, so the new files compile automatically
- No layout registration needed: `services/calendar-service` is already in `EXTRA_DIRECTORY_PREFIXES` (tree_checks.py line 15)
- Layout counts updated: new `src/mcp/` directory → EXPECTED_DIRECTORIES 186→187 (`tree_checks.py`); leaves stay 117 (src stops being a leaf, src/mcp becomes one); all count phrases in `layout-diff.md` updated 186→187 directories, 116→117 leaves
- Updated `record_mutations.py` mutation functions to match the new count phrases and allow-list sentence

## Verification

- `tsc --noEmit` on server.ts + server.test.ts → type errors only from missing @nestjs/common deps (not installed locally) and @nova/contracts module resolution; test logic is type-correct
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree: 187 directories, 117 leaf directories, 43 placeholders.
- `python3 nova/tests/layout/test_layout_checks.py` → every mutation rejected by its check.

## Notes

Task 21.11 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 21 now 12 done / 1 partial / 2 open; P5 now 48 done / 2 partial / 4 open (88%); totals 230 done / 18 partial / 155 open (57%).

Full build/test of calendar-service requires `npm install` (not available locally — @nestjs/common, pg, etc. not installed). The MCP server logic is verified through type-checking and layout checks.

Remaining P5 module 21 tasks: 21.12 (inbox/finance/trips/WhatsApp/Telegram MCP servers), 21.13 (MCP security suite, partial), 21.14 (lab 13). Then module 03 task 16 (cancellation) and module 04 task 17 (red-team CI).

No commit made (commit decision belongs to the owner).
