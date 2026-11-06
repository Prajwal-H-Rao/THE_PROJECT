# NOVA execution phases

Phase gates and work packages for the implementing model. The task loop and rules are in `docs/plan/execution-plan.md`.

## Phase order

Do not start a phase until the previous phase exit passes. The two exceptions are the interleave rules in `order-and-constraints.md`.

| Phase | Exit proof |
|---|---|
| P1 | Gate A: unauthenticated private call rejected, non-root image, no secret in image. |
| P2 | Replayed, expired and cross-user approvals denied. RBAC and TLS hold. |
| P3 | Gate B: parser returns evidence-bound fields or `unknown`. Bad fixtures fail safely. |
| P4 | Previews, denials and failures work by keyboard. Tokens drive both themes. |
| P5 | Gate C: no unauthorised write. No fabricated success. |
| P6 | Gate D: provider IDs and state verify results. Reminders survive restart once. |
| P7 | Uncertain extraction marked for review. Trip estimates labelled as estimates. |
| P8 | Gate E: safe job handoff. Exactly 250 `IN` plus 250 `GLOBAL`. Source gates hold. |
| P9 | Gate F: webhooks verified and deduplicated. Automations run once. Chat actions bound. |
| P10 | No model-to-tool direct path. Evidence ties to state. Workloads isolated. |
| P11 | Gate G: all ten invariants pass by test or operator record. |

The release gate signs gates A to G at P11. No earlier phase signs a gate.

## P1 — close the two gaps

Order: `01` task 16, then `02` task 13.

- 01.16: create `docs/architecture/`. Hold the 23-service map, trust boundaries, data flow and `layout-diff.md`. Prove each of the 23 catalogue services appears once.
- 02.13: implement export and deletion across the schemas. This is a design fork. Write the decision in `docs/design-notes/` first. Stop for owner approval before code.

Exit: run the P1 gate tests and the layout checks.

## P2 — verify, do not rebuild

No open task. Run the identity, policy and audit suites. Re-run the P2 gate tests. Fix only a failing proof.

## P3 — finish the document sandbox

Order: `06` tasks 3, 12, 14, 16, 9, 13, 17, 18, 21.

- 3: serve the Flask app with a production WSGI server.
- 12: prove the worker sandbox. Add the Compose checks.
- 14: add the bad-fixture corpus. Each fixture must fail safely.
- 16: complete the `ml-service` HTTP API for classification and embeddings.
- 9: add OCR as an isolated fallback.
- 13: prove no Postgres route and no internet route from the parser.
- 17: reject a citation ID that does not resolve to a stored span.
- 18: scan uploads for malware when the tool is present.
- 21: extract skills and experience with a source span.

Exit: all parser fixtures pass. The isolation suite passes.

## P4 — finish the design system

Order: `15` task 17, then task 13.

- 17: add Playwright. Write the sign-in and approval-rejection flows first.
- 13: add approve, reject, edit and expire outcomes to `ActionPreview`. Make the full flow work without a mouse.

Exit: Playwright passes. The a11y report holds zero critical violations.

## P5 — finish the MCP surface and scope lock

Order: `21` tasks 9 to 14, then `03` task 16, then `04` task 17. This follows order rule 6.

- 21.9: bounded fetch tool with a domain allow-list.
- 21.10: headless browser worker for allow-listed pages only.
- 21.11: expose the calendar MCP server.
- 21.12: expose the inbox, finance, trips, WhatsApp and Telegram MCP servers.
- 21.13: extend the security suite to all eight listed cases.
- 21.14: deliver lab 13.
- 03.16: implement cancellation. Replace the TODO test.
- 04.17: wire the red-team suite into CI with the change trigger.

Exit: the full red-team suite passes. No unregistered tool call succeeds.

## P6 — finish inbox and calendar

Order: `09` tasks 8, 11, 12, 13, 14, 15, 16, 17, 18.

- 8: build the draft preview. It must equal the send payload.
- 11: calendar adapter interface and the Google adapter.
- 12: attendee-aware approval for invite events.
- 13: conflict detection against the provider.
- 14: ICS import and export.
- 15: partial provider failure paths.
- 16: Calendar page with agenda, week, month and a timezone indicator.
- 17: lab 6.
- 18: three-pane Inbox page.

Exit: send without a grant fails. Reminder restart test passes once.

## P7 — finance and trips

Order: `11` tasks 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18. Task 1 and task 13 are done.

- Tasks 2 to 4: CSV and OFX import, PDF statement path, dedup.
- Tasks 5 and 6: dated currency table and the rule-based categoriser.
- Tasks 7 to 9: model category path, review queue, totals.
- Task 10: export and delete.
- Tasks 11 and 12: provider consent and the Plaid or AA flag.
- Tasks 14 to 16: route estimate, itinerary, booking approval.
- Tasks 17 and 18: Finance and Trips page, policy registration.

External gates: maps key and Plaid terms. Use `manual_only` and CSV only when a gate is closed.

Exit: uncertain rows go to review. Estimates carry the estimate label.

## P8 — jobs agent and registry

Order rule 4 applies. Order: `12` tasks 1 to 7, `13` tasks 8 to 17, `12` tasks 8 to 21, `13` tasks 18 to 25.

- 12.1 to 12.7: listing contract, normalisation, ranking set, hard filters, scoring, rerank, profile versioning.
- 13.8 to 13.17: four ATS adapters, lab 7, extractor, tables, backoff, poll, run record.
- 12.8 to 12.21: review UI, profile spans, drafts, claim checklist, envelope, submit, evidence, states, handoff, duplicates, page, export.
- 13.18 to 13.25: duplicates, freshness, status surface, seed rules, export, page, lab 12, alerts.

Exit: the 250 plus 250 assertion passes. No blocked source is polled. No claim lacks a source.

## P9 — channels, automations, pages

Order: `14` tasks 6 to 10, 1 to 5, 11 to 20; then `20` tasks 1 to 21.

- Telegram first. WhatsApp stays behind a flag until Meta verification clears.
- Build the channel approval cards and the deterministic approval rules.
- Build Today, Assistant, conversation API, automations, integrations, Activity, Settings and RBAC routes.
- Add Storybook and the family 7 operations.

External gates: Telegram token, Meta WABA. Record `blocked-by-claim` for WhatsApp when the gate is closed.

Exit: webhook replay is refused. A second trigger does not run. Every chat write needs a bound approval.

## P10 — hardening and reliability

Order: `17` tasks 1 to 10, 11 to 21, 22 to 26; then `16` task 18; then the rest of `16`.

- 17.1 to 17.10: base image, multi-stage builds, secret scan, network, ML profile, loopback, read-only root, limits, egress, no socket.
- 17.11 to 17.21: K8s base, Pod Security, overlays, kind, seccomp, secrets, service accounts, registry, multi-arch, namespace isolation, rolling deploy.
- 17.22 to 17.26: red-team on kind, observability, scanners, labs 8 and 9.
- 16.18: parser pod drill. It needs the kind cluster.
- Remaining `16`: health, breakers, DLQ, failure classes, security layer, faults, logs, traces, metrics, alerts, workflow tests, perf, a11y CI, backups, runbooks, failure copy, CI test gate, lab 10.

Exit: no model or parser workload reaches the DB, secrets, the Docker socket, host paths or open egress.

## P11 — release gate

Order: `18` tasks 1 to 20.

- Define `gates.json` and the ordering check first.
- Map the ten invariants to tests or records.
- Run the drills, write the runbooks, generate the report.
- Run the final demo and the smoke tests.

Exit: all ten invariants pass. Gate G is signed.
