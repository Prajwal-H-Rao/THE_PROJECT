# Phase P2 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P2 (Identity and policy) after P1 sign-off. P2 has 33 tasks across two module files. Each task names an artifact and a test. A task counts as complete only when its test passes.

## Files to touch (P2)

- `docs/plan/07-identity-authz.md` — tasks 2, 15, 17 (session cookies with HttpOnly/Secure/SameSite, 10 policy matrix rows as tests, RBAC roles admin/user/viewer)
- `docs/plan/08-policy-approval.md` — task 2 (per-action default policies for all 7 task families in families.yaml)

## P2 dependencies

P2 assumes P1 is complete. The gateway session token format comes from module 01 task 4. The policy service decision endpoint comes from module 08 task 3.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P1 tasks are done before starting P2 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
