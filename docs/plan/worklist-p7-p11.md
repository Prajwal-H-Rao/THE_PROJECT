# NOVA worklist — P7 to P11

Live task queue for the implementing model. Work top to bottom. Take one task per iteration. The module file holds the full task text and the test.

Rules are in `docs/plan/worklist.md`. Start P7 only when P1 to P6 pass.

## P7 — finance and trips

External gates: maps key and Plaid or AA terms. Use `manual_only` and CSV only when a gate is closed.

- [x] 11.2 — CSV and OFX import with locale variants
- [x] 11.3 — PDF statement path through the document service
- [x] 11.4 — content-addressed dedup across imports
- [x] 11.5 — deterministic currency conversion with a dated table
- [x] 11.6 — rule-based categoriser with override history
- [x] 11.7 — model-drafted category with confidence and reason
- [ ] 11.8 — ambiguous-import review queue
- [ ] 11.9 — totals, budgets and trends in code
- [ ] 11.10 — export and delete for finance (partial)
- [ ] 11.11 — provider connection and consent inside finance
- [ ] 11.12 — Plaid or AA behind a config flag
- [ ] 11.14 — route and fare estimate with an estimate label
- [ ] 11.15 — itinerary, packing list and checklist
- [ ] 11.16 — gate booking behind an approval grant
- [ ] 11.17 — Finance and Trips page
- [ ] 11.18 — register trips operations with policy

Exit: uncertain rows go to review. Every estimate carries its label.

## P8 — jobs agent and registry

Order rule 4 applies: 12.1 to 12.7, then 13.8 to 13.17, then 12.8 to 12.21, then 13.18 to 13.25.

- [ ] 12.1 — listing contract with provenance fields
- [ ] 12.2 — normalisation with source and freshness per field
- [ ] 12.3 — 200-case labelled ranking evaluation set
- [ ] 12.4 — hard filters as deterministic code
- [ ] 12.5 — explainable feature scoring
- [ ] 12.6 — optional embedding rerank after hard filters
- [ ] 12.7 — profile versioning, field sources and confirm flags
- [ ] 13.8 — Greenhouse Job Board adapter
- [ ] 13.9 — Lever Postings adapter with XML fallback
- [ ] 13.10 — Ashby public posting adapter
- [ ] 13.11 — SmartRecruiters posting adapter
- [ ] 13.12 — lab 7: permitted ATS source with a labelled set
- [ ] 13.13 — permitted-public-page extractor with review gate
- [ ] 13.14 — registry opening, match and run tables
- [ ] 13.15 — backoff, timeout, breaker and per-source limits
- [ ] 13.16 — scheduled poll: 24h, jitter, cap, ETag
- [ ] 13.17 — run record with counts, dedupe and error class
- [ ] 12.8 — extraction review UI beside supporting text
- [ ] 12.9 — parser spans to profile candidates with `source_ref`
- [ ] 12.10 — cover letter, summary and response drafts
- [ ] 12.11 — truthful-claim checklist before review
- [ ] 12.12 — application envelope with hash and nonce
- [ ] 12.13 — gate submission behind an approval grant
- [ ] 12.14 — submission adapter with `Idempotency-Key`
- [ ] 12.15 — confirmation record with provider evidence
- [ ] 12.16 — follow-up state machine
- [ ] 12.17 — manual handoff for blocked paths
- [ ] 12.18 — duplicate application detection
- [ ] 12.19 — Resume and Job Search page
- [ ] 12.20 — export, delete and provider revoke
- [ ] 12.21 — lab 2 review view
- [ ] 13.18 — canonical ID normalisation and duplicate detection
- [ ] 13.19 — freshness, changed-field, stale and closed thresholds
- [ ] 13.20 — source-status surface
- [ ] 13.21 — seed-list maintenance rules
- [ ] 13.22 — export and delete of user data, not the seed
- [ ] 13.23 — Jobs to Companies page
- [ ] 13.24 — lab 12: 250/250 assertion and 10 pilots
- [ ] 13.25 — saved filters and alerts

Exit: 250 `IN` plus 250 `GLOBAL`. No blocked source is polled. No claim lacks a source.

## P9 — channels, automations, pages

Telegram first. Keep WhatsApp behind a flag until Meta clears. Record `blocked-by-claim` while the gate is closed.

- [ ] 14.1 — WhatsApp signature verification
- [ ] 14.2 — WhatsApp verify-token challenge
- [ ] 14.3 — message-ID idempotency
- [ ] 14.4 — replay protection with a timestamp window
- [ ] 14.5 — outbound sender with rate limits and opt-in
- [ ] 14.6 — Telegram secret-token header check
- [ ] 14.7 — Telegram update offset and retry
- [ ] 14.8 — Telegram bot, secret token and webhook
- [ ] 14.9 — inbound sanitiser for untrusted text
- [ ] 14.10 — action preview card for chat approvals
- [ ] 14.11 — inline callbacks with signature checks
- [ ] 14.12 — chat approvals on the low-risk allow-list
- [ ] 14.13 — reject free-text approvals
- [ ] 14.14 — notification templates
- [ ] 14.15 — delivery receipts and failure backoff
- [ ] 14.16 — redaction in adapter logs
- [ ] 14.17 — consume the P2 linking nonce
- [ ] 14.18 — webhook and delivery metrics
- [ ] 14.19 — channel settings page
- [ ] 14.20 — lab 5
- [ ] 20.1 — Today page
- [ ] 20.2 — Assistant page
- [ ] 20.3 — conversation API with stop and history
- [ ] 20.4 — inline approval cards with detail view
- [ ] 20.5 — automation rule schema
- [ ] 20.6 — automation engine with idempotency keys
- [ ] 20.7 — preview before enable
- [ ] 20.8 — run history with verified outcomes
- [ ] 20.9 — pause, resume and delete an automation
- [ ] 20.10 — automation permissions through policy
- [ ] 20.11 — integration-registry service
- [ ] 20.12 — Automations page
- [ ] 20.13 — Integrations page
- [ ] 20.14 — token-expiry and error explanations
- [ ] 20.15 — Activity and Security page
- [ ] 20.16 — Settings page
- [ ] 20.17 — RBAC on every page route
- [ ] 20.18 — privileged endpoints behind the P5 rule
- [ ] 20.19 — Storybook variants
- [ ] 20.20 — Storybook interaction tests
- [ ] 20.21 — family 7 operations

Exit: replay refused. A second trigger does not run. Every chat write needs a bound approval.

## P10 — hardening and reliability

Order: 17.1 to 17.10, 17.11 to 17.21, 17.22 to 17.26, then 16.18, then the rest of 16.

- [ ] 17.1 — hardened base image
- [ ] 17.2 — multi-stage Dockerfiles with pinned digests (partial)
- [ ] 17.3 — `.dockerignore` and a build-context secret scan (partial)
- [ ] 17.5 — ML and document profile with allow-list egress (partial)
- [ ] 17.7 — read-only root and tmpfs scratch
- [ ] 17.9 — egress proxy with an allow-list
- [ ] 17.10 — prove no Docker socket and no host path (partial)
- [ ] 17.11 — K8s base manifests
- [ ] 17.12 — Pod Security `restricted`
- [ ] 17.13 — Kustomize overlays for kind and EKS
- [ ] 17.14 — local kind cluster target
- [ ] 17.15 — seccomp, capability drop, no privilege escalation
- [ ] 17.16 — `SecretRef` files with rotation
- [ ] 17.17 — FSGroup, service accounts, token control
- [ ] 17.18 — private registry and image signing
- [ ] 17.19 — multi-arch builds
- [ ] 17.20 — namespace isolation on kind
- [ ] 17.21 — rolling deploy and version endpoint
- [ ] 17.22 — red-team suite on kind
- [ ] 17.23 — Prometheus, OTel and dashboards
- [ ] 17.24 — Trivy, Grype and pip-audit in CI
- [ ] 17.25 — lab 8
- [ ] 17.26 — lab 9
- [ ] 16.1 — health standard across services (partial)
- [ ] 16.2 — circuit breakers on provider calls
- [ ] 16.3 — backoff with jitter and a DLQ per queue
- [ ] 16.4 — failure classes: failed, unverified, delayed
- [ ] 16.5 — security test layer: CSRF, SSRF, XSS, scans (partial)
- [ ] 16.6 — fault injection for the eight cases
- [ ] 16.7 — structured logs with redaction (partial)
- [ ] 16.8 — OpenTelemetry trace to the provider (partial)
- [ ] 16.9 — metrics: latency, depth, errors, cost (partial)
- [ ] 16.10 — alerts with runbooks
- [ ] 16.11 — workflow test suite: pause, resume, cancel (partial)
- [ ] 16.12 — performance tests with real volumes
- [ ] 16.13 — a11y suite in CI
- [ ] 16.14 — scheduled backups with verification (partial)
- [ ] 16.16 — recovery runbooks
- [ ] 16.17 — failure copy with the last confirmed stage (partial)
- [ ] 16.18 — spec runbooks and the parser pod drill
- [ ] 16.19 — CI fails on a missing required test (partial)
- [ ] 16.20 — lab 10

Exit: no model or parser workload reaches the DB, secrets, the socket, host paths or open egress.

## P11 — release gate

- [ ] 18.1 — define `gates.json`
- [ ] 18.2 — gate-ordering check
- [ ] 18.3 — invariant-to-test manifest
- [ ] 18.4 — invariant 1 and 2 tests
- [ ] 18.5 — invariant 3 tests
- [ ] 18.6 — invariant 4 tests
- [ ] 18.7 — invariant 5 tests
- [ ] 18.8 — invariant 6 evidence
- [ ] 18.9 — invariant 7 evidence
- [ ] 18.10 — invariant 8 tests
- [ ] 18.11 — invariant 9 scan
- [ ] 18.12 — invariant 10 CI trigger
- [ ] 18.13 — recovery drills
- [ ] 18.14 — operator checklist
- [ ] 18.15 — runbook index
- [ ] 18.16 — release report
- [ ] 18.17 — post-release review and ledger re-check
- [ ] 18.18 — final demo
- [ ] 18.19 — threat-model review
- [ ] 18.20 — production-like smoke tests

Exit: all ten invariants pass. Gate G is signed.
