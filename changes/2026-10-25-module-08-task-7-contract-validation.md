# 2026-10-25 — Module 08 task 7 — contract validation middleware

## Scope

Contract validation for gateway request bodies (Module 08 task 7, plan `docs/plan/08-policy-approval.md`).

## Implementation

### Validator module (`src/lib/contract-validation.ts`, 199 lines, zero imports)- JSON-Schema-subset validator: `object`, `string`, `number`, `integer`, `array`; `enum`, `format: date-time`, `minLength`/`maxLength`, `minimum`/`maximum`, `required`, `additionalProperties: false`.
- Schemas: `internal/echo`, `tasks/create`, `jobs/apply`, `channels/link`, `finance/import`.
- `PATH_TO_SCHEMA` exact match on the `decodeURIComponent`-normalized path, so `/api/v1/%74asks` cannot skip validation; malformed encodings fall back to the raw path.
- Method guard: only POST/PUT/PATCH validate; GET/DELETE unaffected.
- `validateContract(pathname, method, bodyText, traceId)` answers 400 inline (`invalid_json` / `validation_failed` with joined `details`) or `null` on pass.
- Zero imports by design: the Next build (Turbopack) and the node test build resolve relative modules differently. Both now compile it.

### Wiring

- `proxy.ts` (Edge middleware): carries no body validation and gains none. Middleware cannot consume the request body, so validation lives in the route handlers only. Fixed the `reject()` call to `errorResponse(status, code, traceId, undefined, headers)` after `details` was added to `errorResponse`.
- `src/app/api/v1/[...slug]/route.ts`: `readBody` text feeds `validateContract` before the 404 answer; validation rejections log 400.
- `src/app/api/internal/[...slug]/route.ts`: POST now reads and validates the body. Fail-closed first (`SERVICE_ID_HEADER` `null` or `""` answers through `answer()`), oversize body answers 413 with `body_too_large`, then contract validation; GET unchanged.
- `responses.ts`: `ErrorBody` and `errorResponse` gained an optional `details` field.

### Tests

- `src/test/contract-validation.test.ts`: 15 unit tests (required, additionalProperties, enum, min/max length, number/integer, arrays with items, date-time, invalid JSON, percent-encoded path, method guard, mapped-path pass-through).
- `middleware.test.ts`: the two write-path tests now POST `{"title":"hello"}` (valid per `tasks/create`) and keep their 404 intent.
- `package.json` pretest gate includes `contract-validation` again.
- `tsconfig.json` gains `verbatimModuleSyntax`; `tsconfig.test.json` is a standalone nodenext config (`module`/`moduleResolution: nodenext`, emits `dist`). These settings are what let one import-free module compile under both builds.

## Verification

- `npm run build` passes (Turbopack + TypeScript). `tsc -p tsconfig.test.json` exits 0.
- Gateway `npm test`: 50 pass, 0 fail. Contracts: 47 pass. Policy service: 53 pass.
- Layout `tests/layout/check_layout.py`: all checks passed.
- Two negator rounds ran. Round 2 findings fixed: `Headers.get()` returns `null` for absent headers (fail-closed guard corrected), scratch `test.ts` removed, `checkArray` recursion passes `schema.items`.

## Deliberate scope notes

- Verify-service-calls POSTs with invalid bodies now answer 400 from the handler instead of the old unconditional 200 — this is the new contract.
- Exact-match mapping (no prefix matching): nested writes like `POST /api/v1/tasks/123` carry no contract yet; the handler keeps its 404.
