# NOVA worklist — P1 to P6

Live task queue for the implementing model. Work top to bottom. Take one task per iteration. The module file holds the full task text and the test.

## Rules

1. Read the module row before you start.
2. Write the test first. Confirm that it fails.
3. Tick `[x]` only when the test passes.
4. Update `docs/plan/status.md` after each tick.
5. Add a `changes/` entry after each tick.
6. Stop at a design fork. Ask the owner.

## P1 — repo, contracts, platform

- [x] 01.16 — create `docs/architecture/`: 23-service map, trust boundaries, data flow, layout diff
- [ ] 02.13 — export and delete workflow across schemas (design gate: write the design note first)

## P2 — identity and policy

No open task. Run the proof suite and confirm the P2 exit criteria.

- [ ] P2 exit — identity, policy and audit suites pass; replay, expiry and cross-user denial hold

## P3 — document sandbox and models

- [ ] 06.3 — serve the Flask app with a production WSGI server (partial)
- [ ] 06.12 — prove the worker sandbox: non-root, read-only root, tmpfs, capabilities (partial)
- [ ] 06.14 — add the bad-fixture corpus; each fixture fails safely (partial)
- [ ] 06.16 — complete the `ml-service` HTTP API for classification and embeddings (partial)
- [ ] 06.9 — add OCR as an isolated fallback
- [ ] 06.13 — prove no Postgres route and no internet route from the parser
- [ ] 06.17 — reject a citation ID that does not resolve to a stored span
- [ ] 06.18 — scan uploads for malware when the tool is present
- [ ] 06.21 — extract skills and experience with a source span

Exit: every fixture passes. The isolation suite passes.

## P4 — design system

- [ ] 15.17 — add Playwright; sign-in and approval-rejection flows
- [ ] 15.13 — add approve, reject, edit and expire outcomes to `ActionPreview` (partial)

Exit: Playwright passes. Zero critical a11y violations.

## P5 — agent runtime and scope lock

Work in this order: module 21, then 03, then 04. This is order rule 6.

- [ ] 21.9 — bounded fetch tool with a domain allow-list
- [ ] 21.10 — headless browser worker for allow-listed pages only
- [ ] 21.11 — expose the calendar MCP server
- [ ] 21.12 — expose the inbox, finance, trips, WhatsApp and Telegram MCP servers
- [ ] 21.13 — extend the MCP security suite to all eight cases (partial)
- [ ] 21.14 — deliver lab 13
- [ ] 03.16 — implement cancellation; replace the TODO test (partial)
- [ ] 04.17 — wire the red-team suite into CI with the change trigger

Exit: the red-team suite passes. No unregistered tool call succeeds.

## P6 — inbox, calendar, tasks, notes

- [ ] 09.8 — build the draft preview; it matches the send payload
- [ ] 09.11 — calendar adapter interface and the Google adapter
- [ ] 09.12 — attendee-aware approval for invite events
- [ ] 09.13 — conflict detection against the provider
- [ ] 09.14 — ICS import and export
- [ ] 09.15 — partial provider failure paths
- [ ] 09.16 — Calendar page: agenda, week, month, timezone, approval preview
- [ ] 09.17 — deliver lab 6
- [ ] 09.18 — three-pane Inbox page

Exit: send without a grant fails. The reminder restart test delivers once.

Next queue: `docs/plan/worklist-p7-p11.md`.
