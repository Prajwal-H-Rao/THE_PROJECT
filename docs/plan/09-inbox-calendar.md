# Module 09 — Inbox and calendar

Phase P6. Spec headings: integrations and external APIs, allowed task families, page composition for inbox and calendar.

## Goal

Read, search, draft and send mail. Read, create, change and delete events. Every write returns a provider ID. NOVA marks no write succeeded without that ID.

## Constraints (spec, binding)

- Spec:64: "external integrations should be called only by their owning adapters."
- Spec:18: "a model sees a constrained context and returns candidate structured output. It cannot connect directly to databases, invoke arbitrary tools, access general filesystem paths, use shell/process execution, or read credentials."
- Spec:185: "send only through an approved, payload-bound action."
- Spec:186: task family 2 covers "list/create/update/cancel the user's own records according to per-operation policy and approval requirements."
- Gmail polling, not push, for the MVP. `users.watch` needs a GCP project, a Pub/Sub topic and an IAM grant (claim C11).

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Define the mail adapter interface: list, get, search, draft, send | `services/inbox-service/gmail/` | Adapter contract test passes | 5 |
| 2 | Implement the Gmail adapter with OAuth scopes and consent screen | adapter | Scope escalation fails | 8 |
| 3 | Implement polling with delta sync, page tokens and backoff | worker | Poll survives a rate limit | 6 |
| 4 | Add idempotent mail processing keyed on Gmail message ID | worker | Duplicate message processed once | 5 |
| 5 | Store message bodies as object storage pointers, not in audit | inbox schema | Audit row holds no body text | 4 |
| 6 | Extend the P4 tool registry with the inbox family: summarise, label, draft, send | tool registry | Send carries `requires_approval`, and a second registration fails | 6 |
| 7 | Implement deterministic search over the local index | inbox service | Search returns provider IDs | 5 |
| 8 | Build the draft preview surface with the exact payload | web UI | Preview equals the send payload | 5 |
| 9 | Implement send with approval grant verification | inbox service | Send without a valid grant fails | 6 |
| 10 | Verify the send with the Gmail message ID | verifier | Missing ID leaves status `unknown` | 5 |
| 11 | Define the calendar adapter interface and the Google Calendar adapter | `calendar/` | Contract test passes | 8 |
| 12 | Implement attendee-aware approval for invite events | policy + calendar | Invite without approval fails | 6 |
| 13 | Implement event conflict detection against the provider | calendar service | Double booking surfaces | 5 |
| 14 | Add ICS import and export for non-Google providers | calendar service | Round-trip preserves fields | 5 |
| 15 | Handle partial provider failure: retry, reauthenticate, fail safe | worker | Each path is covered by a test | 6 |
| 16 | Build the Calendar page: agenda, week and month switcher, a clear timezone indicator, event categories that pair colour with a label or icon, and an event-write approval preview that shows invitees and conflicts | `apps/web/calendar/` | Each view switches without losing the timezone, no category relies on colour alone, and a write preview lists invitees and conflicts (spec:406) | 7 |
| 17 | Deliver curriculum lab 6: Gmail read-only, then draft and send behind approval | `labs/lab06/` | Send without a grant fails | 5 |
| 18 | Build the three-pane Inbox page: folder and filter rail, message list and reading pane, per spec:405 | `apps/web/inbox/` | Each pane keeps its source, freshness and action controls | 6 |
This build sequence sums to 103 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

1. Define the mail adapter and implement Gmail list, get and search.
2. Add polling with delta sync and idempotent processing.
3. Implement draft, then send behind an approval grant.

## Acceptance tests

- `test_send_without_grant_rejected` — send fails with a typed denial.
- `test_draft_and_send_are_separate` — the draft tool cannot send.
- `test_invite_requires_approval` — the policy blocks an event with attendees when no grant exists.
- `test_send_verified_by_message_id` — no message ID means no `succeeded`.
- `test_duplicate_message_processed_once` — a redelivered message is a no-op.
- `test_no_body_in_audit` — audit rows match the redaction key list.
- `test_rate_limit_backs_off` — a 429 triggers backoff, not a retry storm.

## Risks

- Gmail scopes are sensitive. Request the minimum, and document each scope in the consent screen text.
- Push notifications via `users.watch` add a GCP project, a Pub/Sub topic, IAM grants and 7-day renewal. Defer to a later release.
- Calendar timezone handling is a common defect source. Store the provider's timezone with every event.
