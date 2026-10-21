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

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Create the transaction table: amount, currency, date, merchant, category, source, hash | migrations | Duplicate hash is rejected |
| 2 | Implement CSV and OFX import with encoding and locale variants | `services/finance-service/ingest/` | Each fixture imports |
| 3 | Implement PDF statement parsing through the sandboxed document service | finance + document service | Rows keep row and column refs |
| 4 | Add content-addressed deduplication across imports | finance service | Re-import is a no-op |
| 5 | Implement deterministic currency conversion with a dated rate table | finance service | Rounding cases pass |
| 6 | Build the rule-based categoriser with override history | finance service | Rules are deterministic |
| 7 | Add the model-drafted category path with confidence and reason | finance + gateway | Low confidence forces review |
| 8 | Implement the ambiguous-import review queue | finance service | Queue surfaces only uncertain rows |
| 9 | Compute totals, budgets and trends in code | finance service | Totals match a fixed fixture |
| 10 | Add export and delete for the finance domain | finance service | Delete removes objects too |
| 11 | Implement provider connection handling and account-linking consent inside the finance service. `20-pages-and-automations` adds the `integration-registry` that displays these connections in P9 | finance service | Consent scope is explicit |
| 12 | Add Plaid or India Account Aggregator behind a config flag in the same local adapter. The P9 registry reads only its status. | finance service | Flag off means CSV only |
| 13 | Create the trip table: dates, origin, destination, budget, status | migrations | Ownership indexed |
| 14 | Implement route and fare estimation with a provider adapter | `services/trips-service/` | Estimates are labelled |
| 15 | Implement itinerary draft, packing list and a pre-departure checklist | trip service | Checklist is deterministic |
| 16 | Gate booking actions behind an approval grant | policy + trip service | Booking without approval fails |
| 17 | Build the Finance and Trips page: period selector, net and cash-flow cards, category chart, import provenance and review queue. Trips add a map with stops, a route timeline, transport options and booking links. | `apps/web/finance/` | The chart renders from stored transactions. Every import shows its provenance. Booking links carry an estimate label (spec:408, spec:409). |
| 18 | Register the trips operations with the policy layer: argument schema, resource scope, risk tier, quota and verifier (spec:193) | policy service | A trips call with an unregistered argument is rejected |

## Build order

Work these steps in order. A step names tasks from the table above.

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

- Provider integrations (Plaid, Account Aggregator) carry compliance weight. Keep the flag off until you read the terms.
- Floating-point money is a defect source. Use integer minor units everywhere.
- A model-drafted category is a suggestion. Never let it reach a report without review when confidence is low.
