# Module 11 — Finance and trips

Phase P7. Spec headings: allowed task families, integrations and external APIs, data model for trips and finance.

## Goal

Import, categorise and review transactions with evidence. Compute totals in code, never in a model. Plan trips as labelled estimates with a review before booking.

## Constraints (spec, binding)

- Spec:822: "Use deterministic arithmetic for finance totals, scoring hard filters, due-time scheduling, currency/date conversion, permission decisions and job-application state transitions. Models may summarize these values but cannot be their source of truth."
- Spec:188: finance family covers "import statements, normalize transactions, categorize, budget and summarize spending; no movement of money or financial transfers."
- Spec:799: "Review ambiguous/large imports; never trust model sums alone."
- Spec:737: finance-service keeps "import parser isolated; no bank credentials in model prompts."
- Spec:409: trips show "Unconfirmed prices/times marked estimates; purchases require approval/manual checkout unless official authorized purchase integration exists."

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Create the transaction table: amount, currency, date, merchant, category, source, hash | migrations | Duplicate hash is rejected | 5 |
| 2 | Implement CSV and OFX import with encoding and locale variants | `services/finance-service/ingest/` | Each fixture imports | 7 |
| 3 | Implement PDF statement parsing through the sandboxed document service | finance + document service | Rows keep row and column refs | 6 |
| 4 | Add content-addressed deduplication across imports | finance service | Re-import is a no-op | 5 |
| 5 | Implement deterministic currency conversion with a dated rate table | finance service | Rounding cases pass | 5 |
| 6 | Build the rule-based categoriser with override history | finance service | Rules are deterministic | 6 |
| 7 | Add the model-drafted category path with confidence and reason | finance + gateway | Low confidence forces review | 6 |
| 8 | Implement the ambiguous-import review queue | finance service | Queue surfaces only uncertain rows | 5 |
| 9 | Compute totals, budgets and trends in code | finance service | Totals match a fixed fixture | 6 |
| 10 | Add export and delete for the finance domain | finance service | Delete removes objects too | 4 |
| 11 | Implement provider connection handling and account linking consent | integration service | Consent scope is explicit | 6 |
| 12 | Add Plaid or India Account Aggregator behind a config flag | integration service | Flag off means CSV only | 6 |
| 13 | Create the trip table: dates, origin, destination, budget, status | migrations | Ownership indexed | 4 |
| 14 | Implement route and fare estimation with a provider adapter | `services/trip-service/` | Estimates are labelled | 6 |
| 15 | Implement itinerary draft, packing list and a pre-departure checklist | trip service | Checklist is deterministic | 5 |
| 16 | Gate booking actions behind an approval grant | policy + trip service | Booking without approval fails | 5 |
| 17 | Build the finance and trips page composition | web UI | Playwright flow passes | 6 |

This build sequence sums to 93 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

1. Create the transaction table and the CSV importer with deduplication.
2. Add the deterministic categoriser, then the model-drafted category path behind review.
3. Create trips with labelled estimates and an approval-gated booking.

## Acceptance tests

- `test_totals_match_fixed_fixture` — a known CSV produces a known total.
- `test_reimport_is_noop` — the same file twice produces no duplicates.
- `test_low_confidence_forces_review` — no uncertain row posts a final category.
- `test_no_raw_credentials_stored` — a log and audit scan finds no credential material.
- `test_estimate_labelled_not_booked` — a fare estimate never reports a booked state.
- `test_booking_requires_grant` — booking without a valid approval fails.
- `test_delete_removes_objects` — deleting the domain removes its storage objects.

## Risks

- Provider integrations (Plaid, Account Aggregator) carry compliance weight. Keep the flag off until the terms are read.
- Floating-point money is a defect source. Use integer minor units everywhere.
- A model-drafted category is a suggestion. Never let it reach a report without review when confidence is low.
