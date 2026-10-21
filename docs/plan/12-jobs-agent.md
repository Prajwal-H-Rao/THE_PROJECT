# Module 12 — Resume and job-search agent

Phase P8. Spec headings: Resume & Job-Search / Application Agent, Flow, Data and service responsibilities, Acceptance criteria (jobs).

## Goal

Search, rank and track jobs with evidence. Draft every application artifact from verified profile facts. Submit only after the user approves the exact payload.

This module interleaves with `13-employer-registry` inside P8. See rule 4 in `schedule.md`. Build tasks 1 to 7 first, then tasks 8 to 21 after `13` tasks 1 to 17.

## Constraints (spec, binding)

- Spec:514: "an assisted application workflow with default human submission approval, not a bot that tries to submit to every website."
- Spec:524: "Never fabricate credentials, skills, years of experience, visa/work authorization, salary, notice period or answers to legally significant questions."
- Spec:525: "Approval is bound to the exact application payload hash, job ID, user ID, expiry, nonce and tool version. Any material change invalidates approval."
- Spec:527: "A local click, tool call, generated message or absent error is not proof."
- Spec:528: status moves "only from user input or source evidence."
- Spec:715: "Do not claim a fixed matching false-positive target before building a representative evaluation set."

## Flow (spec:518-528, 11 steps)

1. Upload and quarantine: file object ID, SHA-256, type/size/page limits, malware scan where tooling is available, sandboxed parse.
2. Extract: the parser returns text with page, paragraph, table and character-span provenance. Candidate fields carry `source_ref`, method and confidence.
3. Review profile: fields beside supporting text. The user confirms name, dates, skills, employment, education, location and preferences. Unknown stays unknown.
4. Discover jobs: query the registry using only connectors marked `verified_permitted`.
5. Normalize and deduplicate: canonicalise, use source IDs, track duplicate confidence, treat job text as untrusted.
6. Rank and explain: hard filters first, then optional embeddings. Show factor breakdown and missing requirements.
7. Prepare materials: drafts from verified profile facts only. Every claim links to a source. When no source exists, the system marks the claim for user input.
8. Review and approval: show employer, link, fields, attachments and disclosures. Bind the approval to the payload hash.
9. Submit through an allowed path. If unsupported, hand the prepared content to the user. Never evade CAPTCHA or bot controls.
10. Verify status: `submitted` only after authoritative confirmation with a stored provider reference.
11. Follow up: `applied`, `assessment`, `interview`, `rejected`, `withdrawn`, `unknown` from user input or source evidence.

## Data and service ownership

| Concern | Owning service | Note |
|---|---|---|
| Listing lifecycle, dedupe, filters, ranking, drafts, application state | `jobs-service` | Spec:730 |
| 500-employer registry, source status, polling schedules | `employer-registry-service` | See `13-employer-registry` |
| ATS, feed and public-page adapters, incremental polling | `job-source-worker` | Spec:732 |
| `resume_profile`, `job_listing`, `job_match`, `application_draft`, `application_submission` | `jobs-service` | Spec:532-536 |

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Define the listing contract. It carries connector ID, canonical URI, employer, role, location, times, source hash, last verified and terms classification. | contracts | Unknown field fails | 5 |
| 2 | Implement normalisation with provenance on every field | `jobs-service/` | Every field carries source and freshness | 6 |
| 3 | Build the 200-case labelled ranking evaluation set with human labels | `tests/job-eval/` | The set has a manifest and a label file, and `ranking_quality.json` carries the measured score | 10 |
| 4 | Implement hard filters as deterministic code | job service | Filters never call a model | 4 |
| 5 | Implement explainable feature scoring with factor breakdown | job service | Every result shows its factors | 7 |
| 6 | Add optional embedding similarity as a rerank after hard filters, then score the ranker on the evaluation set | job service | Similarity cannot waive a hard filter, and `ranking_quality.json` carries the measured score | 5 |
| 7 | Extend `resume_profile`, which `02-data-and-audit` created in P1, with versioning, field sources and confirmed-by-user flags | profile path in `jobs-service` | A used version cannot be edited | 6 |
| 8 | Implement extraction review: fields beside supporting text, user confirms | web UI | Unknown fields stay unknown | 7 |
| 9 | Map parser spans to `resume_profile` candidate fields with `source_ref`, extraction method and confidence where meaningful | `services/jobs-service/profile/` | Every candidate field carries a resolvable `source_ref`, and a field with no span is marked unknown (spec:519, spec:520) | 5 |
| 10 | Build artifact drafting: cover letter, profile summaries, response drafts | job service | Each claim links to a profile source | 7 |
| 11 | Implement the truthful-claim checklist before review | job service | An unlinked claim blocks readiness | 5 |
| 12 | Build the application envelope with payload hash, job ID, user ID, expiry, nonce and tool version | job service | Any byte change invalidates it | 6 |
| 13 | Gate submission behind an approval grant bound to that envelope | policy + job service | Altered envelope fails at the domain service | 6 |
| 14 | Implement the submission adapter with an `Idempotency-Key` | job service | Retry does not double-submit | 6 |
| 15 | Record confirmation with provider reference, timestamp and response evidence | job service | No evidence means `status_unknown` | 5 |
| 16 | Implement follow-up states: `applied`, `assessment`, `interview`, `rejected`, `withdrawn`, `unknown` | job service | Illegal transition fails | 5 |
| 17 | Implement manual handoff for unsupported or blocked paths | job service | Blocked path opens the official URL, no evasion | 5 |
| 18 | Add duplicate detection across the user's own applications and job cards | job service | A second application to one job is rejected | 4 |
| 19 | Build the Resume and Job Search page: upload, version history, profile, job cards, rationale, checklist, drafts, approval queue and status history | web UI | Playwright flow passes | 10 |
| 20 | Add export, deletion and provider-revoke for resume and application records | job service | Export contains every user row | 5 |
| 21 | Complete curriculum lab 2 with the React review view beside the supporting text | `labs/lab02/` | A field shows its source span, and an unknown field stays unknown | 4 |
This build sequence sums to 123 hours.

## Acceptance criteria (spec:545-551)

- Uploaded documents cannot access host secrets, network or DB, and cannot execute active content.
- Every extracted material fact is source-linked or marked unknown or needs review.
- Every match explains its filters and score factors.
- Draft content cannot be submitted without a valid, unexpired approval matching its current exact payload.
- Blocked or disallowed sources lead to a clear manual handoff, not an evasion attempt.
- Application success is recorded only with a verifiable provider receipt or status; an ambiguous outcome stays `status_unknown`.
- The user can export or delete the resume and application records and revoke connected provider access.

## Acceptance tests

- `test_unlinked_claim_blocks_readiness` — a draft with a claim that has no profile source cannot reach `ready`.
- `test_altered_envelope_invalidates_approval` — one changed byte invalidates the grant.
- `test_no_evidence_means_status_unknown` — no receipt means no `submitted`.
- `test_similarity_cannot_waive_hard_filter` — a high embedding score never overrides a failed filter.
- `test_blocked_path_opens_official_url` — a `403` produces a handoff, not a retry.
- `test_profile_version_immutable_once_used` — editing a used version fails.
- `test_illegal_followup_transition_fails` — the service refuses a `rejected` to `interview` transition.
- `test_ranking_quality_reported_not_claimed` — `ranking_quality.json` carries a score computed on the labelled set. It carries no `measured` claim when the set is missing.

## Risks

- The labelled evaluation set is the gating artifact for any ranking claim. Build it before any quality statement.
- Submission adapters vary per employer portal. Mark unsupported portals `manual_only` rather than automating against the rules.
- A tailored resume must never edit the base profile. Keep the base immutable and show a diff.
