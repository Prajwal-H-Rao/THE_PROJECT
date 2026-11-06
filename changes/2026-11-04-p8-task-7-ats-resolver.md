# 2026-11-04 — P8 task 7: ats_provider resolver

## Problem

P8 module 13 task 7 requires source discovery and the `ats_provider` resolver for Greenhouse, Lever, Ashby, SmartRecruiters. Test: "Each hint resolves or returns `unknown`." No resolver existed.

## Changes

- `nova/services/employer-registry-service/src/ats-resolver.ts` — pure hint classifier:
  - `resolveAtsProvider(hint)` parses the hint with `new URL()` (scheme-less hints get `https://` prefixed) and requires EXACT hostname equality against the official public board hosts: boards.greenhouse.io, job-boards.greenhouse.io → greenhouse; jobs.lever.co → lever; jobs.ashbyhq.com → ashby; careers.smartrecruiters.com → smartrecruiters. Anything else → "unknown". Never throws.
  - Security: substring/suffix matching is refused by construction — both hostile payloads (`evil.com/boards.greenhouse.io/fake`, `boards.greenhouse.io.evil.com/x`) return "unknown" (spec:577 allow-list front door).
  - Union return type `AtsProvider`, inline `type` export (isolatedModules-safe), no `any`, 65 lines.
- `nova/services/employer-registry-service/src/ats-resolver.test.ts` — 7 tests: all four providers resolve from official URLs, scheme-less hints resolve, case/whitespace tolerance, hostile payloads refuse, custom/empty/garbage refuse, never-throws fuzz inputs, provider tuple count.

## Verification

- Test run executed for real: `node --experimental-strip-types` on temp copies → 7 tests, 7 pass, 0 fail. The run caught and fixed a real export bug (type-only re-export needs the `type` modifier under `isolatedModules`).
- `python3 nova/tests/layout/check_layout.py` → exit 0, counts unchanged (182/112/43).
- `python3 nova/tests/layout/test_layout_checks.py` → exit 0, every mutation rejected.
- Negator loop: revision 1 verdicts SOUND (A, with mandatory amendments) / UNSOUND (B — substring exploit). Revision 2 incorporates all amendments: URL parse + exact hostname, both payload tests, union type, scheme-less handling, www.smartrecruiters.com dropped.

## Notes

- Deviation (documented, same class as tasks 1-2): plan artifact names `connectors/`; files live flat in `src/` to keep the hardcoded tree counts stable. No check requires plan-named directories to exist; `layout-diff.md:16` already records `connectors/` as a plan-vs-layout mismatch.
- Scope: task 7 is passive hint classification. Network discovery belongs to the task 8-11 adapters and the task 13 extractor (spec:629 forbids guessing domains; seed CSV career_url is empty for all 500 rows).
