## P7 — finance and trips

External gates: maps key and Plaid or AA terms. Use `manual_only` and CSV only when a gate is closed.

- [x] 11.2 — CSV and OFX import with locale variants
- [x] 11.3 — PDF statement path through the document service
- [x] 11.4 — content-addressed dedup across imports
- [x] 11.5 — deterministic currency conversion with a dated table
- [x] 11.6 — rule-based categoriser with override history
- [x] 11.7 — model-drafted category with confidence and reason
- [x] 11.8 — ambiguous-import review queue
- [x] 11.9 — totals, budgets and trends in code
- [x] 11.10 — export and delete for finance
- [x] 11.11 — provider connection and consent inside finance
- [x] 11.12 — Plaid or AA behind a config flag
- [x] 11.14 — route and fare estimate with an estimate label
- [x] 11.15 — itinerary, packing list and checklist
- [x] 11.16 — gate booking behind an approval grant
- [x] 11.17 — Finance and Trips page
- [x] 11.18 — register trips operations with policy

Exit: uncertain rows go to review. Every estimate carries its label.

## P8 — jobs agent and registry

Order rule 4 applies: 12.1 to 12.7, then 13.8 to 13.17, then 12.8 to 12.21, then 13.18 to 13.25.

- [x] 12.1 — listing contract with provenance fields
- [x] 12.2 — normalisation with source and freshness per field
- [x] 12.3 — 200-case labelled ranking evaluation set
- [x] 12.4 — hard filters as deterministic code
- [x] 12.5 — explainable feature scoring
- [x] 12.6 — optional embedding rerank after hard filters
- [x] 12.7 — profile versioning, field sources and confirm flags
- [x] 12.8 — extraction review UI beside supporting text
- [x] 12.9 — parser spans to profile candidates with `source_ref`
- [x] 12.10 — cover letter, summary and response drafts
- [x] 12.11 — truthful-claim checklist before review
- [x] 12.12 — application envelope with hash and nonce
- [x] 12.13 — gate submission behind an approval grant
- [x] 12.14 — submission adapter with `Idempotency-Key`
- [x] 12.15 — confirmation record with provider evidence
- [x] 12.16 — follow-up state machine
- [x] 12.17 — manual handoff for blocked paths
- [x] 12.18 — duplicate application detection
- [x] 12.19 — Resume and Job Search page
- [x] 12.20 — export, delete and provider revoke
- [x] 12.21 — lab 2 review view

## P9 — channels, automations, pages

Telegram first. Keep WhatsApp behind a flag until Meta clears. Record `blocked-by-claim` while the gate is closed.

- [x] 14.1 — WhatsApp signature verification
- [x] 14.2 — WhatsApp verify-token challenge
- [x] 14.3 — message-ID idempotency
- [x] 14.4 — replay protection with a timestamp window
- [x] 14.5 — outbound sender with rate limits and opt-in
- [x] 14.6 — Telegram secret-token header check
- [x] 14.7 — Telegram update offset and retry
- [x] 14.8 — Telegram bot, secret token and webhook
- [x] 14.9 — inbound sanitiser for untrusted text
- [x] 14.10 — action preview card for chat approvals
- [x] 14.11 — inline callbacks with signature checks
- [x] 14.12 — chat approvals on the low-risk allow-list
- [x] 14.13 — reject free-text approvals
- [x] 14.14 — notification templates
- [x] 14.15 — delivery receipts and failure backoff
- [x] 14.16 — redaction in adapter logs
- [x] 14.17 — consume the P2 linking nonce
- [x] 14.18 — webhook and delivery metrics
- [x] 14.19 — channel settings page
- [x] 14.20 — lab 5

## P9 — channels, automations, pages

Telegram first. Keep WhatsApp behind a flag until Meta clears. Record `blocked-by-claim` while the gate is closed.

- [x] 20.1 — Today page
- [x] 20.2 — Assistant page
- [x] 20.3 — conversation API with stop and history
- [x] 20.4 — inline approval cards with detail view
- [x] 20.5 — automation rule schema
- [x] 20.6 — automation engine with idempotency keys
- [x] 20.7 — preview before enable
- [x] 20.8 — run history with verified outcomes
- [x] 20.9 — pause, resume and delete an automation
- [x] 20.10 — automation permissions through policy
- [x] 20.11 — integration-registry service
- [x] 20.12 — Automations page
- [x] 20.13 — Integrations page
- [x] 20.14 — token-expiry and error explanations
- [x] 20.15 — Activity and Security page
- [x] 20.16 — Settings page
- [x] 20.17 — RBAC on every page route
- [x] 20.18 — privileged endpoints behind the P5 rule
- [x] 20.19 — Storybook variants
- [x] 20.20 — Storybook interaction tests
- [x] 20.21 — family 7 operations