# 2026-11-04 — Phase implementation approaches

## Problem

The project has 11 phases and 390 tasks across 21 module files, but no per-phase implementation approach existed. Each phase needed a plain-language plan ready for the negator loop.

## Changes

- `docs/implementation/approach-P1.md` — P1 approach (38 tasks, 3 module files). Work order follows order-and-constraints.md rules 2, 3, 4.
- `docs/implementation/approach-P2.md` — P2 approach (33 tasks, 2 module files). Depends on P1.
- `docs/implementation/approach-P3.md` — P3 approach (37 tasks, 2 module files). Depends on P2 and claims-ledger C01–C06.
- `docs/implementation/approach-P4.md` — P4 approach (21 tasks, 1 module file). Depends on P3.
- `docs/implementation/approach-P5.md` — P5 approach (53 tasks, 3 module files). Depends on P4. Tasks 12–20 and 17–19 already verified DONE.
- `docs/implementation/approach-P6.md` — P6 approach (37 tasks, 2 module files). Depends on P5.
- `docs/implementation/approach-P7.md` — P7 approach (18 tasks, 1 module file). Depends on P6.
- `docs/implementation/approach-P8.md` — P8 approach (46 tasks, 2 module files). Interleaves modules 12 and 13 per rule 4. Depends on P7 and claims-ledger C07–C10.
- `docs/implementation/approach-P9.md` — P9 approach (41 tasks, 2 module files). Depends on P8 and claims-ledger C12–C13.
- `docs/implementation/approach-P10.md` — P10 approach (46 tasks, 2 module files). Depends on P9.
- `docs/implementation/approach-P11.md` — P11 approach (20 tasks, 1 module file). Depends on P10. Gates A–G sign in order.

Each approach states the approach plainly, lists files to touch, gives verification steps, and is ready for the two-negator loop.

## Verification

- All 11 files are under 200 lines.
- Each approach references the layout checker and mutation suite as pre-code verification.
- No service code changes in this set; all are plan documents only.

## Negator blocker

The OpenCode free usage limit prevents spawning negator subagents. No code changes can be implemented until both negators return SOUND for each phase approach. The limit must reset or an OpenCode Go subscription is required.
