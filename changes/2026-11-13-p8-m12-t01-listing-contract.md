# Change — 2026-11-13-p8-m12-t01-listing-contract

## Problem

Task 12.1 (module 12, phase P8): define the job listing contract. It carries connector ID, canonical URI, employer, role, location, times, source hash, last verified and terms classification. Test: an unknown field fails. Artifact: contracts, `job-source-worker`.

## Approach approval

The approach ran three negation rounds. The negators found and fixed four defects before implementation:

1. `nova/packages/contracts/tsconfig.json` enumerates every file in its `include` array. New files must be listed or `tsc` skips them.
2. The contracts `test` script enumerates every test file. The new test must be appended or it never runs.
3. The package `exports` map must gain a `./job-listing` entry or consumers cannot import it.
4. The field set follows spec:536 and migration 09: `title` (not `role`), `fingerprint` (the SHA-256 source hash), `work_mode` pinned to `remote`/`hybrid`/`onsite`, `expires_at` kept, plus `source_job_id`, `retrieved_at` (spec:523), and two state axes — `freshness_state` (`current`/`stale`, spec:639) and `listing_status` (`open`/`closed`/`unknown`, spec:540).

The validator follows the existing `readEnvelope` guard pattern. No new dependency. `ajv` stays unused (it has zero precedent in this package).

## Changes

- Added `nova/packages/contracts/job-listing.ts` (169 lines): the `JobListing` interface, the two state-axis unions, and `readJobListing()`. The validator rejects unknown fields, empty required values, malformed fingerprints (must be 64 lowercase hex), malformed timestamps and non-http(s) URIs. The header comment carries the contract-to-column delta table against `jobs_service.job_listing` (migration 09).
- Added `nova/packages/contracts/job-listing.test.ts` (87 lines): 11 cases. Minimal valid passes, full optional set passes, unknown field fails, missing required fails, non-object fails, bad fingerprint, bad `work_mode`, empty `terms_classification`, malformed URI, malformed timestamp, bad state values.
- Registered the module at three points: tsconfig `include`, `package.json` `exports` (`./job-listing`), and the `test` script (`dist/job-listing.test.js`).

## Deferral

The `job-source-worker` artifact is deferred to the module 13 adapter work (tasks 13.8+). The empty directory carries nothing in git, and the layout checker imposes no requirement for it yet. The existing `jobs-service` NestJS scaffold keeps its unrelated task code.

## Verification

- `cd nova/packages/contracts && npm test` → 213 tests pass, 0 fail (11 new).
- Both files are under the 200-line rule (169 and 87 lines).
- The tsconfig `include` array silently skips unmatched names (verified: the stale `self-extension-guard.test.ts` entry does not fail the build), so the two new entries are the required and sufficient wiring.

## Flag for the owner

Migration 11 (`migrations/11-export-deletion.sql:146`) filters `jobs_service.job_listing` by `user_id`, but migration 09 (`09-jobs-schema.sql:27-48`) never creates that column. The export/delete path for listings will fail against a fresh schema. This predates task 12.1 and is not fixed here. It needs a decision with the P1 design fork (task 02.13).

## Notes

Task 12.1 marked done. Module 12 now 1/0/20 (Started); P8 now 8/0/38 (17%); totals 259/15/129 (64%).

Next tasks in the P8 order: 12.2 (normalisation with source and freshness per field), then 12.3 (200-case labelled ranking evaluation set).

No commit made (commit decision belongs to the owner).
