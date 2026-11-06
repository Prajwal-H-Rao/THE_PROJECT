# Phase P9 implementation approach

Repo: /home/prajwal/THE_PROJECT (git repo; never commit). Nothing here is committed until you approve.

## Approach

Complete P9 (Channels, automations, pages) after P8 sign-off. P9 has 41 tasks across two module files. Each task names an artifact and a test. A task counts as complete only when its test passes.

P9 depends on claims-ledger C12–C13 (verified 2026-10-12, recheck before 2027-04-13): WhatsApp webhooks carry X-Hub-Signature-256 (HMAC-SHA256, constant-time compare); Telegram sends X-Telegram-Bot-Api-Secret-Token when secret_token is set.

## Files to touch (P9)

- `docs/plan/14-channels.md` — WhatsApp and Telegram interaction, Telegram, WhatsApp Business Platform / Cloud API, Chat-based approvals. Task: high-risk routes to web — a consequential action never completes in chat alone.
- `docs/plan/20-pages-and-automations.md` — tasks across six page rows (Today, Assistant, Automations, Integrations, Activity, Settings)

## P9 dependencies

P9 assumes P8 is complete. P9 depends on claims-ledger C12–C13 being verified. Gate F: Telegram/WhatsApp where setup prerequisites permit; unsigned/replayed webhooks rejected and deduplicated; automations run once per trigger; privileged chat action requires bound approval.

## Verification steps before code

1. Run `python nova/tests/layout/check_layout.py` — must exit 0.
2. Run `python nova/tests/layout/test_layout_checks.py` — must exit 0.
3. Confirm P8 tasks are done before starting P9 tasks.

## Negator readiness

This approach touches plan docs only. No service code changes yet. When the negator limit clears, send this document to two `general` subagents in parallel. Proceed only when both return SOUND.

## After negator sign-off

Implement tasks in order. Run the layout checker after each path change under `nova/`. Update `repo.md` and add a `changes/` entry per task. Do not commit — you commit when you choose.
