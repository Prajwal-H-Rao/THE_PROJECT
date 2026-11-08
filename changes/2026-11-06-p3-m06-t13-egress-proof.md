# Change — 2026-11-06-p3-m06-t13-egress-proof

## Problem

Task 06.13 (module 06, P3): prove the worker cannot reach Postgres or the internet. Artifact: Compose test. Acceptance tests `test_worker_cannot_reach_database` and `test_worker_has_no_egress`. No Docker/runtime installed; stdlib-only `python3` test is the approved pattern (06.3, 06.12, 06.14, 06.16).

## Changes (test-first, static-assertion proof)

- Extended `nova/workers/document-worker/sandbox-compose.yaml` (task 06.12 artifact) with an internal-only Compose network `document-sandbox-net` (`internal: true` → Compose removes the default gateway, so attached containers have no internet/egress route) and attached `document-worker` to it. No external Postgres host is referenced; no port 5432 is published.
  - Care: `test_sandbox.py` (06.12) asserts the literal `"postgres"` is absent from this file, so all additions avoid that word.
- Wrote `nova/workers/document-worker/test_egress.py`: stdlib-only test reading sandbox-compose.yaml as text:
  - `test_worker_cannot_reach_database`: asserts no `network_mode: host`, no port 5432 publish, no `extra_hosts` DB reference, worker attached to `document-sandbox-net`.
  - `test_worker_has_no_egress`: asserts `internal: true` (no gateway/internet), no `ports:` published at all, no `docker.sock` volume, `volumes: []`.
- Runs with plain python3; passes.

## Verification

- `python3 nova/workers/document-worker/test_egress.py` → PASS (both acceptance checks).
- `python3 nova/workers/document-worker/test_sandbox.py` (06.12) → still PASS (no regression from network addition).
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree counts unchanged: 180 directories, 111 leaf directories, 43 placeholders.

## Notes

Task 06.13 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 06 now 18 done / 1 partial / 2 open; P3 now 34 done / 1 partial / 2 open (92%); totals 222 done / 19 partial / 162 open (55%). Partial retained because 06.14 remains partial (deterministic page enforcement lands at 06.5/06.16 parser side).

Remaining P3 tasks top-to-bottom: 06.17 (citation validator), 06.18 (malware scan), 06.21 (skills/experience extraction).

No commit made (commit decision belongs to the owner).
