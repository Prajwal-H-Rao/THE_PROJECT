# Phase P11 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P11 (Release gate) after P10 sign-off. P11 has 20 tasks across one module file. Each task names an artifact and a test. A task counts as complete only when its test passes.

All ten security invariants pass by test or by an operator-reviewed record. Gates A to G sign in order at P11, from evidence each phase produced. No earlier phase signs a gate. No risky feature ships to meet a date.

## Files to touch (P11)

- `docs/plan/18-release-gate.md` — task 1 (gates.json: gate ID, phase, state open/signed, signer, timestamp, evidence paths), task 10 (invariant 8 tests: absent evidence renders unverified, never done)

## P11 dependencies

P11 assumes P10 is complete. Gate A–G criteria:
- Gate A: unauthenticated private service call rejected; images run non-root; no secrets in images
- Gate B: parser returns evidence-bound fields or explicit unknown; malicious and oversized fixtures fail safely
- Gate C: model cannot make unauthorised write; model cannot fabricate success
- Gate D: provider IDs and persisted state verify results; reminder workers survive restart without duplicates
- Gate E: job discovery and drafting with safe human handoff; exactly 250 IN + 250 GLOBAL seeds; source verification gates hold
- Gate F: Telegram/WhatsApp where prerequisites permit; unsigned/replayed webhooks rejected and deduplicated; automations run once per trigger; privileged chat action needs bound approval
- Gate G: all ten release invariants pass by test or operator-reviewed record

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P10 tasks are done before starting P11 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
