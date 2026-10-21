# Module 13 — 500-employer registry and opening tracker

Phase P8. Spec headings: employer registry, lifecycle, source priority, polling, data model, dashboard, Appendix B, seed rules.

## Goal

Import 500 seed employers. Verify each source before any poll. Track openings with provenance, freshness, dedup and a source-status surface.

This module interleaves with `12-jobs-agent` inside P8. See rule 4 in `order-and-constraints.md`. Build tasks 1 to 17 first, then tasks 18 to 25 after `12` tasks 8 to 21.

## Constraints (spec, binding)

- Spec:558: "Every company/source starts as `needs_verification`; the agent must verify the official employer identity, canonical career page and permitted source before polling it."
- Spec:558: the seed list is "not an objective ranking, promise of hiring, or assertion that a company is currently recruiting."
- Spec:577: "Never use proxy rotation, identity evasion, CAPTCHA solving, anti-bot bypass, hidden/unlisted job exposure, credential stuffing, or unrestricted crawl of arbitrary URLs."
- Spec:581: "By default poll verified public sources **once per 24 hours**."
- Spec:584: "If no current check is possible, display “last seen” and the date, not “open now.”"
- Spec:629: "For a source with no verified permitted URL, leave the URL nullable in the company record and do not guess the domain/endpoint."
- Spec:633: "Batch actions must not silently enable new sources or authorize applications."
- Spec:1544: "The source registry is the only authority for whether and how an employer can be polled."

## Registry lifecycle (spec:562)

`seeded → identity_verified → career_url_verified → source_permission_reviewed → connector_configured → polling → healthy / no_openings / source_changed / rate_limited / manual_only / paused`

These are the only legal states. Gate E depends on `career_url_verified` and `source_permission_reviewed`, so those states must exist.

## Seed artifact

`NOVA_Employer_Targets_500.csv`. Header, 11 columns:

`target_id, region, company_name, normalized_name, registry_status, user_priority, career_url, source_mode, ats_provider, source_evidence_url, source_verified_at`

All 500 rows start with `registry_status = needs_verification`. All 500 `career_url` values are empty. Do not write a test that expects a populated URL.

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Write the CSV importer against the 11-column header | `services/employer-registry-service/import/` | Fails on a missing or renamed column |
| 2 | Enforce exactly 250 `IN` plus 250 `GLOBAL` and unique `normalized_name` | importer | 499 or 501 rows fails |
| 3 | Own the seed artifact. Copy the repo CSV to `data/employer-seed-v1.csv`, the path spec:959 path. Keep it versioned data, not configuration. | `data/employer-seed-v1.csv` | The file has the 11-column header, 500 rows, and no populated `career_url` |
| 4 | Record alias relationships in a separate reviewed table | alias schema | No alias is silently discarded |
| 5 | Implement the full spec:562 lifecycle: six pipeline states plus six health states, with legal transitions only | registry service | An illegal transition fails |
| 6 | Add the `verified_permitted` gate: no poll before `source_permission_reviewed` | worker | Unverified source is never polled |
| 7 | Implement source discovery and the `ats_provider` resolver for Greenhouse, Lever, Ashby, SmartRecruiters | `connectors/` | Each hint resolves or returns `unknown` |
| 8 | Implement the Greenhouse Job Board adapter (C07) | connector | Adapter contract passes |
| 9 | Implement the Lever Postings adapter with `?mode=xml` fallback (C08) | connector | Adapter contract passes |
| 10 | Implement the Ashby public posting adapter with `listedOnly=true` (C09) | connector | Adapter contract passes |
| 11 | Implement the SmartRecruiters posting adapter, tier-tolerant (C10) | connector | Missing tier returns `unsupported`, not an error |
| 12 | Deliver curriculum lab 7: one permitted ATS source with a labelled ranking set, using the connector from task 8 | `labs/lab07/` | The ranking report renders from the labelled set |
| 13 | Build the permitted-public-page extractor with structured data first, and gate enablement on a completed review record | connector | An enabled source row carries a `source_evidence_url` and a review timestamp |
| 14 | Extend `employer_targets` and `employer_job_sources` from spec:590-626 on the P1 base schema `02-data-and-audit`. Add the service-owned opening, match and run tables. | migrations | Matches the spec SQL. Adds the five spec:564 fields the SQL omits: alternate names, remote preference, experience band, compensation preference and visa needs |
| 15 | Implement backoff, timeout, circuit breaker and per-source rate limits | worker | Breaker opens and recovers |
| 16 | Implement the scheduled poll: 24h default, jitter, concurrency cap, ETag and Last-Modified | worker | No source exceeds its limit |
| 17 | Build the run record: timing, HTTP status class, records seen/new/updated/closed, dedupe, error class, correlation ID | registry schema | No full HTML stored, no secrets stored |
| 18 | Add canonical ID normalisation and exact plus fuzzy duplicate detection | job service | Duplicate rate reported |
| 19 | Implement freshness, changed-field, stale and closed thresholds | job service | Stale openings flagged |
| 20 | Build the source-status surface: verified, stale, failed, rate-limited, manual, unsupported, paused | web UI | Status renders per source with a reason |
| 21 | Add the seed-list maintenance rules: reviewed diff imports, add only through review, disable on repeated health failure | registry service | A blind overwrite import fails review |
| 22 | Implement export and delete of user matching and application data without touching the shared seed | registry service | Shared seed survives a user delete |
| 23 | Build the Jobs to Companies page: search, filters, counts from persisted records, pause/resume, history | web UI | Counts come from queries, not constants |
| 24 | Deliver curriculum lab 12: seed import with the 250/250 assertion and 10 manual pilots | `labs/lab12/` | The import assertion passes and 10 pilots are marked verified |
| 25 | Build saved filters and alerts: daily digest, urgent match, company priority and mute. Filter on role family, experience, city mode, work authorisation, salary band and keyword. | `jobs-service/filters/` | Each control round-trips and the digest job reads the saved set |
## Acceptance criteria (spec:637-642)

- Exactly 500 distinct seed employer names: 250 `IN`, 250 `GLOBAL`, no duplicate `normalized_name`.
- All 500 start as targets only. Poll no source until you have verified identity, URL and access mode, and marked the row `verified_permitted`.
- Every displayed job carries a provenance URL, a retrieval timestamp, a source ID, and a current or stale state. No hallucinated job reaches the list.
- Public ATS read access and application submission are separate. Keep application automation off until you verify a permitted submission path.
- Rate limits, `403`, CAPTCHA and parser failures lead to bounded backoff or manual/paused status, never evasion.
- The user can add, remove and disable companies. The user can also export or delete their own data without deleting the shared seed.

## Acceptance tests

- `test_import_counts_250_250` — 500 rows, split 250 and 250, unique normalised names.
- `test_import_fails_on_wrong_header` — a renamed column stops the import.
- `test_no_poll_before_permission_review` — an unverified source produces zero requests.
- `test_unverified_url_stays_null` — the service leaves `career_url` null when only a company name is known.
- `test_blocked_source_pauses_without_evasion` — a `403` moves the source to `paused`, not to a retry with a new method.
- `test_run_history_supports_searched_claim` — the dashboard cannot show "searched all 500" unless run history covers all 500.
- `test_batch_action_cannot_enable_source` — a batch cannot add a source or authorise an application.
- `test_user_delete_spares_shared_seed` — user data goes, the seed stays.

## Risks

- SmartRecruiters availability is tier dependent (C10). Return `unsupported` per employer instead of failing the run.
- 500 employers polled at 24h is about 21 requests per hour spread with jitter. Set the concurrency cap before the first real poll.
- Generic page extraction breaks when a site changes. The circuit breaker and the `source_changed` state are the defence.
